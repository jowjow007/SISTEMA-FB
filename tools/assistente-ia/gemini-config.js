// ============================================================
// CONFIGURAÇÃO DO ASSISTENTE IA — endereço do proxy (Cloudflare Worker)
// ============================================================
// A chave de verdade do Gemini NÃO fica aqui nem em nenhum arquivo público
// deste repositório — o GitHub bloqueia esse tipo específico de chave
// (vinculada a conta de serviço) se ela aparecer em texto num commit. Ela
// mora só dentro de um Cloudflare Worker, como "Secret" (variável de
// ambiente criptografada, gratuito, sem servidor para manter). O
// navegador de cada pessoa só conversa com o endereço público abaixo, que
// aceita apenas pedidos vindos dos domínios do Portal.
//
// Veja o passo a passo completo no README-SETUP.md, seção 9.
// ============================================================

const GEMINI_WORKER_URL = "COLE_AQUI_A_URL_DO_SEU_WORKER";
