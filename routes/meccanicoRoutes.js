"use strict";

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const path = require('path');
const { Meccanico } = require('../models/utente');
const { Riparazione } = require('../models/riparazione');
const db = require('../database/db');

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

// Dashboard meccanico
// In routes/meccanicoRoutes.js
router.get('/dashboard', isMeccanico, async (req, res) => {
    try {
      // Get mechanic data
      const meccanico = await Meccanico.findById(req.user.id);
      
      // Get pending requests/repairs
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
      
      // Get repairs in progress
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
      
      // Get completed repairs
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
      
      // Get recent reviews
      const recensioniRecenti = await db.query(
        `SELECT r.*, c.nome as nome_cliente, c.cognome as cognome_cliente,
         c.avatar as avatar_cliente
         FROM recensioni r
         JOIN clienti c ON r.id_cliente = c.id
         WHERE r.id_meccanico = ?
         ORDER BY r.data_recensione DESC
         LIMIT 3`,
        [req.user.id]
      );
      
      // Calculate statistics
      // Number of total repairs
      const totalRiparazioni = await db.get(
        'SELECT COUNT(*) as count FROM riparazioni WHERE id_meccanico = ?',
        [req.user.id]
      );
      
      // Number of repairs by status
      const riparazioniPerStato = await db.query(
        `SELECT stato, COUNT(*) as count 
         FROM riparazioni 
         WHERE id_meccanico = ? 
         GROUP BY stato`,
        [req.user.id]
      );
      
      // Total income
      const incassoTotale = await db.get(
        'SELECT SUM(costo) as total FROM riparazioni WHERE id_meccanico = ? AND stato = ? AND costo > 0',
        [req.user.id, 'completata']
      );
      
      // Create stats object
      const stats = {
        totalRiparazioni: totalRiparazioni ? totalRiparazioni.count : 0,
        riparazioniPerStato: riparazioniPerStato || [],
        incassoTotale: incassoTotale ? incassoTotale.total || 0 : 0,
        valutazione: meccanico.valutazione || 0,
        numeroRecensioni: meccanico.numero_recensioni || 0
      };
      
      // Render the dashboard with all necessary data
      res.render('meccanico/dashboard', {
        title: 'Dashboard Meccanico - MechFinder',
        active: 'dashboard',
        meccanico,
        richiestePendenti,
        riparazioniInCorso,
        riparazioniCompletate,
        recensioniRecenti,
        valutazioneMedia: meccanico.valutazione || 0,
        numeroRecensioni: meccanico.numero_recensioni || 0,
        stats // Added stats object
      });
    } catch (err) {
      console.error('Error loading mechanic dashboard:', err);
      req.flash('error', 'Si è verificato un errore nel caricamento della dashboard.');
      res.redirect('/');
    }
  });

// Profilo meccanico (area personale)
router.get('/profilo', isMeccanico, async (req, res) => {
    try {
        // Fetch the complete mechanic data from the database
        const meccanico = await Meccanico.findById(req.user.id);
        
        res.render('meccanico/profilo', {
            title: 'Il Mio Profilo - MechFinder',
            active: 'profilo',
            currentUser: meccanico // Add the mechanic data to the template
        });
    } catch (err) {
        console.error('Errore nel caricamento del profilo meccanico:', err);
        req.flash('error', 'Si è verificato un errore nel caricamento del profilo.');
        res.redirect('/');
    }
});

