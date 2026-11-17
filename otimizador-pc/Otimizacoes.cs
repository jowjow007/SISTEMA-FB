// Otimizações do Windows (além do Chrome/Edge, que ficam em Ajustes): tudo seguro e reversível ("Desfazer ajustes").
//  - Programas que abrem com o Windows: desliga o início automático dos dispensáveis do jeito do Gerenciador de
//    Tarefas (StartupApproved) — nada é desinstalado; certificado digital, Drive, OneDrive, WhatsApp, AnyDesk etc. nunca.
//  - Arquivos temporários: apaga os com mais de 2 dias da pasta Temp do usuário e do Windows.
//  - Inicialização rápida do Windows desligada: assim "Desligar" também limpa a memória (antes só "Reiniciar" limpava).
//  - Efeitos visuais: sem transparência e sem animações (pesam em PC de 8 GB).
// Parte do sistema (HKLM, Windows\Temp, inicialização rápida) precisa de administrador; a do usuário (HKCU, Temp do
// usuário, efeitos) roda na conta de quem usa — e, com o app instalado, roda sozinha a cada login.
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using Microsoft.Win32;

static class Otimizacoes
{
    const string RUN = @"SOFTWARE\Microsoft\Windows\CurrentVersion\Run";
    const string RUN32 = @"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Run";
    const string APROV = @"SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\";
    const string MEU = @"SOFTWARE\OtimizadorPC";
    const string POWER = @"SYSTEM\CurrentControlSet\Control\Session Manager\Power";

    // nunca mexer (vale mais que a lista de dispensáveis)
    static readonly string[] Nunca = { "valid", "safenet", "aetcrss", "certisign", "serasa", "soluti", "token", "pje", "assinador", "shodo",
        "securityhealth", "windowsdefender", "googledrivefs", "google drive", "onedrive", "whatsapp", "anydesk", "teamviewer", "realtek",
        "intel", "nvidia", "amd", "synaptics", "elan", "dell", "lenovo", "hp ", "bluetooth", "otimizadorpc", "portalfb", "astrea",
        "warsaw", "gbplugin", "topaz", "diebold", "sicoob", "sicredi", "itau", "bradesco", "santander", "caixa", "banco" };   // módulos de segurança de banco
    // dispensáveis no escritório (abrem sozinhos e ficam gastando memória; continuam funcionando se abertos à mão)
    static readonly string[] Dispensaveis = { "teams", "webex", "ciscomeeting", "adobecollabsync", "acrobat synchronizer", "reader synchronizer",
        "adobegcinvoker", "creative cloud", "ccxprocess", "adobe updater", "spotify", "discord", "steam", "epicgames", "epic games", "skype",
        "jusched", "sunjavaupdatesched", "java update", "itunes", "ccleaner", "utorrent", "bittorrent", "zoom", "googlechromeautolaunch",
        "microsoftedgeautolaunch", "msedge", "cortana", "lightshot", "ms-teams", "msteams" };

    public class ItemInicio { public string Nome, Comando, Onde; public bool Desligado, Dispensavel; }

    // ------------------------------------------------ programas que abrem com o Windows
    public static List<ItemInicio> Inicializacao()
    {
        List<ItemInicio> r = new List<ItemInicio>();
        Ler(r, Registry.CurrentUser, RUN, "Run", "usuário");
        Ler(r, Registry.LocalMachine, RUN, "Run", "todos");
        Ler(r, Registry.LocalMachine, RUN32, "Run32", "todos");
        return r;
    }

    static void Ler(List<ItemInicio> r, RegistryKey raiz, string sub, string aprov, string onde)
    {
        try
        {
            using (RegistryKey k = raiz.OpenSubKey(sub))
            using (RegistryKey a = raiz.OpenSubKey(APROV + aprov))
            {
                if (k == null) return;
                foreach (string n in k.GetValueNames())
                {
                    if (n == "") continue;
                    string cmd = Convert.ToString(k.GetValue(n));
                    byte[] b = a == null ? null : a.GetValue(n) as byte[];
                    string low = (n + " " + cmd).ToLowerInvariant();
                    bool nunca = Nunca.Any(x => low.Contains(x));
                    r.Add(new ItemInicio
                    {
                        Nome = n, Comando = cmd, Onde = onde + "|" + aprov,
                        Desligado = b != null && b.Length > 0 && (b[0] & 1) == 1,
                        Dispensavel = !nunca && Dispensaveis.Any(x => low.Contains(x))
                    });
                }
            }
        }
        catch { }
    }

