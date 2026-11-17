// Monitoramento de travamentos: roda escondido (ícone perto do relógio) por alguns dias, anota a cada 30 s
// memória, processador, programas que mais gastam e janelas "Não respondendo"; o relatório junta tudo isso
// com os eventos do Windows (pouca memória, travamentos, desligamento forçado) para análise.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Diagnostics.Eventing.Reader;
using System.Drawing;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Management;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Win32;

static class Monitor
{
    public const int DIAS = 7, INTERVALO_S = 30;
    const string RUN = @"Software\Microsoft\Windows\CurrentVersion\Run", NOME_RUN = "OtimizadorPCMonitor";
    const string MUTEX = "OtimizadorPC_Monitor", PARAR = "OtimizadorPC_Parar";
    static readonly CultureInfo INV = CultureInfo.InvariantCulture;

    public static string Pasta { get { return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "OtimizadorPC"); } }
    static string PastaLog { get { return Path.Combine(Pasta, "monitor"); } }
    static string ArqFim { get { return Path.Combine(Pasta, "fim.txt"); } }

    // ------------------------------------------------ ligar / desligar
    public static bool Ativo()
    {
        Mutex t;
        if (Mutex.TryOpenExisting(MUTEX, out t)) { t.Dispose(); return true; }
        return false;
    }

    // ------------------------------------------------ instalação permanente (todos os usuários, inicia com o Windows)
    const string RUN_HKLM = @"SOFTWARE\Microsoft\Windows\CurrentVersion\Run";
    public static string PastaInstalacao { get { return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "OtimizadorPC"); } }
    public static string ExeInstalado { get { return Path.Combine(PastaInstalacao, "OtimizadorPC.exe"); } }

    public static bool Instalado()
    {
        try { using (RegistryKey k = Registry.LocalMachine.OpenSubKey(RUN_HKLM)) return k != null && k.GetValue(NOME_RUN) != null && File.Exists(ExeInstalado); }
        catch { return false; }
    }

    // parte que precisa de administrador (roda elevada): copia o app, inicia com o Windows para todos e aplica os ajustes
    public static bool Instalar()
    {
        try
        {
            Directory.CreateDirectory(PastaInstalacao);
            string origem = Path.GetFullPath(Application.ExecutablePath);
            if (!string.Equals(origem, Path.GetFullPath(ExeInstalado), StringComparison.OrdinalIgnoreCase))
            {
                // se uma versão antiga estiver rodando, pede para ela sair antes de trocar o arquivo
                try { using (EventWaitHandle e = new EventWaitHandle(false, EventResetMode.ManualReset, PARAR)) e.Set(); } catch { }
                // nome antigo (quando o app se chamava Otimizador do Chrome)
                try { using (RegistryKey k = Registry.LocalMachine.OpenSubKey(RUN_HKLM, true)) if (k != null) k.DeleteValue("OtimizadorChromeMonitor", false); } catch { }
                for (int i = 0; ; i++)
                {
                    try { File.Copy(origem, ExeInstalado, true); break; }
                    catch (IOException) { if (i >= 20) throw; Thread.Sleep(500); }
                }
            }
            using (RegistryKey k = Registry.LocalMachine.CreateSubKey(RUN_HKLM)) k.SetValue(NOME_RUN, "\"" + ExeInstalado + "\" /monitor");
            Ajustes.Aplicar();
            return true;
        }
        catch { return false; }
    }

    public static bool Desinstalar()
    {
        try
        {
            using (RegistryKey k = Registry.LocalMachine.OpenSubKey(RUN_HKLM, true)) if (k != null) k.DeleteValue(NOME_RUN, false);
            try { using (EventWaitHandle e = new EventWaitHandle(false, EventResetMode.ManualReset, PARAR)) e.Set(); } catch { }
            Thread.Sleep(3000);
            try { File.Delete(ExeInstalado); } catch { }
            return true;
        }
        catch { return false; }
    }

    // parte do usuário, depois de instalar: tira o monitor temporário antigo e liga o instalado nesta sessão
    public static void IniciarInstalado()
    {
        try { using (RegistryKey k = Registry.CurrentUser.OpenSubKey(RUN, true)) if (k != null) k.DeleteValue(NOME_RUN, false); } catch { }
        try { File.Delete(ArqFim); } catch { }
        for (int i = 0; i < 10 && Ativo(); i++) Thread.Sleep(500);   // espera a versão antiga sair
        try { using (EventWaitHandle e = new EventWaitHandle(false, EventResetMode.ManualReset, PARAR)) e.Reset(); } catch { }
        try { Process.Start(ExeInstalado, "/monitor"); } catch { }
    }

    public static DateTime? Fim()
    {
        if (Instalado()) return DateTime.MaxValue;   // instalado: monitora sempre
        try { return DateTime.ParseExact(File.ReadAllText(ArqFim).Trim(), "yyyy-MM-dd HH:mm", INV); } catch { return null; }
    }

    public static void Ligar()
    {
        Directory.CreateDirectory(PastaLog);
        string destino = Path.Combine(Pasta, "OtimizadorPC.exe");
        // copia o app para uma pasta fixa (se a pessoa apagar o Downloads, o monitor continua)
        if (!string.Equals(Path.GetFullPath(Application.ExecutablePath), Path.GetFullPath(destino), StringComparison.OrdinalIgnoreCase))
            try { File.Copy(Application.ExecutablePath, destino, true); } catch { if (!File.Exists(destino)) destino = Application.ExecutablePath; }
        File.WriteAllText(ArqFim, DateTime.Now.AddDays(DIAS).ToString("yyyy-MM-dd HH:mm", INV));
        using (RegistryKey k = Registry.CurrentUser.CreateSubKey(RUN)) k.SetValue(NOME_RUN, "\"" + destino + "\" /monitor");
        if (!Ativo()) Process.Start(destino, "/monitor");
    }

    // aviso na tela pedido pelo painel (vem de outra thread; o ícone mostra no próximo ciclo de 2 s)
    static string avisoTitulo, avisoTexto;
    public static void MostrarAviso(string titulo, string texto) { avisoTexto = texto; avisoTitulo = titulo; }

    public static void Desligar()
    {
        try { using (RegistryKey k = Registry.CurrentUser.OpenSubKey(RUN, true)) if (k != null) k.DeleteValue(NOME_RUN, false); } catch { }
        try { File.Delete(ArqFim); } catch { }
        try { using (EventWaitHandle e = new EventWaitHandle(false, EventResetMode.ManualReset, PARAR)) e.Set(); } catch { }
    }

    // ------------------------------------------------ o processo que fica rodando
    public static void Rodar()
    {
        bool novo;
        using (Mutex m = new Mutex(true, MUTEX, out novo))
        {
            if (!novo) return;
            using (EventWaitHandle parar = new EventWaitHandle(false, EventResetMode.ManualReset, PARAR))
            {
                parar.Reset();
                NotifyIcon icone = new NotifyIcon();
                try { icone.Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch { icone.Icon = SystemIcons.Information; }
                icone.Text = "Otimizador de PC";
                icone.Visible = true;
                ContextMenuStrip menu = new ContextMenuStrip();
                menu.Items.Add("Abrir o Otimizador de PC", null, delegate { try { Process.Start(Application.ExecutablePath); } catch { } });
                if (!Instalado()) menu.Items.Add("Parar o monitoramento", null, delegate { Desligar(); });
                icone.ContextMenuStrip = menu;
                icone.DoubleClick += delegate { try { Process.Start(Application.ExecutablePath); } catch { } };

                Amostrador a = new Amostrador();
                System.Windows.Forms.Timer t = new System.Windows.Forms.Timer { Interval = INTERVALO_S * 1000 };
                t.Tick += delegate
                {
                    DateTime? fim = Fim();
                    if (parar.WaitOne(0) || fim == null || DateTime.Now > fim.Value) { if (fim != null && DateTime.Now > fim.Value) Desligar(); icone.Visible = false; Application.ExitThread(); return; }
                    try { a.Amostra(); } catch { }
                };
                System.Windows.Forms.Timer rapido = new System.Windows.Forms.Timer { Interval = 2000 };
                rapido.Tick += delegate
                {
                    if (parar.WaitOne(0)) { icone.Visible = false; Application.ExitThread(); return; }
                    string tituloAviso = avisoTitulo;
                    if (tituloAviso != null) { avisoTitulo = null; try { icone.ShowBalloonTip(30000, tituloAviso, avisoTexto, ToolTipIcon.Warning); } catch { } }
                };
                Limpar();
                a.Amostra();
                // instalado: 2 min depois do login aplica as otimizações deste usuário (Chrome escondido, inicialização,
                // temporários, efeitos) e, no fim da tarde, lembra de reiniciar se o PC está ligado há 4+ dias
                bool otimizou = false; DateTime avisou = DateTime.MinValue; DateTime inicio = DateTime.Now;
                System.Windows.Forms.Timer extra = new System.Windows.Forms.Timer { Interval = 60000 };
                extra.Tick += delegate
                {
                    try
                    {
                        if (!otimizou && (DateTime.Now - inicio).TotalMinutes >= 2 && Instalado()) { otimizou = true; Ajustes.LimparUsuario(); }
                        double dias = Sistema.DiasLigado();
                        if (dias >= 4 && DateTime.Now.Hour >= 16 && avisou.Date != DateTime.Today)
                        {
                            avisou = DateTime.Now;
                            icone.ShowBalloonTip(20000, "Reinicie o computador hoje",
                                "Ele está ligado há " + (int)dias + " dias e isso deixa tudo lento. Ao terminar o dia, salve o que estiver aberto e use Iniciar > Energia > Reiniciar (ou Desligar).",
                                ToolTipIcon.Info);
                        }
                    }
                    catch { }
                };
                extra.Start();
                t.Start(); rapido.Start();
                Application.Run();
                icone.Visible = false; icone.Dispose();
            }
        }
    }

    static void Limpar()
    {
        try { foreach (string f in Directory.GetFiles(PastaLog, "*.log")) if (File.GetLastWriteTime(f) < DateTime.Now.AddDays(-15)) File.Delete(f); } catch { }
    }

    class Amostrador
    {
        Dictionary<int, TimeSpan> cpuAnt = new Dictionary<int, TimeSpan>();
        DateTime tAnt = DateTime.MinValue;
        long idleAnt, totAnt;

        [DllImport("kernel32.dll")] static extern bool GetSystemTimes(out long idle, out long kernel, out long user);
        delegate bool EnumProc(IntPtr h, IntPtr l);
        [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc f, IntPtr l);
        [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
        [DllImport("user32.dll")] static extern bool IsHungAppWindow(IntPtr h);
        [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);

        public void Amostra()
        {
            DateTime agora = DateTime.Now;
            long idle, kern, user; GetSystemTimes(out idle, out kern, out user);
            long tot = kern + user; int cpu = -1;
            if (totAnt > 0 && tot > totAnt) cpu = (int)Math.Round(100.0 * (1 - (double)(idle - idleAnt) / (tot - totAnt)));
            idleAnt = idle; totAnt = tot;

            double seg = tAnt == DateTime.MinValue ? 0 : (agora - tAnt).TotalSeconds; tAnt = agora;
            Dictionary<string, long> mem = new Dictionary<string, long>(StringComparer.OrdinalIgnoreCase);
            Dictionary<string, double> cpuP = new Dictionary<string, double>(StringComparer.OrdinalIgnoreCase);
            Dictionary<int, TimeSpan> cpuNovo = new Dictionary<int, TimeSpan>();
            long chrome = 0; int chromeN = 0;
            foreach (Process p in Process.GetProcesses())
            {
                try
                {
                    string n = p.ProcessName.Replace(":", "").Replace(",", "");
                    if (n == "Idle" || n == "System" || n == "Memory Compression" || n == "Registry") continue;
                    long b = p.PrivateMemorySize64; long x; mem.TryGetValue(n, out x); mem[n] = x + b;
                    if (n.Equals("chrome", StringComparison.OrdinalIgnoreCase)) { chrome += b; chromeN++; }
                    TimeSpan tp = p.TotalProcessorTime; cpuNovo[p.Id] = tp;
                    TimeSpan antes;
                    if (seg > 0 && cpuAnt.TryGetValue(p.Id, out antes))
                    {
                        double pc = (tp - antes).TotalSeconds / seg / Environment.ProcessorCount * 100;
                        double y; cpuP.TryGetValue(n, out y); cpuP[n] = y + pc;
                    }
                }
                catch { }
            }
            cpuAnt = cpuNovo;

            List<string> travadas = new List<string>();
            EnumWindows(delegate (IntPtr h, IntPtr l)
            {
                try
                {
                    if (IsWindowVisible(h) && IsHungAppWindow(h))
                    {
                        uint pid; GetWindowThreadProcessId(h, out pid);
                        string n = Process.GetProcessById((int)pid).ProcessName;
                        if (!travadas.Contains(n)) travadas.Add(n);
                    }
                }
                catch { }
                return true;
            }, IntPtr.Zero);

            ulong totalF, livreF, commitT, commitL; Memoria(out totalF, out livreF, out commitT, out commitL);
            int ram = (int)Math.Round(100.0 * (totalF - livreF) / totalF);
            int commit = commitT == 0 ? 0 : (int)Math.Round(100.0 * (commitT - commitL) / commitT);

            StringBuilder sb = new StringBuilder();
            sb.Append(agora.ToString("yyyy-MM-dd HH:mm:ss", INV));
            sb.Append("|ram=").Append(ram);
            sb.Append("|livre=").Append((livreF / 1073741824.0).ToString("0.00", INV));
            sb.Append("|commit=").Append(commit);
            sb.Append("|cpu=").Append(cpu);
            sb.Append("|chrome=").Append(chrome / 1048576).Append("/").Append(chromeN);
            sb.Append("|mem=").Append(string.Join(",", mem.OrderByDescending(k => k.Value).Take(8).Select(k => k.Key + ":" + (k.Value / 1048576)).ToArray()));
            sb.Append("|cpup=").Append(string.Join(",", cpuP.Where(k => k.Value >= 5).OrderByDescending(k => k.Value).Take(5).Select(k => k.Key + ":" + (int)k.Value).ToArray()));
            sb.Append("|travado=").Append(string.Join(",", travadas.ToArray()));
            Directory.CreateDirectory(PastaLog);
            File.AppendAllText(Path.Combine(PastaLog, agora.ToString("yyyy-MM-dd", INV) + ".log"), sb.ToString() + Environment.NewLine);
            Envio.Nova(sb.ToString());
        }
    }

    [StructLayout(LayoutKind.Sequential)]
    class MEMSTATUS
    {
        public uint dwLength = (uint)Marshal.SizeOf(typeof(MEMSTATUS));
        public uint dwMemoryLoad;
        public ulong ullTotalPhys, ullAvailPhys, ullTotalPageFile, ullAvailPageFile, ullTotalVirtual, ullAvailVirtual, ullAvailExtendedVirtual;
    }
    [DllImport("kernel32.dll")] static extern bool GlobalMemoryStatusEx([In, Out] MEMSTATUS m);
    static void Memoria(out ulong total, out ulong livre, out ulong commitTotal, out ulong commitLivre)
    {
        MEMSTATUS m = new MEMSTATUS(); GlobalMemoryStatusEx(m);
        total = m.ullTotalPhys; livre = m.ullAvailPhys; commitTotal = m.ullTotalPageFile; commitLivre = m.ullAvailPageFile;
    }

    // ------------------------------------------------ relatório para análise
    public class Amostra
    {
        public DateTime T; public int Ram, Commit, Cpu, ChromeMB, ChromeN; public double Livre;
        public List<KeyValuePair<string, int>> Mem = new List<KeyValuePair<string, int>>(), CpuP = new List<KeyValuePair<string, int>>();
        public string Travado = "";
    }

    static List<KeyValuePair<string, int>> Pares(string s)
    {
        List<KeyValuePair<string, int>> r = new List<KeyValuePair<string, int>>();
        if (string.IsNullOrEmpty(s)) return r;
        foreach (string p in s.Split(','))
        {
            int i = p.LastIndexOf(':'); int v;
            if (i > 0 && int.TryParse(p.Substring(i + 1), out v)) r.Add(new KeyValuePair<string, int>(p.Substring(0, i), v));
        }
        return r;
    }

    static List<Amostra> LerAmostras()
    {
        List<Amostra> r = new List<Amostra>();
        if (!Directory.Exists(PastaLog)) return r;
        foreach (string f in Directory.GetFiles(PastaLog, "*.log").OrderBy(x => x))
        {
            string[] linhas;
            try { using (FileStream fs = new FileStream(f, FileMode.Open, FileAccess.Read, FileShare.ReadWrite)) using (StreamReader sr = new StreamReader(fs)) linhas = sr.ReadToEnd().Split('\n'); }
            catch { continue; }
            foreach (string l0 in linhas)
            {
                string l = l0.Trim(); if (l.Length < 20) continue;
                try { r.Add(ParseLinha(l)); } catch { }
            }
        }
        return r;
    }

    public static Amostra ParseLinha(string l)
    {
        string[] c = l.Trim().Split('|');
        Amostra a = new Amostra { T = DateTime.ParseExact(c[0], "yyyy-MM-dd HH:mm:ss", INV) };
        for (int i = 1; i < c.Length; i++)
        {
            int eq = c[i].IndexOf('='); if (eq < 0) continue;
            string k = c[i].Substring(0, eq), v = c[i].Substring(eq + 1);
            if (k == "ram") a.Ram = int.Parse(v);
            else if (k == "livre") a.Livre = double.Parse(v, INV);
            else if (k == "commit") a.Commit = int.Parse(v);
            else if (k == "cpu") a.Cpu = int.Parse(v);
            else if (k == "chrome") { string[] x = v.Split('/'); a.ChromeMB = int.Parse(x[0]); a.ChromeN = int.Parse(x[1]); }
            else if (k == "mem") a.Mem = Pares(v);
            else if (k == "cpup") a.CpuP = Pares(v);
            else if (k == "travado") a.Travado = v;
        }
        return a;
    }

    static string Linha(IEnumerable<KeyValuePair<string, int>> l, string suf)
    {
        return string.Join(", ", l.Select(k => k.Key + " " + k.Value + suf).ToArray());
    }

    public static string Relatorio(string diagnostico)
    {
        StringBuilder sb = new StringBuilder();
        sb.AppendLine("===== RELATÓRIO PARA ANÁLISE DE TRAVAMENTOS =====");
        sb.AppendLine("Computador: " + Environment.MachineName + "   Usuário: " + Environment.UserName + "   Gerado em: " + DateTime.Now.ToString("dd/MM/yyyy HH:mm"));
        sb.AppendLine(Hardware());
        sb.AppendLine();
        sb.AppendLine("----- DIAGNÓSTICO DE AGORA -----");
        sb.AppendLine(diagnostico.TrimEnd());
        sb.AppendLine();

        List<Amostra> am = LerAmostras();
        sb.AppendLine("----- MONITORAMENTO -----");
        if (am.Count == 0) sb.AppendLine("Nenhum dado de monitoramento ainda (o botão \"Monitorar travamentos\" não foi ligado).");
        else
        {
            sb.AppendLine("Período: " + am[0].T.ToString("dd/MM HH:mm") + " até " + am[am.Count - 1].T.ToString("dd/MM HH:mm") + " — " + am.Count + " medições a cada " + INTERVALO_S + " s");
            sb.AppendLine("Memória em uso: média " + (int)am.Average(a => a.Ram) + "%, máxima " + am.Max(a => a.Ram) + "%.  Medições com 90% ou mais: " + am.Count(a => a.Ram >= 90) + " (" + (100 * am.Count(a => a.Ram >= 90) / am.Count) + "%)");
            sb.AppendLine("Memória comprometida (RAM + arquivo de paginação): média " + (int)am.Average(a => a.Commit) + "%, máxima " + am.Max(a => a.Commit) + "%");
            var cpus = am.Where(a => a.Cpu >= 0).ToList();
            if (cpus.Count > 0) sb.AppendLine("Processador: média " + (int)cpus.Average(a => a.Cpu) + "%, medições com 90% ou mais: " + cpus.Count(a => a.Cpu >= 90));
            sb.AppendLine("Chrome: média " + (int)am.Average(a => a.ChromeMB) + " MB, máximo " + am.Max(a => a.ChromeMB) + " MB, até " + am.Max(a => a.ChromeN) + " processos");
            sb.AppendLine();

            // média por programa (considerando só quando aparece no top 8)
            Dictionary<string, List<int>> porProg = new Dictionary<string, List<int>>(StringComparer.OrdinalIgnoreCase);
            foreach (Amostra a in am) foreach (var kv in a.Mem) { if (!porProg.ContainsKey(kv.Key)) porProg[kv.Key] = new List<int>(); porProg[kv.Key].Add(kv.Value); }
            sb.AppendLine("Programas que mais gastaram memória (média quando aberto / pico / % do tempo entre os maiores):");
            foreach (var kv in porProg.OrderByDescending(k => k.Value.Average() * k.Value.Count).Take(12))
                sb.AppendLine("   " + kv.Key.PadRight(28) + ((int)kv.Value.Average() + " MB").PadLeft(9) + ("pico " + kv.Value.Max() + " MB").PadLeft(16) + ("  " + (100 * kv.Value.Count / am.Count) + "%"));

            Dictionary<string, List<int>> cpuProg = new Dictionary<string, List<int>>(StringComparer.OrdinalIgnoreCase);
            foreach (Amostra a in am) foreach (var kv in a.CpuP) { if (!cpuProg.ContainsKey(kv.Key)) cpuProg[kv.Key] = new List<int>(); cpuProg[kv.Key].Add(kv.Value); }
            if (cpuProg.Count > 0)
            {
                sb.AppendLine("Programas que mais usaram o processador (vezes acima de 5% / média nessas vezes / pico):");
                foreach (var kv in cpuProg.OrderByDescending(k => k.Value.Sum()).Take(8))
                    sb.AppendLine("   " + kv.Key.PadRight(28) + (kv.Value.Count + "x").PadLeft(7) + ((int)kv.Value.Average() + "%").PadLeft(8) + ("pico " + kv.Value.Max() + "%").PadLeft(12));
            }
            sb.AppendLine();

            var trav = am.Where(a => a.Travado != "").ToList();
            sb.AppendLine("Janelas \"Não respondendo\": " + (trav.Count == 0 ? "nenhuma registrada" : ""));
            foreach (var a in trav.Take(40)) sb.AppendLine("   " + a.T.ToString("dd/MM HH:mm:ss") + "  " + a.Travado + "  (memória " + a.Ram + "%, CPU " + a.Cpu + "%)");

            sb.AppendLine("Pausas no monitoramento de 2 a 60 min (computador congelado OU em suspensão/bloqueado — cruzar com o horário de uso):");
            int pausas = 0;
            for (int i = 1; i < am.Count; i++)
            {
                double min = (am[i].T - am[i - 1].T).TotalMinutes;
                if (min >= 2 && min <= 60 && pausas++ < 30)
                    sb.AppendLine("   " + am[i - 1].T.ToString("dd/MM HH:mm") + " → " + am[i].T.ToString("HH:mm") + "  (" + (int)min + " min; antes: memória " + am[i - 1].Ram + "%, CPU " + am[i - 1].Cpu + "%)");
            }
            if (pausas == 0) sb.AppendLine("   nenhuma");
            sb.AppendLine();

            sb.AppendLine("Piores momentos (memória mais alta), com o que estava aberto:");
            foreach (Amostra a in am.OrderByDescending(x => x.Ram * 1000 + x.Commit).Take(12).OrderBy(x => x.T))
                sb.AppendLine("   " + a.T.ToString("dd/MM HH:mm") + "  mem " + a.Ram + "% (livre " + a.Livre.ToString("0.0") + " GB, comprom. " + a.Commit + "%), CPU " + a.Cpu + "%  →  " + Linha(a.Mem, " MB") + (a.CpuP.Count > 0 ? "   | CPU: " + Linha(a.CpuP, "%") : ""));
        }
        sb.AppendLine();

        sb.AppendLine("----- EVENTOS DO WINDOWS (últimos 7 dias) -----");
        sb.AppendLine(Eventos());
        sb.AppendLine("----- ABAS / SITES NO CHROME (sessão atual, aproximado) -----");
        sb.AppendLine(Abas());
        sb.AppendLine("----- PROGRAMAS QUE ABREM COM O WINDOWS -----");
        sb.AppendLine(Inicializacao());
        return sb.ToString();
    }

    // ------------------------------------------------ peças do relatório
    public static string TipoDisco()
    {
        try
        {
            List<string> r = new List<string>();
            using (ManagementObjectSearcher s = new ManagementObjectSearcher(@"root\Microsoft\Windows\Storage", "SELECT FriendlyName, MediaType, Size FROM MSFT_PhysicalDisk"))
                foreach (ManagementObject o in s.Get())
                {
                    int mt = Convert.ToInt32(o["MediaType"]);
                    string tipo = mt == 3 ? "HD mecânico" : mt == 4 ? "SSD" : mt == 5 ? "SCM" : "tipo não informado";
                    r.Add(o["FriendlyName"] + " (" + tipo + ", " + Math.Round(Convert.ToDouble(o["Size"]) / 1e9) + " GB)");
                }
            return string.Join("; ", r.ToArray());
        }
        catch { return "não identificado"; }
    }

    public static string Hardware()
    {
        StringBuilder sb = new StringBuilder();
        try
        {
            using (ManagementObjectSearcher s = new ManagementObjectSearcher("SELECT Name FROM Win32_Processor"))
                foreach (ManagementObject o in s.Get()) sb.Append("Processador: " + Convert.ToString(o["Name"]).Trim() + " (" + Environment.ProcessorCount + " núcleos lógicos)\n");
            using (ManagementObjectSearcher s = new ManagementObjectSearcher("SELECT Caption, BuildNumber FROM Win32_OperatingSystem"))
                foreach (ManagementObject o in s.Get()) sb.Append("Windows: " + o["Caption"] + " (build " + o["BuildNumber"] + ")\n");
            using (ManagementObjectSearcher s = new ManagementObjectSearcher("SELECT Capacity, Speed FROM Win32_PhysicalMemory"))
            {
                List<string> pentes = new List<string>();
                foreach (ManagementObject o in s.Get()) pentes.Add(Math.Round(Convert.ToDouble(o["Capacity"]) / 1073741824.0) + " GB" + (o["Speed"] != null ? " " + o["Speed"] + " MHz" : ""));
                sb.Append("Memória: " + Sistema.RamTotalGB().ToString("0.0") + " GB utilizáveis — pentes: " + string.Join(" + ", pentes.ToArray()) + "\n");
            }
            using (ManagementObjectSearcher s = new ManagementObjectSearcher("SELECT MemoryDevices FROM Win32_PhysicalMemoryArray"))
                foreach (ManagementObject o in s.Get()) sb.Append("Encaixes de memória na placa: " + o["MemoryDevices"] + "\n");
        }
        catch { }
        sb.Append("Disco: " + TipoDisco() + "\n");
        sb.Append("Ligado há: " + Sistema.DiasLigado().ToString("0.0") + " dias");
        return sb.ToString();
    }

    static string Eventos()
    {
        StringBuilder sb = new StringBuilder();
        Ler(sb, "System", "*[System[(EventID=2004) and TimeCreated[timediff(@SystemTime) <= 604800000]]]", "POUCA MEMÓRIA (Windows avisou)", 8, 700);
        Ler(sb, "System", "*[System[(EventID=41) and Provider[@Name='Microsoft-Windows-Kernel-Power'] and TimeCreated[timediff(@SystemTime) <= 604800000]]]", "DESLIGAMENTO FORÇADO (botão/queda de energia)", 10, 0);
        Ler(sb, "Application", "*[System[(EventID=1002) and Provider[@Name='Application Hang'] and TimeCreated[timediff(@SystemTime) <= 604800000]]]", "PROGRAMA TRAVOU (Não respondendo e foi fechado)", 15, 160);
        Ler(sb, "Application", "*[System[(EventID=1000) and Provider[@Name='Application Error'] and TimeCreated[timediff(@SystemTime) <= 604800000]]]", "PROGRAMA FECHOU SOZINHO (erro)", 10, 160);
        return sb.Length == 0 ? "Nenhum evento relevante.\n" : sb.ToString();
    }

    static void Ler(StringBuilder sb, string log, string xpath, string titulo, int max, int corte)
    {
        try
        {
            List<string> linhas = new List<string>();
            int total = 0;
            using (EventLogReader r = new EventLogReader(new EventLogQuery(log, PathType.LogName, xpath) { ReverseDirection = true }))
            {
                EventRecord e;
                while ((e = r.ReadEvent()) != null)
                {
                    using (e)
                    {
                        total++;
                        if (linhas.Count >= max) continue;
                        string msg = "";
                        if (corte > 0)
                        {
                            try { msg = e.FormatDescription() ?? ""; } catch { }
                            if (string.IsNullOrEmpty(msg) && e.Properties.Count > 0) msg = string.Join(" | ", e.Properties.Take(6).Select(p => Convert.ToString(p.Value)).ToArray());
                            msg = Regex.Replace(msg, @"\s+", " ").Trim();
                            if (msg.Length > corte) msg = msg.Substring(0, corte) + "…";
                        }
                        linhas.Add("   " + (e.TimeCreated.HasValue ? e.TimeCreated.Value.ToString("dd/MM HH:mm") : "") + (msg != "" ? "  " + msg : ""));
                    }
                }
            }
            if (total > 0) { sb.AppendLine(titulo + ": " + total + " vez(es)"); foreach (string l in linhas) sb.AppendLine(l); }
        }
        catch (Exception ex) { sb.AppendLine(titulo + ": não consegui ler (" + ex.Message + ")"); }
    }

    static string Abas()
    {
        try
        {
            string ud = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Google\Chrome\User Data");
            if (!Directory.Exists(ud)) return "Chrome não encontrado.\n";
            StringBuilder sb = new StringBuilder();
            foreach (string perfil in Directory.GetDirectories(ud))
            {
                string np = Path.GetFileName(perfil);
                if (np != "Default" && !np.StartsWith("Profile ")) continue;
                string ses = Path.Combine(perfil, "Sessions");
                if (!Directory.Exists(ses)) continue;
                string arq = Directory.GetFiles(ses, "Session_*").OrderByDescending(f => File.GetLastWriteTime(f)).FirstOrDefault();
                if (arq == null || File.GetLastWriteTime(arq) < DateTime.Now.AddDays(-3)) continue; // perfil sem uso recente
                byte[] b;
                using (FileStream fs = new FileStream(arq, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete)) { b = new byte[fs.Length]; fs.Read(b, 0, b.Length); }
                string txt = Encoding.GetEncoding(28591).GetString(b);
                Dictionary<string, HashSet<string>> sites = new Dictionary<string, HashSet<string>>();
                foreach (Match m in Regex.Matches(txt, @"https?://([a-zA-Z0-9.\-]+)[^\x00-\x20""]*"))
                {
                    string host = m.Groups[1].Value.ToLowerInvariant();
                    if (host.StartsWith("www.")) host = host.Substring(4);
                    if (!sites.ContainsKey(host)) sites[host] = new HashSet<string>();
                    sites[host].Add(m.Value.Length > 120 ? m.Value.Substring(0, 120) : m.Value);
                }
                sb.AppendLine("Perfil " + np + " (" + File.GetLastWriteTime(arq).ToString("dd/MM HH:mm") + "):");
                foreach (var kv in sites.OrderByDescending(k => k.Value.Count).Take(20))
                    sb.AppendLine("   " + kv.Key + " — " + kv.Value.Count + " página(s)");
            }
            return sb.Length == 0 ? "Nenhuma sessão encontrada.\n" : sb.ToString();
        }
        catch (Exception ex) { return "não consegui ler (" + ex.Message + ")\n"; }
    }

    static string Inicializacao()
    {
        StringBuilder sb = new StringBuilder();
        foreach (Otimizacoes.ItemInicio i in Otimizacoes.Inicializacao())
        {
            string v = i.Comando ?? "";
            sb.AppendLine("   " + (i.Desligado ? "[desligado] " : i.Dispensavel ? "[DISPENSÁVEL] " : "") + i.Nome + " (" + i.Onde.Split('|')[0] + ")  →  " + (v.Length > 100 ? v.Substring(0, 100) + "…" : v));
        }
        try
        {
            string pasta = Environment.GetFolderPath(Environment.SpecialFolder.Startup);
            foreach (string f in Directory.GetFiles(pasta)) if (!f.EndsWith(".ini")) sb.AppendLine("   (pasta Inicializar) " + Path.GetFileName(f));
        }
        catch { }
        return sb.Length == 0 ? "   nenhum\n" : sb.ToString();
    }
}
