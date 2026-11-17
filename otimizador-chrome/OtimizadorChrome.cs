// Otimizador do Chrome — diagnóstico + ajustes automáticos para os computadores do escritório.
// Abre e já mostra o diagnóstico; o botão "Corrigir automaticamente" grava as políticas do Chrome/Edge
// (HKLM\SOFTWARE\Policies) pedindo permissão de administrador só nesse momento.
// Linha de comando:  OtimizadorChrome.exe /aplicar   (aplica sem janela; precisa estar como administrador)
//                    OtimizadorChrome.exe /desfazer  (remove só o que este app gravou)
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Security.Principal;
using System.Text;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using Microsoft.Win32;

[assembly: AssemblyTitle("Otimizador do Chrome")]
[assembly: AssemblyProduct("Otimizador do Chrome")]
[assembly: AssemblyVersion("1.0.0.0")]
[assembly: AssemblyFileVersion("1.0.0.0")]

static class Programa
{
    [STAThread]
    static int Main(string[] args)
    {
        string a = args.Length > 0 ? args[0].ToLowerInvariant() : "";
        if (a == "/aplicar") return Ajustes.Aplicar() ? 0 : 1;
        if (a == "/desfazer") return Ajustes.Desfazer() ? 0 : 1;
        if (a == "/monitor") { Monitor.Rodar(); return 0; }
        if (a == "/instalar") return Monitor.Instalar() ? 0 : 1;        // precisa de administrador
        if (a == "/desinstalar") return Monitor.Desinstalar() ? 0 : 1;  // precisa de administrador
        if (a == "/testar-envio") { string res = Envio.Testar(); if (args.Length > 1) File.WriteAllText(args[1], res, Encoding.UTF8); return res.StartsWith("OK") ? 0 : 1; }
        if (a == "/relatorio" && args.Length > 1)
        {   // grava o relatório completo num arquivo de texto (sem janela)
            string resumo; List<Diagnostico.Extensao> exts;
            List<Achado> r = Diagnostico.Rodar(out resumo, out exts);
            File.WriteAllText(args[1], Monitor.Relatorio(Janela.Relatorio(resumo, r, exts)), Encoding.UTF8);
            return 0;
        }
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        Application.Run(new Janela());
        return 0;
    }
}

// ---------------------------------------------------------------- ajustes (políticas)
static class Ajustes
{
    const string CHROME = @"SOFTWARE\Policies\Google\Chrome";
    const string EDGE = @"SOFTWARE\Policies\Microsoft\Edge";

    // sites que NUNCA são congelados (formato de URL do Chrome: domínio pega também os subdomínios)
    public static readonly string[] Excecoes = {
        "fonsecaebraga.com.br",   // portal
        "jus.br",                 // PJe, e-SAJ, eproc, PJe-JT, DJEN, TJMG, TRT...
        "astrea.net.br",          // Astrea
        "web.whatsapp.com",       // senão para de avisar mensagem nova
        "meet.google.com"         // reunião não pode cair
    };

    public static int NivelEconomia()
    {
        // 8 GB ou menos: economia máxima; acima disso: equilibrada
        return Sistema.RamTotalGB() <= 8.5 ? 2 : 1;
    }

    public static bool Aplicar()
    {
        try
        {
            using (RegistryKey k = Registry.LocalMachine.CreateSubKey(CHROME))
            {
                k.SetValue("HighEfficiencyModeEnabled", 1, RegistryValueKind.DWord);       // economia de memória ligada
                k.SetValue("MemorySaverModeSavings", NivelEconomia(), RegistryValueKind.DWord);
                k.SetValue("BackgroundModeEnabled", 0, RegistryValueKind.DWord);           // não fica rodando depois de fechado
                k.SetValue("NetworkPredictionOptions", 2, RegistryValueKind.DWord);        // não pré-carrega páginas
                k.SetValue("ShoppingListEnabled", 0, RegistryValueKind.DWord);
            }
            Registry.LocalMachine.DeleteSubKeyTree(CHROME + @"\TabDiscardingExceptions", false);
            using (RegistryKey k = Registry.LocalMachine.CreateSubKey(CHROME + @"\TabDiscardingExceptions"))
                for (int i = 0; i < Excecoes.Length; i++) k.SetValue((i + 1).ToString(), Excecoes[i], RegistryValueKind.String);
            using (RegistryKey k = Registry.LocalMachine.CreateSubKey(EDGE))
            {
                k.SetValue("StartupBoostEnabled", 0, RegistryValueKind.DWord);             // Edge não abre escondido com o Windows
                k.SetValue("BackgroundModeEnabled", 0, RegistryValueKind.DWord);
            }
            return true;
        }
        catch { return false; }
    }

