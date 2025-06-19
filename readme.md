# Installazione e Avvio di MechFinder

## Prerequisiti
- Node.js (versione 14.x o superiore)
- npm (versione 6.x o superiore)

## Passi per l'installazione

### 1. Clona o scarica il repository
```bash
git clone [url-repository]
cd mechfinder
```

### 2. Installa le dipendenze
```bash
npm install
```

Verifica che tutte le dipendenze siano installate correttamente. Se riscontri problemi, puoi installare manualmente le dipendenze principali:

```bash
npm install express ejs express-session connect-flash passport passport-local bcrypt express-validator express-fileupload method-override cookie-parser helmet sqlite3
```

### 3. Inizializza il database
```bash
npm run seed
```

Questo comando popolerà il database SQLite con dati di esempio, inclusi utenti, meccanici e riparazioni.

### 4. Avvia l'applicazione
```bash
npm start
```

L'applicazione sarà disponibile all'indirizzo: http://localhost:3000

## Credenziali di accesso (utenti di esempio)

### Clienti
- Email: marco@esempio.it / Password: password123
- Email: laura@esempio.it / Password: password123
- Email: giovanni@esempio.it / Password: password123

### Meccanici
- Email: mario@esempio.it / Password: password123
- Email: giuseppe@esempio.it / Password: password123
- Email: luigi@esempio.it / Password: password123
- Email: antonio@esempio.it / Password: password123
- Email: francesco@esempio.it / Password: password123

### Admin
- Email: admin@mechfinder.it / Password: admin123

## Risoluzione dei problemi comuni

### 1. Errore "module not found"
Se ricevi errori del tipo "Cannot find module X", installa la dipendenza mancante:
```bash
npm install X
```

### 2. Errore con SQLite
Assicurati che la cartella `database` esista e che l'utente abbia i permessi di scrittura:
```bash
mkdir -p database
chmod 755 database
```

### 3. Problemi di autenticazione
Se riscontri problemi di login, prova a eliminare il database esistente e ricrearlo:
```bash
rm -f database/mechfinder.db
npm run seed
```

### 4. Problemi con il caricamento delle immagini
Assicurati che le cartelle per il caricamento delle immagini esistano:
```bash
mkdir -p public/uploads/avatars
mkdir -p public/uploads/veicoli
chmod -R 755 public/uploads
```

Per qualsiasi altro problema, controlla i log del server nella console per messaggi di errore dettagliati.

## Struttura del progetto

```
mechfinder/
├── app.js                  # File principale dell'applicazione
├── controllers/            # Controller per la logica di business
├── database/               # File del database e utility
├── models/                 # Modelli per l'accesso ai dati
├── public/                 # File statici (CSS, JS, immagini)
├── routes/                 # Definizione delle route
├── utils/                  # Funzioni di utilità
└── views/                  # Template EJS
```