/*
 * ============================================================================
 *  Service worker - cache offline aplikacji
 * ============================================================================
 *
 *  Zadanie: aplikacja ma się uruchamiać bez internetu po pierwszym wejściu.
 *
 *  WAŻNE PRZY KAŻDEJ ZMIANIE KODU: podbij CACHE_NAME razem z APP_VERSION
 *  w index.html. Nazwa cache jest jedynym sygnałem dla przeglądarki, że
 *  pliki się zmieniły - bez jej zmiany telefon w nieskończoność serwuje
 *  starą wersję z pamięci i wygląda to jak "zmiany nie weszły".
 *
 *  Strategia: cache-first (najpierw pamięć, potem sieć). Świadomie prosta -
 *  to aplikacja testowa. Biblioteka ZXing ładowana jest z CDN i nie ma jej
 *  na liście, więc pierwsze uruchomienie wymaga internetu; potem przeglądarka
 *  trzyma ją we własnym cache HTTP.
 */

var CACHE_NAME = 'skaner-kodow-kreskowych-v14';

// Pliki wgrywane do cache przy instalacji. './' to sam adres katalogu -
// pod nim otwiera się aplikacja dodana do ekranu głównego.
// index.html tylko przekierowuje na demo.html, ale musi tu być, bo starsze
// skróty na ekranie głównym telefonu wskazują właśnie na niego.
var urlsToCache = [
  './',
  './index.html',
  './demo.html',
  './skaner_kodow_kreskowych.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

// INSTALACJA - wgranie kompletu plików do nowego cache.
// skipWaiting() sprawia, że nowa wersja przejmuje kontrolę od razu, zamiast
// czekać na zamknięcie wszystkich kart ze starą wersją.
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// AKTYWACJA - sprzątanie po poprzednich wersjach.
// Kasujemy każdy cache o innej nazwie niż bieżąca, żeby stare pliki nie
// zostawały w telefonie na zawsze.
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names.filter(function (name) {
          return name !== CACHE_NAME;
        }).map(function (name) {
          return caches.delete(name);
        })
      );
    })
  );
  self.clients.claim();
});

// PRZECHWYTYWANIE ŻĄDAŃ - najpierw cache, a gdy pliku tam nie ma, sieć.
self.addEventListener('fetch', function (event) {
  event.respondWith(
    caches.match(event.request).then(function (response) {
      return response || fetch(event.request);
    })
  );
});
