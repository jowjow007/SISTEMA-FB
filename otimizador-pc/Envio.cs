// Envio das medições do monitoramento para o portal (Firestore, coleção monitorPCs) — para o painel
// "Computadores" (tools/monitor-pcs), que só o admin lê.
// Sem login: a regra do Firestore aceita a gravação só com a chave do escritório (a regra guarda apenas o
// SHA-256 dela). A chave vem de privado/monitor-chave.txt na hora de compilar (nunca vai para o repositório).
//   monitorPCs/{pc}                 estado atual (a cada 60 s) + diagnóstico e hardware (a cada 10 min)
//   monitorPCs/{pc}/amostras/{id}   histórico: pacotes de ~20 medições (10 min), uma linha de log por medição
//   monitorComandos/{pc}            pedido do admin pelo painel ({id, acao, pedidoEm}); o app lê a cada minuto, sem
//                                   login, executa e devolve o resultado nos campos comando* de monitorPCs/{pc}
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Web.Script.Serialization;
using System.Windows.Forms;

static class Envio
{
    const string BASE = "https://firestore.googleapis.com/v1/projects/sistema-fb-4cce5/databases/(default)/documents/monitorPCs/";
    const string BASE_CMD = "https://firestore.googleapis.com/v1/projects/sistema-fb-4cce5/databases/(default)/documents/monitorComandos/";
    public const string VERSAO = "3";
    // último comando executado (fica num arquivo do usuário, para não repetir depois de reiniciar)
    static string cmdId = null, cmdStatus = "", cmdResultado = "";
    static DateTime cmdEm = DateTime.MinValue;
    static string ArqCmd { get { return Path.Combine(Monitor.Pasta, "ultimo-comando.txt"); } }
    static readonly object trava = new object();
    static readonly List<string> pendentes = new List<string>();
    static bool ocupado;
    static int contador;
    static DateTime ultimoDiag = DateTime.MinValue;
    static List<object> achados = new List<object>(), extensoes = new List<object>();
    static string hardware = null;
    public static string UltimoErro = "";

    public static bool Ligado { get { return ChaveMonitor.VALOR.Length >= 20; } }

    public static string IdPc()
    {
        string s = Regex.Replace(Environment.MachineName, "[^A-Za-z0-9_-]", "-");
        return s.Length > 50 ? s.Substring(0, 50) : s;
    }

    // chamado a cada medição (30 s), na thread da janela: só guarda e dispara o envio em segundo plano
    public static void Nova(string linha)
    {
        if (!Ligado) return;
        lock (trava)
        {
            pendentes.Add(linha);
            if (pendentes.Count > 300) pendentes.RemoveRange(0, pendentes.Count - 300);
            contador++;
            if (ocupado || (contador % 2 != 1)) return;   // estado atual a cada 2 medições (60 s), começando pela 1ª
            ocupado = true;
        }
        ThreadPool.QueueUserWorkItem(delegate { try { Enviar(linha); } catch (Exception ex) { UltimoErro = ex.Message; } finally { lock (trava) ocupado = false; } });
    }

