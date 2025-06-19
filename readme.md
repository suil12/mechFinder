# Installazione e Avvio di MechFinder
## LINK AL VIDEO YOUTUBE
https://youtu.be/dW3uao1pbqMa
## LINK AL WEB SERVER HOSTATO CON RENDER
https://mechfinder-pv24.onrender.com
## Prerequisiti
- Node.js 
- npm 

## Passi per l'installazione

### 1. Installa le dipendenze
```bash
npm install
```

### 2. Avvia l'applicazione
```bash
node app.js
```

L'applicazione sarà disponibile all'indirizzo: http://localhost:3000

## Credenziali di accesso (utenti di esempio)

### Clienti
- Email: marco@esempio.it / Password: password123
- Email: laura@esempio.it / Password: password123
- Email: giovanni@esempio.it / Password: password123


### Meccanici
- Email: mario@esempio.it / Password: password123
- Email: francesco@esempio.it / Password: password123
- Email: luigi@esempio.it / Password: password123
- Email: antonio@esempio.it / Password: password123

### Admin
- Email: admin@mechfinder.it / Password: admin123

### Per problemi con database
```bash
rm -f database/mechfinder.db
npm run seed
```


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