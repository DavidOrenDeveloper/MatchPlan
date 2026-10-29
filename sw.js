const VER='1.0.0',V='goldin-cmp-'+VER,F=['./','index.html','css/style.css','js/app.js','js/legend.js','js/export.js','js/worker.js','manifest.webmanifest','assets/icon.svg','lib/pdf.min.mjs','lib/pdf-lib.min.js','lib/pdf.worker.min.mjs'];
self.addEventListener('install',e=>e.waitUntil(caches.open(V).then(c=>Promise.all(F.map(u=>c.add(new Request(u,{cache:'reload'})))))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('message',e=>{const d=e.data||{};if(d.t==='skip')self.skipWaiting();if(d.t==='ver'&&e.source)e.source.postMessage({ver:VER})});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{if(r.ok){const c=r.clone();caches.open(V).then(h=>h.put(e.request,c))}return r}).catch(()=>caches.match(e.request)))});
