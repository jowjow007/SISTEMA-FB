// Portal FB para Windows — abre o Portal Fonseca e Braga numa janela própria, sem barra de navegador.
// Usa o motor do Edge que já vem no Windows (WebView2). Um único .exe: as bibliotecas da Microsoft vão embutidas.
// Primeira execução (fora da pasta de instalação): instala em %LOCALAPPDATA%\PortalFB, cria atalhos no menu
// Iniciar e na área de trabalho e registra em "Aplicativos instalados" (desinstala por lá).
// Compilar: app-windows/compilar.ps1
using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Runtime.InteropServices;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Net;
using System.Security.Cryptography;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Win32;

[assembly: AssemblyTitle("Portal FB")]
[assembly: AssemblyProduct("Portal Fonseca e Braga")]
[assembly: AssemblyCompany("Fonseca e Braga")]
[assembly: AssemblyVersion("214.0.0.0")]   // VERSAO_PORTAL
[assembly: AssemblyFileVersion("214.0.0.0")]   // VERSAO_PORTAL

namespace PortalFB
{
    static class Programa
    {
#if TESTE
        // só para o teste automático da atualização (tests/app-windows/): pasta, servidor e registro separados
        public const string PORTAL = "http://127.0.0.1:8770/";
        public const string HOST = "127.0.0.1";
        public static readonly string Pasta = Path.Combine(Path.GetTempPath(), "PortalFBTeste");
        public const string CHAVE = @"Software\Microsoft\Windows\CurrentVersion\Uninstall\PortalFBTeste";
#else
        public const string PORTAL = "https://portal.fonsecaebraga.com.br/";
        public const string HOST = "portal.fonsecaebraga.com.br";
        public static readonly string Pasta = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "PortalFB");
        public const string CHAVE = @"Software\Microsoft\Windows\CurrentVersion\Uninstall\PortalFB";
#endif
        public const string NOME = "Portal FB";
        public const string VERSAO = "214";   // VERSAO_PORTAL (publicar.ps1)
        public static readonly string ExeInstalado = Path.Combine(Pasta, "PortalFB.exe");

