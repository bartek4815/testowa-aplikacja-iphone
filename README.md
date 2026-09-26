# Skaner kodów kreskowych - biblioteka w jednym pliku

Skaner kodów kreskowych i QR dla stron i aplikacji PWA. Cała biblioteka to
jeden plik: **`skaner_kodow_kreskowych.html`**. Kopiujesz go obok swojej
strony, wczytujesz jedną funkcją i wywołujesz `BarcodeScanner.open()`.

Działa na Androidzie (Chrome) i na iPhonie (Safari), także po dodaniu strony
do ekranu głównego jako PWA.

---

## Pliki

| Plik | Do czego |
|---|---|
| `skaner_kodow_kreskowych.html` | **biblioteka** - style, nakładka skanera i cała logika |
| `demo.html` | przykładowa aplikacja pokazująca użycie |
| `index.html` | przekierowanie na `demo.html` |
| `manifest.json`, `service-worker.js` | obsługa PWA i cache offline |
| `LICENSE` | licencja MIT |

---

## Szybki start

**1.** Skopiuj `skaner_kodow_kreskowych.html` obok swojej strony.

**2.** Wklej do swojej aplikacji funkcję wczytującą (jest też w `demo.html`):

```js
function loadScannerLibrary(url) {
  return fetch(url).then(function (response) {
    if (!response.ok) {
      throw new Error('Nie udało się pobrać ' + url);
    }
    return response.text();
  }).then(function (html) {
    var holder = document.createElement('div');
    holder.innerHTML = html;

    // skrypty wstawione przez innerHTML nie uruchamiają się same
    var found = holder.querySelectorAll('script');
    var sources = [];
    for (var i = 0; i < found.length; i++) {
      sources.push(found[i].textContent);
      found[i].parentNode.removeChild(found[i]);
    }
    document.body.appendChild(holder);
    for (var j = 0; j < sources.length; j++) {
      var fresh = document.createElement('script');
      fresh.textContent = sources[j];
      document.body.appendChild(fresh);
    }
  });
}
```

**3.** Wczytaj bibliotekę raz przy starcie strony:

```js
loadScannerLibrary('skaner_kodow_kreskowych.html').then(function () {
  przyciskSkanuj.disabled = false;     // biblioteka gotowa
});
```

**4.** Otwórz skaner po kliknięciu:

```js
przyciskSkanuj.addEventListener('click', function () {
  BarcodeScanner.open({
    onScan: function (kod) {
      document.getElementById('pole').value = kod;
    }
  });
});
```

Tyle. Nakładka skanera pojawia się na pełnym ekranie, użytkownik celuje
w kod, zatwierdza go przyciskiem na dole i skaner znika.

---

## API

| Wywołanie | Opis |
|---|---|
| `BarcodeScanner.open(opcje)` | otwiera skaner, zwraca `Promise<boolean>` |
| `BarcodeScanner.close()` | zamyka skaner |
| `BarcodeScanner.isOpen()` | czy skaner jest otwarty |
| `BarcodeScanner.defaults` | domyślne opcje, można nadpisać globalnie |
| `BarcodeScanner.version` | wersja biblioteki |

### Opcje `open()`

Wszystkie są nieobowiązkowe.

| Opcja | Domyślnie | Opis |
|---|---|---|
| `onScan(kod)` | - | kod zatwierdzony przyciskiem na dole ekranu |
| `onDetect(kod)` | - | każdy nowy odczyt, jeszcze przed zatwierdzeniem |
| `onClose()` | - | skaner został zamknięty |
| `onError(blad)` | - | brak zgody na aparat, brak internetu itp. |
| `autoClose` | `false` | `true`: pierwszy odczyt od razu zamyka skaner i wywołuje `onScan` |
| `lockOrientation` | `true` | blokada obrotu ekranu na czas skanowania (Android; iOS ignoruje) |
| `vibrate` | `true` | krótka wibracja przy nowym kodzie (tylko Android) |
| `formats` | typowe | lista formatów, np. `['EAN_13', 'QR_CODE']` |
| `zxingUrl` | CDN | własny adres biblioteki ZXing, np. kopia lokalna |

