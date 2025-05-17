"use strict";

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const { Riparazione } = require('../models/riparazione');

// Middleware per verificare se l'utente è autenticato come cliente
const isCliente = (req, res, next) => {
    if (req.isAuthenticated() && req.user.tipo === 'cliente') {
        return next();
    }
    req.flash('error', 'Devi accedere come cliente per visualizzare questa pagina.');
    res.redirect('/');
};

// Dashboard cliente
router.get('/dashboard', isCliente, async (req, res) => {
    try {
        // Ottieni le riparazioni del cliente
        const riparazioni = await Riparazione.findByClienteId(req.user.id);

        // Ottieni riparazioni attive 
        const riparazioniAttive = riparazioni.filter(r => 
            r.stato !== 'completata' && r.stato !== 'rifiutata'
        );
       // Ottieni riparazioni attive  
        const riparazioniCompletate = riparazioni.filter(r => 
            r.stato === 'completata'
        );
        // Ottieni i veicoli del cliente
        const veicoli = await db.query('SELECT * FROM veicoli WHERE id_cliente = ?', [req.user.id]);
        
        // Calcola statistiche
        const stats = {
            totalRiparazioni: riparazioni ? riparazioni.length : 0,
            riparazioniAttive: riparazioniAttive ? riparazioniAttive.length : 0,
            riparazioniCompletate: riparazioniCompletate ? riparazioniCompletate.length : 0,
            totalVeicoli: veicoli ? veicoli.length : 0,
            spesaTotale: riparazioniCompletate && riparazioniCompletate.length > 0 
                ? riparazioniCompletate.reduce((total, r) => total + (r.costo || 0), 0) 
                : 0
        };
        
        // Ottieni le recensioni lasciate dal cliente
        const recensioni = await db.query('SELECT * FROM recensioni WHERE id_cliente = ?', [req.user.id]);

        res.render('cliente/dashboard', {
            title: 'Dashboard Cliente - MechFinder',
            active: 'dashboard',
            riparazioni: riparazioni || [],
            riparazioniAttive: riparazioniAttive || [], // Asegúrate de pasar esta variable
            riparazioniCompletate: riparazioniCompletate || [],
            veicoli: veicoli || [],
            recensioni: recensioni || [],
            stats: stats
        });
    } catch (err) {
        console.error('Errore nel caricamento della dashboard cliente:', err);
        req.flash('error', 'Si è verificato un errore nel caricamento della dashboard.');
        res.redirect('/');
    }
});

// Profilo cliente
router.get('/profilo', isCliente, async (req, res) => {
    try {
        // Ottieni i veicoli del cliente
        const veicoli = await db.query('SELECT * FROM veicoli WHERE id_cliente = ?', [req.user.id]);
        
        // Ottieni le riparazioni del cliente
        const riparazioni = await Riparazione.findByClienteId(req.user.id);
        
        // Filtra le riparazioni attive (non completate e non rifiutate)
        const riparazioniAttive = riparazioni.filter(r => 
            r.stato !== 'completata' && r.stato !== 'rifiutata'
        );
        
        // Ottieni le recensioni lasciate dal cliente
        const recensioni = await db.query('SELECT * FROM recensioni WHERE id_cliente = ?', [req.user.id]);
        
        res.render('cliente/profilo', {
            title: 'Il Mio Profilo - MechFinder',
            active: 'profilo',
            veicoli: veicoli || [],
            riparazioni: riparazioni || [],
            riparazioniAttive: riparazioniAttive || [],
            recensioni: recensioni || []
        });
    } catch (err) {
        console.error('Errore nel caricamento del profilo cliente:', err);
        req.flash('error', 'Si è verificato un errore nel caricamento del profilo.');
        res.redirect('/');
    }
});