    public static bool Desfazer()
    {
        try
        {
            using (RegistryKey k = Registry.LocalMachine.OpenSubKey(CHROME, true))
                if (k != null) foreach (string n in new[] { "HighEfficiencyModeEnabled", "MemorySaverModeSavings", "BackgroundModeEnabled", "NetworkPredictionOptions", "ShoppingListEnabled" }) k.DeleteValue(n, false);
            Registry.LocalMachine.DeleteSubKeyTree(CHROME + @"\TabDiscardingExceptions", false);
            using (RegistryKey k = Registry.LocalMachine.OpenSubKey(EDGE, true))
                if (k != null) foreach (string n in new[] { "StartupBoostEnabled", "BackgroundModeEnabled" }) k.DeleteValue(n, false);
            return true;
        }
        catch { return false; }
    }

    public static bool JaAplicado()
    {
        using (RegistryKey k = Registry.LocalMachine.OpenSubKey(CHROME))
        {
            if (k == null) return false;
            object v = k.GetValue("HighEfficiencyModeEnabled");
            object b = k.GetValue("BackgroundModeEnabled");
            return v is int && (int)v == 1 && b is int && (int)b == 0;
        }
    }

    // ---- parte do usuário (roda sem administrador, na conta de quem está usando)

    // Chrome aberto sem nenhuma janela = rodando escondido em segundo plano
    public static bool ChromeEscondido(out double gb)
    {
        gb = 0; bool algum = false, janela = false;
        foreach (Process p in Process.GetProcessesByName("chrome"))
        {
            try { algum = true; gb += p.PrivateMemorySize64 / 1073741824.0; if (p.MainWindowHandle != IntPtr.Zero) janela = true; } catch { }
        }
        return algum && !janela;
    }

