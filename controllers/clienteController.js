"use strict";

const { validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const { Cliente } = require('../models/utente');
const { Riparazione } = require('../models/riparazione');
const db = require('../database/db');
const path = require('path');
const fs = require('fs');

// Dashboard cliente
exports.getDashboard = async (req, res) => {
    try {
        // Ottiene le riparazioni attive
        const riparazioniAttive = await db.query(
            `SELECT r.*, m.nome as nome_meccanico, m.cognome as cognome_meccanico, 
             m.nome_officina, m.specializzazione, m.avatar as avatar_meccanico
             FROM riparazioni r
             JOIN meccanici m ON r.id_meccanico = m.id
             WHERE r.id_cliente = ? AND r.stato NOT IN ('completata', 'rifiutata')
             ORDER BY r.data_richiesta DESC`,
            [req.user.id]
        );
        
        // Ottiene le ultime riparazioni completate
        const riparazioniCompletate = await db.query(
            `SELECT r.*, m.nome as nome_meccanico, m.cognome as cognome_meccanico,
             m.nome_officina, m.specializzazione, m.avatar as avatar_meccanico
             FROM riparazioni r
             JOIN meccanici m ON r.id_meccanico = m.id
             WHERE r.id_cliente = ? AND r.stato = 'completata'
             ORDER BY r.data_completamento DESC
             LIMIT 5`,
            [req.user.id]
        );
        
        // Ottiene i meccanici preferiti (quelli con cui ha fatto più riparazioni)
        const meccaniciPreferiti = await db.query(
            `SELECT m.id, m.nome, m.cognome, m.nome_officina, m.specializzazione, 
             m.valutazione, m.avatar, COUNT(r.id) as num_riparazioni
             FROM riparazioni r
             JOIN meccanici m ON r.id_meccanico = m.id
             WHERE r.id_cliente = ?
             GROUP BY m.id
             ORDER BY num_riparazioni DESC
             LIMIT 3`,
            [req.user.id]
        );
        
        // Statistiche
        // Numero totale di riparazioni
        const totalRiparazioni = await db.get(
            'SELECT COUNT(*) as count FROM riparazioni WHERE id_cliente = ?',
            [req.user.id]
        );
        
        // Numero di riparazioni per stato
        const riparazioniPerStato = await db.query(
            `SELECT stato, COUNT(*) as count 
             FROM riparazioni 
             WHERE id_cliente = ? 
             GROUP BY stato`,
            [req.user.id]
        );
        
        // Spesa totale
        const spesaTotale = await db.get(
            'SELECT SUM(costo) as total FROM riparazioni WHERE id_cliente = ? AND costo > 0',
            [req.user.id]
        );
        
        res.render('cliente/dashboard', {
            title: 'Dashboard Cliente - MechFinder',
            active: 'dashboard',
            riparazioniAttive,
            riparazioniCompletate,
            meccaniciPreferiti,
            stats: {
                totalRiparazioni: totalRiparazioni ? totalRiparazioni.count : 0,
                riparazioniPerStato: riparazioniPerStato || [],
                spesaTotale: spesaTotale ? spesaTotale.total || 0 : 0
            }
        });
    } catch (err) {
        console.error('Errore nel recupero dati dashboard cliente:', err);
        req.flash('error', 'Si è verificato un errore nel caricamento della dashboard.');
        res.redirect('/');
    }
};

// Profilo cliente
exports.getProfilo = async (req, res) => {
    try {
        // Ottieni i veicoli del cliente
        const veicoli = await db.query(
            'SELECT * FROM veicoli WHERE id_cliente = ?',
            [req.user.id]
        );
        
        // Statistiche riparazioni
        const riparazioniStats = await db.query(
            `SELECT stato, COUNT(*) as count 
             FROM riparazioni 
             WHERE id_cliente = ? 
             GROUP BY stato`,
            [req.user.id]
        );
        
        res.render('cliente/profilo', {
            title: 'Profilo - MechFinder',
            active: 'profile',
            veicoli: veicoli || [],
            riparazioniStats: riparazioniStats || []
        });
    } catch (err) {
        console.error('Errore nel recupero dati profilo cliente:', err);
        req.flash('error', 'Si è verificato un errore nel caricamento del profilo.');
        res.redirect('/cliente/dashboard');
    }
};

// Aggiornamento profilo cliente
exports.updateProfilo = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.flash('error', errors.array().map(err => err.msg).join(', '));
        return res.redirect('/cliente/profilo');
    }

    try {
        // Ottieni dati utente correnti
        const cliente = await Cliente.findById(req.user.id);
        
        // Aggiorna i dati
        cliente.nome = req.body.nome;
        cliente.cognome = req.body.cognome;
        cliente.email = req.body.email;
        cliente.telefono = req.body.telefono;
        cliente.indirizzo = req.body.indirizzo;
        cliente.citta = req.body.citta;
        cliente.cap = req.body.cap;
        
        // Se è stata fornita una password, aggiornala
        if (req.body.password && req.body.password.length >= 6) {
            cliente.password = await bcrypt.hash(req.body.password, 10);
        }
        
        // Gestione dell'immagine avatar
        if (req.files && req.files.avatar) {
            const avatar = req.files.avatar;
            
            // Controlla il formato
            if (!avatar.mimetype.startsWith('image/')) {
                req.flash('error', 'Il file deve essere un\'immagine.');
                return res.redirect('/cliente/profilo');
            }
            
            // Controlla la dimensione (max 5MB)
            if (avatar.size > 5 * 1024 * 1024) {
                req.flash('error', 'Il file è troppo grande. Dimensione massima: 5MB.');
                return res.redirect('/cliente/profilo');
            }
            
            // Crea una cartella per gli upload se non esiste
            const uploadDir = path.join(__dirname, '../public/uploads/clienti');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            
            // Nome del file: id utente + timestamp + estensione originale
            const fileName = `cliente_${cliente.id}_${Date.now()}${path.extname(avatar.name)}`;
            const filePath = path.join(uploadDir, fileName);
            
            // Sposta il file
            await avatar.mv(filePath);
            
            // Aggiorna il percorso dell'avatar nel DB
            cliente.avatar = `/uploads/clienti/${fileName}`;
        }
        
        // Salva i cambiamenti
        await cliente.update();
        
        req.flash('success', 'Profilo aggiornato con successo.');
        res.redirect('/cliente/profilo');
    } catch (err) {
        console.error('Errore nell\'aggiornamento del profilo cliente:', err);
        req.flash('error', 'Si è verificato un errore nell\'aggiornamento del profilo.');
        res.redirect('/cliente/profilo');
    }
};