// Le mie riparazioni
router.get('/riparazioni', isCliente, async (req, res) => {
    try {
        let filtri = {
            id_cliente: req.user.id
        };
        
        // Aggiungi filtri dalla query string
        if (req.query.stato) filtri.stato = req.query.stato;
        if (req.query.data_da) filtri.data_da = req.query.data_da;
        if (req.query.data_a) filtri.data_a = req.query.data_a;
        if (req.query.id_veicolo) filtri.id_veicolo = req.query.id_veicolo;
        if (req.query.q) filtri.q = req.query.q;
        
        // Ordinamento
        filtri.ordina = req.query.ordina || 'data_desc';
        
        // Ottieni le riparazioni filtrate
        const riparazioni = await Riparazione.cerca(filtri);
        
        // Ottieni i veicoli del cliente per il filtro
        const veicoli = await db.query('SELECT * FROM veicoli WHERE id_cliente = ?', [req.user.id]);
        
        res.render('cliente/riparazioni', {
            title: 'Le Mie Riparazioni - MechFinder',
            active: 'riparazioni',
            riparazioni: riparazioni || [],
            veicoli: veicoli || [],
            filtri: req.query
        });
    } catch (err) {
        console.error('Errore nel caricamento delle riparazioni cliente:', err);
        req.flash('error', 'Si è verificato un errore nel caricamento delle riparazioni.');
        res.redirect('/cliente/dashboard');
    }
});

// Dettaglio riparazione
router.get('/riparazioni/:id', isCliente, async (req, res) => {
    try {
        const riparazione = await Riparazione.getDettaglio(req.params.id);
        
        if (!riparazione || riparazione.id_cliente !== req.user.id) {
            req.flash('error', 'Riparazione non trovata o non autorizzata.');
            return res.redirect('/cliente/riparazioni');
        }
        
        // Ottieni i commenti della riparazione
        const commenti = await db.query(`
            SELECT c.*, 
                CASE 
                    WHEN c.tipo_utente = 'cliente' THEN cl.nome 
                    WHEN c.tipo_utente = 'meccanico' THEN m.nome 
                END as nome_utente,
                CASE 
                    WHEN c.tipo_utente = 'cliente' THEN cl.avatar 
                    WHEN c.tipo_utente = 'meccanico' THEN m.avatar 
                END as avatar_utente
            FROM commenti c
            LEFT JOIN clienti cl ON c.utente_id = cl.id AND c.tipo_utente = 'cliente'
            LEFT JOIN meccanici m ON c.utente_id = m.id AND c.tipo_utente = 'meccanico'
            WHERE c.riparazione_id = ?
            ORDER BY c.data_creazione ASC
        `, [req.params.id]);
        
        res.render('cliente/dettaglio-riparazione', {
            title: 'Dettaglio Riparazione - MechFinder',
            active: 'riparazioni',
            riparazione: riparazione,
            commenti: commenti || []
        });
    } catch (err) {
        console.error('Errore nel caricamento del dettaglio riparazione cliente:', err);
        req.flash('error', 'Si è verificato un errore nel caricamento del dettaglio riparazione.');
        res.redirect('/cliente/riparazioni');
    }
});

// I miei veicoli
router.get('/veicoli', isCliente, async (req, res) => {
    try {
        // Ottieni i veicoli del cliente
        const veicoli = await db.query('SELECT * FROM veicoli WHERE id_cliente = ?', [req.user.id]);
        
        res.render('cliente/veicoli', {
            title: 'I Miei Veicoli - MechFinder',
            active: 'veicoli',
            veicoli: veicoli || []
        });
    } catch (err) {
        console.error('Errore nel caricamento dei veicoli cliente:', err);
        req.flash('error', 'Si è verificato un errore nel caricamento dei veicoli.');
        res.redirect('/cliente/dashboard');
    }
});