    // entradas que fazem Chrome/Edge abrirem escondidos quando o Windows liga
    public static List<string> AutoInicio()
    {
        List<string> r = new List<string>();
        using (RegistryKey k = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run"))
            if (k != null) foreach (string n in k.GetValueNames())
                    if (n.StartsWith("GoogleChromeAutoLaunch_") || n.StartsWith("MicrosoftEdgeAutoLaunch_")) r.Add(n);
        return r;
    }

    // apaga o auto-início escondido e encerra o Chrome se ele estiver sem janela (não perde nenhuma aba)
    public static void LimparUsuario()
    {
        try
        {
            using (RegistryKey k = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run", true))
                if (k != null) foreach (string n in AutoInicio()) k.DeleteValue(n, false);
        }
        catch { }
        double gb;
        if (ChromeEscondido(out gb))
            foreach (Process p in Process.GetProcessesByName("chrome")) { try { p.Kill(); } catch { } }
        foreach (Process p in Process.GetProcessesByName("msedge"))
        {   // Edge escondido (sem janela) também sai
            try { if (Process.GetProcessesByName("msedge").All(x => x.MainWindowHandle == IntPtr.Zero)) p.Kill(); } catch { }
        }
    }

    public static bool SouAdmin()
    {
        return new WindowsPrincipal(WindowsIdentity.GetCurrent()).IsInRole(WindowsBuiltInRole.Administrator);
    }
}

// ---------------------------------------------------------------- leitura do sistema
static class Sistema
{
    [StructLayout(LayoutKind.Sequential)]
    class MEMSTATUS
    {
        public uint dwLength = (uint)Marshal.SizeOf(typeof(MEMSTATUS));
        public uint dwMemoryLoad;
        public ulong ullTotalPhys, ullAvailPhys, ullTotalPageFile, ullAvailPageFile, ullTotalVirtual, ullAvailVirtual, ullAvailExtendedVirtual;
    }
    [DllImport("kernel32.dll")] static extern bool GlobalMemoryStatusEx([In, Out] MEMSTATUS m);
    [DllImport("kernel32.dll")] static extern ulong GetTickCount64();

    public static double RamTotalGB() { MEMSTATUS m = new MEMSTATUS(); GlobalMemoryStatusEx(m); return m.ullTotalPhys / 1073741824.0; }
    public static double RamLivreGB() { MEMSTATUS m = new MEMSTATUS(); GlobalMemoryStatusEx(m); return m.ullAvailPhys / 1073741824.0; }
    public static int RamUsoPct() { MEMSTATUS m = new MEMSTATUS(); GlobalMemoryStatusEx(m); return (int)m.dwMemoryLoad; }
    public static double DiasLigado() { return GetTickCount64() / 86400000.0; }
}

class Achado
{
    public int Nivel;          // 0 = problema, 1 = atenção, 2 = ok
    public string Titulo, Texto;
    public Achado(int n, string t, string x) { Nivel = n; Titulo = t; Texto = x; }
}

static class Diagnostico
{
    static readonly CultureInfo BR = new CultureInfo("pt-BR");
    public static string GB(double g) { return g.ToString("0.0", BR) + " GB"; }

    static readonly Dictionary<string, string> Nomes = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase) {
        {"msedge","Microsoft Edge"}, {"msedgewebview2","Apps com navegador embutido (Portal FB, Teams, WhatsApp...)"},
        {"WhatsApp","WhatsApp"}, {"WhatsApp.Root","WhatsApp"}, {"ms-teams","Microsoft Teams"}, {"Teams","Microsoft Teams"},
        {"OneDrive","OneDrive"}, {"explorer","Windows Explorer"}, {"MsMpEng","Antivírus do Windows"},
        {"java","Java (PJe Office / assinador)"}, {"javaw","Java (PJe Office / assinador)"},
        {"WINWORD","Word"}, {"EXCEL","Excel"}, {"OUTLOOK","Outlook"}, {"olk","Outlook (novo)"}, {"Acrobat","Adobe Acrobat"},
        {"AcroRd32","Adobe Reader"}, {"GoogleDriveFS","Google Drive"}, {"Spotify","Spotify"}, {"Discord","Discord"},
        {"PortalFB","Portal FB (app)"}, {"AnyDesk","AnyDesk"}, {"TeamViewer","TeamViewer"}
    };
    static readonly string[] Ignorar = { "Idle", "System", "Memory Compression", "Registry", "Secure System", "chrome", "vmmem", "dwm", "csrss", "smss", "wininit", "services", "lsass", "svchost", "fontdrvhost", "OtimizadorChrome" };

    // extensões conhecidas por pesar e raramente fazer falta no escritório
    static readonly string[] Pesadas = { "honey", "méliuz", "meliuz", "cuponomia", "buscapé", "buscape", "pelando", "zoom ", "grammarly",
        "avast", "avg ", "mcafee", "norton", "kaspersky", "webadvisor", "adobe acrobat", "hola", "vpn", "superdeal", "shopping", "cashback", "ad block plus" };

    public class Extensao { public string Nome, Perfil; public bool Pesada; }

    public static List<Achado> Rodar(out string resumo, out List<Extensao> exts)
    {
        List<Achado> r = new List<Achado>();
        double total = Sistema.RamTotalGB(), livre = Sistema.RamLivreGB();
        int uso = Sistema.RamUsoPct();

        // Chrome
        long chromeBytes = 0; int chromeProc = 0;
        foreach (Process p in Process.GetProcessesByName("chrome"))
        {
            try { chromeBytes += p.PrivateMemorySize64; chromeProc++; } catch { }
        }
        double chromeGB = chromeBytes / 1073741824.0;
        resumo = "Memória: " + GB(total) + "  ·  em uso " + uso + "%  ·  Chrome usando " + GB(chromeGB);

        // 1. memória geral
        if (uso >= 90) r.Add(new Achado(0, "A memória está no limite (" + uso + "% em uso)",
            "Sobram só " + GB(livre) + ". O computador fica lento e trava. Feche abas e programas que não estiver usando."));
        else if (uso >= 75) r.Add(new Achado(1, "Memória bem ocupada (" + uso + "% em uso)", "Sobram " + GB(livre) + "."));
        else r.Add(new Achado(2, "Memória com folga (" + uso + "% em uso)", "Sobram " + GB(livre) + "."));

        // 2. Chrome
        if (chromeProc == 0) r.Add(new Achado(2, "O Chrome está fechado agora", "Abra o Chrome com as abas de sempre e clique em \"Verificar de novo\" para medir o consumo real."));
        else
        {
            double fatia = chromeGB / total;
            string t = "Está com " + chromeProc + " processos abertos (cada aba e cada extensão é um processo). " +
                       "Para ver qual aba pesa mais: no Chrome, aperte Shift + Esc.";
            if (fatia >= 0.40) r.Add(new Achado(0, "O Chrome está usando " + GB(chromeGB) + " (" + (int)(fatia * 100) + "% da memória)", t));
            else if (fatia >= 0.25) r.Add(new Achado(1, "O Chrome está usando " + GB(chromeGB), t));
            else r.Add(new Achado(2, "O Chrome está usando " + GB(chromeGB) + " — normal", t));
        }

        // 2b. rodando escondido
        double gbEsc;
        if (Ajustes.ChromeEscondido(out gbEsc)) r.Add(new Achado(0, "O Chrome está rodando escondido, sem nenhuma janela aberta (" + GB(gbEsc) + ")",
            "Você fechou o Chrome, mas ele continuou ligado por trás. Clique em \"Corrigir automaticamente\" para encerrar (nenhuma aba é perdida)."));
        if (Ajustes.AutoInicio().Count > 0) r.Add(new Achado(0, "O Chrome/Edge abrem escondidos toda vez que o Windows liga",
            "Gastam memória o dia todo mesmo sem ninguém abrir. O \"Corrigir automaticamente\" desliga isso."));

        // 3. ajustes
        if (Ajustes.JaAplicado()) r.Add(new Achado(2, "Ajustes de economia já aplicados neste computador",
            "Abas paradas são congeladas automaticamente (portal, sistemas dos tribunais, Astrea e WhatsApp nunca são congelados)."));
        else r.Add(new Achado(0, "O Chrome ainda não está configurado para economizar memória",
            "Clique em \"Corrigir automaticamente\". Abas paradas passam a ser congeladas e o Chrome deixa de ficar rodando depois de fechado."));

        // 4. dias ligado
        double dias = Sistema.DiasLigado();
        if (dias >= 3) r.Add(new Achado(1, "O computador não é reiniciado há " + (int)dias + " dias",
            "Use Iniciar > Energia > REINICIAR (só desligar não limpa a memória no Windows 10/11). Uma vez por semana resolve."));
        else r.Add(new Achado(2, "Computador reiniciado recentemente", ""));

        // 5. extensões
        exts = LerExtensoes();
        List<Extensao> pesadas = exts.Where(e => e.Pesada).ToList();
        if (pesadas.Count > 0) r.Add(new Achado(0, pesadas.Count + " extensão(ões) que pesam e quase nunca fazem falta",
            string.Join(", ", pesadas.Select(e => e.Nome).Distinct().ToArray()) + ". Para remover: no Chrome, clique no ícone de quebra-cabeça (ao lado da barra de endereço) > três pontinhos > Remover do Chrome."));
        if (exts.Count > 6) r.Add(new Achado(1, exts.Count + " extensões ligadas no Chrome",
            "Cada extensão gasta memória o tempo todo. Mantenha só as necessárias (ex.: assinador do PJe). Lista completa no relatório."));
        else if (pesadas.Count == 0) r.Add(new Achado(2, exts.Count + " extensão(ões) ligada(s) — tudo bem", ""));

        // 6. outros programas pesados
        Dictionary<string, long> porNome = new Dictionary<string, long>(StringComparer.OrdinalIgnoreCase);
        foreach (Process p in Process.GetProcesses())
        {
            try
            {
                string n = p.ProcessName;
                if (Ignorar.Contains(n, StringComparer.OrdinalIgnoreCase)) continue;
                long b = p.PrivateMemorySize64;
                long ant; porNome.TryGetValue(n, out ant); porNome[n] = ant + b;
            }
            catch { }
        }
        var top = porNome.Where(kv => kv.Value > 300L * 1048576).OrderByDescending(kv => kv.Value).Take(5).ToList();
        if (top.Count > 0)
        {
            string lista = string.Join("\n", top.Select(kv => "   • " + (Nomes.ContainsKey(kv.Key) ? Nomes[kv.Key] : kv.Key) + " — " + GB(kv.Value / 1073741824.0)).ToArray());
            bool edge = top.Any(kv => kv.Key.Equals("msedge", StringComparison.OrdinalIgnoreCase));
            r.Add(new Achado(1, "Outros programas que mais gastam memória", lista +
                (edge ? "\nO Edge costuma ficar aberto escondido sem ninguém usar — o \"Corrigir automaticamente\" desliga isso." : "") +
                "\nSe usa o WhatsApp no Chrome, o app do WhatsApp para Windows costuma gastar menos."));
        }

        // 7. disco
        try
        {
            DriveInfo c = new DriveInfo("C");
            double livreDisco = c.AvailableFreeSpace / 1073741824.0, pct = (double)c.AvailableFreeSpace / c.TotalSize;
            if (pct < 0.10 || livreDisco < 15) r.Add(new Achado(0, "Disco C: quase cheio (" + GB(livreDisco) + " livres)",
                "Quando a memória acaba o Windows usa o disco — com ele cheio, tudo trava. Esvazie a Lixeira e a pasta Downloads."));
            else r.Add(new Achado(2, "Espaço em disco ok (" + GB(livreDisco) + " livres)", ""));
        }
        catch { }

        // 8. hardware
        string disco = Monitor.TipoDisco();
        if (disco.Contains("HD mecânico")) r.Add(new Achado(0, "O disco deste computador é um HD mecânico (lento)",
            "Quando a memória enche, o Windows usa o disco — e num HD isso trava tudo por segundos ou minutos. Trocar por SSD é a melhoria mais barata e de maior efeito (avise o responsável)."));
        if (total <= 8.5) r.Add(new Achado(1, "Este computador tem só " + GB(total) + " de memória",
            "Com Windows 11 + Chrome + sistemas dos tribunais, 8 GB fica no limite mesmo com tudo ajustado. Aumentar para 16 GB resolve de vez (avise o responsável)."));

        return r.OrderBy(x => x.Nivel).ToList();
    }

    static List<Extensao> LerExtensoes()
    {
        List<Extensao> lista = new List<Extensao>();
        string ud = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Google\Chrome\User Data");
        if (!Directory.Exists(ud)) return lista;
        JavaScriptSerializer js = new JavaScriptSerializer { MaxJsonLength = int.MaxValue };
        foreach (string perfil in Directory.GetDirectories(ud))
        {
            string nomePerfil = Path.GetFileName(perfil);
            if (nomePerfil != "Default" && !nomePerfil.StartsWith("Profile ")) continue;
            string dirExt = Path.Combine(perfil, "Extensions");
            if (!Directory.Exists(dirExt)) continue;
            Dictionary<string, object> config = LerConfigExtensoes(js, perfil);
            foreach (string dirId in Directory.GetDirectories(dirExt))
            {
                try
                {
                    string id = Path.GetFileName(dirId);
                    if (config != null && config.ContainsKey(id))
                    {
                        Dictionary<string, object> s = config[id] as Dictionary<string, object>;
                        if (s != null)
                        {
                            object dr; object st;
                            if (s.TryGetValue("disable_reasons", out dr) && dr != null && !(dr is object[] && ((object[])dr).Length == 0) && !(dr is int && (int)dr == 0)) continue; // desativada
                            if (s.TryGetValue("state", out st) && st is int && (int)st == 0) continue;
                            object loc; if (s.TryGetValue("location", out loc) && loc is int && ((int)loc == 5 || (int)loc == 10)) continue; // componente interno
                        }
                    }
                    string ver = Directory.GetDirectories(dirId).OrderByDescending(d => d).FirstOrDefault();
                    if (ver == null) continue;
                    string mf = Path.Combine(ver, "manifest.json");
                    if (!File.Exists(mf)) continue;
                    Dictionary<string, object> m = js.Deserialize<Dictionary<string, object>>(File.ReadAllText(mf));
                    string nome = m.ContainsKey("name") ? Convert.ToString(m["name"]) : id;
                    if (nome.StartsWith("__MSG_")) nome = Traduzir(js, ver, m, nome);
                    if (id == "ghbmnnjooekpmoecnnnilnnbdlolhkhi" || id == "nmmhkkegccagdldgiimedpiccmgmieda") continue; // padrões do Google (Docs off-line, Pagamentos)
                    string low = " " + nome.ToLowerInvariant() + " ";
                    lista.Add(new Extensao { Nome = nome, Perfil = nomePerfil, Pesada = Pesadas.Any(p => low.Contains(p)) });
                }
                catch { }
            }
        }
        return lista;
    }

    static Dictionary<string, object> LerConfigExtensoes(JavaScriptSerializer js, string perfil)
    {
        Dictionary<string, object> res = new Dictionary<string, object>();
        foreach (string arq in new[] { "Preferences", "Secure Preferences" })
        {
            try
            {
                string p = Path.Combine(perfil, arq);
                if (!File.Exists(p)) continue;
                Dictionary<string, object> d = js.Deserialize<Dictionary<string, object>>(File.ReadAllText(p));
                object e; if (!d.TryGetValue("extensions", out e)) continue;
                Dictionary<string, object> ex = e as Dictionary<string, object>;
                object s; if (ex == null || !ex.TryGetValue("settings", out s)) continue;
                foreach (var kv in (Dictionary<string, object>)s) res[kv.Key] = kv.Value;
            }
            catch { }
        }
        return res;
    }

    static string Traduzir(JavaScriptSerializer js, string ver, Dictionary<string, object> m, string chave)
    {
        string k = chave.Substring(6).TrimEnd('_');
        List<string> locs = new List<string> { "pt_BR", "pt_PT" };
        if (m.ContainsKey("default_locale")) locs.Add(Convert.ToString(m["default_locale"]));
        locs.Add("en");
        foreach (string l in locs)
        {
            try
            {
                string f = Path.Combine(ver, "_locales", l, "messages.json");
                if (!File.Exists(f)) continue;
                Dictionary<string, object> msgs = js.Deserialize<Dictionary<string, object>>(File.ReadAllText(f));
                foreach (var kv in msgs)
                    if (kv.Key.Equals(k, StringComparison.OrdinalIgnoreCase))
                    {
                        Dictionary<string, object> v = kv.Value as Dictionary<string, object>;
                        if (v != null && v.ContainsKey("message")) return Convert.ToString(v["message"]);
                    }
            }
            catch { }
        }
        return k;
    }
}

// ---------------------------------------------------------------- janela
class Janela : Form
{
    RichTextBox caixa; Label topo, resumo, monitorando; Button corrigir, verificar, copiar, desfazer, monitorar;
    List<Achado> achados = new List<Achado>(); List<Diagnostico.Extensao> exts = new List<Diagnostico.Extensao>(); string textoResumo = "";