        [STAThread]
        static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            AppDomain.CurrentDomain.AssemblyResolve += ResolverBiblioteca;
            try
            {
                if (args.Length > 0 && args[0] == "--desinstalar") { Desinstalar(); return; }
                string eu = Assembly.GetExecutingAssembly().Location;
                if (!string.Equals(Path.GetFullPath(eu), Path.GetFullPath(ExeInstalado), StringComparison.OrdinalIgnoreCase))
                {
                    string modo = args.Length > 0 ? args[0] : "";
                    Instalar(eu, modo == "--atualizar" || modo == "--atualizar-silencioso", modo == "--atualizar");
                    return;
                }
                // atualização baixada e ainda não aplicada (o computador foi desligado com o app aberto): aplica agora
                if (AplicarPendente(true)) return;
                Iniciar();
            }
            catch (Exception ex)
            {
                Aviso.Mostrar("Não foi possível abrir o Portal FB", ex.Message, "Fechar", null);
            }
        }

        // as bibliotecas do WebView2 vêm embutidas no .exe
        // Elas são gravadas em %LOCALAPPDATA%\PortalFB\bin e carregadas DE LÁ, do jeito normal. Carregar direto da
        // memória (Assembly.Load de bytes) fazia o Windows Defender bloquear o app ("Contebrew.A!ml", 08/11/2026).
        static Assembly ResolverBiblioteca(object s, ResolveEventArgs e)
        {
            string nome = new AssemblyName(e.Name).Name + ".dll";
            using (Stream st = Assembly.GetExecutingAssembly().GetManifestResourceStream(nome))
            {
                if (st == null) return null;
                byte[] b = new byte[st.Length];
                st.Read(b, 0, b.Length);
                string bin = Path.Combine(Pasta, "bin");
                Directory.CreateDirectory(bin);
                string destino = Path.Combine(bin, nome);
                if (!File.Exists(destino) || new FileInfo(destino).Length != b.Length) File.WriteAllBytes(destino, b);
                return Assembly.LoadFrom(destino);
            }
        }

        static void ExtrairLoader()
        {
            string bin = Path.Combine(Pasta, "bin");
            Directory.CreateDirectory(bin);
            string destino = Path.Combine(bin, "WebView2Loader.dll");
            using (Stream st = Assembly.GetExecutingAssembly().GetManifestResourceStream("WebView2Loader.dll"))
            {
                byte[] b = new byte[st.Length];
                st.Read(b, 0, b.Length);
                if (!File.Exists(destino) || new FileInfo(destino).Length != b.Length) File.WriteAllBytes(destino, b);
            }
        }

        [MethodImpl(MethodImplOptions.NoInlining)]
        static void Iniciar()
        {
            ExtrairLoader();
            Microsoft.Web.WebView2.Core.CoreWebView2Environment.SetLoaderDllFolderPath(Path.Combine(Pasta, "bin"));
            string versao = null;
            try { versao = Microsoft.Web.WebView2.Core.CoreWebView2Environment.GetAvailableBrowserVersionString(); } catch { }
            if (string.IsNullOrEmpty(versao))
            {
                if (Aviso.Mostrar("Falta um componente do Windows",
                    "Este computador não tem o Microsoft Edge WebView2, que o Portal FB usa. Abra a página oficial da Microsoft, instale e abra o Portal FB de novo.",
                    "Abrir a página da Microsoft", "Agora não"))
                    AbrirFora("https://go.microsoft.com/fwlink/p/?LinkId=2124703");
                return;
            }
            Application.Run(new Janela(PORTAL, true));
        }

        public static void AbrirFora(string url)
        {
            try { Process.Start(new ProcessStartInfo(url) { UseShellExecute = true }); } catch { }
        }

        // ---------- atualização automática (silenciosa) ----------
        // O portal publica baixar/versao.json ({"versao": 209, "sha256": "..."}) junto com o .exe. Enquanto o app está
        // aberto, ele baixa a versão nova em segundo plano e confere o SHA-256; ao FECHAR o app, a versão nova se
        // instala sozinha (sem perguntar nada). Se o computador for desligado antes, ela é aplicada ao abrir.
        // O download é feito pelo próprio app (não pelo navegador), então não passa pelo aviso do SmartScreen.
        static readonly string PastaAtualizacao = Path.Combine(Pasta, "atualizacao");
        static readonly string ArqPendente = Path.Combine(PastaAtualizacao, "PortalFB.exe");
        static readonly string ArqInfo = Path.Combine(PastaAtualizacao, "pendente.txt");   // "versao;sha256"

        static string Sha256(string arq)
        {
            using (var sha = SHA256.Create()) using (var st = File.OpenRead(arq))
                return BitConverter.ToString(sha.ComputeHash(st)).Replace("-", "").ToLowerInvariant();
        }

        // true se havia atualização válida e o instalador foi disparado (o app atual deve sair)
        public static bool AplicarPendente(bool reabrir)
        {
            try
            {
                if (!File.Exists(ArqInfo) || !File.Exists(ArqPendente))
                {
                    // sobra de uma atualização já aplicada
                    if (!File.Exists(ArqInfo) && File.Exists(ArqPendente)) { try { Directory.Delete(PastaAtualizacao, true); } catch { } }
                    return false;
                }
                string[] info = File.ReadAllText(ArqInfo).Trim().Split(';');
                int nova, minha;
                if (info.Length < 2 || !int.TryParse(info[0], out nova) || !int.TryParse(VERSAO, out minha) || nova <= minha || Sha256(ArqPendente) != info[1])
                {
                    try { Directory.Delete(PastaAtualizacao, true); } catch { }   // já aplicada, antiga ou corrompida
                    return false;
                }
                File.Delete(ArqInfo);   // aplica uma vez só
                Process.Start(new ProcessStartInfo(ArqPendente, reabrir ? "--atualizar" : "--atualizar-silencioso") { UseShellExecute = true });
                return true;
            }
            catch { return false; }
        }

        public static void VerificarAtualizacao()
        {
            ThreadPool.QueueUserWorkItem(delegate
            {
                try
                {
                    ServicePointManager.SecurityProtocol |= SecurityProtocolType.Tls12;
                    string json;
                    using (var wc = new WebClient())
                    {
                        wc.CachePolicy = new System.Net.Cache.RequestCachePolicy(System.Net.Cache.RequestCacheLevel.NoCacheNoStore);
                        json = wc.DownloadString(PORTAL + "baixar/versao.json?t=" + DateTime.UtcNow.Ticks);
                    }
                    Match mv = Regex.Match(json, "\"versao\"\\s*:\\s*(\\d+)"), mh = Regex.Match(json, "\"sha256\"\\s*:\\s*\"([0-9a-fA-F]{64})\"");
                    int nova, minha;
                    if (!mv.Success || !mh.Success || !int.TryParse(mv.Groups[1].Value, out nova) || !int.TryParse(VERSAO, out minha) || nova <= minha) return;
                    string sha = mh.Groups[1].Value.ToLowerInvariant();
                    if (File.Exists(ArqInfo) && File.ReadAllText(ArqInfo).Trim() == nova + ";" + sha) return;   // já baixada
                    Directory.CreateDirectory(PastaAtualizacao);
                    string tmp = ArqPendente + ".baixando";
                    using (var wc = new WebClient())
                    {
                        wc.CachePolicy = new System.Net.Cache.RequestCachePolicy(System.Net.Cache.RequestCacheLevel.NoCacheNoStore);
                        wc.DownloadFile(PORTAL + "baixar/PortalFB.exe?v=" + nova, tmp);
                    }
                    if (Sha256(tmp) != sha) { File.Delete(tmp); return; }   // arquivo corrompido ou trocado: não instala
                    if (File.Exists(ArqPendente)) File.Delete(ArqPendente);
                    File.Move(tmp, ArqPendente);
                    File.WriteAllText(ArqInfo, nova + ";" + sha);
                }
                catch { }   // sem internet ou portal fora do ar: tenta de novo mais tarde
            });
        }

        // ---------- instalação ----------
        static void Instalar(string origem, bool atualizando, bool reabrir)
        {
            Directory.CreateDirectory(Pasta);
            // se o app estiver aberto, fecha antes de trocar o arquivo
            foreach (Process p in Process.GetProcessesByName("PortalFB"))
            {
                try { if (p.Id != Process.GetCurrentProcess().Id && string.Equals(p.MainModule.FileName, ExeInstalado, StringComparison.OrdinalIgnoreCase)) { p.CloseMainWindow(); p.WaitForExit(4000); } } catch { }
            }
            // o app antigo pode levar alguns segundos para soltar o arquivo
            for (int i = 0; ; i++)
            {
                try { File.Copy(origem, ExeInstalado, true); break; }
                catch (IOException) { if (i >= 30) throw; Thread.Sleep(500); }
                catch (UnauthorizedAccessException) { if (i >= 30) throw; Thread.Sleep(500); }
            }
            CriarAtalho(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Programs), NOME + ".lnk"));
            CriarAtalho(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory), NOME + ".lnk"));
            using (RegistryKey k = Registry.CurrentUser.CreateSubKey(CHAVE))
            {
                k.SetValue("DisplayName", "Portal Fonseca e Braga");
                k.SetValue("DisplayVersion", "v" + VERSAO);
                k.SetValue("Publisher", "Fonseca e Braga");
                k.SetValue("DisplayIcon", ExeInstalado);
                k.SetValue("InstallLocation", Pasta);
                k.SetValue("UninstallString", "\"" + ExeInstalado + "\" --desinstalar");
                k.SetValue("NoModify", 1, RegistryValueKind.DWord);
                k.SetValue("NoRepair", 1, RegistryValueKind.DWord);
                k.SetValue("EstimatedSize", (int)(new FileInfo(ExeInstalado).Length / 1024), RegistryValueKind.DWord);
            }
            if (atualizando) { if (reabrir) Process.Start(new ProcessStartInfo(ExeInstalado) { UseShellExecute = true }); return; }