// Gestione veicoli
exports.getVeicoli = async (req, res) => {
    try {
        const veicoli = await db.query(
            'SELECT * FROM veicoli WHERE id_cliente = ?',
            [req.user.id]
        );
        
        res.render('cliente/veicoli', {
            title: 'I Miei Veicoli - MechFinder',
            active: 'veicoli',
            veicoli: veicoli || []
        });
    } catch (err) {
        console.error('Errore nel recupero dei veicoli:', err);
        req.flash('error', 'Si è verificato un errore nel caricamento dei veicoli.');
        res.redirect('/cliente/profilo');
    }
};

// Aggiungi veicolo
exports.addVeicolo = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.flash('error', errors.array().map(err => err.msg).join(', '));
        return res.redirect('/cliente/veicoli');
    }

    try {
        const nuovoVeicolo = {
            id_cliente: req.user.id,
            marca: req.body.marca,
            modello: req.body.modello,
            anno: req.body.anno,
            targa: req.body.targa,
            tipo: req.body.tipo
        };
        
        await db.run(
            'INSERT INTO veicoli (id_cliente, marca, modello, anno, targa, tipo) VALUES (?, ?, ?, ?, ?, ?)',
            [nuovoVeicolo.id_cliente, nuovoVeicolo.marca, nuovoVeicolo.modello, nuovoVeicolo.anno, nuovoVeicolo.targa, nuovoVeicolo.tipo]
        );
        
        req.flash('success', 'Veicolo aggiunto con successo.');
        res.redirect('/cliente/veicoli');
    } catch (err) {
        console.error('Errore nell\'aggiunta del veicolo:', err);
        req.flash('error', 'Si è verificato un errore nell\'aggiunta del veicolo.');
        res.redirect('/cliente/veicoli');
    }
};