    static void Enviar(string linha)
    {
        ServicePointManager.SecurityProtocol |= (SecurityProtocolType)3072; // TLS 1.2
        if (hardware == null) hardware = Monitor.Hardware();
        try { VerComando(); } catch { }
        if ((DateTime.Now - ultimoDiag).TotalMinutes >= 10)
        {
            ultimoDiag = DateTime.Now;
            try
            {
                string resumo; List<Diagnostico.Extensao> exts;
                List<Achado> r = Diagnostico.Rodar(out resumo, out exts);
                achados = r.Take(20).Select(x => (object)Mapa(new Dictionary<string, object> { { "nivel", x.Nivel }, { "titulo", Corta(x.Titulo, 200) }, { "texto", Corta(x.Texto, 600) } })).ToList();
                extensoes = exts.Take(40).Select(e => (object)Str(Corta(e.Nome + (e.Pesada ? " (pesada)" : ""), 120))).ToList();
            }
            catch { }
        }

        Monitor.Amostra a = Monitor.ParseLinha(linha);
        DateTime? fim = Monitor.Fim();
        Dictionary<string, object> f = new Dictionary<string, object>();
        f["chave"] = Str(ChaveMonitor.VALOR);
        f["pc"] = Str(Environment.MachineName);
        f["usuario"] = Str(Environment.UserName);
        f["versao"] = Str(VERSAO);
        f["atualizadoEm"] = Ts(DateTime.Now);
        // instalado (monitora sempre) vai como 01/01/2100 — o painel mostra "instalado"
        f["ate"] = Ts(fim == null ? DateTime.Now : fim.Value > DateTime.Now.AddYears(10) ? new DateTime(2100, 1, 1) : fim.Value);
        f["ram"] = Int(a.Ram);
        f["livreGB"] = Dbl(a.Livre);
        f["commit"] = Int(a.Commit);
        f["cpu"] = Int(a.Cpu);
        f["chromeMB"] = Int(a.ChromeMB);
        f["chromeN"] = Int(a.ChromeN);
        f["top"] = Arr(a.Mem.Take(10).Select(k => (object)Mapa(new Dictionary<string, object> { { "n", k.Key }, { "mb", k.Value } })));
        f["cpuTop"] = Arr(a.CpuP.Take(10).Select(k => (object)Mapa(new Dictionary<string, object> { { "n", k.Key }, { "p", k.Value } })));
        f["travado"] = Str(Corta(a.Travado, 300));
        f["ramTotalGB"] = Dbl(Math.Round(Sistema.RamTotalGB(), 1));
        f["ligadoDias"] = Dbl(Math.Round(Sistema.DiasLigado(), 2));
        f["ajustes"] = new Dictionary<string, object> { { "booleanValue", Ajustes.JaAplicado() } };
        f["hardware"] = Str(Corta(hardware, 1500));
        f["achados"] = Arr(achados);
        f["extensoes"] = Arr(extensoes);
        if (!string.IsNullOrEmpty(cmdId))   // só depois de executar algum comando (regras antigas não conhecem estes campos)
        {
            f["comandoId"] = Str(Corta(cmdId, 40));
            f["comandoStatus"] = Str(cmdStatus);
            f["comandoResultado"] = Str(Corta(cmdResultado, 500));
            f["comandoEm"] = Ts(cmdEm == DateTime.MinValue ? DateTime.Now : cmdEm);
        }
        Patch(IdPc(), f);

        // histórico: manda os pacotes de 20 medições já fechados
        while (true)
        {
            List<string> pacote;
            lock (trava) { if (pendentes.Count < 20) break; pacote = pendentes.Take(20).ToList(); }
            Monitor.Amostra p0 = Monitor.ParseLinha(pacote[0]);
            Dictionary<string, object> h = new Dictionary<string, object>();
            h["chave"] = Str(ChaveMonitor.VALOR);
            h["t"] = Ts(p0.T);
            h["s"] = Arr(pacote.Select(l => (object)Str(Corta(l, 1200))));
            Patch(IdPc() + "/amostras/" + p0.T.ToString("yyyyMMddHHmmss"), h);
            lock (trava) pendentes.RemoveRange(0, Math.Min(20, pendentes.Count));
        }
        UltimoErro = "";
    }

    // ------------------------------------------------ comandos do painel
    static void VerComando()
    {
        if (cmdId == null) { try { string[] l = File.ReadAllLines(ArqCmd); cmdId = l[0]; cmdStatus = l[1]; cmdResultado = l[2]; cmdEm = DateTime.Parse(l[3], System.Globalization.CultureInfo.InvariantCulture); } catch { cmdId = ""; } }
        HttpWebRequest r = (HttpWebRequest)WebRequest.Create(BASE_CMD + IdPc());
        r.Timeout = 15000;
        string json;
        try { using (WebResponse resp = r.GetResponse()) using (StreamReader sr = new StreamReader(resp.GetResponseStream())) json = sr.ReadToEnd(); }
        catch (WebException) { return; }   // sem pedido (404) ou sem rede
        Dictionary<string, object> d = new JavaScriptSerializer().Deserialize<Dictionary<string, object>>(json);
        Dictionary<string, object> campos = d.ContainsKey("fields") ? d["fields"] as Dictionary<string, object> : null;
        if (campos == null) return;
        string id = Valor(campos, "id", "stringValue"), acao = Valor(campos, "acao", "stringValue"), quando = Valor(campos, "pedidoEm", "timestampValue");
        if (string.IsNullOrEmpty(id) || id == cmdId) return;
        DateTime pedido;
        if (!DateTime.TryParse(quando, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.AdjustToUniversal, out pedido)) return;
        cmdId = id; cmdEm = DateTime.Now;
        if ((DateTime.UtcNow - pedido).TotalHours > 24) { cmdStatus = "expirado"; cmdResultado = "Pedido de mais de 24 h atrás: não executado."; }
        else
        {
            try { cmdResultado = Executar(acao); cmdStatus = "ok"; }
            catch (Exception ex) { cmdStatus = "erro"; cmdResultado = ex.Message; }
        }
        try { Directory.CreateDirectory(Monitor.Pasta); File.WriteAllLines(ArqCmd, new[] { cmdId, cmdStatus, cmdResultado.Replace("\n", " "), cmdEm.ToString("o", System.Globalization.CultureInfo.InvariantCulture) }); } catch { }
    }

