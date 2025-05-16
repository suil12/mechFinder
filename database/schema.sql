-- Creazione tabelle principali

-- Tabella Clienti
CREATE TABLE IF NOT EXISTS clienti (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    cognome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    telefono TEXT,
    indirizzo TEXT,
    citta TEXT,
    cap TEXT,
    data_registrazione DATETIME DEFAULT CURRENT_TIMESTAMP,
    avatar TEXT DEFAULT 'default_avatar.png',
    reset_token TEXT,
    reset_token_expires DATETIME,
    email_notifications BOOLEAN DEFAULT 1,
    sms_notifications BOOLEAN DEFAULT 0,
    reminder_notifications BOOLEAN DEFAULT 1,
    promotions_notifications BOOLEAN DEFAULT 0,
    tipo TEXT DEFAULT 'cliente'
);

-- Tabella Meccanici
CREATE TABLE IF NOT EXISTS meccanici (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    cognome TEXT NOT NULL,
    nome_officina TEXT,
    specializzazione TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    telefono TEXT,
    indirizzo TEXT,
    citta TEXT,
    cap TEXT,
    latitudine REAL,
    longitudine REAL,
    descrizione TEXT,
    valutazione REAL DEFAULT 0,
    numero_recensioni INTEGER DEFAULT 0,
    data_registrazione DATETIME DEFAULT CURRENT_TIMESTAMP,
    avatar TEXT DEFAULT 'default_mechanic.png',
    verificato BOOLEAN DEFAULT 0,
    reset_token TEXT,
    reset_token_expires DATETIME,
    tipo TEXT DEFAULT 'meccanico'
);

-- Tabella Admin
CREATE TABLE IF NOT EXISTS admin (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    avatar TEXT DEFAULT 'default_admin.png',
    data_registrazione DATETIME DEFAULT CURRENT_TIMESTAMP,
    reset_token TEXT,
    reset_token_expires DATETIME,
    tipo TEXT DEFAULT 'admin'
);

-- Tabella Veicoli
CREATE TABLE IF NOT EXISTS veicoli (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_cliente INTEGER NOT NULL,
    marca TEXT NOT NULL,
    modello TEXT NOT NULL,
    anno INTEGER,
    targa TEXT,
    tipo TEXT NOT NULL,
    FOREIGN KEY (id_cliente) REFERENCES clienti(id) ON DELETE CASCADE
);

-- Tabella Riparazioni
CREATE TABLE IF NOT EXISTS riparazioni (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_cliente INTEGER NOT NULL,
    id_meccanico INTEGER NOT NULL,
    id_veicolo INTEGER,
    descrizione TEXT NOT NULL,
    tipo_problema TEXT,
    stato TEXT NOT NULL DEFAULT 'richiesta',
    priorita TEXT DEFAULT 'normale',
    data_richiesta DATETIME NOT NULL,
    data_accettazione DATETIME,
    data_inizio DATETIME,
    data_completamento DATETIME,
    descrizione_intervento TEXT,
    costo REAL,
    note TEXT,
    FOREIGN KEY (id_cliente) REFERENCES clienti(id) ON DELETE CASCADE,
    FOREIGN KEY (id_meccanico) REFERENCES meccanici(id) ON DELETE CASCADE,
    FOREIGN KEY (id_veicolo) REFERENCES veicoli(id) ON DELETE SET NULL
);

-- Tabella Preventivi
CREATE TABLE IF NOT EXISTS preventivi (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_riparazione INTEGER NOT NULL,
    importo REAL NOT NULL,
    descrizione TEXT NOT NULL,
    data_creazione DATETIME DEFAULT CURRENT_TIMESTAMP,
    data_scadenza DATETIME NOT NULL,
    stato TEXT DEFAULT 'in_attesa',
    FOREIGN KEY (id_riparazione) REFERENCES riparazioni(id) ON DELETE CASCADE
);

-- Tabella Commenti
CREATE TABLE IF NOT EXISTS commenti (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_riparazione INTEGER NOT NULL,
    id_utente INTEGER NOT NULL,
    tipo_utente TEXT NOT NULL,
    messaggio TEXT NOT NULL,
    data_creazione DATETIME DEFAULT CURRENT_TIMESTAMP,
    automatico BOOLEAN DEFAULT 0,
    FOREIGN KEY (id_riparazione) REFERENCES riparazioni(id) ON DELETE CASCADE
);

-- Tabella Recensioni
CREATE TABLE IF NOT EXISTS recensioni (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_cliente INTEGER NOT NULL,
    id_meccanico INTEGER NOT NULL,
    id_riparazione INTEGER,
    valutazione INTEGER NOT NULL,
    commento TEXT,
    data_recensione DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_cliente) REFERENCES clienti(id) ON DELETE CASCADE,
    FOREIGN KEY (id_meccanico) REFERENCES meccanici(id) ON DELETE CASCADE,
    FOREIGN KEY (id_riparazione) REFERENCES riparazioni(id) ON DELETE SET NULL
);

-- Tabella Servizi
CREATE TABLE IF NOT EXISTS servizi (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    descrizione TEXT,
    icona TEXT
);

-- Tabella Servizi-Meccanici (relazione N:M)
CREATE TABLE IF NOT EXISTS servizi_meccanici (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_meccanico INTEGER NOT NULL,
    id_servizio INTEGER NOT NULL,
    prezzo REAL,
    attivo BOOLEAN DEFAULT 1,
    FOREIGN KEY (id_meccanico) REFERENCES meccanici(id) ON DELETE CASCADE,
    FOREIGN KEY (id_servizio) REFERENCES servizi(id) ON DELETE CASCADE,
    UNIQUE(id_meccanico, id_servizio)
);

-- Tabella Orari Meccanici
CREATE TABLE IF NOT EXISTS orari_meccanici (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_meccanico INTEGER NOT NULL,
    giorno INTEGER NOT NULL,
    apertura TEXT,
    chiusura TEXT,
    pausa_inizio TEXT,
    pausa_fine TEXT,
    chiuso BOOLEAN DEFAULT 0,
    FOREIGN KEY (id_meccanico) REFERENCES meccanici(id) ON DELETE CASCADE
);
-- Aggiunta della tabella ricevute
CREATE TABLE IF NOT EXISTS ricevute (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_riparazione INTEGER NOT NULL,
    importo REAL NOT NULL,
    descrizione TEXT NOT NULL,
    numero_fattura TEXT,
    metodo_pagamento TEXT,
    data_emissione DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_riparazione) REFERENCES riparazioni(id) ON DELETE CASCADE
);
-- Indici
CREATE INDEX IF NOT EXISTS idx_riparazioni_cliente ON riparazioni(id_cliente);
CREATE INDEX IF NOT EXISTS idx_riparazioni_meccanico ON riparazioni(id_meccanico);
CREATE INDEX IF NOT EXISTS idx_riparazioni_stato ON riparazioni(stato);
CREATE INDEX IF NOT EXISTS idx_recensioni_meccanico ON recensioni(id_meccanico);
CREATE INDEX IF NOT EXISTS idx_commenti_riparazione ON commenti(id_riparazione);
CREATE INDEX IF NOT EXISTS idx_veicoli_cliente ON veicoli(id_cliente);
CREATE INDEX IF NOT EXISTS idx_servizi_meccanici_meccanico ON servizi_meccanici(id_meccanico);
CREATE INDEX IF NOT EXISTS idx_orari_meccanici_meccanico ON orari_meccanici(id_meccanico);