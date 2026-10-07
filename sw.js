const V='togo-v14',TILES='togo-tiles-v1',LIBS='togo-libs-v1';
const KEEP=[V,TILES,LIBS];
const SHELL=['./','index.html','install.html','manifest.webmanifest','icon-192.png','icon-512.png','logo.png'];
const LIB_URLS=[
  'https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.js',
  'https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.css',
  'https://cdn.jsdelivr.net/npm/@mapbox/mapbox-gl-rtl-text@0.3.0/dist/mapbox-gl-rtl-text.js',
  'https://fonts.googleapis.com/css2?family=Readex+Pro:wght@400;500;600;700&display=swap',
  'https://esm.sh/@neondatabase/neon-js',
  'https://tiles.openfreemap.org/styles/liberty'
];
const MAX_TILES=1200;

// install: cache the app shell and the libraries it needs. One missing file must not break the install.
self.addEventListener('install',e=>{e.waitUntil((async()=>{
  const c=await caches.open(V);
  await Promise.all(SHELL.map(u=>c.add(u).catch(()=>{})));
  const l=await caches.open(LIBS);
  await Promise.all(LIB_URLS.map(u=>l.add(u).catch(()=>{})));
  await self.skipWaiting();
})())});

self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>!KEEP.includes(x)).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});

// the app itself: network first (updates reach the phone), but give up after a few seconds so a weak connection
// falls back to the cached copy instead of hanging
async function netFirst(req,ms){
  const cache=await caches.open(V);
  try{
    const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),ms);
    const res=await fetch(req,{signal:ctl.signal});clearTimeout(t);
    if(res&&res.status===200)cache.put(req,res.clone());
    return res;
  }catch(err){
    const hit=await cache.match(req,{ignoreSearch:true});
    if(hit)return hit;
    if(req.mode==='navigate'){const home=await cache.match('index.html')||await cache.match('./');if(home)return home}
    return Response.error();
  }
}

// libraries, fonts and map data: use the saved copy right away, refresh it in the background
async function swr(req,name,trim){
  const cache=await caches.open(name);
  const hit=await cache.match(req);
  const net=fetch(req).then(res=>{
    if(res&&res.status===200){cache.put(req,res.clone());if(trim&&Math.random()<.05)trimCache(cache,trim)}
    return res;
  }).catch(()=>null);
  if(hit){net.catch(()=>{});return hit}
  const res=await net;
  return res||Response.error();
}
async function trimCache(cache,max){
  const keys=await cache.keys();
  if(keys.length>max)await Promise.all(keys.slice(0,keys.length-max).map(k=>cache.delete(k)));
}

self.addEventListener('fetch',e=>{
  const r=e.request;
  if(r.method!=='GET')return;
  const u=new URL(r.url);
  if(u.origin===location.origin){e.respondWith(netFirst(r,3500));return}
  if(u.hostname==='tiles.openfreemap.org'){e.respondWith(swr(r,TILES,MAX_TILES));return}
  if(u.hostname==='esm.sh'||u.hostname.endsWith('.esm.sh')||u.hostname==='cdn.jsdelivr.net'||u.hostname==='fonts.googleapis.com'||u.hostname==='fonts.gstatic.com'){e.respondWith(swr(r,LIBS));return}
  // everything else (database, login, routing) goes straight to the network; the app handles being offline
});