    static string Executar(string acao)
    {
        string hora = DateTime.Now.ToString("HH:mm");
        if (acao == "otimizar")
        {
            double gb; bool escondido = Ajustes.ChromeEscondido(out gb);
            int antes = Otimizacoes.Inicializacao().Count(i => i.Onde.StartsWith("usuário") && i.Dispensavel && !i.Desligado);
            long lib = Ajustes.LimparUsuario();
            int depois = Otimizacoes.Inicializacao().Count(i => i.Onde.StartsWith("usuário") && i.Dispensavel && !i.Desligado);
            ultimoDiag = DateTime.MinValue;   // diagnóstico novo já nesta rodada
            List<string> feito = new List<string>();
            feito.Add("temporários apagados: " + Diagnostico.GB(lib / 1073741824.0));
            if (antes > depois) feito.Add((antes - depois) + " programa(s) a menos abrindo com o Windows");
            if (escondido && !Ajustes.ChromeEscondido(out gb)) feito.Add("Chrome escondido encerrado");
            return "Otimizado às " + hora + " (usuário " + Environment.UserName + "): " + string.Join("; ", feito.ToArray()) + ".";
        }
        if (acao == "diagnostico") { ultimoDiag = DateTime.MinValue; return "Diagnóstico atualizado às " + hora + "."; }
        if (acao == "avisar-reiniciar")
        {
            Monitor.MostrarAviso("Reinicie o computador",
                "O responsável pelos computadores pediu: ao terminar o que está fazendo, salve tudo e use Iniciar > Energia > Reiniciar.");
            return "Aviso de reiniciar mostrado na tela às " + hora + " (usuário " + Environment.UserName + ").";
        }
        return "Ação desconhecida: " + acao;
    }

    static string Valor(Dictionary<string, object> campos, string nome, string tipo)
    {
        object o; if (!campos.TryGetValue(nome, out o)) return null;
        Dictionary<string, object> v = o as Dictionary<string, object>;
        object x; return v != null && v.TryGetValue(tipo, out x) ? Convert.ToString(x) : null;
    }

    static void Patch(string caminho, Dictionary<string, object> campos)
    {
        string corpo = new JavaScriptSerializer { MaxJsonLength = int.MaxValue }.Serialize(new Dictionary<string, object> { { "fields", campos } });
        HttpWebRequest r = (HttpWebRequest)WebRequest.Create(BASE + caminho);
        r.Method = "PATCH"; r.ContentType = "application/json; charset=utf-8"; r.Timeout = 20000;
        byte[] b = Encoding.UTF8.GetBytes(corpo);
        r.ContentLength = b.Length;
        using (Stream s = r.GetRequestStream()) s.Write(b, 0, b.Length);
        try { using (r.GetResponse()) { } }
        catch (WebException ex)
        {
            string det = "";
            if (ex.Response != null) using (StreamReader sr = new StreamReader(ex.Response.GetResponseStream())) det = sr.ReadToEnd();
            throw new Exception(ex.Message + " " + Corta(Regex.Replace(det, @"\s+", " "), 300));
        }
    }

    // teste manual: OtimizadorPC.exe /testar-envio  → grava uma medição e diz se a regra aceitou
    public static string Testar()
    {
        if (!Ligado) return "Sem chave: o app foi compilado sem privado/monitor-chave.txt.";
        string linha = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss", System.Globalization.CultureInfo.InvariantCulture) + "|ram=" + Sistema.RamUsoPct() + "|livre=1.00|commit=0|cpu=-1|chrome=0/0|mem=|cpup=|travado=";
        try { Enviar(linha); return "OK: medição gravada em monitorPCs/" + IdPc(); }
        catch (Exception ex) { return "FALHOU: " + ex.Message; }
    }

    static string Corta(string s, int n) { s = s ?? ""; return s.Length > n ? s.Substring(0, n) : s; }
    static Dictionary<string, object> Str(string s) { return new Dictionary<string, object> { { "stringValue", s ?? "" } }; }
    static Dictionary<string, object> Int(long v) { return new Dictionary<string, object> { { "integerValue", v.ToString() } }; }
    static Dictionary<string, object> Dbl(double v) { return new Dictionary<string, object> { { "doubleValue", v } }; }
    static Dictionary<string, object> Ts(DateTime t) { return new Dictionary<string, object> { { "timestampValue", t.ToUniversalTime().ToString("yyyy-MM-dd'T'HH:mm:ss'Z'") } }; }
    static Dictionary<string, object> Arr(IEnumerable<object> v) { return new Dictionary<string, object> { { "arrayValue", new Dictionary<string, object> { { "values", v.ToList() } } } }; }
    static Dictionary<string, object> Mapa(Dictionary<string, object> m)
    {
        Dictionary<string, object> f = new Dictionary<string, object>();
        foreach (var kv in m)
            f[kv.Key] = kv.Value is int ? Int((int)kv.Value) : kv.Value is long ? Int((long)kv.Value) : kv.Value is double ? Dbl((double)kv.Value) : (object)Str(Convert.ToString(kv.Value));
        return new Dictionary<string, object> { { "mapValue", new Dictionary<string, object> { { "fields", f } } } };
    }
}
