"use strict";

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const path = require('path');
const { Meccanico } = require('../models/utente');

const db = require('../database/db');
const meccanicoController = require('../controllers/meccanicoController');

// Middleware per verificare se l'utente è autenticato come meccanico
const isMeccanico = (req, res, next) => {
    if (req.isAuthenticated() && req.user.tipo === 'meccanico') {
        return next();
    }
    req.flash('error', 'Devi accedere come meccanico per visualizzare questa pagina.');
    res.redirect('/');
};

// Pagina dettaglio meccanico pubblica
router.get('/profilo/:id', async (req, res) => {
    try {
        const meccanico = await Meccanico.findById(req.params.id);
        
        if (!meccanico) {
            req.flash('error', 'Meccanico non trovato.');
            return res.redirect('/meccanici');
        }
        
        res.render('meccanico/profilo-pubblico', {
            title: `${meccanico.nome} - Profilo Meccanico - MechFinder`,
            active: 'meccanici',
            meccanico: meccanico
        });
    } catch (err) {
        console.error(err);
        req.flash('error', 'Si è verificato un errore nel caricamento del profilo meccanico.');
        res.redirect('/meccanici');
    }
});

// Dashboard meccanico - usa il controller
router.get('/dashboard', isMeccanico, meccanicoController.getDashboard);

// Gestione profilo e notifiche
router.post('/aggiorna-profilo', isMeccanico, meccanicoController.aggiornaProfilo);
router.get('/notifiche', isMeccanico, meccanicoController.getNotifiche);
router.post('/notifica-letta/:id', isMeccanico, meccanicoController.segnaNotificaLetta);

// Route per API modal
router.get('/api/riparazioni', isMeccanico, meccanicoController.getTutteRiparazioni);
router.get('/api/recensioni', isMeccanico, meccanicoController.getRecensioni);

// Profilo meccanico (reindirizza alla dashboard)
router.get('/profilo', isMeccanico, (req, res) => {
    res.redirect('/meccanico/dashboard');
});

// Aggiornamento profilo meccanico - reindirizza alla dashboard  
router.post('/profilo', isMeccanico, (req, res) => {
    req.flash('info', 'Le impostazioni del profilo sono disponibili nella dashboard.');
    res.redirect('/meccanico/dashboard');
});

// Route per tutte le riparazioni (API per il modal)
router.get('/tutte-riparazioni', isMeccanico, async (req, res) => {
    try {
        const meccanicoId = req.user.id;
        const filtroStato = req.query.stato;
        
        let query = `
            SELECT r.*, c.nome as nome_cliente, c.cognome as cognome_cliente,
                   v.marca, v.modello, v.anno, v.targa
            FROM riparazioni r
            JOIN clienti c ON r.id_cliente = c.id
            LEFT JOIN veicoli v ON r.id_veicolo = v.id
            WHERE r.id_meccanico = ?
        `;
        
        const params = [meccanicoId];
        
        if (filtroStato) {
            if (filtroStato.includes(',')) {
                // Più stati separati da virgola
                const stati = filtroStato.split(',').map(s => `'${s.trim()}'`).join(',');
                query += ` AND r.stato IN (${stati})`;
            } else {
                query += ` AND r.stato = ?`;
                params.push(filtroStato);
            }
        }
        
        query += ` ORDER BY r.data_richiesta DESC`;
        
        const riparazioni = await db.all(query, params);
        
        res.json({ success: true, riparazioni });
    } catch (error) {
        console.error('Errore nel recupero riparazioni:', error);
        res.json({ success: false, message: 'Errore nel recupero delle riparazioni' });
    }
});

// Route per dettagli riparazione (API per il modal)
router.get('/riparazione/:id/dettagli', isMeccanico, async (req, res) => {
    try {
        const riparazioneId = req.params.id;
        const meccanicoId = req.user.id;
        
        const riparazione = await db.get(`
            SELECT r.*, c.nome as nome_cliente, c.cognome as cognome_cliente, 
                   c.email as email_cliente, c.telefono as telefono_cliente,
                   v.marca, v.modello, v.anno, v.targa
            FROM riparazioni r
            JOIN clienti c ON r.id_cliente = c.id
            LEFT JOIN veicoli v ON r.id_veicolo = v.id
            WHERE r.id = ? AND r.id_meccanico = ?
        `, [riparazioneId, meccanicoId]);
        
        if (!riparazione) {
            return res.json({ success: false, message: 'Riparazione non trovata' });
        }
        
        res.json({ success: true, riparazione });
    } catch (error) {
        console.error('Errore nel recupero dettagli riparazione:', error);
        res.json({ success: false, message: 'Errore nel recupero dei dettagli' });
    }
});

// Route API per le recensioni (gestisce sia pagina che AJAX)
router.get('/recensioni', isMeccanico, async (req, res) => {
    try {
        const meccanicoId = req.user.id;
        
        // Se è una richiesta AJAX (per il modal), restituisci JSON
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            const recensioni = await db.all(`
                SELECT rec.*, c.nome as nome_cliente, c.cognome as cognome_cliente, 
                       r.descrizione as descrizione_riparazione
                FROM recensioni rec
                JOIN clienti c ON rec.id_cliente = c.id
                LEFT JOIN riparazioni r ON rec.id_riparazione = r.id
                WHERE rec.id_meccanico = ?
                ORDER BY rec.data_recensione DESC
            `, [meccanicoId]);
            
            return res.json({ success: true, recensioni });
        }
        
        // Altrimenti usa il controller normale per la pagina
        return meccanicoController.getRecensioni(req, res);
    } catch (error) {
        console.error('Errore nel recupero recensioni:', error);
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            res.json({ success: false, message: 'Errore nel recupero delle recensioni' });
        } else {
            req.flash('error', 'Errore nel caricamento delle recensioni.');
            res.redirect('/meccanico/dashboard');
        }
    }
});

// Gestione riparazioni
router.post('/accetta-richiesta', isMeccanico, meccanicoController.accettaRichiesta);
router.post('/completa-riparazione', isMeccanico, meccanicoController.completaRiparazione);

// Download PDF certificato riparazione
router.get('/download-pdf/:riparazione_id', isMeccanico, meccanicoController.downloadPDF);

module.exports = router;