// Modifica veicolo
exports.updateVeicolo = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.flash('error', errors.array().map(err => err.msg).join(', '));
        return res.redirect('/cliente/veicoli');
    }

    try {
        // Verifica che il veicolo appartenga all'utente
        const veicolo = await db.get(
            'SELECT * FROM veicoli WHERE id = ? AND id_cliente = ?',
            [req.params.id, req.user.id]
        );
        
        if (!veicolo) {
            req.flash('error', 'Veicolo non trovato o non autorizzato.');
            return res.redirect('/cliente/veicoli');
        }
        
        await db.run(
            'UPDATE veicoli SET marca = ?, modello = ?, anno = ?, targa = ?, tipo = ? WHERE id = ?',
            [req.body.marca, req.body.modello, req.body.anno, req.body.targa, req.body.tipo, req.params.id]
        );
        
        req.flash('success', 'Veicolo aggiornato con successo.');
        res.redirect('/cliente/veicoli');
    } catch (err) {
        console.error('Errore nell\'aggiornamento del veicolo:', err);
        req.flash('error', 'Si è verificato un errore nell\'aggiornamento del veicolo.');
        res.redirect('/cliente/veicoli');
    }
};

// Elimina veicolo
exports.deleteVeicolo = async (req, res) => {
    try {
        // Verifica che il veicolo appartenga all'utente
        const veicolo = await db.get(
            'SELECT * FROM veicoli WHERE id = ? AND id_cliente = ?',
            [req.params.id, req.user.id]
        );
        
        if (!veicolo) {
            req.flash('error', 'Veicolo non trovato o non autorizzato.');
            return res.redirect('/cliente/veicoli');
        }
        
        // Controlla se ci sono riparazioni associate
        const riparazioni = await db.get(
            'SELECT COUNT(*) as count FROM riparazioni WHERE id_veicolo = ?',
            [req.params.id]
        );
        
        if (riparazioni.count > 0) {
            req.flash('error', 'Non è possibile eliminare il veicolo perché esistono riparazioni associate.');
            return res.redirect('/cliente/veicoli');
        }
        
        await db.run('DELETE FROM veicoli WHERE id = ?', [req.params.id]);
        
        req.flash('success', 'Veicolo eliminato con successo.');
        res.redirect('/cliente/veicoli');
    } catch (err) {
        console.error('Errore nell\'eliminazione del veicolo:', err);
        req.flash('error', 'Si è verificato un errore nell\'eliminazione del veicolo.');
        res.redirect('/cliente/veicoli');
    }
};

// Gestione riparazioni
// Gestione riparazioni
exports.getRiparazioni = async (req, res) => {
    try {
        // Filtra per stato se specificato
        const stato = req.query.stato || '';
        
        // Query base
        let query = `
            SELECT r.*, m.nome as nome_meccanico, m.cognome as cognome_meccanico, 
            m.nome_officina, m.specializzazione, m.avatar as avatar_meccanico,
            v.marca, v.modello, v.targa, v.tipo as tipo_veicolo
            FROM riparazioni r
            JOIN meccanici m ON r.id_meccanico = m.id
            LEFT JOIN veicoli v ON r.id_veicolo = v.id
            WHERE r.id_cliente = ?
        `;
        
        const params = [req.user.id];
        
        // Filtra per stato se specificato
        if (stato) {
            query += ' AND r.stato = ?';
            params.push(stato);
        }
        
        // Ordina per data
        query += ' ORDER BY r.data_richiesta DESC';
        
        const riparazioni = await db.query(query, params);
        
        // Ottieni i veicoli del cliente per il form di richiesta riparazione
        const veicoli = await db.query(
            'SELECT * FROM veicoli WHERE id_cliente = ?',
            [req.user.id]
        );
        
        // Ottieni le specializzazioni dei meccanici per il filtro
        const specializzazioni = await db.query(
            'SELECT DISTINCT specializzazione FROM meccanici WHERE verificato = 1'
        );
        
        res.render('cliente/riparazioni', {
            title: 'Le Mie Riparazioni - MechFinder',
            active: 'riparazioni',
            riparazioni,
            veicoli,
            specializzazioni,
            filtroStato: stato
        });
    } catch (err) {
        console.error('Errore nel recupero delle riparazioni:', err);
        req.flash('error', 'Si è verificato un errore nel caricamento delle riparazioni.');
        res.redirect('/cliente/dashboard');
    }
};

