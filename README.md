# Hilfsmittel-Berater Blog

Ein moderner Blog für Informationen zu Kommunikationshilfen und unterstützter Kommunikation, entwickelt mit Astro und Tailwind CSS.

## 🚀 Über das Projekt

Hilfsmittel-Berater.at ist eine vertrauenswürdige Informationsquelle für Menschen mit Kommunikationsbeeinträchtigungen und deren Betreuer. Die Website bietet umfassende Informationen über Kommunikationshilfsmittel, Finanzierungsmöglichkeiten und praktische Tipps.

### Features

- **Modernes Design**: Responsive Design mit Tailwind CSS
- **Content Management**: Markdown-basierte Inhalte mit Astro Content Collections
- **SEO-optimiert**: Vollständige SEO-Unterstützung mit strukturierten Daten
- **Performance**: Statische Site-Generierung für optimale Ladezeiten
- **Chatbot-Integration**: Direkter Zugang zu Speakii, dem intelligenten Assistenten

## 🛠 Technologie-Stack

- **Framework**: [Astro](https://astro.build/) - Modernes Web-Framework
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS Framework
- **Content**: Markdown-Dateien mit Frontmatter
- **Deployment**: [Netlify](https://netlify.com/) - Serverless Deployment
- **Fonts**: Inter & Lexend von Google Fonts

## 📁 Projektstruktur

```
/
├── public/                 # Statische Assets
│   └── favicon.svg
├── src/
│   ├── components/        # Wiederverwendbare Komponenten
│   │   ├── blog/         # Blog-spezifische Komponenten
│   │   └── common/       # Allgemeine Komponenten
│   ├── content/          # Content Collections
│   │   └── blog/         # Blog-Artikel (Markdown)
│   ├── layouts/          # Layout-Komponenten
│   ├── pages/            # Seiten und Routen
│   ├── styles/           # Globale Styles
│   └── utils/            # Utility-Funktionen
├── astro.config.mjs      # Astro-Konfiguration
├── tailwind.config.cjs   # Tailwind-Konfiguration
└── package.json
```

## Coderabbit AI Code review
![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/Tomeksy/platus-astro-blog?utm_source=oss&utm_medium=github&utm_campaign=Tomeksy%2Fplatus-astro-blog&labelColor=171717&color=FF570A&link=https%3A%2F%2Fcoderabbit.ai&label=CodeRabbit+Reviews)


## 🚀 Erste Schritte

### Voraussetzungen

- Node.js (Version 18 oder höher)
- npm oder yarn

### Installation

1. Repository klonen:
```bash
git clone <repository-url>
cd hilfsmittel-berater-blog
```

2. Abhängigkeiten installieren:
```bash
npm install
```

3. Umgebungsvariablen konfigurieren:
```bash
cp .env.example .env
```

4. Entwicklungsserver starten:
```bash
npm run dev
```

Die Website ist nun unter `http://localhost:4321` verfügbar.

## 📝 Content Management

### Blog-Artikel erstellen

Blog-Artikel werden als Markdown-Dateien in `src/content/blog/` gespeichert. Jeder Artikel benötigt Frontmatter mit folgenden Feldern:

```markdown
---
title: "Titel des Artikels"
description: "Kurze Beschreibung für SEO"
publishedDate: 2024-01-15
author: "Autor Name"
categories: ['Kategorie1', 'Kategorie2']
tags: ['Tag1', 'Tag2']
featured: false
coverImage: "https://example.com/image.jpg"
imageAlt: "Bildbeschreibung"
---

# Artikel-Inhalt

Hier kommt der Markdown-Inhalt des Artikels...
```

### Erforderliche Felder

- `title`: Titel des Artikels
- `publishedDate`: Veröffentlichungsdatum (YYYY-MM-DD)
- `categories`: Array von Kategorien
- `tags`: Array von Tags

### Optionale Felder

- `description`: SEO-Beschreibung
- `author`: Autor (Standard: "Platus Team")
- `featured`: Als Featured-Artikel markieren
- `coverImage`: URL zum Titelbild
- `imageAlt`: Alt-Text für das Titelbild
- `updatedDate`: Aktualisierungsdatum
- `draft`: Als Entwurf markieren

## 🎨 Styling und Design

Das Projekt verwendet ein konsistentes Design-System mit:

- **Farbpalette**: Primary (Blau), Secondary (Lila), Accent (Orange)
- **Typografie**: Inter für Text, Lexend für Überschriften
- **Spacing**: 8px-basiertes Spacing-System
- **Komponenten**: Wiederverwendbare UI-Komponenten

## 🔧 Verfügbare Scripts

```bash
# Entwicklungsserver starten
npm run dev

# Produktions-Build erstellen
npm run build

# Build-Vorschau
npm run preview

# Astro CLI
npm run astro
```

## 🌐 Deployment

Das Projekt ist für Netlify konfiguriert:

1. Repository mit Netlify verbinden
2. Build-Einstellungen:
   - Build Command: `npm run build`
   - Publish Directory: `dist`
3. Umgebungsvariablen in Netlify konfigurieren

### Umgebungsvariablen

```bash
PUBLIC_SITE_URL=https://hilfsmittel-berater.at
PUBLIC_CHATBOT_URL=https://chat.hilfsmittel-berater.at
PUBLIC_MAIN_SITE_URL=https://www.platus.at
```

## 📊 SEO und Performance

- **Strukturierte Daten**: Schema.org Markup für bessere Suchmaschinenindexierung
- **Open Graph**: Optimierte Social Media Previews
- **Sitemap**: Automatisch generiert
- **Performance**: Optimierte Bilder und statische Generierung

## 🤝 Beitragen

1. Fork des Repositories erstellen
2. Feature-Branch erstellen (`git checkout -b feature/amazing-feature`)
3. Änderungen committen (`git commit -m 'Add amazing feature'`)
4. Branch pushen (`git push origin feature/amazing-feature`)
5. Pull Request erstellen

## 📄 Lizenz

Dieses Projekt ist Eigentum von Platus und für den internen Gebrauch bestimmt.

## 📞 Support

Bei Fragen oder Problemen:

- **Chatbot**: [Speakii](https://chat.hilfsmittel-berater.at)
- **Website**: [platus.at](https://www.platus.at)
- **E-Mail**: Kontakt über die Website

---

Entwickelt mit ❤️ von [Platus](https://www.platus.at) für bessere Kommunikation.
