# Milano Locali 🍽️

App iOS nativa per scoprire ristoranti e locali di Milano, organizzati per zona.

## Setup Xcode

### 1. Crea il progetto

1. Apri **Xcode** → File → New → Project
2. Scegli **iOS → App**
3. Impostazioni:
   - Product Name: `MilanoLocali`
   - Team: il tuo Apple ID
   - Bundle Identifier: `com.tuonome.MilanoLocali`
   - Interface: **SwiftUI**
   - Language: **Swift**
   - Storage: **SwiftData** ✅
4. Salva il progetto nella cartella `App-Milan-Restaurant/`

### 2. Aggiungi i file sorgente

Trascina nella navigator di Xcode la cartella `MilanoLocali/` (quella con i file Swift).  
Seleziona **"Add to target: MilanoLocali"** per tutti i file.

Elimina il file `ContentView.swift` generato da Xcode (il nostro lo sostituisce).

### 3. Aggiungi il JSON come resource

1. Trascina `MilanoLocali/Resources/locali.json` nel progetto Xcode
2. Spunta **"Copy items if needed"** e **"Add to target"**

### 4. Aggiungi permessi Info.plist

Aggiungi in `Info.plist`:
```
NSLocationWhenInUseUsageDescription → "Per mostrarti i locali vicino a te"
```

### 5. Build & Run

Seleziona un simulatore iPhone e premi **⌘R**.

---

## Come aggiornare i dati

Modifica il file `MilanoLocali/Resources/locali.json` e fai push su GitHub.  
L'app scarica automaticamente i dati aggiornati all'avvio dal URL:

```
https://raw.githubusercontent.com/francescadilallo-cpu/app-milan-restaurant/main/MilanoLocali/Resources/locali.json
```

### Struttura di un locale nel JSON

```json
{
  "id": "id-unico",
  "name": "Nome Locale",
  "zona": "Navigli",
  "categoria": "Cocktail Bar",
  "address": "Via Example, 1, Milano",
  "description": "Descrizione del locale...",
  "latitude": 45.4551,
  "longitude": 9.1730,
  "priceRange": 2,
  "tags": ["cocktail", "aperitivo"],
  "instagramHandle": "handle_instagram",
  "websiteURL": "https://www.sito.it",
  "imageURL": null,
  "isNew": false
}
```

**Zone valide:** Navigli, Brera, Porta Venezia, Isola, Tortona, NoLo, Centrale, Duomo, Moscova, Lambrate, Città Studi, Loreto

**Categorie valide:** Ristorante, Cocktail Bar, Aperitivo, Caffè, Pizza, Osteria, Sushi, Street Food, Rooftop, Vineria

**priceRange:** 1 (€) · 2 (€€) · 3 (€€€) · 4 (€€€€)

---

## Struttura del progetto

```
MilanoLocali/
├── MilanoLocaliApp.swift       # Entry point
├── Models/
│   └── Locale.swift            # LocaleDTO, FavoriteLocale, Zona, Categoria
├── Services/
│   └── DataService.swift       # Fetch remoto + fallback locale
├── ViewModels/
│   └── LocaliViewModel.swift   # Stato app, filtri, preferiti
├── Views/
│   ├── ContentView.swift       # TabView principale
│   ├── HomeView.swift          # Grid zone + filtro categorie
│   ├── ZonaListView.swift      # Lista locali per zona
│   ├── LocaleDetailView.swift  # Scheda dettaglio + mappa
│   ├── MapaView.swift          # Mappa full screen con pin
│   └── FavoritesView.swift     # Preferiti salvati
└── Resources/
    └── locali.json             # Database locali (aggiornabile su GitHub)
```

## Features

- **Scopri per zona** — Navigli, Brera, Isola, NoLo e altre 8 zone
- **Mappa interattiva** — pin per ogni locale con anteprima rapida
- **Filtri** — per categoria (cocktail bar, pizza, osteria…) e zona
- **Ricerca** — cerca per nome, tag o descrizione
- **Preferiti** — salvati localmente con SwiftData (persistono tra le sessioni)
- **Navigazione** — apri direttamente in Apple Maps con indicazioni
- **Aggiornamento dati** — basta modificare il JSON su GitHub