// Aggiungi veicolo
router.post('/veicoli', isCliente, [
    body('marca').trim().notEmpty().withMessage('La marca è obbligatoria'),
    body('modello').trim().notEmpty().withMessage('Il modello è obbligatorio'),
    body('anno').isInt({ min: 1900, max: new Date().getFullYear() }).withMessage('Anno non valido'),
    body('tipo').isIn(['auto', 'moto', 'furgone', 'altro']).withMessage('Tipo non valido')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.flash('error', errors.array().map(err => err.msg).join(', '));
        return res.redirect('/cliente/veicoli');
    }

    try {
        // Inserisci il nuovo veicolo
        await db.run(
            `INSERT INTO veicoli (id_cliente, marca, modello, anno, targa, tipo) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                req.user.id,
                req.body.marca,
                req.body.modello,
                req.body.anno,
                req.body.targa || '',
                req.body.tipo
            ]
        );
        
        req.flash('success', 'Veicolo aggiunto con successo.');
        res.redirect('/cliente/veicoli');
    } catch (err) {
        console.error('Errore nell\'aggiunta del veicolo:', err);
        req.flash('error', 'Si è verificato un errore nell\'aggiunta del veicolo.');
        res.redirect('/cliente/veicoli');
    }
});

// Elimina veicolo
router.post('/veicoli/:id/elimina', isCliente, async (req, res) => {
    try {
        // Verifica che il veicolo appartenga al cliente
        const veicolo = await db.get(
            'SELECT * FROM veicoli WHERE id = ? AND id_cliente = ?', 
            [req.params.id, req.user.id]
        );
        
        if (!veicolo) {
            req.flash('error', 'Veicolo non trovato o non autorizzato.');
            return res.redirect('/cliente/veicoli');
        }
        
        // Controlla se il veicolo è utilizzato in riparazioni attive
        const riparazioniAttive = await db.get(
            `SELECT COUNT(*) as count FROM riparazioni 
             WHERE id_veicolo = ? AND stato NOT IN ('completata', 'rifiutata')`,
            [req.params.id]
        );
        
        if (riparazioniAttive.count > 0) {
            req.flash('error', 'Impossibile eliminare il veicolo: è utilizzato in riparazioni attive.');
            return res.redirect('/cliente/veicoli');
        }
        
        // Elimina il veicolo
        await db.run('DELETE FROM veicoli WHERE id = ?', [req.params.id]);
        
        req.flash('success', 'Veicolo eliminato con successo.');
        res.redirect('/cliente/veicoli');
    } catch (err) {
        console.error('Errore nell\'eliminazione del veicolo:', err);
        req.flash('error', 'Si è verificato un errore nell\'eliminazione del veicolo.');
        res.redirect('/cliente/veicoli');
    }
});

// Modifica profilo
router.post('/profilo', isCliente, [
    body('nome').trim().notEmpty().withMessage('Il nome è obbligatorio'),
    body('email').isEmail().withMessage('Email non valida'),
    body('telefono').optional({ checkFalsy: true }),
    body('citta').optional({ checkFalsy: true })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.flash('error', errors.array().map(err => err.msg).join(', '));
        return res.redirect('/cliente/profilo');
    }

    try {
        // Controlla se l'email è già in uso da un altro utente
        if (req.body.email !== req.user.email) {
            const emailEsistente = await db.get(
                `SELECT id FROM clienti WHERE email = ? AND id != ?
                 UNION 
                 SELECT id FROM meccanici WHERE email = ?`,
                [req.body.email, req.user.id, req.body.email]
            );
            
            if (emailEsistente) {
                req.flash('error', 'Email già in uso da un altro utente.');
                return res.redirect('/cliente/profilo');
            }
        }
        
        // Aggiorna i dati del cliente
        let query = `
            UPDATE clienti SET 
            nome = ?, cognome = ?, email = ?, telefono = ?, citta = ?
            WHERE id = ?
        `;
        
        const params = [
            req.body.nome,
            req.body.cognome || '',
            req.body.email,
            req.body.telefono || null,
            req.body.citta || null,
            req.user.id
        ];
        
        // Se è stata fornita una nuova password, aggiungila
        if (req.body.password && req.body.password.length >= 6) {
            const hashedPassword = await bcrypt.hash(req.body.password, 10);
            query = `
                UPDATE clienti SET 
                nome = ?, cognome = ?, email = ?, telefono = ?, citta = ?, password = ?
                WHERE id = ?
            `;
            params.splice(5, 0, hashedPassword);
        }
        
        await db.run(query, params);
        
        req.flash('success', 'Profilo aggiornato con successo.');
        res.redirect('/cliente/profilo');
    } catch (err) {
        console.error('Errore nell\'aggiornamento del profilo cliente:', err);
        req.flash('error', 'Si è verificato un errore nell\'aggiornamento del profilo.');
        res.redirect('/cliente/profilo');
    }
});

module.exports = router;