    [DllImport("user32.dll")] static extern bool SetProcessDPIAware();

    public Janela()
    {
        try { SetProcessDPIAware(); } catch { }
        Text = "Otimizador do Chrome";
        AutoScaleMode = AutoScaleMode.Dpi;
        Font = new Font("Segoe UI", 10f);
        ClientSize = new Size(1080, 680);
        MinimumSize = new Size(640, 480);
        StartPosition = FormStartPosition.CenterScreen;
        BackColor = Color.White;
        try { Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch { }

        topo = new Label { Text = "Verificando o computador...", Font = new Font("Segoe UI Semibold", 15f), Dock = DockStyle.Top, Height = 44, Padding = new Padding(16, 12, 16, 0) };
        resumo = new Label { Text = "", ForeColor = Color.FromArgb(90, 90, 90), Dock = DockStyle.Top, Height = 30, Padding = new Padding(18, 4, 16, 0) };

        caixa = new RichTextBox { Dock = DockStyle.Fill, ReadOnly = true, BorderStyle = BorderStyle.None, BackColor = Color.White, Font = new Font("Segoe UI", 10.5f), DetectUrls = false };
        Panel meio = new Panel { Dock = DockStyle.Fill, Padding = new Padding(18, 8, 18, 8) };
        meio.Controls.Add(caixa);

        FlowLayoutPanel botoes = new FlowLayoutPanel { Dock = DockStyle.Bottom, Height = 70, Padding = new Padding(14, 12, 14, 12), BackColor = Color.FromArgb(245, 246, 248), FlowDirection = FlowDirection.LeftToRight };
        corrigir = Botao("Corrigir automaticamente", 230, true);
        monitorar = Botao("Instalar neste computador", 250, false);
        copiar = Botao("Gerar relatório", 160, false);
        verificar = Botao("Verificar de novo", 160, false);
        desfazer = Botao("Desfazer ajustes", 160, false);
        botoes.Controls.AddRange(new Control[] { corrigir, monitorar, copiar, verificar, desfazer });
        monitorando = new Label { Dock = DockStyle.Bottom, Height = 30, Padding = new Padding(18, 6, 16, 0), ForeColor = Color.FromArgb(29, 78, 216), Text = "" };

        monitorar.Click += delegate
        {
            if (Monitor.Instalado())
            {
                if (MessageBox.Show("Desinstalar o Otimizador deste computador?\n\nO monitoramento para e o computador sai do Painel do portal (os ajustes do Chrome continuam; use \"Desfazer ajustes\" se quiser tirar).",
                    Text, MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes) return;
                Elevar("/desinstalar", "Desinstalado. Este computador não é mais monitorado.");
            }
            else
                Elevar("/instalar", "Instalado!\n\nA partir de agora o Otimizador abre sozinho toda vez que qualquer pessoa entrar no Windows, monitora o computador o tempo todo e envia para o Painel dos Computadores do portal. " +
                    "Os ajustes do Chrome também foram aplicados.\n\nNinguém precisa fazer mais nada. Pode fechar esta janela.");
        };

        corrigir.Click += delegate { Elevar("/aplicar", "Pronto! Ajustes aplicados.\n\nFeche o Chrome por completo e abra de novo para valer tudo."); };
        desfazer.Click += delegate
        {
            if (MessageBox.Show("Remover os ajustes de economia deste computador?", Text, MessageBoxButtons.YesNo, MessageBoxIcon.Question) == DialogResult.Yes)
                Elevar("/desfazer", "Ajustes removidos. O Chrome volta ao normal depois de fechado e aberto de novo.");
        };
        verificar.Click += delegate { Rodar(); };
        copiar.Click += delegate
        {
            Cursor = Cursors.WaitCursor;
            try
            {
                string txt = Monitor.Relatorio(Relatorio());
                string arq = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory),
                    "Relatorio-" + Environment.MachineName + "-" + DateTime.Now.ToString("yyyy-MM-dd-HHmm") + ".txt");
                File.WriteAllText(arq, txt, Encoding.UTF8);
                try { Clipboard.SetText(txt); } catch { }
                Cursor = Cursors.Default;
                MessageBox.Show("Relatório salvo na Área de Trabalho:\n" + Path.GetFileName(arq) + "\n\nEnvie esse arquivo para o responsável (pelo chat do portal ou WhatsApp).", Text, MessageBoxButtons.OK, MessageBoxIcon.Information);
                Process.Start("explorer.exe", "/select,\"" + arq + "\"");
            }
            catch (Exception ex) { Cursor = Cursors.Default; MessageBox.Show("Não consegui gerar o relatório: " + ex.Message, Text); }
        };

        Controls.Add(meio); Controls.Add(monitorando); Controls.Add(botoes); Controls.Add(resumo); Controls.Add(topo);
        Shown += delegate { Rodar(); };
    }

