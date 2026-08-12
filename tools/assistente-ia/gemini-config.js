// ============================================================
// CONFIGURAÇÃO DO GOOGLE GEMINI — aba "Assistente IA"
// ============================================================
// Chave de API GRATUITA do Google AI Studio (https://aistudio.google.com/apikey).
//
// Diferente da apiKey do Firebase, esta chave PRECISA ser restrita por
// domínio (Google Cloud Console > APIs e serviços > Credenciais > editar a
// chave > "Restrições de aplicativo" > "Sites" > adicionar os domínios do
// Portal). Sem essa restrição, qualquer pessoa que veja o código-fonte
// poderia copiar a chave e gastar a cota gratuita do escritório em outro
// lugar. Veja o passo a passo completo no README-SETUP.md.
// ============================================================

const GEMINI_API_KEY = "COLE_AQUI_SUA_API_KEY_DO_GEMINI";
const GEMINI_MODEL = "gemini-2.5-flash";
