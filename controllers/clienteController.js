"use strict";

const { validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const { Cliente } = require('../models/utente');
const db = require('../database/db');
const path = require('path');
const fs = require('fs');

const clienteController = {
    // Dashboard cliente
    getDashboard: async (req, res) => {
        try {
            const clienteId = req.user.id;

            // Recupera tutte le riparazioni del cliente
            const tutteRiparazioni = await db.all(`
                SELECT r.*, m.nome as meccanico_nome, m.cognome as meccanico_cognome, 
                       m.nome_officina, m.specializzazione, m.avatar as avatar_meccanico,
                       v.marca as veicolo_marca, v.modello as veicolo_modello, 
                       v.anno as veicolo_anno, v.tipo as tipo_veicolo
                FROM riparazioni r
                LEFT JOIN meccanici m ON r.id_meccanico = m.id
                LEFT JOIN veicoli v ON r.id_veicolo = v.id
                WHERE r.id_cliente = ?
                ORDER BY r.data_richiesta DESC
            `, [clienteId]);
            
            // Riparazioni attive (non completate o rifiutate)
            const riparazioniAttive = await db.all(`
                SELECT r.*, m.nome as nome_meccanico, m.cognome as cognome_meccanico, 
                       m.nome_officina, m.specializzazione, m.avatar as avatar_meccanico,
                       v.marca, v.modello, v.anno, v.targa
                FROM riparazioni r
                LEFT JOIN meccanici m ON r.id_meccanico = m.id
                LEFT JOIN veicoli v ON r.id_veicolo = v.id
                WHERE r.id_cliente = ? AND r.stato NOT IN ('completata', 'rifiutata', 'annullata')
                ORDER BY r.data_richiesta DESC
            `, [clienteId]);
            
            // Veicoli del cliente
            const veicoli = await db.all(
                'SELECT * FROM veicoli WHERE id_cliente = ? ORDER BY id DESC',
                [clienteId]
            );
            
            // Riparazioni completate recenti
            const riparazioniCompletate = await db.all(`
                SELECT r.*, m.nome as nome_meccanico, m.cognome as cognome_meccanico,
                       m.nome_officina, m.specializzazione, m.avatar as avatar_meccanico,
                       v.marca, v.modello, v.anno, v.targa
                FROM riparazioni r
                LEFT JOIN meccanici m ON r.id_meccanico = m.id
                LEFT JOIN veicoli v ON r.id_veicolo = v.id
                WHERE r.id_cliente = ? AND r.stato = 'completata'
                ORDER BY r.data_completamento DESC
                LIMIT 5
            `, [clienteId]);
            
            // Meccanici preferiti (con cui ha fatto più riparazioni)
            const meccaniciPreferiti = await db.all(`
                SELECT m.id, m.nome, m.cognome, m.nome_officina, m.specializzazione, 
                       m.valutazione, m.avatar, COUNT(r.id) as num_riparazioni
                FROM riparazioni r
                JOIN meccanici m ON r.id_meccanico = m.id
                WHERE r.id_cliente = ? AND r.stato = 'completata'
                GROUP BY m.id
                ORDER BY num_riparazioni DESC
                LIMIT 3
            `, [clienteId]);
            
            // Statistiche
            const totalRiparazioni = await db.get(
                'SELECT COUNT(*) as count FROM riparazioni WHERE id_cliente = ?',
                [clienteId]
            );
            
            const riparazioniPerStato = await db.all(`
                SELECT stato, COUNT(*) as count 
                FROM riparazioni 
                WHERE id_cliente = ? 
                GROUP BY stato
            `, [clienteId]);
            
            const spesaTotale = await db.get(
                'SELECT SUM(costo) as total FROM riparazioni WHERE id_cliente = ? AND costo > 0',
                [clienteId]
            );

            // Notifiche non lette
            const notifiche = await db.all(`
                SELECT * FROM notifiche 
                WHERE id_utente = ? AND tipo_utente = 'cliente' AND letta = 0
                ORDER BY data_creazione DESC
                LIMIT 10
            `, [clienteId]);
            
            res.render('cliente/dashboard_complete', {
                title: 'Dashboard Cliente - MechFinder',
                active: 'dashboard',
                user: req.user,
                veicoli,
                riparazioniAttive,
                tutteRiparazioni,
                riparazioniCompletate,
                meccaniciPreferiti,
                notifiche,
                stats: {
                    totalRiparazioni: totalRiparazioni ? totalRiparazioni.count : 0,
                    riparazioniPerStato: riparazioniPerStato || [],
                    spesaTotale: spesaTotale ? spesaTotale.total || 0 : 0
                },
                isCliente: true,
                isAuthenticated: true
            });
        } catch (error) {
            console.error('Errore nel recupero dati dashboard cliente:', error);
            req.flash('error', 'Si è verificato un errore nel caricamento della dashboard.');
            res.redirect('/');
        }
    },

    // Crea richiesta di riparazione
    creaRiparazione: async (req, res) => {
        try {
            const { id_veicolo, descrizione, tipo_riparazione, urgenza, budget_max } = req.body;
            const clienteId = req.user.id;
            
            // Verifica che il veicolo appartenga al cliente
            const veicolo = await db.get(
                'SELECT * FROM veicoli WHERE id = ? AND id_cliente = ?',
                [id_veicolo, clienteId]
            );
            
            if (!veicolo) {
                return res.json({ success: false, message: 'Veicolo non trovato.' });
            }
            
            // Inserisci la riparazione
            const result = await db.run(`
                INSERT INTO riparazioni (id_cliente, id_veicolo, descrizione, tipo_riparazione, urgenza, budget_max, stato, data_richiesta)
                VALUES (?, ?, ?, ?, ?, ?, 'in_attesa', ?)
            `, [clienteId, id_veicolo, descrizione, tipo_riparazione, urgenza, budget_max, new Date().toISOString()]);
            
            // Crea notifica per admin
            await db.run(`
                INSERT INTO notifiche (id_utente, tipo_utente, titolo, messaggio, tipo_notifica, dati_extra)
                VALUES (1, 'admin', 'Nuova Richiesta Riparazione', 
                        'Cliente ha creato una nuova richiesta di riparazione', 
                        'nuova_riparazione', ?)
            `, [JSON.stringify({ riparazione_id: result.lastID, cliente_id: clienteId })]);
            
            res.json({ success: true, message: 'Richiesta di riparazione creata con successo!' });
        } catch (error) {
            console.error('Errore nella creazione riparazione:', error);
            res.json({ success: false, message: 'Errore nella creazione della richiesta.' });
        }
    },

    // Conferma riparazione accettata dal meccanico
    confermaRiparazione: async (req, res) => {
        try {
            const { riparazione_id } = req.body;
            const clienteId = req.user.id;
            
            // Verifica che la riparazione appartenga al cliente e sia accettata
            const riparazione = await db.get(
                'SELECT * FROM riparazioni WHERE id = ? AND id_cliente = ? AND stato = "accettata"',
                [riparazione_id, clienteId]
            );
            
            if (!riparazione) {
                return res.json({ success: false, message: 'Riparazione non trovata o non valida.' });
            }
            
            // Aggiorna stato a "in_corso"
            await db.run(
                'UPDATE riparazioni SET stato = "in_corso", data_inizio = ? WHERE id = ?',
                [new Date().toISOString(), riparazione_id]
            );
            
            // Notifica al meccanico
            await db.run(`
                INSERT INTO notifiche (id_utente, tipo_utente, titolo, messaggio, tipo_notifica, dati_extra)
                VALUES (?, 'meccanico', 'Riparazione Confermata', 
                        'Il cliente ha confermato la riparazione. Puoi iniziare i lavori.', 
                        'riparazione_confermata', ?)
            `, [riparazione.id_meccanico, JSON.stringify({ riparazione_id })]);

            // Notifica admin
            await db.run(`
                INSERT INTO notifiche (id_utente, tipo_utente, titolo, messaggio, tipo_notifica, dati_extra)
                VALUES (1, 'admin', 'Riparazione Confermata', 
                        'Cliente ha confermato riparazione #${riparazione_id}', 
                        'riparazione_confermata', ?)
            `, [JSON.stringify({ riparazione_id, cliente_id: clienteId })]);
            
            res.json({ success: true, message: 'Riparazione confermata con successo!' });
        } catch (error) {
            console.error('Errore nella conferma riparazione:', error);
            res.json({ success: false, message: 'Errore nella conferma della riparazione.' });
        }
    },

    // Lascia recensione
    lasciaRecensione: async (req, res) => {
        try {
            const { riparazione_id, valutazione, commento } = req.body;
            const clienteId = req.user.id;
            
            // Verifica che la riparazione sia completata e appartenga al cliente
            const riparazione = await db.get(
                'SELECT * FROM riparazioni WHERE id = ? AND id_cliente = ? AND stato = "completata" AND valutata = 0',
                [riparazione_id, clienteId]
            );
            
            if (!riparazione) {
                return res.json({ success: false, message: 'Riparazione non trovata o già valutata.' });
            }
            
            // Inserisci recensione
            await db.run(`
                INSERT INTO recensioni (id_cliente, id_meccanico, id_riparazione, valutazione, commento, data_recensione)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [clienteId, riparazione.id_meccanico, riparazione_id, valutazione, commento, new Date().toISOString()]);
            
            // Segna riparazione come valutata
            await db.run('UPDATE riparazioni SET valutata = 1 WHERE id = ?', [riparazione_id]);
            
            // Aggiorna valutazione media del meccanico
            const nuovaMedia = await db.get(`
                SELECT AVG(valutazione) as media, COUNT(*) as totale
                FROM recensioni WHERE id_meccanico = ?
            `, [riparazione.id_meccanico]);
            
            await db.run(
                'UPDATE meccanici SET valutazione = ?, numero_recensioni = ? WHERE id = ?',
                [nuovaMedia.media, nuovaMedia.totale, riparazione.id_meccanico]
            );
            
            // Notifica al meccanico
            await db.run(`
                INSERT INTO notifiche (id_utente, tipo_utente, titolo, messaggio, tipo_notifica, dati_extra)
                VALUES (?, 'meccanico', 'Nuova Recensione', 
                        'Hai ricevuto una nuova recensione: ${valutazione} stelle', 
                        'nuova_recensione', ?)
            `, [riparazione.id_meccanico, JSON.stringify({ riparazione_id, valutazione })]);
            
            res.json({ success: true, message: 'Recensione inviata con successo!' });
        } catch (error) {
            console.error('Errore nell\'invio recensione:', error);
            res.json({ success: false, message: 'Errore nell\'invio della recensione.' });
        }
    },

    // Gestione veicoli
    aggiungiVeicolo: async (req, res) => {
        try {
            const { marca, modello, anno, targa, tipo } = req.body;
            const clienteId = req.user.id;
            
            console.log('Dati veicolo ricevuti:', { marca, modello, anno, targa, tipo });
            
            // Validazione base
            if (!marca || !modello || !tipo) {
                return res.json({ success: false, message: 'Marca, modello e tipo sono obbligatori.' });
            }
            
            await db.run(`
                INSERT INTO veicoli (id_cliente, marca, modello, anno, targa, tipo)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [clienteId, marca, modello, anno, targa, tipo]);
            
            res.json({ success: true, message: 'Veicolo aggiunto con successo!' });
        } catch (error) {
            console.error('Errore nell\'aggiunta veicolo:', error);
            res.json({ success: false, message: 'Errore nell\'aggiunta del veicolo.' });
        }
    },

    modificaVeicolo: async (req, res) => {
        try {
            const veicolo_id = req.params.id; // Cambiato da req.body.veicolo_id
            const { marca, modello, anno, targa, tipo } = req.body;
            const clienteId = req.user.id;
            
            console.log('Modifica veicolo:', { veicolo_id, marca, modello, anno, targa, tipo });
            
            // Verifica che il veicolo appartenga al cliente
            const veicolo = await db.get(
                'SELECT * FROM veicoli WHERE id = ? AND id_cliente = ?',
                [veicolo_id, clienteId]
            );
            
            if (!veicolo) {
                return res.json({ success: false, message: 'Veicolo non trovato.' });
            }
            
            await db.run(`
                UPDATE veicoli SET marca = ?, modello = ?, anno = ?, targa = ?, tipo = ?
                WHERE id = ?
            `, [marca, modello, anno, targa, tipo, veicolo_id]);
            
            res.json({ success: true, message: 'Veicolo modificato con successo!' });
        } catch (error) {
            console.error('Errore nella modifica veicolo:', error);
            res.json({ success: false, message: 'Errore nella modifica del veicolo.' });
        }
    },

    eliminaVeicolo: async (req, res) => {
        try {
            const veicolo_id = req.params.id; // Cambiato da req.params.veicolo_id
            const clienteId = req.user.id;
            
            console.log('Elimina veicolo:', { veicolo_id, clienteId });
            
            // Verifica che il veicolo appartenga al cliente
            const veicolo = await db.get(
                'SELECT * FROM veicoli WHERE id = ? AND id_cliente = ?',
                [veicolo_id, clienteId]
            );
            
            if (!veicolo) {
                return res.json({ success: false, message: 'Veicolo non trovato.' });
            }
            
            // Verifica che non ci siano riparazioni attive per questo veicolo
            const riparazioniAttive = await db.get(
                'SELECT COUNT(*) as count FROM riparazioni WHERE id_veicolo = ? AND stato NOT IN ("completata", "rifiutata", "annullata")',
                [veicolo_id]
            );
            
            if (riparazioniAttive.count > 0) {
                return res.json({ success: false, message: 'Non è possibile eliminare un veicolo con riparazioni attive.' });
            }
            
            await db.run('DELETE FROM veicoli WHERE id = ?', [veicolo_id]);
            
            res.json({ success: true, message: 'Veicolo eliminato con successo!' });
        } catch (error) {
            console.error('Errore nell\'eliminazione veicolo:', error);
            res.json({ success: false, message: 'Errore nell\'eliminazione del veicolo.' });
        }
    },

    // Aggiorna profilo cliente  
    aggiornaProfilo: async (req, res) => {
        try {
            const { nome, cognome, telefono, indirizzo, citta, cap } = req.body;
            const clienteId = req.user.id;
            
            await db.run(`
                UPDATE clienti 
                SET nome = ?, cognome = ?, telefono = ?, indirizzo = ?, citta = ?, cap = ?
                WHERE id = ?
            `, [nome, cognome, telefono, indirizzo, citta, cap, clienteId]);
            
            res.json({ success: true, message: 'Profilo aggiornato con successo!' });
        } catch (error) {
            console.error('Errore nell\'aggiornamento profilo:', error);
            res.json({ success: false, message: 'Errore nell\'aggiornamento del profilo.' });
        }
    },

    // Gestione notifiche
    getNotifiche: async (req, res) => {
        try {
            const clienteId = req.user.id;
            
            const notifiche = await db.all(`
                SELECT * FROM notifiche 
                WHERE id_utente = ? AND tipo_utente = 'cliente'
                ORDER BY data_creazione DESC
                LIMIT 50
            `, [clienteId]);
            
            res.json({ success: true, notifiche });
        } catch (error) {
            console.error('Errore nel recupero notifiche:', error);
            res.json({ success: false, message: 'Errore nel recupero delle notifiche.' });
        }
    },

    segnaNotificaLetta: async (req, res) => {
        try {
            const { notifica_id } = req.params;
            const clienteId = req.user.id;
            
            await db.run(
                'UPDATE notifiche SET letta = 1 WHERE id = ? AND id_utente = ? AND tipo_utente = "cliente"',
                [notifica_id, clienteId]
            );
            
            res.json({ success: true });
        } catch (error) {
            console.error('Errore nell\'aggiornamento notifica:', error);
            res.json({ success: false, message: 'Errore nell\'aggiornamento della notifica.' });
        }
    },

    // Download PDF ricevuta
    downloadRicevuta: async (req, res) => {
        try {
            const { riparazione_id } = req.params;
            const clienteId = req.user.id;
            
            // Verifica che la riparazione appartenga al cliente e sia completata
            const riparazione = await db.get(
                'SELECT * FROM riparazioni WHERE id = ? AND id_cliente = ? AND stato = "completata"',
                [riparazione_id, clienteId]
            );
            
            if (!riparazione) {
                req.flash('error', 'Riparazione non trovata.');
                return res.redirect('/cliente/dashboard');
            }
            
            // Cerca il PDF esistente o genera uno nuovo (usa il metodo del meccanico)
            const meccanicoController = require('./meccanicoController');
            const pdfPath = await meccanicoController.generaPDFRiparazione(riparazione_id);
            const fullPath = path.join(__dirname, '../public', pdfPath);
            
            if (!fs.existsSync(fullPath)) {
                req.flash('error', 'Ricevuta non trovata.');
                return res.redirect('/cliente/dashboard');
            }
            
            res.download(fullPath, `ricevuta_riparazione_${riparazione_id}.pdf`);
        } catch (error) {
            console.error('Errore nel download ricevuta:', error);
            req.flash('error', 'Errore nel download della ricevuta.');
            res.redirect('/cliente/dashboard');
        }
    },

    // Visualizza profilo cliente
    getProfilo: async (req, res) => {
        try {
            const clienteId = req.user.id;
            
            // Recupera tutte le riparazioni per le statistiche
            const tutteRiparazioni = await db.all(`
                SELECT r.*, m.nome as meccanico_nome, m.cognome as meccanico_cognome 
                FROM riparazioni r
                LEFT JOIN meccanici m ON r.id_meccanico = m.id
                WHERE r.id_cliente = ?
                ORDER BY r.data_richiesta DESC
            `, [clienteId]);
            
            // Veicoli del cliente
            const veicoli = await db.all(
                'SELECT * FROM veicoli WHERE id_cliente = ? ORDER BY id DESC',
                [clienteId]
            );
            
            // Riparazioni attive
            const riparazioniAttive = tutteRiparazioni ? tutteRiparazioni.filter(r => 
                r.stato !== 'completata' && r.stato !== 'rifiutata' && r.stato !== 'annullata'
            ) : [];
            
            // Recupera statistiche riparazioni
            const riparazioniStats = await db.all(`
                SELECT stato, COUNT(*) as count 
                FROM riparazioni 
                WHERE id_cliente = ? 
                GROUP BY stato
            `, [clienteId]);
            
            res.render('cliente/dashboard', {
                title: 'Profilo Cliente - MechFinder',
                active: 'profilo',
                user: req.user,
                tutteRiparazioni: tutteRiparazioni || [],
                riparazioniAttive: riparazioniAttive || [],
                veicoli: veicoli || [],
                riparazioniStats: riparazioniStats || [],
                stats: {
                    totalRiparazioni: tutteRiparazioni ? tutteRiparazioni.length : 0
                },
                showProfiloModal: true,
                isCliente: true,
                isAuthenticated: true
            });
        } catch (error) {
            console.error('Errore nel caricamento profilo cliente:', error);
            req.flash('error', 'Errore nel caricamento del profilo.');
            res.redirect('/cliente/dashboard');
        }
    },

    // Get veicoli
    getVeicoli: async (req, res) => {
        try {
            const clienteId = req.user.id;
            
            const veicoli = await db.all(
                'SELECT * FROM veicoli WHERE id_cliente = ? ORDER BY id DESC',
                [clienteId]
            );
            
            res.render('cliente/veicoli', {
                title: 'I Miei Veicoli - MechFinder',
                active: 'veicoli',
                user: req.user,
                veicoli,
                isCliente: true,
                isAuthenticated: true
            });
        } catch (error) {
            console.error('Errore nel recupero veicoli:', error);
            req.flash('error', 'Errore nel caricamento dei veicoli.');
            res.redirect('/cliente/dashboard');
        }
    },

    getMeccaniciAreaAPI: async (req, res) => {
        try {
            const clienteId = req.user.id;
            
            // Get client's city from their profile
            const cliente = await db.get('SELECT citta FROM clienti WHERE id = ?', [clienteId]);
            const cittaCliente = cliente?.citta || '';
            
            const meccanici = await db.all(`
                SELECT id, nome, cognome, nome_officina, specializzazione, valutazione, numero_recensioni, citta
                FROM meccanici 
                WHERE verificato = 1 AND sospeso = 0 
                ${cittaCliente ? 'AND citta = ?' : ''}
                ORDER BY valutazione DESC 
                LIMIT 10
            `, cittaCliente ? [cittaCliente] : []);
            
            res.json({ success: true, meccanici });
        } catch (error) {
            console.error('Errore nel recupero meccanici area API:', error);
            res.json({ success: false, message: 'Errore nel recupero dei meccanici.' });
        }
    },

    getNotificheAPI: async (req, res) => {
        try {
            const clienteId = req.user.id;
            
            const notifiche = await db.all(`
                SELECT * FROM notifiche 
                WHERE id_utente = ? AND tipo_utente = 'cliente'
                ORDER BY data_creazione DESC
                LIMIT 20
            `, [clienteId]);
            
            res.json({ success: true, notifiche });
        } catch (error) {
            console.error('Errore nel recupero notifiche API:', error);
            res.json({ success: false, message: 'Errore nel recupero delle notifiche.' });
        }
    },

    // Get dettagli riparazione
    getRiparazioneDettagli: async (req, res) => {
        try {
            const { id } = req.params;
            const clienteId = req.user.id;
            
            const riparazione = await db.get(`
                SELECT r.*, 
                       c.nome as cliente_nome, c.cognome as cliente_cognome,
                       m.nome as nome_meccanico, m.cognome as cognome_meccanico,
                       m.nome_officina, m.telefono as meccanico_telefono,
                       v.marca, v.modello, v.anno, v.targa, v.tipo as tipo_veicolo
                FROM riparazioni r
                LEFT JOIN clienti c ON r.id_cliente = c.id
                LEFT JOIN meccanici m ON r.id_meccanico = m.id
                LEFT JOIN veicoli v ON r.id_veicolo = v.id
                WHERE r.id = ? AND r.id_cliente = ?
            `, [id, clienteId]);
            
            if (!riparazione) {
                return res.json({ success: false, message: 'Riparazione non trovata.' });
            }
            
            res.json({ success: true, riparazione });
        } catch (error) {
            console.error('Errore nel recupero dettagli riparazione:', error);
            res.json({ success: false, message: 'Errore nel recupero dei dettagli.' });
        }
    },

    marcaNotificaLetta: async (req, res) => {
        try {
            const { notifica_id } = req.params;
            const clienteId = req.user.id;
            
            await db.run(
                'UPDATE notifiche SET letta = 1 WHERE id = ? AND id_utente = ? AND tipo_utente = "cliente"',
                [notifica_id, clienteId]
            );
            
            res.json({ success: true });
        } catch (error) {
            console.error('Errore nell\'aggiornamento notifica:', error);
            res.json({ success: false, message: 'Errore nell\'aggiornamento della notifica.' });
        }
    },

    // Get dettagli singolo veicolo 
    getVeicoloDettagli: async (req, res) => {
        try {
            const veicolo_id = req.params.id;
            const clienteId = req.user.id;
            
            const veicolo = await db.get(
                'SELECT * FROM veicoli WHERE id = ? AND id_cliente = ?',
                [veicolo_id, clienteId]
            );
            
            if (!veicolo) {
                return res.json({ success: false, message: 'Veicolo non trovato.' });
            }
            
            res.json({ success: true, veicolo });
        } catch (error) {
            console.error('Errore nel recupero dettagli veicolo:', error);
            res.json({ success: false, message: 'Errore nel recupero dei dettagli del veicolo.' });
        }
    },
};

module.exports = clienteController;