// Dettaglio riparazione
exports.getDettaglioRiparazione = async (req, res) => {
    try {
        // Ottieni dettagli riparazione con query JOIN
        const riparazione = await db.get(
            `SELECT r.*, m.nome as nome_meccanico, m.cognome as cognome_meccanico, 
            m.nome_officina, m.specializzazione, m.email as email_meccanico,
            m.telefono as telefono_meccanico, m.avatar as avatar_meccanico,
            v.marca, v.modello, v.anno, v.targa, v.tipo as tipo_veicolo
            FROM riparazioni r
            JOIN meccanici m ON r.id_meccanico = m.id
            LEFT JOIN veicoli v ON r.id_veicolo = v.id
            WHERE r.id = ? AND r.id_cliente = ?`,
            [req.params.id, req.user.id]
        );
        
        if (!riparazione) {
            req.flash('error', 'Riparazione non trovata o non autorizzata.');
            return res.redirect('/cliente/riparazioni');
        }
        
        // Ottieni preventivo se disponibile
        const preventivo = await db.get(
            'SELECT * FROM preventivi WHERE id_riparazione = ? ORDER BY data_creazione DESC LIMIT 1',
            [riparazione.id]
        );
        
        // Ottieni commenti/messaggi
        const commenti = await db.query(
            `SELECT c.*, 
             CASE 
                WHEN c.tipo_utente = 'cliente' THEN cl.nome || ' ' || cl.cognome
                WHEN c.tipo_utente = 'meccanico' THEN m.nome || ' ' || m.cognome
             END as nome_utente,
             CASE 
                WHEN c.tipo_utente = 'cliente' THEN cl.avatar
                WHEN c.tipo_utente = 'meccanico' THEN m.avatar
             END as avatar_utente
             FROM commenti c
             LEFT JOIN clienti cl ON c.id_utente = cl.id AND c.tipo_utente = 'cliente'
             LEFT JOIN meccanici m ON c.id_utente = m.id AND c.tipo_utente = 'meccanico'
             WHERE c.id_riparazione = ?
             ORDER BY c.data_creazione ASC`,
            [riparazione.id]
        );
        
        res.render('cliente/dettaglio-riparazione', {
            title: 'Dettaglio Riparazione - MechFinder',
            active: 'riparazioni',
            riparazione,
            preventivo,
            commenti
        });
    } catch (err) {
        console.error('Errore nel recupero del dettaglio riparazione:', err);
        req.flash('error', 'Si è verificato un errore nel caricamento del dettaglio riparazione.');
        res.redirect('/cliente/riparazioni');
    }
};

