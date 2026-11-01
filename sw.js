const VER='2.0.0',V='matchplan-'+VER,F=['./','index.html','manifest.webmanifest','assets/icon.svg','lib/pdf.min.mjs','lib/pdf.worker.min.mjs'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(V).then(c=>Promise.all(F.map(u=>c.add(new Request(u,{cache:'reload'}))))))});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{if(r.ok){const c=r.clone();caches.open(V).then(h=>h.put(e.request,c))}return r}).catch(()=>caches.match(e.request)))});
