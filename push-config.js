// Notificações do Chat no celular (26/11/2026). Os dois valores são públicos (não são senhas):
//  - workerUrl: endereço do Worker "portal-fb-push" no Cloudflare (scripts/push-worker/worker.js);
//  - vapidKey: "Par de chaves" público do Firebase (Configurações do projeto › Cloud Messaging ›
//    Certificados push da Web).
// Enquanto estiverem vazios, o portal não oferece as notificações (nada muda para ninguém).
var PUSH_CONFIG = {
  workerUrl: 'https://portal-fb-push.jowjow07.workers.dev',
  vapidKey: 'BHmKTfZ50e0Aw7QVKKvOm7soRyPYy1A1EBBRZpPPpkNSzvqYxSl1aBTIJHADE39K-eLMp1lOkafP94BEX_4cP6Q'
};