    // desliga (ou religa) o início automático; devolve quantos mudou
    static int Marcar(RegistryKey raiz, string aprov, IEnumerable<string> nomes, bool desligar)
    {
        int n = 0;
        try
        {
            using (RegistryKey a = raiz.CreateSubKey(APROV + aprov))
                foreach (string nome in nomes)
                {
                    byte[] b = new byte[12];
                    b[0] = (byte)(desligar ? 3 : 2);
                    if (desligar) BitConverter.GetBytes(DateTime.UtcNow.ToFileTimeUtc()).CopyTo(b, 4);
                    a.SetValue(nome, b, RegistryValueKind.Binary);
                    n++;
                }
        }
        catch { }
        return n;
    }

    // lembra o que este app desligou, para o "Desfazer" religar só isso
    static void Anotar(RegistryKey raiz, string aprov, IEnumerable<string> nomes)
    {
        try { using (RegistryKey k = raiz.CreateSubKey(MEU + @"\Desligados\" + aprov)) foreach (string n in nomes) k.SetValue(n, 1, RegistryValueKind.DWord); } catch { }
    }
    static int Religar(RegistryKey raiz, string aprov)
    {
        try
        {
            string[] nomes;
            using (RegistryKey k = raiz.OpenSubKey(MEU + @"\Desligados\" + aprov)) { if (k == null) return 0; nomes = k.GetValueNames(); }
            int n = Marcar(raiz, aprov, nomes, false);
            raiz.DeleteSubKeyTree(MEU + @"\Desligados\" + aprov, false);
            return n;
        }
        catch { return 0; }
    }

    // ------------------------------------------------ temporários
    public static long TamanhoTemp(string pasta)
    {
        long t = 0; int n = 0;
        try
        {
            foreach (string f in Directory.EnumerateFiles(pasta, "*", SearchOption.AllDirectories))
            {
                try { t += new FileInfo(f).Length; } catch { }
                if (++n > 200000) break;
            }
        }
        catch { }
        return t;
    }

    public static long LimparTemp(string pasta)
    {
        long liberado = 0;
        DateTime limite = DateTime.Now.AddDays(-2);
        try
        {
            foreach (string f in Directory.EnumerateFiles(pasta, "*", SearchOption.AllDirectories).ToList())
            {
                try
                {
                    FileInfo fi = new FileInfo(f);
                    if (fi.LastWriteTime > limite) continue;
                    long tam = fi.Length;
                    fi.Attributes = FileAttributes.Normal;
                    fi.Delete(); liberado += tam;
                }
                catch { }   // em uso: fica
            }
            foreach (string d in Directory.GetDirectories(pasta, "*", SearchOption.AllDirectories).OrderByDescending(x => x.Length))
                try { if (!Directory.EnumerateFileSystemEntries(d).Any() && Directory.GetLastWriteTime(d) < limite) Directory.Delete(d); } catch { }
        }
        catch { }
        return liberado;
    }

    // ------------------------------------------------ inicialização rápida
    public static bool InicializacaoRapidaLigada()
    {
        try { using (RegistryKey k = Registry.LocalMachine.OpenSubKey(POWER)) { object v = k == null ? null : k.GetValue("HiberbootEnabled"); return !(v is int) || (int)v != 0; } }
        catch { return false; }
    }

    // ------------------------------------------------ efeitos visuais (do usuário)
    [DllImport("user32.dll")] static extern bool SystemParametersInfo(uint acao, uint p, IntPtr pv, uint f);
    const uint SPI_SETCLIENTAREAANIMATION = 0x1043, SPIF_UPDATE = 0x3;

    public static bool EfeitosLigados()
    {
        try
        {
            using (RegistryKey k = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize"))
            { object v = k == null ? null : k.GetValue("EnableTransparency"); if (!(v is int) || (int)v != 0) return true; }
            using (RegistryKey k = Registry.CurrentUser.OpenSubKey(@"Control Panel\Desktop\WindowMetrics"))
            { object v = k == null ? null : k.GetValue("MinAnimate"); if (Convert.ToString(v) != "0") return true; }
            return false;
        }
        catch { return false; }
    }

    static void Efeitos(bool ligar)
    {
        try { using (RegistryKey k = Registry.CurrentUser.CreateSubKey(@"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize")) k.SetValue("EnableTransparency", ligar ? 1 : 0, RegistryValueKind.DWord); } catch { }
        try { using (RegistryKey k = Registry.CurrentUser.CreateSubKey(@"Control Panel\Desktop\WindowMetrics")) k.SetValue("MinAnimate", ligar ? "1" : "0", RegistryValueKind.String); } catch { }
        try { using (RegistryKey k = Registry.CurrentUser.CreateSubKey(@"Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced")) k.SetValue("TaskbarAnimations", ligar ? 1 : 0, RegistryValueKind.DWord); } catch { }
        try { SystemParametersInfo(SPI_SETCLIENTAREAANIMATION, 0, ligar ? new IntPtr(1) : IntPtr.Zero, SPIF_UPDATE); } catch { }
    }

    // ------------------------------------------------ aplicar / desfazer
    // administrador: o que vale para o computador todo
    public static void AplicarSistema()
    {
        foreach (string aprov in new[] { "Run", "Run32" })
        {
            List<string> nomes = Inicializacao().Where(i => i.Onde == "todos|" + aprov && i.Dispensavel && !i.Desligado).Select(i => i.Nome).ToList();
            if (nomes.Count == 0) continue;
            Anotar(Registry.LocalMachine, aprov, nomes);
            Marcar(Registry.LocalMachine, aprov, nomes, true);
        }
        try { using (RegistryKey k = Registry.LocalMachine.CreateSubKey(POWER)) k.SetValue("HiberbootEnabled", 0, RegistryValueKind.DWord); } catch { }
        LimparTemp(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Windows), "Temp"));
        try { using (RegistryKey k = Registry.LocalMachine.CreateSubKey(MEU)) k.SetValue("Aplicado", DateTime.Now.ToString("yyyy-MM-dd HH:mm")); } catch { }
    }

    public static void DesfazerSistema()
    {
        Religar(Registry.LocalMachine, "Run");
        Religar(Registry.LocalMachine, "Run32");
        try { using (RegistryKey k = Registry.LocalMachine.CreateSubKey(POWER)) k.SetValue("HiberbootEnabled", 1, RegistryValueKind.DWord); } catch { }
        try { Registry.LocalMachine.DeleteSubKeyTree(MEU, false); } catch { }
    }

    // usuário: devolve quanto liberou de temporários (bytes)
    public static long AplicarUsuario()
    {
        List<string> nomes = Inicializacao().Where(i => i.Onde == "usuário|Run" && i.Dispensavel && !i.Desligado).Select(i => i.Nome).ToList();
        if (nomes.Count > 0) { Anotar(Registry.CurrentUser, "Run", nomes); Marcar(Registry.CurrentUser, "Run", nomes, true); }
        if (EfeitosLigados()) Efeitos(false);
        try { using (RegistryKey k = Registry.CurrentUser.CreateSubKey(MEU)) k.SetValue("Aplicado", DateTime.Now.ToString("yyyy-MM-dd HH:mm")); } catch { }
        return LimparTemp(Path.GetTempPath());
    }

    public static void DesfazerUsuario()
    {
        Religar(Registry.CurrentUser, "Run");
        Efeitos(true);
        try { Registry.CurrentUser.DeleteSubKeyTree(MEU, false); } catch { }
    }

    public static bool UsuarioAplicado()
    {
        try { using (RegistryKey k = Registry.CurrentUser.OpenSubKey(MEU)) return k != null && k.GetValue("Aplicado") != null; } catch { return false; }
    }
}
