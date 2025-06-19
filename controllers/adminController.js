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

            // Lista combinata utenti per la dashboard
            const clienti = await db.all(`
                SELECT id, nome, cognome, email, telefono, 'cliente' as tipo_utente, 
                       data_registrazione
                FROM clienti 
                ORDER BY data_registrazione DESC 
                LIMIT 10
            `);
            
            const meccanici = await db.all(`
                SELECT id, nome, cognome, email, telefono, 'meccanico' as tipo_utente, 
                       data_registrazione, verificato
                FROM meccanici 
                ORDER BY data_registrazione DESC 
                LIMIT 10
            `);
            
            // Combina e ordina per data di registrazione
            const utenti = [...clienti, ...meccanici]
                .sort((a, b) => new Date(b.data_registrazione) - new Date(a.data_registrazione))
                .slice(0, 10);

            res.render('admin/dashboard_complete', {
                title: 'Dashboard Admin - MechFinder',
                active: 'dashboard',
                user: req.user,
                admin: req.user, // Aggiunto per compatibilità template
                stats: {
                    totalClienti: totalClienti?.count || 0,
                    totalMeccanici: totalMeccanici?.count || 0,
                    totalUtenti: (totalClienti?.count || 0) + (totalMeccanici?.count || 0),
                    totalRiparazioni: totalRiparazioni?.count || 0,
                    riparazioniOggi: riparazioniOggi?.count || 0
                },
                meccaniciInAttesa,
                riparazioniRecenti,
                notifiche,
                riparazioniPerStato,
                utenti, // Aggiunta lista combinata utenti
                isAdmin: true,
                isAuthenticated: true
            });
        } catch (error) {
            console.error('Errore nel caricamento dashboard admin:', error);
            req.flash('error', 'Errore nel caricamento della dashboard.');
            res.redirect('/');
        }
    },

    // Get utenti
    getUtenti: async (req, res) => {
        try {
            const clienti = await db.all('SELECT * FROM clienti ORDER BY data_registrazione DESC');
            const meccanici = await db.all('SELECT * FROM meccanici ORDER BY data_registrazione DESC');
            
            res.render('admin/utenti', {
                title: 'Gestione Utenti - MechFinder',
                active: 'utenti',
                user: req.user,
                clienti,
                meccanici,
                isAdmin: true,
                isAuthenticated: true
            });
        } catch (error) {
            console.error('Errore nel recupero utenti:', error);
            req.flash('error', 'Errore nel caricamento degli utenti.');
            res.redirect('/admin/dashboard');
        }
    },

    // API Methods
    getMeccaniciAPI: async (req, res) => {
        try {
            const meccanici = await db.all(`
                SELECT id, nome, cognome, email, nome_officina, specializzazione, telefono, 
                       citta, verificato, valutazione, numero_recensioni, data_registrazione
                FROM meccanici 
                ORDER BY data_registrazione DESC
            `);
            res.json(meccanici);
        } catch (error) {
            console.error('Errore nel recupero meccanici:', error);
            res.status(500).json({ error: 'Errore interno del server' });
        }
    },

    getClientiAPI: async (req, res) => {
        try {
            const clienti = await db.all(`
                SELECT id, nome, cognome, email, telefono, citta, data_registrazione
                FROM clienti 
                ORDER BY data_registrazione DESC
            `);
            res.json(clienti);
        } catch (error) {
            console.error('Errore nel recupero clienti:', error);
            res.status(500).json({ error: 'Errore interno del server' });
        }
    },

    getRichiesteVerificaAPI: async (req, res) => {
        try {
            const richieste = await db.all(`
                SELECT id, nome, cognome, email, specializzazione, descrizione, data_registrazione
                FROM meccanici 
                WHERE verificato = 0
                ORDER BY data_registrazione ASC
            `);
            res.json(richieste);
        } catch (error) {
            console.error('Errore nel recupero richieste verifica:', error);
            res.status(500).json({ error: 'Errore interno del server' });
        }
    },

    getRiparazioniAPI: async (req, res) => {
        try {
            const riparazioni = await db.all(`
                SELECT r.id, r.tipo_riparazione, r.stato, r.costo, r.data_richiesta, r.data_completamento,
                       c.nome || ' ' || c.cognome as cliente_nome,
                       m.nome || ' ' || m.cognome as meccanico_nome
                FROM riparazioni r
                LEFT JOIN clienti c ON r.id_cliente = c.id
                LEFT JOIN meccanici m ON r.id_meccanico = m.id
                ORDER BY r.data_richiesta DESC
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
                    INSERT INTO notifiche (id_utente, tipo_utente, titolo, messaggio, tipo_notifica, data_creazione)
                    VALUES (?, 'meccanico', 'Verifica approvata', 'Il tuo account è stato verificato con successo!', 'verifica', datetime('now'))
                `, [id]);
                
                res.json({ success: true, message: 'Meccanico verificato con successo!' });
                
            } else if (azione === 'rifiuta') {
                await db.run('DELETE FROM meccanici WHERE id = ?', [id]);
                res.json({ success: true, message: 'Meccanico rifiutato con successo!' });
            }
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

    // Get profilo admin
    getProfilo: async (req, res) => {
        try {
            const admin = await db.get('SELECT id, nome, cognome, email FROM admin WHERE id = ?', [req.user.id]);
            res.render('admin/profilo', { 
                admin, 
                user: req.user,
                title: 'Profilo Admin - MechFinder',
                active: 'profilo',
                isAdmin: true,
                isAuthenticated: true
            });
        } catch (error) {
            console.error('Errore nel recupero profilo admin:', error);
            req.flash('error', 'Errore nel caricamento del profilo');
            res.redirect('/admin/dashboard');
        }
    },

    // Aggiorna profilo admin
    aggiornaProfilo: async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

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

            res.json({ success: true, message: 'Profilo aggiornato con successo' });
        } catch (error) {
            console.error('Errore nell\'aggiornamento profilo:', error);
            res.status(500).json({ error: 'Errore interno del server' });
        }
    },

    // Ottieni dettagli meccanico
    getMeccanico: async (req, res) => {
        try {
            const { id } = req.params;
            
            const meccanico = await db.get(`
                SELECT * FROM meccanici WHERE id = ?
            `, [id]);
            
            if (!meccanico) {
                return res.status(404).json({ success: false, message: 'Meccanico non trovato' });
            }
            
            res.json({ success: true, meccanico });
        } catch (error) {
            console.error('Errore nel recupero meccanico:', error);
            res.status(500).json({ success: false, message: 'Errore interno del server' });
        }
    },

    // Sospendi utente
    sospendiUtente: async (req, res) => {
        try {
            const { id } = req.params;
            const { tipo } = req.body;
            
            if (!['meccanico', 'cliente'].includes(tipo)) {
                return res.status(400).json({ success: false, message: 'Tipo utente non valido' });
            }
            
            const tabella = tipo === 'meccanico' ? 'meccanici' : 'clienti';
            
            await db.run(`UPDATE ${tabella} SET stato = 'sospeso' WHERE id = ?`, [id]);
            
            res.json({ success: true, message: 'Utente sospeso con successo' });
        } catch (error) {
            console.error('Errore nella sospensione utente:', error);
            res.status(500).json({ success: false, message: 'Errore interno del server' });
        }
    },

    // Riattiva utente
    riattivaUtente: async (req, res) => {
        try {
            const { id } = req.params;
            const { tipo } = req.body;
            
            if (!['meccanico', 'cliente'].includes(tipo)) {
                return res.status(400).json({ success: false, message: 'Tipo utente non valido' });
            }
            
            const tabella = tipo === 'meccanico' ? 'meccanici' : 'clienti';
            
            await db.run(`UPDATE ${tabella} SET stato = 'attivo' WHERE id = ?`, [id]);
            
            res.json({ success: true, message: 'Utente riattivato con successo' });
        } catch (error) {
            console.error('Errore nella riattivazione utente:', error);
            res.status(500).json({ success: false, message: 'Errore interno del server' });
        }
    }
};

module.exports = adminController;