// Richiedi riparazione
exports.richiediRiparazione = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.flash('error', errors.array().map(err => err.msg).join(', '));
        return res.redirect('/cliente/riparazioni');
    }

    try {
        const nuovaRiparazione = {
            id_cliente: req.user.id,
            id_meccanico: req.body.id_meccanico,
            id_veicolo: req.body.id_veicolo || null,
            descrizione: req.body.descrizione,
            tipo_problema: req.body.tipo_problema || 'Generale',
            priorita: req.body.priorita || 'normale',
            stato: 'richiesta',
            data_richiesta: new Date()
        };
        
        const result = await db.run(
            `INSERT INTO riparazioni 
             (id_cliente, id_meccanico, id_veicolo, descrizione, tipo_problema, priorita, stato, data_richiesta) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [nuovaRiparazione.id_cliente, nuovaRiparazione.id_meccanico, nuovaRiparazione.id_veicolo,
             nuovaRiparazione.descrizione, nuovaRiparazione.tipo_problema, nuovaRiparazione.priorita,
             nuovaRiparazione.stato, nuovaRiparazione.data_richiesta]
        );
        
        // Aggiungi il primo commento con la descrizione del problema
        await db.run(
            `INSERT INTO commenti 
             (id_riparazione, id_utente, tipo_utente, messaggio, data_creazione) 
             VALUES (?, ?, ?, ?, ?)`,
            [result.lastID, req.user.id, 'cliente', nuovaRiparazione.descrizione, new Date()]
        );
        
        req.flash('success', 'Richiesta di riparazione inviata con successo.');
        res.redirect(`/cliente/riparazioni/${result.lastID}`);
    } catch (err) {
        console.error('Errore nella richiesta di riparazione:', err);
        req.flash('error', 'Si è verificato un errore nell\'invio della richiesta di riparazione.');
        res.redirect('/cliente/riparazioni');
    }
};

// Accetta preventivo
exports.accettaPreventivo = async (req, res) => {
    try {
        // Verifica che la riparazione appartenga all'utente
        const riparazione = await db.get(
            'SELECT * FROM riparazioni WHERE id = ? AND id_cliente = ?',
            [req.params.id, req.user.id]
        );
        
        if (!riparazione) {
            req.flash('error', 'Riparazione non trovata o non autorizzata.');
            return res.redirect('/cliente/riparazioni');
        }
        
        // Verifica che lo stato sia "preventivo"
        if (riparazione.stato !== 'preventivo') {
            req.flash('error', 'Questa riparazione non ha un preventivo attivo.');
            return res.redirect(`/cliente/riparazioni/${req.params.id}`);
        }
        
        // Aggiorna lo stato della riparazione
        await db.run(
            'UPDATE riparazioni SET stato = ?, data_accettazione = ? WHERE id = ?',
            ['accettata', new Date(), req.params.id]
        );
        
        // Aggiorna lo stato del preventivo
        await db.run(
            'UPDATE preventivi SET stato = ? WHERE id_riparazione = ? AND stato = ?',
            ['accettato', req.params.id, 'in_attesa']
        );
        
        // Aggiungi commento automatico
        await db.run(
            `INSERT INTO commenti 
             (id_riparazione, id_utente, tipo_utente, messaggio, data_creazione, automatico) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [req.params.id, req.user.id, 'cliente', 'Il preventivo è stato accettato.', new Date(), 1]
        );
        
        req.flash('success', 'Preventivo accettato con successo.');
        res.redirect(`/cliente/riparazioni/${req.params.id}`);
    } catch (err) {
        console.error('Errore nell\'accettazione del preventivo:', err);
        req.flash('error', 'Si è verificato un errore nell\'accettazione del preventivo.');
        res.redirect(`/cliente/riparazioni/${req.params.id}`);
    }
};

