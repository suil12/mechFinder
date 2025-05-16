"use strict";

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const path = require('path');
const { Meccanico } = require('../models/utente');
const { Riparazione } = require('../models/riparazione');

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
router.get('/dashboard', isMeccanico, async (req, res) => {
    try {
        // Ottenere le riparazioni del meccanico
        const riparazioni = await Riparazione.findByMeccanicoId(req.user.id);
        
        res.render('meccanico/dashboard', {
            title: 'Dashboard Meccanico - MechFinder',
            active: 'dashboard',
            riparazioni: riparazioni
        });
    } catch (err) {
        console.error(err);
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