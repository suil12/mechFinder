"use strict";

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Assicurati che la directory database esista
const dbDir = path.join(__dirname);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'mechfinder.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Errore nell\'apertura del database:', err.message);
        throw err;
    }
    console.log('Database MechFinder connesso con successo');
    
    // Creare le tabelle se non esistono
    initDatabase();
});

function initDatabase() {
    db.serialize(() => {
        // Abilita foreign keys
        db.run('PRAGMA foreign_keys = ON');
        
        // Tabella Clienti
        db.run(`
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
                avatar TEXT DEFAULT 'default_avatar.png'
            )
        `);
        
        // Tabella Veicoli
        db.run(`
            CREATE TABLE IF NOT EXISTS veicoli (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                id_cliente INTEGER NOT NULL,
                marca TEXT NOT NULL,
                modello TEXT NOT NULL,
                anno INTEGER,
                targa TEXT,
                tipo TEXT,
                FOREIGN KEY (id_cliente) REFERENCES clienti(id) ON DELETE CASCADE
            )
        `);
        
        // Tabella Meccanici
        db.run(`
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
                verificato BOOLEAN DEFAULT 0
            )
        `);
        
        // Tabella Servizi
        db.run(`
            CREATE TABLE IF NOT EXISTS servizi (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                descrizione TEXT,
                icona TEXT
            )
        `);
        
        // Tabella Servizi Offerti dai Meccanici
        db.run(`
            CREATE TABLE IF NOT EXISTS servizi_meccanici (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                id_meccanico INTEGER NOT NULL,
                id_servizio INTEGER NOT NULL,
                prezzo REAL,
                FOREIGN KEY (id_meccanico) REFERENCES meccanici(id) ON DELETE CASCADE,
                FOREIGN KEY (id_servizio) REFERENCES servizi(id) ON DELETE CASCADE
            )
        `);
        
        // Tabella Riparazioni
        db.run(`
            CREATE TABLE IF NOT EXISTS riparazioni (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                id_cliente INTEGER NOT NULL,
                id_meccanico INTEGER NOT NULL,
                id_veicolo INTEGER,
                descrizione TEXT NOT NULL,
                tipo_problema TEXT,
                data_richiesta DATETIME DEFAULT CURRENT_TIMESTAMP,
                stato TEXT DEFAULT 'richiesta', -- richiesta, preventivo, accettata, in_corso, completata, rifiutata
                priorita TEXT DEFAULT 'normale', -- bassa, normale, alta
                data_accettazione DATETIME,
                data_completamento DATETIME,
                note TEXT,
                FOREIGN KEY (id_cliente) REFERENCES clienti(id) ON DELETE CASCADE,
                FOREIGN KEY (id_meccanico) REFERENCES meccanici(id) ON DELETE CASCADE,
                FOREIGN KEY (id_veicolo) REFERENCES veicoli(id) ON DELETE SET NULL
            )
        `);
        
        // Tabella Preventivi
        db.run(`
            CREATE TABLE IF NOT EXISTS preventivi (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                id_riparazione INTEGER NOT NULL,
                importo REAL NOT NULL,
                descrizione TEXT NOT NULL,
                data_creazione DATETIME DEFAULT CURRENT_TIMESTAMP,
                data_scadenza DATETIME,
                stato TEXT DEFAULT 'in_attesa', -- in_attesa, accettato, rifiutato
                FOREIGN KEY (id_riparazione) REFERENCES riparazioni(id) ON DELETE CASCADE
            )
        `);
        
        // Tabella Ricevute
        db.run(`
            CREATE TABLE IF NOT EXISTS ricevute (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                id_riparazione INTEGER NOT NULL,
                importo REAL NOT NULL,
                descrizione TEXT,
                data_emissione DATETIME DEFAULT CURRENT_TIMESTAMP,
                numero_fattura TEXT,
                metodo_pagamento TEXT,
                FOREIGN KEY (id_riparazione) REFERENCES riparazioni(id) ON DELETE CASCADE
            )
        `);
        
        // Tabella Recensioni
        db.run(`
            CREATE TABLE IF NOT EXISTS recensioni (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                id_cliente INTEGER NOT NULL,
                id_meccanico INTEGER NOT NULL,
                id_riparazione INTEGER,
                valutazione INTEGER NOT NULL CHECK(valutazione BETWEEN 1 AND 5),
                commento TEXT,
                data_recensione DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (id_cliente) REFERENCES clienti(id) ON DELETE CASCADE,
                FOREIGN KEY (id_meccanico) REFERENCES meccanici(id) ON DELETE CASCADE,
                FOREIGN KEY (id_riparazione) REFERENCES riparazioni(id) ON DELETE SET NULL
            )
        `);
        
        // Tabella Messaggi
        db.run(`
            CREATE TABLE IF NOT EXISTS messaggi (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                id_mittente INTEGER NOT NULL,
                tipo_mittente TEXT NOT NULL, -- cliente, meccanico
                id_destinatario INTEGER NOT NULL,
                tipo_destinatario TEXT NOT NULL, -- cliente, meccanico
                id_riparazione INTEGER,
                testo TEXT NOT NULL,
                data_invio DATETIME DEFAULT CURRENT_TIMESTAMP,
                letto BOOLEAN DEFAULT 0,
                FOREIGN KEY (id_riparazione) REFERENCES riparazioni(id) ON DELETE CASCADE
            )
        `);
        
        // Inserisci alcuni dati di esempio per i servizi
        db.get('SELECT COUNT(*) as count FROM servizi', (err, row) => {
            if (err) {
                console.error('Errore nella verifica dei servizi:', err.message);
                return;
            }
            
            if (row.count === 0) {
                const servizi = [
                    { nome: 'Elettronica', descrizione: 'Riparazioni elettroniche e diagnostica', icona: 'elettronica.jpg' },
                    { nome: 'Meccanica Generale', descrizione: 'Riparazioni di motore e parti meccaniche', icona: 'meccanicagen.webp' },
                    { nome: 'Revisioni', descrizione: 'Controlli tecnici e revisioni periodiche', icona: 'revisioni.jpg' },
                    { nome: 'Tagliandi', descrizione: 'Manutenzione ordinaria e tagliandi', icona: 'meccanico3.png' },
                    { nome: 'Cambio Gomme', descrizione: 'Sostituzione e bilanciatura pneumatici', icona: 'gomme.jpeg' },
                    { nome: 'Carrozzeria', descrizione: 'Riparazioni di carrozzeria e verniciatura', icona: 'carrozzeria.jpg' }
                ];
                
                const stmt = db.prepare('INSERT INTO servizi (nome, descrizione, icona) VALUES (?, ?, ?)');
                servizi.forEach(servizio => {
                    stmt.run(servizio.nome, servizio.descrizione, servizio.icona);
                });
                stmt.finalize();
                
                console.log('Servizi di esempio inseriti nel database');
            }
        });
    });
}

// Funzioni helper per le query al database
function query(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error('Errore nella query:', err.message);
                reject(err);
                return;
            }
            resolve(rows);
        });
    });
}

function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) {
                console.error('Errore nella query get:', err.message);
                reject(err);
                return;
            }
            resolve(row);
        });
    });
}

function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) {
                console.error('Errore nella query run:', err.message);
                reject(err);
                return;
            }
            resolve({ id: this.lastID, changes: this.changes });
        });
    });
}

// Esporta l'oggetto db e le funzioni helper
module.exports = {
    db,
    query,
    get,
    run,
    close: () => {
        return new Promise((resolve, reject) => {
            db.close(err => {
                if (err) {
                    console.error('Errore nella chiusura del database:', err.message);
                    reject(err);
                    return;
                }
                console.log('Database chiuso con successo');
                resolve();
            });
        });
    }
};