    Button Botao(string t, int w, bool principal)
    {
        Button b = new Button { Text = t, Width = w, Height = 42, FlatStyle = FlatStyle.Flat, Margin = new Padding(0, 0, 10, 0), Cursor = Cursors.Hand };
        if (principal) { b.BackColor = Color.FromArgb(22, 128, 61); b.ForeColor = Color.White; b.Font = new Font("Segoe UI Semibold", 10.5f); b.FlatAppearance.BorderSize = 0; }
        else { b.BackColor = Color.White; b.FlatAppearance.BorderColor = Color.FromArgb(200, 200, 205); }
        return b;
    }

    void Rodar()
    {
        Cursor = Cursors.WaitCursor; topo.Text = "Verificando o computador..."; caixa.Clear(); Application.DoEvents();
        try { achados = Diagnostico.Rodar(out textoResumo, out exts); }
        catch (Exception ex) { achados = new List<Achado> { new Achado(1, "Não consegui verificar tudo", ex.Message) }; }
        Cursor = Cursors.Default;

        int problemas = achados.Count(a => a.Nivel == 0), atencao = achados.Count(a => a.Nivel == 1);
        if (problemas > 0) { topo.Text = problemas == 1 ? "Encontrei 1 problema" : "Encontrei " + problemas + " problemas"; topo.ForeColor = Color.FromArgb(185, 28, 28); }
        else if (atencao > 0) { topo.Text = "Quase tudo certo — veja os avisos"; topo.ForeColor = Color.FromArgb(161, 98, 7); }
        else { topo.Text = "Tudo certo neste computador"; topo.ForeColor = Color.FromArgb(22, 128, 61); }
        resumo.Text = textoResumo;

        bool aplicado = Ajustes.JaAplicado();
        double gbEsc;
        bool pendente = !aplicado || Ajustes.ChromeEscondido(out gbEsc) || Ajustes.AutoInicio().Count > 0;
        corrigir.Text = pendente ? "Corrigir automaticamente" : "Ajustes já aplicados ✓";
        corrigir.Enabled = pendente;
        corrigir.BackColor = pendente ? Color.FromArgb(22, 128, 61) : Color.FromArgb(170, 190, 175);
        desfazer.Visible = aplicado;

        foreach (Achado a in achados)
        {
            Color cor = a.Nivel == 0 ? Color.FromArgb(220, 38, 38) : a.Nivel == 1 ? Color.FromArgb(217, 119, 6) : Color.FromArgb(22, 163, 74);
            Escrever("●  ", cor, true);
            Escrever(a.Titulo + "\n", Color.FromArgb(20, 20, 20), true);
            if (!string.IsNullOrEmpty(a.Texto)) Escrever(a.Texto + "\n", Color.FromArgb(80, 80, 85), false);
            Escrever("\n", Color.Black, false);
        }
        caixa.SelectionStart = 0; caixa.ScrollToCaret();
        AtualizarMonitor();
    }

