"use strict";

const { validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const { Meccanico } = require('../models/utente');
const { Riparazione } = require('../models/riparazione');
const db = require('../database/db');
const path = require('path');
const fs = require('fs');

// Dashboard meccanico
exports.getDashboard = async (req, res) => {
    try {
        // Ottiene le riparazioni in corso
        const riparazioniInCorso = await db.query(
            `SELECT r.*, c.nome as nome_cliente, c.cognome as cognome_cliente, 
             c.avatar as avatar_cliente, v.marca, v.modello, v.targa
             FROM riparazioni r
             JOIN clienti c ON r.id_cliente = c.id
             LEFT JOIN veicoli v ON r.id_veicolo = v.id
             WHERE r.id_meccanico = ? AND r.stato IN ('in_corso', 'accettata')
             ORDER BY r.data_richiesta DESC`,
            [req.user.id]
        );
        
        // Ottiene le richieste in attesa
        const richiestePendenti = await db.query(
            `SELECT r.*, c.nome as nome_cliente, c.cognome as cognome_cliente, 
             c.avatar as avatar_cliente, v.marca, v.modello, v.targa
             FROM riparazioni r
             JOIN clienti c ON r.id_cliente = c.id
             LEFT JOIN veicoli v ON r.id_veicolo = v.id
             WHERE r.id_meccanico = ? AND r.stato IN ('richiesta', 'preventivo')
             ORDER BY r.data_richiesta DESC`,
            [req.user.id]
        );
        
        // Ottiene le ultime riparazioni completate
        const riparazioniCompletate = await db.query(
            `SELECT r.*, c.nome as nome_cliente, c.cognome as cognome_cliente,
             c.avatar as avatar_cliente, v.marca, v.modello, v.targa
             FROM riparazioni r
             JOIN clienti c ON r.id_cliente = c.id
             LEFT JOIN veicoli v ON r.id_veicolo = v.id
             WHERE r.id_meccanico = ? AND r.stato = 'completata'
             ORDER BY r.data_completamento DESC
             LIMIT 5`,
            [req.user.id]
        );
        
        // Ottiene le ultime recensioni
        const recensioniRecenti = await db.query(
            `SELECT r.*, c.nome as nome_cliente, c.cognome as cognome_cliente,
             c.avatar as avatar_cliente, rip.descrizione as descrizione_riparazione
             FROM recensioni r
             JOIN clienti c ON r.id_cliente = c.id
             JOIN riparazioni rip ON r.id_riparazione = rip.id
             WHERE r.id_meccanico = ?
             ORDER BY r.data_recensione DESC
             LIMIT 3`,
            [req.user.id]
        );
        
        // Statistiche
        // Numero totale di riparazioni
        const totalRiparazioni = await db.get(
            'SELECT COUNT(*) as count FROM riparazioni WHERE id_meccanico = ?',
            [req.user.id]
        );
        
        // Numero di riparazioni per stato
        const riparazioniPerStato = await db.query(
            `SELECT stato, COUNT(*) as count 
             FROM riparazioni 
             WHERE id_meccanico = ? 
             GROUP BY stato`,
            [req.user.id]
        );
        
        // Incasso totale
        const incassoTotale = await db.get(
            'SELECT SUM(costo) as total FROM riparazioni WHERE id_meccanico = ? AND stato = ? AND costo > 0',
            [req.user.id, 'completata']
        );
        
        // Valutazione media
        const valutazione = await db.get(
            'SELECT valutazione, numero_recensioni FROM meccanici WHERE id = ?',
            [req.user.id]
        );
        
        res.render('meccanico/dashboard', {
            title: 'Dashboard Meccanico - MechFinder',
            active: 'dashboard',
            riparazioniInCorso,
            richiestePendenti,
            riparazioniCompletate,
            recensioniRecenti,
            stats: {
                totalRiparazioni: totalRiparazioni ? totalRiparazioni.count : 0,
                riparazioniPerStato: riparazioniPerStato || [],
                incassoTotale: incassoTotale ? incassoTotale.total || 0 : 0,
                valutazione: valutazione ? valutazione.valutazione : 0,
                numeroRecensioni: valutazione ? valutazione.numero_recensioni : 0
            }
        });
    } catch (err) {
        console.error('Errore nel recupero dati dashboard meccanico:', err);
        req.flash('error', 'Si è verificato un errore nel caricamento della dashboard.');
        res.redirect('/');
    }
};
// Profilo meccanico
exports.getProfilo = async (req, res) => {
    try {
        // Ottieni i servizi offerti dal meccanico
        const servizi = await db.query(
            `SELECT s.*, sm.prezzo, sm.attivo 
             FROM servizi s
             LEFT JOIN servizi_meccanici sm ON s.id = sm.id_servizio AND sm.id_meccanico = ?`,
            [req.user.id]
        );
        
        // Ottieni gli orari di apertura
        const orari = await db.query(
            'SELECT * FROM orari_meccanici WHERE id_meccanico = ? ORDER BY giorno',
            [req.user.id]
        );
        
        // Ottieni le recensioni
        const recensioni = await db.query(
            `SELECT r.*, c.nome as nome_cliente, c.cognome as cognome_cliente, c.avatar as avatar_cliente,
             rip.descrizione as descrizione_riparazione
             FROM recensioni r
             JOIN clienti c ON r.id_cliente = c.id
             JOIN riparazioni rip ON r.id_riparazione = rip.id
             WHERE r.id_meccanico = ?
             ORDER BY r.data_recensione DESC
             LIMIT 5`,
            [req.user.id]
        );
        
        // Statistiche riparazioni
        const riparazioniStats = await db.query(
            `SELECT stato, COUNT(*) as count 
             FROM riparazioni 
             WHERE id_meccanico = ? 
             GROUP BY stato`,
            [req.user.id]
        );
        
        res.render('meccanico/profilo', {
            title: 'Profilo Meccanico - MechFinder',
            active: 'profile',
            servizi: servizi || [],
            orari: orari || [],
            recensioni: recensioni || [],
            riparazioniStats: riparazioniStats || []
        });
    } catch (err) {
        console.error('Errore nel recupero dati profilo meccanico:', err);
        req.flash('error', 'Si è verificato un errore nel caricamento del profilo.');
        res.redirect('/meccanico/dashboard');
    }
};

// Aggiornamento profilo meccanico
exports.updateProfilo = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.flash('error', errors.array().map(err => err.msg).join(', '));
        return res.redirect('/meccanico/profilo');
    }

    try {
        // Ottieni dati utente correnti
        const meccanico = await Meccanico.findById(req.user.id);
        
        // Aggiorna i dati
        meccanico.nome = req.body.nome;
        meccanico.cognome = req.body.cognome;
        meccanico.email = req.body.email;
        meccanico.nome_officina = req.body.nome_officina;
        meccanico.specializzazione = req.body.specializzazione;
        meccanico.telefono = req.body.telefono;
        meccanico.indirizzo = req.body.indirizzo;
        meccanico.citta = req.body.citta;
        meccanico.cap = req.body.cap;
        meccanico.descrizione = req.body.descrizione;
        
        // Se è stata fornita una password, aggiornala
        if (req.body.password && req.body.password.length >= 6) {
            meccanico.password = await bcrypt.hash(req.body.password, 10);
        }
        
        // Gestione dell'immagine avatar
        if (req.files && req.files.avatar) {
            const avatar = req.files.avatar;
            
            // Controlla il formato
            if (!avatar.mimetype.startsWith('image/')) {
                req.flash('error', 'Il file deve essere un\'immagine.');
                return res.redirect('/meccanico/profilo');
            }
            
            // Controlla la dimensione (max 5MB)
            if (avatar.size > 5 * 1024 * 1024) {
                req.flash('error', 'Il file è troppo grande. Dimensione massima: 5MB.');
                return res.redirect('/meccanico/profilo');
            }
            
            // Crea una cartella per gli upload se non esiste
            const uploadDir = path.join(__dirname, '../public/uploads/meccanici');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            
            // Nome del file: id utente + timestamp + estensione originale
            const fileName = `meccanico_${meccanico.id}_${Date.now()}${path.extname(avatar.name)}`;
            const filePath = path.join(uploadDir, fileName);
            
            // Sposta il file
            await avatar.mv(filePath);
            
            // Aggiorna il percorso dell'avatar nel DB
            meccanico.avatar = `/uploads/meccanici/${fileName}`;
        }
        
        // Salva i cambiamenti
        await meccanico.update();
        
        req.flash('success', 'Profilo aggiornato con successo.');
        res.redirect('/meccanico/profilo');
    } catch (err) {
        console.error('Errore nell\'aggiornamento del profilo meccanico:', err);
        req.flash('error', 'Si è verificato un errore nell\'aggiornamento del profilo.');
        res.redirect('/meccanico/profilo');
    }
};

