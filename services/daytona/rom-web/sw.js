// Retire only the previous procedural game's shell cache on this same site.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const name of await caches.keys())if(name.startsWith('apex-rebuilt-'))await caches.delete(name);
 await self.clients.claim();await self.registration.unregister();
})()));
