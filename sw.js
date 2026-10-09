const ROOT=new URL('./',self.location.href);
const PREFIX='cfv-shell-'+ROOT.pathname+':';
const CACHE=PREFIX+'v4.0.2';
const SHELL=['./','./index.html','./styles.css','./player-cards.css','./fonts.css','./app.mjs','./api-client.mjs','./domain.mjs','./league.mjs','./player-cards.mjs','./media-batches.mjs','./config.mjs','./manifest.webmanifest','./assets/app-icon.svg','./assets/icon-192.png','./assets/icon-512.png','./assets/icon-maskable.png','./assets/crest.jpg','./assets/football.jpg','./assets/barlow-condensed-700.ttf'].map(p=>new URL(p,ROOT).href);
const ALLOWED=new Set(SHELL);
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim().then(()=>caches.keys()).then(keys=>Promise.all(keys.filter(key=>key.startsWith(PREFIX)&&key!==CACHE).map(key=>caches.delete(key))))));
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET'||new URL(request.url).origin!==ROOT.origin)return;
 if(request.mode==='navigate'&&new URL(request.url).pathname.startsWith(ROOT.pathname)){
  event.respondWith(fetch(request).catch(()=>caches.open(CACHE).then(cache=>cache.match(new URL('index.html',ROOT).href))));return;
 }
 if(ALLOWED.has(request.url))event.respondWith(caches.open(CACHE).then(cache=>cache.match(request).then(cached=>cached||fetch(request))));
});