// Aggiorna orari
exports.updateOrari = async (req, res) => {
    try {
        // Elimina orari esistenti
        await db.run('DELETE FROM orari_meccanici WHERE id_meccanico = ?', [req.user.id]);
        
        // Inserisci i nuovi orari
        for (let i = 0; i < 7; i++) {
            const chiuso = req.body[`chiuso_${i}`] === 'on';
            
            await db.run(
                `INSERT INTO orari_meccanici 
                 (id_meccanico, giorno, apertura, chiusura, pausa_inizio, pausa_fine, chiuso) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    req.user.id,
                    i,
                    chiuso ? null : req.body[`apertura_${i}`],
                    chiuso ? null : req.body[`chiusura_${i}`],
                    chiuso ? null : req.body[`pausa_inizio_${i}`] || null,
                    chiuso ? null : req.body[`pausa_fine_${i}`] || null,
                    chiuso ? 1 : 0
                ]
            );
        }
        
        req.flash('success', 'Orari aggiornati con successo.');
        res.redirect('/meccanico/profilo');
    } catch (err) {
        console.error('Errore nell\'aggiornamento degli orari:', err);
        req.flash('error', 'Si è verificato un errore nell\'aggiornamento degli orari.');
        res.redirect('/meccanico/profilo');
    }
};

// Gestione servizi
exports.updateServizi = async (req, res) => {
    try {
        // Ottieni tutti i servizi disponibili
        const servizi = await db.query('SELECT id FROM servizi');
        
        // Per ogni servizio, aggiorna o inserisci il record nella tabella servizi_meccanici
        for (const servizio of servizi) {
            const id_servizio = servizio.id;
            const prezzo = parseFloat(req.body[`prezzo_${id_servizio}`] || 0);
            const attivo = req.body[`attivo_${id_servizio}`] === 'on' ? 1 : 0;
            
            // Verifica se esiste già un record
            const servizioEsistente = await db.get(
                'SELECT * FROM servizi_meccanici WHERE id_meccanico = ? AND id_servizio = ?',
                [req.user.id, id_servizio]
            );
            
            if (servizioEsistente) {
                // Aggiorna
                await db.run(
                    'UPDATE servizi_meccanici SET prezzo = ?, attivo = ? WHERE id_meccanico = ? AND id_servizio = ?',
                    [prezzo, attivo, req.user.id, id_servizio]
                );
            } else {
                // Inserisci nuovo
                await db.run(
                    'INSERT INTO servizi_meccanici (id_meccanico, id_servizio, prezzo, attivo) VALUES (?, ?, ?, ?)',
                    [req.user.id, id_servizio, prezzo, attivo]
                );
            }
        }
        
        req.flash('success', 'Servizi aggiornati con successo.');
        res.redirect('/meccanico/profilo');
    } catch (err) {
        console.error('Errore nell\'aggiornamento dei servizi:', err);
        req.flash('error', 'Si è verificato un errore nell\'aggiornamento dei servizi.');
        res.redirect('/meccanico/profilo');
    }
};

// Gestione riparazioni
exports.getRiparazioni = async (req, res) => {
    try {
        // Filtra per stato se specificato
        const stato = req.query.stato || '';
        
        // Query base
        let query = `
            SELECT r.*, c.nome as nome_cliente, c.cognome as cognome_cliente, 
            c.avatar as avatar_cliente, c.telefono as telefono_cliente,
            v.marca, v.modello, v.targa, v.tipo as tipo_veicolo
            FROM riparazioni r
            JOIN clienti c ON r.id_cliente = c.id
            LEFT JOIN veicoli v ON r.id_veicolo = v.id
            WHERE r.id_meccanico = ?
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
        
        res.render('meccanico/riparazioni', {
            title: 'Gestione Riparazioni - MechFinder',
            active: 'riparazioni',
            riparazioni,
            filtroStato: stato
        });
    } catch (err) {
        console.error('Errore nel recupero delle riparazioni:', err);
        req.flash('error', 'Si è verificato un errore nel caricamento delle riparazioni.');
        res.redirect('/meccanico/dashboard');
    }
};

// Dettaglio riparazione
exports.getDettaglioRiparazione = async (req, res) => {
    try {
        // Ottieni dettagli riparazione con query JOIN
        const riparazione = await db.get(
            `SELECT r.*, c.nome as nome_cliente, c.cognome as cognome_cliente, 
            c.email as email_cliente, c.telefono as telefono_cliente, c.avatar as avatar_cliente,
            v.marca, v.modello, v.anno, v.targa, v.tipo as tipo_veicolo
            FROM riparazioni r
            JOIN clienti c ON r.id_cliente = c.id
            LEFT JOIN veicoli v ON r.id_veicolo = v.id
            WHERE r.id = ? AND r.id_meccanico = ?`,
            [req.params.id, req.user.id]
        );
        
        if (!riparazione) {
            req.flash('error', 'Riparazione non trovata o non autorizzata.');
            return res.redirect('/meccanico/riparazioni');
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
        
        res.render('meccanico/dettaglio-riparazione', {
            title: 'Dettaglio Riparazione - MechFinder',
            active: 'riparazioni',
            riparazione,
            preventivo,
            commenti
        });
    } catch (err) {
        console.error('Errore nel recupero del dettaglio riparazione:', err);
        req.flash('error', 'Si è verificato un errore nel caricamento del dettaglio riparazione.');
        res.redirect('/meccanico/riparazioni');
    }
};

// Crea preventivo
exports.creaPreventivo = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.flash('error', errors.array().map(err => err.msg).join(', '));
        return res.redirect(`/meccanico/riparazioni/${req.params.id}`);
    }

    try {
        // Verifica che la riparazione appartenga al meccanico
        const riparazione = await db.get(
            'SELECT * FROM riparazioni WHERE id = ? AND id_meccanico = ?',
            [req.params.id, req.user.id]
        );
        
        if (!riparazione) {
            req.flash('error', 'Riparazione non trovata o non autorizzata.');
            return res.redirect('/meccanico/riparazioni');
        }
        
        // Verifica che lo stato sia "richiesta" o "preventivo"
        if (riparazione.stato !== 'richiesta' && riparazione.stato !== 'preventivo') {
            req.flash('error', 'Non è possibile creare un preventivo per questa riparazione nel suo stato attuale.');
            return res.redirect(`/meccanico/riparazioni/${req.params.id}`);
        }
        
        // Crea il preventivo
        const giorni_validita = parseInt(req.body.giorni_validita) || 7;
        const data_scadenza = new Date();
        data_scadenza.setDate(data_scadenza.getDate() + giorni_validita);
        
        await db.run(
            `INSERT INTO preventivi 
             (id_riparazione, importo, descrizione, data_creazione, data_scadenza, stato) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [req.params.id, req.body.importo, req.body.descrizione, new Date(), data_scadenza, 'in_attesa']
        );
        
        // Aggiorna lo stato della riparazione
        await db.run(
            'UPDATE riparazioni SET stato = ? WHERE id = ?',
            ['preventivo', req.params.id]
        );
        
        // Aggiungi commento automatico
        await db.run(
            `INSERT INTO commenti 
             (id_riparazione, id_utente, tipo_utente, messaggio, data_creazione, automatico) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [req.params.id, req.user.id, 'meccanico', 'È stato creato un nuovo preventivo.', new Date(), 1]
        );
        
        req.flash('success', 'Preventivo creato con successo.');
        res.redirect(`/meccanico/riparazioni/${req.params.id}`);
    } catch (err) {
        console.error('Errore nella creazione del preventivo:', err);
        req.flash('error', 'Si è verificato un errore nella creazione del preventivo.');
        res.redirect(`/meccanico/riparazioni/${req.params.id}`);
    }
};

// Inizia lavoro
exports.iniziaLavoro = async (req, res) => {
    try {
        // Verifica che la riparazione appartenga al meccanico
        const riparazione = await db.get(
            'SELECT * FROM riparazioni WHERE id = ? AND id_meccanico = ?',
            [req.params.id, req.user.id]
        );
        
        if (!riparazione) {
            req.flash('error', 'Riparazione non trovata o non autorizzata.');
            return res.redirect('/meccanico/riparazioni');
        }
        
        // Verifica che lo stato sia "accettata"
        if (riparazione.stato !== 'accettata') {
            req.flash('error', 'Non è possibile iniziare il lavoro su questa riparazione nel suo stato attuale.');
            return res.redirect(`/meccanico/riparazioni/${req.params.id}`);
        }
        
        // Aggiorna lo stato della riparazione
        await db.run(
            'UPDATE riparazioni SET stato = ?, data_inizio = ? WHERE id = ?',
            ['in_corso', new Date(), req.params.id]
        );
        
        // Aggiungi commento automatico
        await db.run(
            `INSERT INTO commenti 
             (id_riparazione, id_utente, tipo_utente, messaggio, data_creazione, automatico) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [req.params.id, req.user.id, 'meccanico', 'Il lavoro sulla riparazione è iniziato.', new Date(), 1]
        );
        
        req.flash('success', 'Lavoro iniziato. Stato riparazione aggiornato.');
        res.redirect(`/meccanico/riparazioni/${req.params.id}`);
    } catch (err) {
        console.error('Errore nell\'aggiornamento dello stato della riparazione:', err);
        req.flash('error', 'Si è verificato un errore nell\'aggiornamento dello stato della riparazione.');
        res.redirect(`/meccanico/riparazioni/${req.params.id}`);
    }
};

// Completa riparazione
exports.completaRiparazione = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.flash('error', errors.array().map(err => err.msg).join(', '));
        return res.redirect(`/meccanico/riparazioni/${req.params.id}`);
    }

    try {
        // Verifica che la riparazione appartenga al meccanico
        const riparazione = await db.get(
            'SELECT * FROM riparazioni WHERE id = ? AND id_meccanico = ?',
            [req.params.id, req.user.id]
        );
        
        if (!riparazione) {
            req.flash('error', 'Riparazione non trovata o non autorizzata.');
            return res.redirect('/meccanico/riparazioni');
        }
        
        // Verifica che lo stato sia "in_corso"
        if (riparazione.stato !== 'in_corso') {
            req.flash('error', 'Non è possibile completare questa riparazione nel suo stato attuale.');
            return res.redirect(`/meccanico/riparazioni/${req.params.id}`);
        }
        
        // Aggiorna lo stato della riparazione
        await db.run(
            `UPDATE riparazioni SET 
             stato = ?, data_completamento = ?, descrizione_intervento = ?, costo = ?
             WHERE id = ?`,
            ['completata', new Date(), req.body.descrizione_intervento, req.body.costo, req.params.id]
        );
        
        // Aggiungi commento automatico
        await db.run(
            `INSERT INTO commenti 
             (id_riparazione, id_utente, tipo_utente, messaggio, data_creazione, automatico) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [req.params.id, req.user.id, 'meccanico', 'La riparazione è stata completata.', new Date(), 1]
        );
        
        req.flash('success', 'Riparazione completata con successo.');
        res.redirect(`/meccanico/riparazioni/${req.params.id}`);
    } catch (err) {
        console.error('Errore nel completamento della riparazione:', err);
        req.flash('error', 'Si è verificato un errore nel completamento della riparazione.');
        res.redirect(`/meccanico/riparazioni/${req.params.id}`);
    }
};

// Rifiuta riparazione
exports.rifiutaRiparazione = async (req, res) => {
    try {
        // Verifica che la riparazione appartenga al meccanico
        const riparazione = await db.get(
            'SELECT * FROM riparazioni WHERE id = ? AND id_meccanico = ?',
            [req.params.id, req.user.id]
        );
        
        if (!riparazione) {
            req.flash('error', 'Riparazione non trovata o non autorizzata.');
            return res.redirect('/meccanico/riparazioni');
        }
        
        // Verifica che lo stato sia compatibile con il rifiuto
        if (riparazione.stato !== 'richiesta' && riparazione.stato !== 'preventivo') {
            req.flash('error', 'Non è possibile rifiutare questa riparazione nel suo stato attuale.');
            return res.redirect(`/meccanico/riparazioni/${req.params.id}`);
        }
        
        // Aggiorna lo stato della riparazione
        await db.run(
            'UPDATE riparazioni SET stato = ?, note = ? WHERE id = ?',
            ['rifiutata', req.body.motivazione || 'Riparazione rifiutata dal meccanico', req.params.id]
        );
        
        // Aggiungi commento automatico
        await db.run(
            `INSERT INTO commenti 
             (id_riparazione, id_utente, tipo_utente, messaggio, data_creazione, automatico) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [req.params.id, req.user.id, 'meccanico', 
             `La riparazione è stata rifiutata. Motivazione: ${req.body.motivazione || 'Non specificata'}`, 
             new Date(), 1]
        );
        
        req.flash('success', 'Riparazione rifiutata.');
        res.redirect('/meccanico/riparazioni');
    } catch (err) {
        console.error('Errore nel rifiuto della riparazione:', err);
        req.flash('error', 'Si è verificato un errore nel rifiuto della riparazione.');
        res.redirect(`/meccanico/riparazioni/${req.params.id}`);
    }
};

// Aggiungi commento
exports.aggiungiCommento = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.flash('error', errors.array().map(err => err.msg).join(', '));
        return res.redirect(`/meccanico/riparazioni/${req.params.id}`);
    }

    try {
        // Verifica che la riparazione appartenga al meccanico
        const riparazione = await db.get(
            'SELECT * FROM riparazioni WHERE id = ? AND id_meccanico = ?',
            [req.params.id, req.user.id]
        );
        
        if (!riparazione) {
            req.flash('error', 'Riparazione non trovata o non autorizzata.');
            return res.redirect('/meccanico/riparazioni');
        }
        
        // Aggiungi commento
        await db.run(
            `INSERT INTO commenti 
             (id_riparazione, id_utente, tipo_utente, messaggio, data_creazione) 
             VALUES (?, ?, ?, ?, ?)`,
            [req.params.id, req.user.id, 'meccanico', req.body.messaggio, new Date()]
        );
        
        req.flash('success', 'Commento aggiunto con successo.');
        res.redirect(`/meccanico/riparazioni/${req.params.id}`);
    } catch (err) {
        console.error('Errore nell\'aggiunta del commento:', err);
        req.flash('error', 'Si è verificato un errore nell\'aggiunta del commento.');
        res.redirect(`/meccanico/riparazioni/${req.params.id}`);
    }
};