#if TESTE
            Process.Start(new ProcessStartInfo(ExeInstalado) { UseShellExecute = true }); return;
#endif
            if (Aviso.Mostrar("Portal FB instalado",
                "O atalho \"Portal FB\" está na área de trabalho e no menu Iniciar. O app abre o portal do escritório numa janela própria e atualiza sozinho.",
                "Abrir o Portal", "Fechar"))
                Process.Start(new ProcessStartInfo(ExeInstalado) { UseShellExecute = true });
        }

        static void CriarAtalho(string caminho)
        {
#if TESTE
            return;
#endif
            try
            {
                Type t = Type.GetTypeFromProgID("WScript.Shell");
                object shell = Activator.CreateInstance(t);
                object lnk = t.InvokeMember("CreateShortcut", BindingFlags.InvokeMethod, null, shell, new object[] { caminho });
                Type tl = lnk.GetType();
                tl.InvokeMember("TargetPath", BindingFlags.SetProperty, null, lnk, new object[] { ExeInstalado });
                tl.InvokeMember("WorkingDirectory", BindingFlags.SetProperty, null, lnk, new object[] { Pasta });
                tl.InvokeMember("IconLocation", BindingFlags.SetProperty, null, lnk, new object[] { ExeInstalado + ",0" });
                tl.InvokeMember("Description", BindingFlags.SetProperty, null, lnk, new object[] { "Portal Fonseca e Braga" });
                tl.InvokeMember("Save", BindingFlags.InvokeMethod, null, lnk, null);
            }
            catch { }
        }

        static void Desinstalar()
        {
            if (!Aviso.Mostrar("Desinstalar o Portal FB?",
                "O app sai deste computador, junto com os dados guardados para uso sem internet. Nada muda no portal, que continua no navegador.",
                "Desinstalar", "Cancelar")) return;
            foreach (string atalho in new string[] {
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Programs), NOME + ".lnk"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory), NOME + ".lnk") })
            {
                try { if (File.Exists(atalho)) File.Delete(atalho); } catch { }
            }
            try { Registry.CurrentUser.DeleteSubKeyTree(CHAVE, false); } catch { }
            // a pasta (com o próprio .exe) é apagada logo depois que este processo terminar
            Process.Start(new ProcessStartInfo("cmd.exe", "/c timeout /t 3 /nobreak >nul & rmdir /s /q \"" + Pasta + "\"")
                { CreateNoWindow = true, UseShellExecute = false, WindowStyle = ProcessWindowStyle.Hidden });
            Aviso.Mostrar("Portal FB desinstalado", "Para instalar de novo, baixe o app em portal.fonsecaebraga.com.br/baixar/PortalFB.exe.", "Fechar", null);
        }
    }

    // ---------- tela de aviso com a logo (instalação, desinstalação, erros) ----------
    class Aviso : Form
    {
        static readonly Color Fundo = Color.FromArgb(22, 16, 16), Painel = Color.FromArgb(33, 25, 24),
            Texto = Color.FromArgb(236, 230, 225), Suave = Color.FromArgb(176, 166, 161), Vinho = Color.FromArgb(184, 54, 46);

        [DllImport("dwmapi.dll")] static extern int DwmSetWindowAttribute(IntPtr h, int attr, ref int valor, int tamanho);

        // true = botão principal
        public static bool Mostrar(string titulo, string texto, string principal, string secundario)
        {
            using (var f = new Aviso(titulo, texto, principal, secundario)) return f.ShowDialog() == DialogResult.OK;
        }

        Aviso(string titulo, string texto, string principal, string secundario)
        {
            Text = Programa.NOME;
            try { Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch { }
            FormBorderStyle = FormBorderStyle.FixedSingle;
            MaximizeBox = false; MinimizeBox = false;
            StartPosition = FormStartPosition.CenterScreen;
            BackColor = Fundo; ForeColor = Texto;
            Font = new Font("Segoe UI", 10f);
            AutoScaleMode = AutoScaleMode.Dpi;
            ClientSize = new Size(520, 300);
            ShowInTaskbar = true;
            TopMost = true;

            var logo = new PictureBox { SizeMode = PictureBoxSizeMode.Zoom, Location = new Point(32, 28), Size = new Size(250, 58), BackColor = Color.Transparent };
            using (Stream st = Assembly.GetExecutingAssembly().GetManifestResourceStream("logo.png"))
                if (st != null) logo.Image = Image.FromStream(st);
            var linha = new Panel { Location = new Point(32, 102), Size = new Size(456, 1), BackColor = Color.FromArgb(70, 236, 230, 225) };
            var lt = new Label { Text = titulo, Location = new Point(30, 118), Size = new Size(460, 32), Font = new Font("Segoe UI Semibold", 14f), ForeColor = Texto };
            var lx = new Label { Text = texto, Location = new Point(32, 154), Size = new Size(456, 70), ForeColor = Suave };
            Controls.AddRange(new Control[] { logo, linha, lt, lx });

            var ok = Botao(principal, true);
            ok.DialogResult = DialogResult.OK;
            AcceptButton = ok;
            int x = 488 - ok.Width;
            ok.Location = new Point(x, 240);
            Controls.Add(ok);
            if (secundario != null)
            {
                var cancelar = Botao(secundario, false);
                cancelar.DialogResult = DialogResult.Cancel;
                CancelButton = cancelar;
                cancelar.Location = new Point(x - 10 - cancelar.Width, 240);
                Controls.Add(cancelar);
            }
            else CancelButton = ok;
            Shown += delegate { TopMost = false; Activate(); ok.Focus(); };
        }

        Button Botao(string txt, bool principal)
        {
            var b = new Button { Text = txt, AutoSize = true, AutoSizeMode = AutoSizeMode.GrowAndShrink, Padding = new Padding(14, 6, 14, 6),
                FlatStyle = FlatStyle.Flat, Cursor = Cursors.Hand, Font = new Font("Segoe UI Semibold", 10f),
                BackColor = principal ? Vinho : Painel, ForeColor = principal ? Color.White : Texto };
            b.FlatAppearance.BorderColor = principal ? Vinho : Color.FromArgb(90, 80, 78);
            b.FlatAppearance.MouseOverBackColor = principal ? Color.FromArgb(201, 70, 60) : Color.FromArgb(51, 37, 36);
            b.PerformLayout();
            b.Size = b.GetPreferredSize(Size.Empty);
            return b;
        }

        // barra de título escura no Windows 11 (combina com o portal)
        protected override void OnHandleCreated(EventArgs e)
        {
            base.OnHandleCreated(e);
            try { int sim = 1; DwmSetWindowAttribute(Handle, 20, ref sim, 4); } catch { }
            // Windows 11: barra na mesma cor do topo do portal (some visualmente), texto claro
            try { int cor = 33 | (21 << 8) | (21 << 16), texto = 225 | (230 << 8) | (236 << 16);
                  DwmSetWindowAttribute(Handle, 35, ref cor, 4); DwmSetWindowAttribute(Handle, 34, ref cor, 4); DwmSetWindowAttribute(Handle, 36, ref texto, 4); } catch { }
        }
    }

    // ---------- janela do app ----------
    class Janela : Form
    {
        static Microsoft.Web.WebView2.Core.CoreWebView2Environment ambiente;
        readonly Microsoft.Web.WebView2.WinForms.WebView2 web = new Microsoft.Web.WebView2.WinForms.WebView2();
        readonly bool principal;
        readonly string inicial;
        static readonly string ArqJanela = Path.Combine(Programa.Pasta, "janela.txt");

        public Janela(string url, bool ehPrincipal)
        {
            principal = ehPrincipal;
            inicial = url;
            Text = "Portal Fonseca e Braga";
            BackColor = Color.FromArgb(22, 16, 16);
            try { Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch { }
            StartPosition = FormStartPosition.CenterScreen;
            Size = ehPrincipal ? new Size(1360, 860) : new Size(1000, 760);
            MinimumSize = new Size(380, 480);
            web.Dock = DockStyle.Fill;
            web.DefaultBackgroundColor = Color.FromArgb(22, 16, 16);
            Controls.Add(web);
            if (principal) RestaurarJanela();
            Load += async delegate { await Preparar(); };
            FormClosing += delegate { if (principal) GuardarJanela(); };
            FormClosed += delegate { if (principal) Programa.AplicarPendente(false); };
        }

        // janela aberta pelo portal (impressão, termo, login do Google): o WebView2 entrega a nova janela já preparada
        public Task<Microsoft.Web.WebView2.Core.CoreWebView2> PrepararComoFilha()
        {
            return MotorUmaVez().ContinueWith(t => web.CoreWebView2, TaskScheduler.FromCurrentSynchronizationContext());
        }

        Task motor;
        Task MotorUmaVez() { if (motor == null) motor = PrepararMotor(); return motor; }

        async Task PrepararMotor()
        {
            if (ambiente == null)
            {
                var opcoes = new Microsoft.Web.WebView2.Core.CoreWebView2EnvironmentOptions();
                ambiente = await Microsoft.Web.WebView2.Core.CoreWebView2Environment.CreateAsync(null, Path.Combine(Programa.Pasta, "Dados"), opcoes);
            }
            await web.EnsureCoreWebView2Async(ambiente);
            var s = web.CoreWebView2.Settings;
            s.UserAgent = s.UserAgent + " PortalFBApp/" + Programa.VERSAO;   // o portal reconhece o app (modo offline)
            s.AreDevToolsEnabled = false;
            s.IsStatusBarEnabled = false;
            s.IsGeneralAutofillEnabled = true;
            s.IsPasswordAutosaveEnabled = true;
            web.CoreWebView2.DocumentTitleChanged += delegate { Text = string.IsNullOrEmpty(web.CoreWebView2.DocumentTitle) ? "Portal Fonseca e Braga" : web.CoreWebView2.DocumentTitle; };
            web.CoreWebView2.NewWindowRequested += NovaJanela;
            web.CoreWebView2.NavigationStarting += Navegando;
            web.CoreWebView2.PermissionRequested += Permissao;
            web.CoreWebView2.WindowCloseRequested += delegate { if (!principal) Close(); };
        }

        async Task Preparar()
        {
            await MotorUmaVez();
            if (inicial != null) web.CoreWebView2.Navigate(inicial);
            if (principal)
            {
                var t = new System.Windows.Forms.Timer { Interval = 6000 };
                t.Tick += delegate { t.Interval = 2 * 60 * 60 * 1000; Programa.VerificarAtualizacao(); };
                t.Start();
            }
        }

        static bool DoPortal(Uri u)
        {
            return u != null && (u.Host.Equals(Programa.HOST, StringComparison.OrdinalIgnoreCase) || u.Host.Equals("jowjow007.github.io", StringComparison.OrdinalIgnoreCase));
        }
        // login do Google e do Firebase precisam continuar dentro do app (a janelinha devolve o resultado ao portal)
        static bool LoginDentro(Uri u)
        {
            return u != null && (u.Host.EndsWith("accounts.google.com", StringComparison.OrdinalIgnoreCase)
                || u.Host.EndsWith(".firebaseapp.com", StringComparison.OrdinalIgnoreCase)
                || u.Host.EndsWith("googleusercontent.com", StringComparison.OrdinalIgnoreCase));
        }

        void NovaJanela(object s, Microsoft.Web.WebView2.Core.CoreWebView2NewWindowRequestedEventArgs e)
        {
            Uri u; Uri.TryCreate(e.Uri, UriKind.Absolute, out u);
            bool emBranco = e.Uri == "about:blank" || e.Uri == "" || e.Uri == null;
            bool janelinha = e.WindowFeatures != null && (e.WindowFeatures.HasSize || e.WindowFeatures.HasPosition);
            if (!(emBranco || DoPortal(u) || LoginDentro(u) || janelinha))
            {
                // link comum para fora (WhatsApp, Drive, Astrea…): abre no navegador padrão
                e.Handled = true;
                Programa.AbrirFora(e.Uri);
                return;
            }
            var adiamento = e.GetDeferral();
            var filha = new Janela(null, false);
            if (janelinha && e.WindowFeatures.HasSize)
                filha.Size = new Size((int)Math.Max(420, e.WindowFeatures.Width + 16), (int)Math.Max(480, e.WindowFeatures.Height + 39));
            filha.Show();
            filha.PrepararComoFilha().ContinueWith(t =>
            {
                try { e.NewWindow = t.Result; e.Handled = true; } catch { }
                adiamento.Complete();
            }, TaskScheduler.FromCurrentSynchronizationContext());
        }

        void Navegando(object s, Microsoft.Web.WebView2.Core.CoreWebView2NavigationStartingEventArgs e)
        {
            Uri u;
            if (!Uri.TryCreate(e.Uri, UriKind.Absolute, out u)) return;
            if (u.Scheme == "mailto" || u.Scheme == "tel" || u.Scheme == "whatsapp")
            {
                e.Cancel = true; Programa.AbrirFora(e.Uri); return;
            }
            // a janela principal só mostra o portal; o resto vai para o navegador
            if (principal && (u.Scheme == "http" || u.Scheme == "https") && !DoPortal(u) && !LoginDentro(u))
            {
                e.Cancel = true; Programa.AbrirFora(e.Uri);
            }
        }

        // câmera (foto do perfil), microfone, localização (registro da assinatura), notificações e área de
        // transferência: liberados só para o próprio portal
        void Permissao(object s, Microsoft.Web.WebView2.Core.CoreWebView2PermissionRequestedEventArgs e)
        {
            Uri u; Uri.TryCreate(e.Uri, UriKind.Absolute, out u);
            if (DoPortal(u)) e.State = Microsoft.Web.WebView2.Core.CoreWebView2PermissionState.Allow;
        }

        // barra de título escura no Windows 11, no tom do portal
        [DllImport("dwmapi.dll")] static extern int DwmSetWindowAttribute(IntPtr h, int attr, ref int valor, int tamanho);
        protected override void OnHandleCreated(EventArgs e)
        {
            base.OnHandleCreated(e);
            try { int sim = 1; DwmSetWindowAttribute(Handle, 20, ref sim, 4); } catch { }
            // Windows 11: barra na mesma cor do topo do portal (some visualmente), texto claro
            try { int cor = 33 | (21 << 8) | (21 << 16), texto = 225 | (230 << 8) | (236 << 16);
                  DwmSetWindowAttribute(Handle, 35, ref cor, 4); DwmSetWindowAttribute(Handle, 34, ref cor, 4); DwmSetWindowAttribute(Handle, 36, ref texto, 4); } catch { }
        }

        void RestaurarJanela()
        {
            try
            {
                if (!File.Exists(ArqJanela)) return;
                string[] p = File.ReadAllText(ArqJanela).Split(';');
                var r = new Rectangle(int.Parse(p[0]), int.Parse(p[1]), int.Parse(p[2]), int.Parse(p[3]));
                bool visivel = false;
                foreach (Screen sc in Screen.AllScreens) if (sc.WorkingArea.IntersectsWith(r)) visivel = true;
                if (!visivel) return;
                StartPosition = FormStartPosition.Manual;
                Bounds = r;
                if (p.Length > 4 && p[4] == "max") WindowState = FormWindowState.Maximized;
            }
            catch { }
        }

        void GuardarJanela()
        {
            try
            {
                Rectangle r = WindowState == FormWindowState.Normal ? Bounds : RestoreBounds;
                File.WriteAllText(ArqJanela, r.X + ";" + r.Y + ";" + r.Width + ";" + r.Height + ";" + (WindowState == FormWindowState.Maximized ? "max" : "normal"));
            }
            catch { }
        }
    }
}
