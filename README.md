# KI Fahrzeugschaden MVP

Ein schlanker Next.js MVP für eine unverbindliche KI-basierte Ersteinschätzung von Fahrzeugschäden.

## Start

1. Abhängigkeiten installieren:

   ```bash
   npm install
   ```

2. Umgebung anlegen:

   ```bash
   cp .env.example .env
   ```

3. `DATABASE_URL` auf eine lokale PostgreSQL-Datenbank setzen. Optional `OPENAI_API_KEY` eintragen. Ohne API-Key nutzt der MVP eine Demo-Analyse.

4. Datenbank migrieren:

   ```bash
   npm run prisma:migrate
   ```

5. App starten:

   ```bash
   npm run dev
   ```

## MVP-Flow

- Fahrzeugdaten eingeben
- fünf Pflichtfotos hochladen
- Analyse starten
- Kostenschätzung ansehen
- PDF-Bericht herunterladen

Jede Ausgabe ist als "Unverbindliche KI-basierte Ersteinschätzung" gekennzeichnet.
