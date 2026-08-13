// ================================================================
//  sw.js - Service Worker para caché offline y funcionalidad parcial
// ================================================================

const CACHE_NAME = 'astrochat-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Cacheando assets...');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        console.log('✅ Assets cacheados correctamente');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Error al cachear assets:', error);
      })
  );
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: activando...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('🗑️ Eliminando caché antigua:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker activado y listo');
        return self.clients.claim();
      })
  );
});

// Intercepción de peticiones fetch
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Si encontramos el recurso en caché, lo devolvemos
        if (cachedResponse) {
          // console.log('📦 Sirviendo desde caché:', event.request.url);
          return cachedResponse;
        }

        // Si no está en caché, intentamos obtenerlo de la red
        return fetch(event.request)
          .then((response) => {
            // Verificar si la respuesta es válida
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clonar la respuesta para guardarla en caché y devolverla
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                try {
                  cache.put(event.request, responseToCache);
                } catch (error) {
                  // Ignorar errores de caché (por ejemplo, URLs no cacheables)
                }
              });

            return response;
          })
          .catch(() => {
            // Si falla la red y no hay caché, devolver una respuesta offline
            console.warn('⚠️ Sin conexión y no hay caché para:', event.request.url);
            return new Response(
              '⚠️ Estás offline. AstroChat solo puede mostrarte el quiz y la interfaz. La IA necesita conexión.',
              {
                status: 503,
                statusText: 'Service Unavailable',
                headers: new Headers({
                  'Content-Type': 'text/plain'
                })
              }
            );
          });
      })
  );
});

// Manejar mensajes del cliente (opcional)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('🌌 Service Worker de AstroChat cargado correctamente');