// Rifiuta preventivo
exports.rifiutaPreventivo = async (req, res) => {
    try {
        // Verifica che la riparazione appartenga all'utente
        const riparazione = await db.get(
            'SELECT * FROM riparazioni WHERE id = ? AND id_cliente = ?',
            [req.params.id, req.user.id]
        );
        
        if (!riparazione) {
            req.flash('error', 'Riparazione non trovata o non autorizzata.');
            return res.redirect('/cliente/riparazioni');
        }
        
        // Verifica che lo stato sia "preventivo"
        if (riparazione.stato !== 'preventivo') {
            req.flash('error', 'Questa riparazione non ha un preventivo attivo.');
            return res.redirect(`/cliente/riparazioni/${req.params.id}`);
        }
        
        // Aggiorna lo stato della riparazione
        await db.run(
            'UPDATE riparazioni SET stato = ?, note = ? WHERE id = ?',
            ['richiesta', req.body.motivazione || 'Preventivo rifiutato', req.params.id]
        );
        
        // Aggiorna lo stato del preventivo
        await db.run(
            'UPDATE preventivi SET stato = ? WHERE id_riparazione = ? AND stato = ?',
            ['rifiutato', req.params.id, 'in_attesa']
        );
        
        // Aggiungi commento automatico
        await db.run(
            `INSERT INTO commenti 
             (id_riparazione, id_utente, tipo_utente, messaggio, data_creazione, automatico) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [req.params.id, req.user.id, 'cliente', 
             `Il preventivo è stato rifiutato. Motivazione: ${req.body.motivazione || 'Non specificata'}`, 
             new Date(), 1]
        );
        
        req.flash('success', 'Preventivo rifiutato. La richiesta è stata riportata allo stato iniziale.');
        res.redirect(`/cliente/riparazioni/${req.params.id}`);
    } catch (err) {
        console.error('Errore nel rifiuto del preventivo:', err);
        req.flash('error', 'Si è verificato un errore nel rifiuto del preventivo.');
        res.redirect(`/cliente/riparazioni/${req.params.id}`);
    }
};

// Aggiungi commento
exports.aggiungiCommento = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.flash('error', errors.array().map(err => err.msg).join(', '));
        return res.redirect(`/cliente/riparazioni/${req.params.id}`);
    }

    try {
        // Verifica che la riparazione appartenga all'utente
        const riparazione = await db.get(
            'SELECT * FROM riparazioni WHERE id = ? AND id_cliente = ?',
            [req.params.id, req.user.id]
        );
        
        if (!riparazione) {
            req.flash('error', 'Riparazione non trovata o non autorizzata.');
            return res.redirect('/cliente/riparazioni');
        }
        
        // Aggiungi commento
        await db.run(
            `INSERT INTO commenti 
             (id_riparazione, id_utente, tipo_utente, messaggio, data_creazione) 
             VALUES (?, ?, ?, ?, ?)`,
            [req.params.id, req.user.id, 'cliente', req.body.messaggio, new Date()]
        );
        
        req.flash('success', 'Commento aggiunto con successo.');
        res.redirect(`/cliente/riparazioni/${req.params.id}`);
    } catch (err) {
        console.error('Errore nell\'aggiunta del commento:', err);
        req.flash('error', 'Si è verificato un errore nell\'aggiunta del commento.');
        res.redirect(`/cliente/riparazioni/${req.params.id}`);
    }
};

// Lascia recensione
exports.lasciaRecensione = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.flash('error', errors.array().map(err => err.msg).join(', '));
        return res.redirect(`/cliente/riparazioni/${req.params.id}`);
    }

    try {
        // Verifica che la riparazione appartenga all'utente
        const riparazione = await db.get(
            'SELECT * FROM riparazioni WHERE id = ? AND id_cliente = ? AND stato = ?',
            [req.params.id, req.user.id, 'completata']
        );
        
        if (!riparazione) {
            req.flash('error', 'Riparazione non trovata, non autorizzata o non completata.');
            return res.redirect('/cliente/riparazioni');
        }
        
        // Verifica se esiste già una recensione
        const recensioneEsistente = await db.get(
            'SELECT * FROM recensioni WHERE id_riparazione = ?',
            [req.params.id]
        );
        
        if (recensioneEsistente) {
            req.flash('error', 'Hai già lasciato una recensione per questa riparazione.');
            return res.redirect(`/cliente/riparazioni/${req.params.id}`);
        }
        
        // Crea la recensione
        await db.run(
            `INSERT INTO recensioni 
             (id_cliente, id_meccanico, id_riparazione, valutazione, commento, data_recensione) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [req.user.id, riparazione.id_meccanico, req.params.id, 
             req.body.valutazione, req.body.commento, new Date()]
        );
        
        // Aggiorna valutazione media del meccanico
        await db.run(`
            UPDATE meccanici 
            SET valutazione = (
                SELECT AVG(valutazione) 
                FROM recensioni 
                WHERE id_meccanico = ?
            ),
            numero_recensioni = (
                SELECT COUNT(*) 
                FROM recensioni 
                WHERE id_meccanico = ?
            )
            WHERE id = ?
        `, [riparazione.id_meccanico, riparazione.id_meccanico, riparazione.id_meccanico]);
        
        req.flash('success', 'Recensione pubblicata con successo.');
        res.redirect(`/cliente/riparazioni/${req.params.id}`);
    } catch (err) {
        console.error('Errore nella pubblicazione della recensione:', err);
        req.flash('error', 'Si è verificato un errore nella pubblicazione della recensione.');
        res.redirect(`/cliente/riparazioni/${req.params.id}`);
    }
};