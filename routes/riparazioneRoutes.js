"use strict";

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const riparazioneController = require('../controllers/riparazioneController');

// Middleware per verificare se l'utente è autenticato
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    req.flash('error', 'Devi accedere per visualizzare questa pagina.');
    res.redirect('/');
};

// Bacheca riparazioni (accessibile a tutti gli utenti autenticati)
router.get('/', isAuthenticated, riparazioneController.getRiparazioni);

// Dettaglio riparazione
router.get('/:id', isAuthenticated, riparazioneController.getDettaglioRiparazione);

// Aggiunta commento
router.post('/:id/commenti', isAuthenticated, [
    body('messaggio').trim().notEmpty().withMessage('Il messaggio non può essere vuoto')
], riparazioneController.aggiungiCommento);

// Creazione nuova riparazione (solo clienti)
router.post('/', isAuthenticated, [
    body('titolo').trim().notEmpty().withMessage('Il titolo è obbligatorio'),
    body('descrizione').trim().notEmpty().withMessage('La descrizione è obbligatoria'),
    body('categoria').notEmpty().withMessage('La categoria è obbligatoria'),
    body('citta').trim().notEmpty().withMessage('La città è obbligatoria')
], riparazioneController.creaRiparazione);

// Invio preventivo (solo meccanici)
router.post('/:id/preventivi', isAuthenticated, [
    body('importo').isFloat({ min: 0 }).withMessage('L\'importo deve essere un numero positivo'),
    body('descrizione').trim().notEmpty().withMessage('La descrizione è obbligatoria'),
    body('tempo_stimato').isInt({ min: 1 }).withMessage('Il tempo stimato deve essere un numero intero positivo')
], riparazioneController.inviaPreventivo);

module.exports = router;