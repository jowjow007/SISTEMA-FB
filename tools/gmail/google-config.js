// ============================================================
// CONFIGURAÇÃO DO GOOGLE — aba de E-mail (Gmail)
// ============================================================
// Preencha com o Client ID OAuth do projeto Google Cloud "Portal FB -
// Gmail" — um projeto SEPARADO do projeto do Firebase (sistema-fb-4cce5),
// criado logado com a conta Workspace (jonathan@fonsecaebraga.com.br) para
// que a Tela de consentimento OAuth pudesse ser "Interna" (sem verificação
// do Google). Onde encontrar/editar: console.cloud.google.com > projeto
// "Portal FB - Gmail" > APIs e serviços > Credenciais.
//
// Este arquivo NÃO é secreto — um Client ID OAuth de app da Web não
// tem senha/segredo associado (usa o fluxo "implícito", autorizado
// só pelos domínios cadastrados em "Origens JavaScript autorizadas").
// Veja o passo a passo completo no README-SETUP.md.
// ============================================================

const GOOGLE_CLIENT_ID = "433488688713-trijtb823p9m822lnr07fi3muca629cv.apps.googleusercontent.com";
