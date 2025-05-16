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
});

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