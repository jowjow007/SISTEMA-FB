// Notificações do Chat no celular (26/11/2026). Os dois valores são públicos (não são senhas):
//  - workerUrl: endereço do Worker "portal-fb-push" no Cloudflare (scripts/push-worker/worker.js);
//  - vapidKey: "Par de chaves" público do Firebase (Configurações do projeto › Cloud Messaging ›
//    Certificados push da Web).
// Enquanto estiverem vazios, o portal não oferece as notificações (nada muda para ninguém).
var PUSH_CONFIG = {
  workerUrl: '',
  vapidKey: ''
};
