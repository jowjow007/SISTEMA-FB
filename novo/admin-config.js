// ============================================================
// CONFIGURAÇÃO DO PAINEL ADMINISTRAÇÃO — endereço do Worker de exclusão
// ============================================================
// A credencial de administrador de verdade NÃO fica aqui nem em nenhum
// arquivo público deste repositório — mora só dentro de um Cloudflare
// Worker, como "Secret" (variável de ambiente criptografada, gratuito,
// sem servidor para manter). O navegador de cada admin só conversa com o
// endereço público abaixo, que aceita apenas pedidos vindos dos domínios
// do Portal e só executa a exclusão se quem pediu realmente for admin.
//
// Veja o passo a passo completo no README-SETUP.md, seção 10.
// ============================================================

const ADMIN_WORKER_URL = "COLE_AQUI_A_URL_DO_SEU_WORKER";