### Przykład z wszystkimi zwrotkami

```js
BarcodeScanner.open({
  autoClose: true,
  formats: ['EAN_13', 'EAN_8', 'CODE_128'],
  onDetect: function (kod) { console.log('widzę:', kod); },
  onScan:   function (kod) { zapiszKod(kod); },
  onClose:  function ()    { console.log('skaner zamknięty'); },
  onError:  function (err) { alert('Skaner: ' + err.message); }
});
```

### Obsługiwane formaty

`EAN_13`, `EAN_8`, `UPC_A`, `UPC_E`, `CODE_128`, `CODE_39`, `CODE_93`,
`ITF`, `CODABAR`, `QR_CODE`, `DATA_MATRIX`.

Im krótsza lista w opcji `formats`, tym szybciej działa skanowanie.

---

## Wymagania

- **HTTPS albo localhost** - przeglądarki nie dają dostępu do aparatu po
  zwykłym HTTP.
- **Internet przy pierwszym uruchomieniu** - biblioteka ZXing pobierana jest
  z CDN. Potem leży w cache przeglądarki. Jeśli chcesz działać całkiem
  offline, pobierz ZXing lokalnie i podaj `zxingUrl`.
- **`open()` prosto z kliknięcia użytkownika** - tylko wtedy przeglądarka
  pozwala włączyć pełny ekran, a bez pełnego ekranu nie zadziała blokada
  obrotu.

---

## Jak to działa

Trzy warstwy:

1. **Aparat** - własne `getUserMedia`, wybór właściwego obiektywu i prośba
   o autofokus kamery.
2. **Pętla** - co 110 ms klatka podglądu trafia na canvas, co druga obrócona
   o 90 stopni.
3. **Dekoder** - ZXing czyta klatkę z canvasa tak jak zwykłe zdjęcie.

Dwie rzeczy, które warto znać:

**Wybór obiektywu.** Na Androidzie `facingMode: environment` bardzo często
otwiera obiektyw ultraszerokokątny albo pomocniczy, a te w wielu telefonach
w ogóle nie mają układu autofokusu. Obraz jest wtedy nieostry i żaden kod
tego nie naprawi. Biblioteka rozpoznaje główny aparat po etykiecie urządzenia
i przełącza się na niego sama. Gdyby trafiła źle, użytkownik ma w skanerze
przycisk 🔄 do ręcznej zmiany - wybór zostaje zapamiętany w `localStorage`.

**Obie orientacje kodu.** Czytnik kodów 1D skanuje obraz poziomymi liniami,
więc kod z paskami w poziomie sam z siebie się nie odczyta. Dlatego co druga
klatka idzie do dekodera obrócona o 90 stopni - kod czyta się niezależnie od
tego, jak go trzymasz.

---

## Interfejs skanera

| Element | Znaczenie |
|---|---|
| kwadrat z krzyżykiem | obszar analizowany przez dekoder - tu celuj |
| napis u góry | odczytany kod; zielone tło = trafienie |
| przycisk na dole | zatwierdza kod i zamyka skaner |
| ✕ w prawym górnym rogu | zamyka skaner bez zatwierdzania |
| 🔄 w lewym górnym rogu | zmiana obiektywu (tylko gdy telefon ma ich kilka) |
| `aparat 2/2` na dole | numer aktywnego obiektywu |

---

## Licencja

MIT - patrz plik [LICENSE](LICENSE). Możesz używać, zmieniać i rozpowszechniać,
także komercyjnie, pod warunkiem zachowania informacji o autorstwie i treści
licencji.

Biblioteka korzysta z [ZXing for JS](https://github.com/zxing-js/library)
(licencja MIT), pobieranego z CDN.
