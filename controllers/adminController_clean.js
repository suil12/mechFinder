"use strict";


const { validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const db = require('../database/db');
const { Cliente, Meccanico } = require('../models/utente');

const adminController = {
    // Dashboard admin
    getDashboard: async (req, res) => {
        try {
            // Statistiche generali
            const totalClienti = await db.get('SELECT COUNT(*) as count FROM clienti');
            const totalMeccanici = await db.get('SELECT COUNT(*) as count FROM meccanici');
            const totalRiparazioni = await db.get('SELECT COUNT(*) as count FROM riparazioni');
            const riparazioniOggi = await db.get(
                `SELECT COUNT(*) as count FROM riparazioni 
                 WHERE DATE(data_richiesta) = DATE('now')`
            );

            // Meccanici in attesa di verifica
            const meccaniciInAttesa = await db.all(
                'SELECT * FROM meccanici WHERE verificato = 0 ORDER BY data_registrazione DESC LIMIT 10'
            );

            // Ultime riparazioni
            const riparazioniRecenti = await db.all(`
                SELECT r.*, c.nome as nome_cliente, c.cognome as cognome_cliente,
                       m.nome as nome_meccanico, m.cognome as cognome_meccanico, m.nome_officina
                FROM riparazioni r
                JOIN clienti c ON r.id_cliente = c.id
                LEFT JOIN meccanici m ON r.id_meccanico = m.id
                ORDER BY r.data_richiesta DESC
                LIMIT 10
            `);

            // Notifiche non lette per admin
            const notifiche = await db.all(`
                SELECT * FROM notifiche 
                WHERE id_utente = 1 AND tipo_utente = 'admin' AND letta = 0
                ORDER BY data_creazione DESC
                LIMIT 20
            `);

            // Statistiche per i grafici
            const riparazioniPerStato = await db.all(`
                SELECT stato, COUNT(*) as count 
                FROM riparazioni 
                GROUP BY stato
            `);

            res.render('admin/dashboard_complete', {
                title: 'Dashboard Admin - MechFinder',
                user: req.user,
                stats: {
                    totalClienti: totalClienti.count,
                    totalMeccanici: totalMeccanici.count,
                    totalRiparazioni: totalRiparazioni.count,
                    riparazioniOggi: riparazioniOggi.count
                },
                meccaniciInAttesa,
                riparazioniRecenti,
                notifiche,
                riparazioniPerStato
            });
        } catch (error) {
            console.error('Errore nel caricamento dashboard admin:', error);
            req.flash('error', 'Errore nel caricamento della dashboard');
            res.redirect('/');
        }
    },

    // Gestione utenti
    getUtenti: async (req, res) => {
        try {
            const clienti = await db.all(`
                SELECT c.*, COUNT(r.id) as numero_riparazioni 
                FROM clienti c 
                LEFT JOIN riparazioni r ON c.id = r.id_cliente 
                GROUP BY c.id 
                ORDER BY c.data_registrazione DESC
            `);
            
            const meccanici = await db.all(`
                SELECT m.*, COUNT(r.id) as numero_riparazioni 
                FROM meccanici m 
                LEFT JOIN riparazioni r ON m.id = r.id_meccanico 
                GROUP BY m.id 
                ORDER BY m.data_registrazione DESC
            `);

            res.render('admin/utenti', {
                title: 'Gestione Utenti - Admin',
                user: req.user,
                clienti,
                meccanici
            });
        } catch (error) {
            console.error('Errore nel caricamento utenti:', error);
            req.flash('error', 'Errore nel caricamento degli utenti');
            res.redirect('/admin/dashboard');
        }
    },

    // Get profilo admin
    getProfilo: async (req, res) => {
        try {
            const admin = await db.get('SELECT id, nome, cognome, email FROM admin WHERE id = ?', [req.user.id]);
            res.render('admin/profilo', { 
                title: 'Profilo Admin - MechFinder',
                admin, 
                user: req.user 
            });
        } catch (error) {
            console.error('Errore nel recupero profilo admin:', error);
            req.flash('error', 'Errore nel caricamento del profilo');
            res.redirect('/admin/dashboard');
        }
    },

    // Aggiorna profilo admin
    aggiornaProfilo: async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            if (req.headers['content-type'] === 'application/json') {
                return res.status(400).json({ errors: errors.array() });
            }
            req.flash('error', errors.array().map(err => err.msg).join(', '));
            return res.redirect('/admin/profilo');
        }

        try {
            const { nome, cognome, email, password } = req.body;
            
            let query = 'UPDATE admin SET nome = ?, cognome = ?, email = ?';
            let params = [nome, cognome, email];

            if (password && password.trim() !== '') {
                const hashedPassword = await bcrypt.hash(password, 10);
                query += ', password = ?';
                params.push(hashedPassword);
            }

            query += ' WHERE id = ?';
            params.push(req.user.id);

            await db.run(query, params);

            if (req.headers['content-type'] === 'application/json') {
                res.json({ success: true, message: 'Profilo aggiornato con successo' });
            } else {
                req.flash('success', 'Profilo aggiornato con successo.');
                res.redirect('/admin/profilo');
            }
        } catch (err) {
            console.error('Errore nell\'aggiornamento del profilo admin:', err);
            if (req.headers['content-type'] === 'application/json') {
                res.status(500).json({ error: 'Errore interno del server' });
            } else {
                req.flash('error', 'Si è verificato un errore nell\'aggiornamento del profilo.');
                res.redirect('/admin/profilo');
            }
        }
    },

    // API per meccanici
    getMeccaniciAPI: async (req, res) => {
        try {
            const meccanici = await db.all(`
                SELECT id, nome, cognome, email, specializzazione, verificato, sospeso,
                       nome_officina, valutazione, data_registrazione
                FROM meccanici 
                ORDER BY data_registrazione DESC
            `);
            res.json(meccanici);
        } catch (error) {
            console.error('Errore nel recupero meccanici:', error);
            res.status(500).json({ error: 'Errore interno del server' });
        }
    },

    // API per clienti
    getClientiAPI: async (req, res) => {
        try {
            const clienti = await db.all(`
                SELECT c.id, c.nome, c.cognome, c.email, c.telefono, c.sospeso,
                       c.data_registrazione, COUNT(r.id) as numero_riparazioni
                FROM clienti c
                LEFT JOIN riparazioni r ON c.id = r.id_cliente
                GROUP BY c.id
                ORDER BY c.data_registrazione DESC
            `);
            res.json(clienti);
        } catch (error) {
            console.error('Errore nel recupero clienti:', error);
            res.status(500).json({ error: 'Errore interno del server' });
        }
    },

    // API per richieste verifica
    getRichiesteVerificaAPI: async (req, res) => {
        try {
            const richieste = await db.all(`
                SELECT id, nome, cognome, email, specializzazione, anni_esperienza,
                       descrizione, data_registrazione
                FROM meccanici 
                WHERE verificato = 0 AND sospeso = 0
                ORDER BY data_registrazione ASC
            `);
            res.json(richieste);
        } catch (error) {
            console.error('Errore nel recupero richieste verifica:', error);
            res.status(500).json({ error: 'Errore interno del server' });
        }
    },

    // API per riparazioni
    getRiparazioniAPI: async (req, res) => {
        try {
            const riparazioni = await db.all(`
                SELECT r.id, r.tipo_riparazione, r.stato, r.costo_finale, r.costo_stimato,
                       r.data_creazione, r.data_completamento,
                       c.nome || ' ' || c.cognome as cliente_nome,
                       m.nome || ' ' || m.cognome as meccanico_nome
                FROM riparazioni r
                LEFT JOIN clienti c ON r.id_cliente = c.id
                LEFT JOIN meccanici m ON r.id_meccanico = m.id
                ORDER BY r.data_creazione DESC
                LIMIT 100
            `);
            res.json(riparazioni);
        } catch (error) {
            console.error('Errore nel recupero riparazioni:', error);
            res.status(500).json({ error: 'Errore interno del server' });
        }
    },

    // Verifica meccanico
    verificaMeccanico: async (req, res) => {
        try {
            const { id, azione } = req.body;
            
            if (azione === 'approva') {
                await db.run('UPDATE meccanici SET verificato = 1 WHERE id = ?', [id]);
                
                // Invia notifica di approvazione
                await db.run(`
                    INSERT INTO notifiche (id_destinatario, tipo_destinatario, titolo, messaggio, tipo, data_creazione)
                    VALUES (?, 'meccanico', 'Verifica approvata', 'Il tuo account è stato verificato con successo!', 'verifica', datetime('now'))
                `, [id]);
                
            } else if (azione === 'rifiuta') {
                await db.run('DELETE FROM meccanici WHERE id = ?', [id]);
            }
            
            res.json({ success: true });
        } catch (error) {
            console.error('Errore nella verifica meccanico:', error);
            res.status(500).json({ error: 'Errore interno del server' });
        }
    },

    // Toggle sospensione utente
    toggleSospensioneUtente: async (req, res) => {
        try {
            const { id, tipo } = req.body;
            
            if (!['meccanico', 'cliente'].includes(tipo)) {
                return res.status(400).json({ error: 'Tipo utente non valido' });
            }
            
            const tabella = tipo === 'meccanico' ? 'meccanici' : 'clienti';
            
            // Toggle sospensione
            await db.run(`
                UPDATE ${tabella} 
                SET sospeso = CASE WHEN sospeso = 1 THEN 0 ELSE 1 END
                WHERE id = ?
            `, [id]);
            
            res.json({ success: true });
        } catch (error) {
            console.error('Errore nel toggle sospensione:', error);
            res.status(500).json({ error: 'Errore interno del server' });
        }
    },

    // Invia notifica globale
    inviaNotificaGlobale: async (req, res) => {
        try {
            const { titolo, messaggio } = req.body;
            
            if (!titolo || !messaggio) {
                return res.status(400).json({ error: 'Titolo e messaggio sono obbligatori' });
            }
            
            // Ottieni tutti gli utenti
            const clienti = await db.all('SELECT id FROM clienti WHERE sospeso = 0');
            const meccanici = await db.all('SELECT id FROM meccanici WHERE sospeso = 0');
            
            // Crea notifiche per tutti
            for (const cliente of clienti) {
                await db.run(`
                    INSERT INTO notifiche (id_destinatario, tipo_destinatario, titolo, messaggio, tipo, data_creazione)
                    VALUES (?, 'cliente', ?, ?, 'sistema', datetime('now'))
                `, [cliente.id, titolo, messaggio]);
            }
            
            for (const meccanico of meccanici) {
                await db.run(`
                    INSERT INTO notifiche (id_destinatario, tipo_destinatario, titolo, messaggio, tipo, data_creazione)
                    VALUES (?, 'meccanico', ?, ?, 'sistema', datetime('now'))
                `, [meccanico.id, titolo, messaggio]);
            }
            
            res.json({ success: true, message: 'Notifica inviata con successo' });
        } catch (error) {
            console.error('Errore nell\'invio notifica globale:', error);
            res.status(500).json({ error: 'Errore interno del server' });
        }
    },

    // Cancella notifica
    cancellaNotifica: async (req, res) => {
        try {
            const { id } = req.params;
            
            await db.run('DELETE FROM notifiche WHERE id = ?', [id]);
            
            res.json({ success: true });
        } catch (error) {
            console.error('Errore nella cancellazione notifica:', error);
            res.status(500).json({ error: 'Errore interno del server' });
        }
    },

    // Cancella notifiche vecchie
    cancellaNotificheVecchie: async (req, res) => {
        try {
            // Cancella notifiche più vecchie di 30 giorni
            await db.run(`
                DELETE FROM notifiche 
                WHERE data_creazione < datetime('now', '-30 days')
            `);
            
            res.json({ success: true, message: 'Notifiche vecchie cancellate con successo' });
        } catch (error) {
            console.error('Errore nella cancellazione notifiche vecchie:', error);
            res.status(500).json({ error: 'Errore interno del server' });
        }
    },

    // Aggiorna stato riparazione
    aggiornaStatoRiparazione: async (req, res) => {
        try {
            const { id, stato, costo_finale, note_completamento } = req.body;
            
            // Validazione stato
            const statiValidi = ['in_attesa', 'accettata', 'in_corso', 'completata', 'annullata'];
            if (!statiValidi.includes(stato)) {
                return res.status(400).json({ error: 'Stato non valido' });
            }
            
            let query = 'UPDATE riparazioni SET stato = ?';
            let params = [stato];
            
            // Se lo stato è "accettata", aggiorna data_accettazione
            if (stato === 'accettata') {
                query += ', data_accettazione = datetime("now")';
            }
            
            // Se lo stato è "in_corso", aggiorna data_inizio
            if (stato === 'in_corso') {
                query += ', data_inizio = datetime("now")';
            }
            
            // Se lo stato è "completata", aggiorna data_completamento e costo_finale
            if (stato === 'completata') {
                query += ', data_completamento = datetime("now")';
                
                if (costo_finale) {
                    query += ', costo_finale = ?';
                    params.push(parseFloat(costo_finale));
                }
                
                if (note_completamento) {
                    query += ', note_completamento = ?';
                    params.push(note_completamento);
                }
            }
            
            query += ' WHERE id = ?';
            params.push(id);
            
            await db.run(query, params);
            
            // Invia notifica al cliente
            const riparazione = await db.get('SELECT * FROM riparazioni WHERE id = ?', [id]);
            let messaggioNotifica = '';
            let titoloNotifica = '';
            
            switch (stato) {
                case 'accettata':
                    titoloNotifica = 'Riparazione accettata';
                    messaggioNotifica = 'Il meccanico ha accettato la tua richiesta di riparazione';
                    break;
                case 'in_corso':
                    titoloNotifica = 'Riparazione in corso';
                    messaggioNotifica = 'Il meccanico ha iniziato a lavorare sulla tua riparazione';
                    break;
                case 'completata':
                    titoloNotifica = 'Riparazione completata';
                    messaggioNotifica = 'La tua riparazione è stata completata! Puoi visualizzare la ricevuta';
                    break;
                case 'annullata':
                    titoloNotifica = 'Riparazione annullata';
                    messaggioNotifica = 'La riparazione è stata annullata';
                    break;
            }
            
            if (messaggioNotifica) {
                await db.run(`
                    INSERT INTO notifiche (id_destinatario, tipo_destinatario, titolo, messaggio, tipo, data_creazione)
                    VALUES (?, 'cliente', ?, ?, 'riparazione', datetime('now'))
                `, [riparazione.id_cliente, titoloNotifica, messaggioNotifica]);
            }
            
            res.json({ success: true, message: 'Stato riparazione aggiornato con successo' });
        } catch (error) {
            console.error('Errore nell\'aggiornamento stato riparazione:', error);
            res.status(500).json({ error: 'Errore interno del server' });
        }
    },

    // Get riparazione dettagliata
    getRiparazioneDettagliata: async (req, res) => {
        try {
            const { id } = req.params;
            
            const riparazione = await db.get(`
                SELECT r.*, 
                       c.nome as cliente_nome, c.cognome as cliente_cognome, 
                       c.email as cliente_email, c.telefono as cliente_telefono,
                       m.nome as meccanico_nome, m.cognome as meccanico_cognome,
                       m.nome_officina, m.email as meccanico_email, m.telefono as meccanico_telefono
                FROM riparazioni r
                JOIN clienti c ON r.id_cliente = c.id
                LEFT JOIN meccanici m ON r.id_meccanico = m.id
                WHERE r.id = ?
            `, [id]);
            
            if (!riparazione) {
                return res.status(404).json({ error: 'Riparazione non trovata' });
            }
            
            res.json(riparazione);
        } catch (error) {
            console.error('Errore nel recupero riparazione:', error);
            res.status(500).json({ error: 'Errore interno del server' });
        }
    },

    // Genera ricevuta/fattura
    generaRicevuta: async (req, res) => {
        try {
            const { id } = req.params;
            
            const riparazione = await db.get(`
                SELECT r.*, 
                       c.nome as cliente_nome, c.cognome as cliente_cognome, 
                       c.email as cliente_email, c.telefono as cliente_telefono,
                       c.indirizzo as cliente_indirizzo,
                       m.nome as meccanico_nome, m.cognome as meccanico_cognome,
                       m.nome_officina, m.email as meccanico_email, m.telefono as meccanico_telefono,
                       m.indirizzo as meccanico_indirizzo, m.partita_iva
                FROM riparazioni r
                JOIN clienti c ON r.id_cliente = c.id
                JOIN meccanici m ON r.id_meccanico = m.id
                WHERE r.id = ? AND r.stato = 'completata'
            `, [id]);
            
            if (!riparazione) {
                return res.status(404).json({ error: 'Riparazione non trovata o non completata' });
            }
            
            // Genera numero fattura univoco se non esiste
            let numeroFattura = riparazione.numero_fattura;
            if (!numeroFattura) {
                numeroFattura = `MF-${new Date().getFullYear()}-${String(riparazione.id).padStart(6, '0')}`;
                await db.run('UPDATE riparazioni SET numero_fattura = ? WHERE id = ?', [numeroFattura, id]);
            }
            
            const ricevuta = {
                numeroFattura,
                dataEmissione: new Date().toLocaleDateString('it-IT'),
                dataCompletamento: new Date(riparazione.data_completamento).toLocaleDateString('it-IT'),
                cliente: {
                    nome: `${riparazione.cliente_nome} ${riparazione.cliente_cognome}`,
                    email: riparazione.cliente_email,
                    telefono: riparazione.cliente_telefono,
                    indirizzo: riparazione.cliente_indirizzo
                },
                meccanico: {
                    nome: `${riparazione.meccanico_nome} ${riparazione.meccanico_cognome}`,
                    officina: riparazione.nome_officina,
                    email: riparazione.meccanico_email,
                    telefono: riparazione.meccanico_telefono,
                    indirizzo: riparazione.meccanico_indirizzo,
                    partitaIva: riparazione.partita_iva
                },
                riparazione: {
                    id: riparazione.id,
                    tipo: riparazione.tipo_riparazione,
                    descrizione: riparazione.descrizione,
                    costoStimato: riparazione.costo_stimato,
                    costoFinale: riparazione.costo_finale,
                    noteCompletamento: riparazione.note_completamento,
                    urgenza: riparazione.urgenza
                },
                iva: {
                    aliquota: 22,
                    importo: (riparazione.costo_finale * 0.22).toFixed(2),
                    totaleConIva: (riparazione.costo_finale * 1.22).toFixed(2)
                }
            };
            
            res.json({ success: true, ricevuta });
        } catch (error) {
            console.error('Errore nella generazione ricevuta:', error);
            res.status(500).json({ error: 'Errore interno del server' });
        }
    },

    // Get riparazioni in corso per meccanico
    getRiparazioniInCorso: async (req, res) => {
        try {
            const { meccanico_id } = req.query;
            
            let query = `
                SELECT r.*, 
                       c.nome as cliente_nome, c.cognome as cliente_cognome,
                       c.telefono as cliente_telefono, c.email as cliente_email
                FROM riparazioni r
                JOIN clienti c ON r.id_cliente = c.id
                WHERE r.stato IN ('accettata', 'in_corso')
            `;
            
            let params = [];
            
            if (meccanico_id) {
                query += ' AND r.id_meccanico = ?';
                params.push(meccanico_id);
            }
            
            query += ' ORDER BY r.data_accettazione DESC';
            
            const riparazioni = await db.all(query, params);
            
            res.json(riparazioni);
        } catch (error) {
            console.error('Errore nel recupero riparazioni in corso:', error);
            res.status(500).json({ error: 'Errore interno del server' });
        }
    },

    // Get riparazioni completate per meccanico
    getRiparazioniCompletate: async (req, res) => {
        try {
            const { meccanico_id } = req.query;
            
            let query = `
                SELECT r.*, 
                       c.nome as cliente_nome, c.cognome as cliente_cognome,
                       c.telefono as cliente_telefono, c.email as cliente_email
                FROM riparazioni r
                JOIN clienti c ON r.id_cliente = c.id
                WHERE r.stato = 'completata'
            `;
            
            let params = [];
            
            if (meccanico_id) {
                query += ' AND r.id_meccanico = ?';
                params.push(meccanico_id);
            }
            
            query += ' ORDER BY r.data_completamento DESC LIMIT 50';
            
            const riparazioni = await db.all(query, params);
            
            res.json(riparazioni);
        } catch (error) {
            console.error('Errore nel recupero riparazioni completate:', error);
            res.status(500).json({ error: 'Errore interno del server' });
        }
    }
};

module.exports = adminController;