// Aggiornamento profilo meccanico
router.post('/profilo', isMeccanico, [
    body('nome').trim().notEmpty().withMessage('Il nome è obbligatorio'),
    body('email').isEmail().withMessage('Email non valida')
        .custom(async (email, { req }) => {
            const meccanico = await Meccanico.findByEmail(email);
            if (meccanico && meccanico.id !== req.user.id) {
                throw new Error('Email già registrata');
            }
            return true;
        }),
    body('officina').trim().notEmpty().withMessage('Il nome dell\'officina è obbligatorio'),
    body('specializzazione').trim().notEmpty().withMessage('La specializzazione è obbligatoria'),
    body('telefono').trim().notEmpty().withMessage('Il telefono è obbligatorio'),
    body('citta').trim().notEmpty().withMessage('La città è obbligatoria')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.render('meccanico/profilo', {
            title: 'Il Mio Profilo - MechFinder',
            active: 'profilo',
            errors: errors.array()
        });
    }

    try {
        const meccanico = await Meccanico.findById(req.user.id);
        meccanico.nome = req.body.nome;
        meccanico.email = req.body.email;
        meccanico.officina = req.body.officina;
        meccanico.specializzazione = req.body.specializzazione;
        meccanico.telefono = req.body.telefono;
        meccanico.citta = req.body.citta;
        meccanico.descrizione = req.body.descrizione || '';

        // Gestione upload immagine profilo
        if (req.files && req.files.profileImage) {
            const profileImage = req.files.profileImage;
            const fileName = `meccanico_${meccanico.id}_${Date.now()}${path.extname(profileImage.name)}`;
            const uploadPath = path.join(__dirname, '../public/media/imgprova', fileName);
            
            await profileImage.mv(uploadPath);
            meccanico.immagine = `/media/imgprova/${fileName}`;
        }

        // Aggiornamento password se fornita
        if (req.body.password && req.body.password.length >= 6) {
            meccanico.password = await bcrypt.hash(req.body.password, 10);
        }

        await meccanico.update();
        req.flash('success', 'Profilo aggiornato con successo.');
        res.redirect('/meccanico/profilo');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Si è verificato un errore durante l\'aggiornamento del profilo.');
        res.redirect('/meccanico/profilo');
    }
});

// Riparazioni gestite
router.get('/riparazioni', isMeccanico, async (req, res) => {
    try {
        const riparazioni = await Riparazione.findByMeccanicoId(req.user.id);
        
        res.render('meccanico/riparazioni', {
            title: 'Riparazioni Gestite - MechFinder',
            active: 'riparazioni',
            riparazioni: riparazioni
        });
    } catch (err) {
        console.error(err);
        req.flash('error', 'Si è verificato un errore nel caricamento delle riparazioni.');
        res.redirect('/meccanico/dashboard');
    }
});

// Dettaglio riparazione
router.get('/riparazioni/:id', isMeccanico, async (req, res) => {
    try {
        const riparazione = await Riparazione.findById(req.params.id);
        
        if (!riparazione || riparazione.meccanico_id !== req.user.id) {
            req.flash('error', 'Riparazione non trovata o non autorizzata.');
            return res.redirect('/meccanico/riparazioni');
        }
        
        res.render('meccanico/dettaglio-riparazione', {
            title: 'Dettaglio Riparazione - MechFinder',
            active: 'riparazioni',
            riparazione: riparazione
        });
    } catch (err) {
        console.error(err);
        req.flash('error', 'Si è verificato un errore nel caricamento del dettaglio riparazione.');
        res.redirect('/meccanico/riparazioni');
    }
});

// Aggiornamento stato riparazione
router.post('/riparazioni/:id/stato', isMeccanico, [
    body('stato').isIn(['in_attesa', 'in_lavorazione', 'completata', 'annullata'])
        .withMessage('Stato non valido')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.flash('error', 'Stato riparazione non valido.');
        return res.redirect(`/meccanico/riparazioni/${req.params.id}`);
    }

    try {
        const riparazione = await Riparazione.findById(req.params.id);
        
        if (!riparazione || riparazione.meccanico_id !== req.user.id) {
            req.flash('error', 'Riparazione non trovata o non autorizzata.');
            return res.redirect('/meccanico/riparazioni');
        }
        
        riparazione.stato = req.body.stato;
        riparazione.note_meccanico = req.body.note_meccanico || riparazione.note_meccanico;
        
        await riparazione.update();
        req.flash('success', 'Stato riparazione aggiornato con successo.');
        res.redirect(`/meccanico/riparazioni/${req.params.id}`);
    } catch (err) {
        console.error(err);
        req.flash('error', 'Si è verificato un errore nell\'aggiornamento dello stato.');
        res.redirect(`/meccanico/riparazioni/${req.params.id}`);
    }
});

module.exports = router;