    void AtualizarMonitor()
    {
        bool inst = Monitor.Instalado(), ativo = Monitor.Ativo();
        monitorar.Text = inst ? "Desinstalar" : "Instalar neste computador";
        monitorando.Text = inst ? "● Instalado: monitora sempre e abre sozinho com o Windows" + (ativo ? "" : " (começa a medir no próximo login)") + (Envio.Ligado ? " — enviando ao Painel do portal." : ".")
                         : ativo ? "● Monitorando este computador por alguns dias — pode fechar esta janela." : "";
    }

    void Escrever(string t, Color c, bool negrito)
    {
        caixa.SelectionStart = caixa.TextLength; caixa.SelectionLength = 0;
        caixa.SelectionColor = c;
        caixa.SelectionFont = new Font("Segoe UI", 10.5f, negrito ? FontStyle.Bold : FontStyle.Regular);
        caixa.SelectionIndent = negrito ? 0 : 26;
        caixa.AppendText(t);
    }

    void Elevar(string arg, string okMsg)
    {
        bool ok;
        if (arg == "/aplicar" && Ajustes.JaAplicado())
        {   // políticas já gravadas: só falta a parte do usuário, que não precisa de administrador
            Ajustes.LimparUsuario();
            MessageBox.Show("Pronto! O Chrome escondido foi encerrado e não abre mais sozinho com o Windows.", Text, MessageBoxButtons.OK, MessageBoxIcon.Information);
            Rodar(); return;
        }
        if (Ajustes.SouAdmin()) ok = arg == "/aplicar" ? Ajustes.Aplicar() : Ajustes.Desfazer();
        else
        {
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo(Application.ExecutablePath, arg) { Verb = "runas", UseShellExecute = true };
                Process p = Process.Start(psi); p.WaitForExit(); ok = p.ExitCode == 0;
            }
            catch (System.ComponentModel.Win32Exception)
            {
                MessageBox.Show("O Windows vai perguntar se permite que o app faça alterações: é preciso clicar em SIM.\n\n" +
                    "Se ele pedir uma senha de administrador, chame o responsável pelos computadores.", Text, MessageBoxButtons.OK, MessageBoxIcon.Information);
                return;
            }
        }
        if (ok && (arg == "/aplicar" || arg == "/instalar")) Ajustes.LimparUsuario();
        if (ok && arg == "/instalar") Monitor.IniciarInstalado();
        if (ok) MessageBox.Show(okMsg, Text, MessageBoxButtons.OK, MessageBoxIcon.Information);
        else MessageBox.Show("Não consegui gravar os ajustes. Chame o responsável pelos computadores.", Text, MessageBoxButtons.OK, MessageBoxIcon.Warning);
        Rodar();
    }

    string Relatorio() { return Relatorio(textoResumo, achados, exts); }

    public static string Relatorio(string textoResumo, List<Achado> achados, List<Diagnostico.Extensao> exts)
    {
        StringBuilder sb = new StringBuilder();
        sb.AppendLine("Otimizador do Chrome — " + Environment.MachineName + " (" + Environment.UserName + ") — " + DateTime.Now.ToString("dd/MM/yyyy HH:mm"));
        sb.AppendLine(textoResumo);
        foreach (Achado a in achados)
        {
            sb.AppendLine((a.Nivel == 0 ? "[PROBLEMA] " : a.Nivel == 1 ? "[ATENÇÃO] " : "[OK] ") + a.Titulo);
            if (!string.IsNullOrEmpty(a.Texto)) sb.AppendLine("   " + a.Texto.Replace("\n", "\n   "));
        }
        sb.AppendLine("Extensões ligadas:");
        foreach (var e in exts) sb.AppendLine("   - " + e.Nome + " (" + e.Perfil + ")" + (e.Pesada ? "  ← pesada" : ""));
        return sb.ToString();
    }
}
