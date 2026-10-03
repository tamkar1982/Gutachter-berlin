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

## Rückruf-Anfragen per E-Mail

Das Landingpage-Formular sendet Name und Telefonnummer an `POST /api/callback`. Der Server verschickt die Anfrage an `level10@hotmail.de` über die Mailjet Send API v3.1. Lege in der lokalen `.env` sowie in der Deployment-Umgebung `MJ_APIKEY_PUBLIC`, `MJ_APIKEY_PRIVATE` und `CALLBACK_FROM_EMAIL` an. Der Absender muss in Mailjet bestätigt und aktiv sein; eine Beispielkonfiguration steht in `.env.example`. Geheimnisse gehören nie ins Frontend oder in Git.

Die Landingpage wird lokal zusammen mit der API über Next.js ausgeliefert. Starte `npm run dev` und öffne `http://localhost:3000/landing.html`; öffne die Datei nicht per Doppelklick. Ein reines Static-Hosting kann den API-Endpunkt nicht erreichen.

## MVP-Flow

- Fahrzeugdaten eingeben
- fünf Pflichtfotos hochladen
- Analyse starten
- Kostenschätzung ansehen
- PDF-Bericht herunterladen

Jede Ausgabe ist als "Unverbindliche KI-basierte Ersteinschätzung" gekennzeichnet.
