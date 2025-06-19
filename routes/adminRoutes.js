"use strict";

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const adminController = require('../controllers/adminController');

// Middleware per verificare se l'utente è autenticato come admin
const isAdmin = (req, res, next) => {
    if (req.isAuthenticated() && req.user.tipo === 'admin') {
        return next();
    }
    req.flash('error', 'Accesso negato. Privilegi di amministratore richiesti.');
    res.redirect('/');
};

// Dashboard admin
router.get('/dashboard', isAdmin, adminController.getDashboard);

// Gestione utenti
router.get('/utenti', isAdmin, adminController.getUtenti);

// API per i dati dei modali
router.get('/api/meccanici', isAdmin, adminController.getMeccaniciAPI);
router.get('/api/clienti', isAdmin, adminController.getClientiAPI);
router.get('/api/richieste-verifica', isAdmin, adminController.getRichiesteVerificaAPI);
router.get('/api/riparazioni', isAdmin, adminController.getRiparazioniAPI);

// Azioni di gestione
router.post('/verifica-meccanico', isAdmin, adminController.verificaMeccanico);
router.post('/toggle-sospensione', isAdmin, adminController.toggleSospensioneUtente);
router.post('/notifica-globale', isAdmin, adminController.inviaNotificaGlobale);
router.delete('/cancella-notifica/:id', isAdmin, adminController.cancellaNotifica);
router.delete('/cancella-notifiche-vecchie', isAdmin, adminController.cancellaNotificheVecchie);

// Profilo admin
router.get('/profilo', isAdmin, adminController.getProfilo);

// Aggiorna profilo admin
router.post('/aggiorna-profilo', isAdmin, [
    body('nome').trim().notEmpty().withMessage('Il nome è obbligatorio'),
    body('email').isEmail().withMessage('Email non valida'),
    body('password').optional().isLength({ min: 6 }).withMessage('La password deve essere di almeno 6 caratteri')
], adminController.aggiornaProfilo);

// API per statistiche dashboard
router.get('/api/stats', isAdmin, async (req, res) => {
    try {
        const db = require('../database/db');
        
        // Statistiche mensili riparazioni
        const riparazioniMensili = await db.query(`
            SELECT 
                strftime('%Y-%m', data_richiesta) as mese,
                COUNT(*) as totale,
                COUNT(CASE WHEN stato = 'completata' THEN 1 END) as completate,
                COUNT(CASE WHEN stato = 'in_corso' THEN 1 END) as in_corso
            FROM riparazioni 
            WHERE data_richiesta >= date('now', '-12 months')
            GROUP BY strftime('%Y-%m', data_richiesta)
            ORDER BY mese
        `);

        // Meccanici più attivi
        const meccaniciAttivi = await db.query(`
            SELECT 
                m.nome, m.cognome, m.nome_officina,
                COUNT(r.id) as totale_riparazioni,
                AVG(m.valutazione) as valutazione_media
            FROM meccanici m
            LEFT JOIN riparazioni r ON m.id = r.id_meccanico
            WHERE m.verificato = 1
            GROUP BY m.id
            ORDER BY totale_riparazioni DESC
            LIMIT 10
        `);

        // Registrazioni per tipo negli ultimi 30 giorni
        const registrazioniRecenti = await db.query(`
            SELECT 
                DATE(data_registrazione) as data,
                'cliente' as tipo,
                COUNT(*) as count
            FROM clienti 
            WHERE data_registrazione >= date('now', '-30 days')
            GROUP BY DATE(data_registrazione)
            UNION ALL
            SELECT 
                DATE(data_registrazione) as data,
                'meccanico' as tipo,
                COUNT(*) as count
            FROM meccanici 
            WHERE data_registrazione >= date('now', '-30 days')
            GROUP BY DATE(data_registrazione)
            ORDER BY data DESC
        `);

        res.json({
            success: true,
            data: {
                riparazioniMensili,
                meccaniciAttivi,
                registrazioniRecenti
            }
        });
    } catch (err) {
        console.error('Errore nel recupero delle statistiche:', err);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero delle statistiche'
        });
    }
});

module.exports = router;
