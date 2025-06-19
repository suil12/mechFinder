"use strict";

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const clienteController = require('../controllers/clienteController');

// Middleware per verificare se l'utente è autenticato come cliente
const isCliente = (req, res, next) => {
    if (req.isAuthenticated() && req.user.tipo === 'cliente') {
        return next();
    }
    req.flash('error', 'Accesso negato. Effettua il login come cliente.');
    res.redirect('/');
};

// Route di debug per verificare lo stato dell'autenticazione
router.get('/debug-auth', (req, res) => {
    res.json({
        isAuthenticated: req.isAuthenticated(),
        user: req.user,
        session: req.session
    });
});

// Route di test per login rapido
router.get('/test-login', (req, res) => {
    res.send(`
        <html>
        <body>
            <h2>Test Login Cliente</h2>
            <form action="/auth/login/cliente" method="post">
                <div>
                    <label>Email:</label>
                    <input type="email" name="email" value="marco@esempio.it" required>
                </div>
                <div>
                    <label>Password:</label>
                    <input type="password" name="password" value="password123" required>
                </div>
                <button type="submit">Login</button>
            </form>
            
            <h3>Debug Info</h3>
            <p><strong>isAuthenticated:</strong> ${req.isAuthenticated()}</p>
            <p><strong>User:</strong> ${JSON.stringify(req.user, null, 2)}</p>
            
            <br><br>
            <a href="/cliente/debug-auth">Vedi Auth Status JSON</a><br>
            <a href="/cliente/dashboard">Vai alla Dashboard</a>
        </body>
        </html>
    `);
});

// Dashboard cliente
router.get('/dashboard', isCliente, clienteController.getDashboard);

// Gestione riparazioni
router.post('/crea-riparazione', isCliente, clienteController.creaRiparazione);
router.post('/conferma-riparazione', isCliente, clienteController.confermaRiparazione);
router.post('/lascia-recensione', isCliente, clienteController.lasciaRecensione);
router.get('/riparazione/:id', isCliente, clienteController.getRiparazioneDettagli);
router.get('/download-ricevuta/:riparazione_id', isCliente, clienteController.downloadRicevuta);

// Gestione veicoli
router.get('/veicoli', isCliente, clienteController.getVeicoli);
router.get('/veicoli/:id', isCliente, clienteController.getVeicoloDettagli);
router.post('/aggiungi-veicolo', isCliente, [
    body('targa').notEmpty().withMessage('Targa obbligatoria'),
    body('marca').notEmpty().withMessage('Marca obbligatoria'),
    body('modello').notEmpty().withMessage('Modello obbligatorio'),
    body('anno').isInt({ min: 1950, max: new Date().getFullYear() }).withMessage('Anno non valido')
], clienteController.aggiungiVeicolo);
router.put('/modifica-veicolo/:id', isCliente, clienteController.modificaVeicolo);
router.delete('/elimina-veicolo/:id', isCliente, clienteController.eliminaVeicolo);

// API per dashboard
router.get('/api/meccanici-area', isCliente, clienteController.getMeccaniciAreaAPI);
router.get('/api/notifiche', isCliente, clienteController.getNotificheAPI);

// Profilo cliente
router.get('/profilo', isCliente, clienteController.getProfilo);
router.post('/aggiorna-profilo', isCliente, [
    body('nome').trim().notEmpty().withMessage('Il nome è obbligatorio'),
    body('cognome').trim().notEmpty().withMessage('Il cognome è obbligatorio'),
    body('email').isEmail().withMessage('Email non valida'),
    body('telefono').optional().isMobilePhone('it-IT').withMessage('Numero telefono non valido'),
    body('password').optional().isLength({ min: 6 }).withMessage('La password deve essere di almeno 6 caratteri')
], clienteController.aggiornaProfilo);

// Notifiche
router.post('/marca-notifica-letta/:id', isCliente, clienteController.marcaNotificaLetta);

module.exports = router;