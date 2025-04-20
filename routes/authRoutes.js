"use strict";

const express = require('express');
const router = express.Router();
const passport = require('passport');
const { body, validationResult } = require('express-validator');
const { Cliente, Meccanico } = require('../models/utente');

// Middleware per verificare se l'utente è già autenticato
const isNotAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return res.redirect('/');
    }
    next();
};

// Validazione dei dati di registrazione cliente
const validateClienteRegistration = [
    body('nome').trim().notEmpty().withMessage('Il nome è obbligatorio'),
    body('cognome').trim().notEmpty().withMessage('Il cognome è obbligatorio'),
    body('email').trim().isEmail().withMessage('Email non valida'),
    body('password').isLength({ min: 6 }).withMessage('La password deve essere di almeno 6 caratteri'),
    body('conferma_password').custom((value, { req }) => {
        if (value !== req.body.password) {
            throw new Error('Le password non coincidono');
        }
        return true;
    })
];

// Validazione dei dati di registrazione meccanico
const validateMeccanicoRegistration = [
    ...validateClienteRegistration,
    body('specializzazione').trim().notEmpty().withMessage('La specializzazione è obbligatoria')
];

// Login cliente
router.post('/login/cliente', isNotAuthenticated, (req, res, next) => {
    passport.authenticate('cliente', (err, user, info) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Errore durante il login' });
        }
        
        if (!user) {
            return res.status(400).json({ success: false, message: info.message });
        }
        
        req.logIn(user, (err) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Errore durante il login' });
            }
            
            return res.json({ success: true, user: { id: user.id, nome: user.nome, tipo: user.tipo } });
        });
    })(req, res, next);
});

// Login meccanico
router.post('/login/meccanico', isNotAuthenticated, (req, res, next) => {
    passport.authenticate('meccanico', (err, user, info) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Errore durante il login' });
        }
        
        if (!user) {
            return res.status(400).json({ success: false, message: info.message });
        }
        
        req.logIn(user, (err) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Errore durante il login' });
            }
            
            return res.json({ success: true, user: { id: user.id, nome: user.nome, tipo: user.tipo } });
        });
    })(req, res, next);
});

// Registrazione cliente
router.post('/register/cliente', isNotAuthenticated, validateClienteRegistration, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }
    
    try {
        // Controlla se l'email è già registrata
        const existingCliente = await Cliente.findByEmail(req.body.email);
        const existingMeccanico = await Meccanico.findByEmail(req.body.email);
        
        if (existingCliente || existingMeccanico) {
            return res.status(400).json({ success: false, message: 'Email già registrata' });
        }
        
        // Registra il nuovo cliente
        const cliente = await Cliente.register({
            nome: req.body.nome,
            cognome: req.body.cognome,
            email: req.body.email,
            password: req.body.password,
            telefono: req.body.telefono,
            indirizzo: req.body.indirizzo,
            citta: req.body.citta,
            cap: req.body.cap
        });
        
        // Effettua il login automatico
        req.logIn(cliente, (err) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Errore durante il login automatico' });
            }
            
            return res.json({ success: true, user: { id: cliente.id, nome: cliente.nome, tipo: cliente.tipo } });
        });
    } catch (error) {
        console.error('Errore durante la registrazione cliente:', error);
        res.status(500).json({ success: false, message: 'Errore durante la registrazione' });
    }
});

// Registrazione meccanico
router.post('/register/meccanico', isNotAuthenticated, validateMeccanicoRegistration, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }
    
    try {
        // Controlla se l'email è già registrata
        const existingCliente = await Cliente.findByEmail(req.body.email);
        const existingMeccanico = await Meccanico.findByEmail(req.body.email);
        
        if (existingCliente || existingMeccanico) {
            return res.status(400).json({ success: false, message: 'Email già registrata' });
        }
        
        // Registra il nuovo meccanico
        const meccanico = await Meccanico.register({
            nome: req.body.nome,
            cognome: req.body.cognome,
            email: req.body.email,
            password: req.body.password,
            specializzazione: req.body.specializzazione,
            telefono: req.body.telefono,
            nome_officina: req.body.nome_officina,
            indirizzo: req.body.indirizzo,
            citta: req.body.citta,
            cap: req.body.cap,
            descrizione: req.body.descrizione
        });
        
        // Effettua il login automatico
        req.logIn(meccanico, (err) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Errore durante il login automatico' });
            }
            
            return res.json({ success: true, user: { id: meccanico.id, nome: meccanico.nome, tipo: meccanico.tipo } });
        });
    } catch (error) {
        console.error('Errore durante la registrazione meccanico:', error);
        res.status(500).json({ success: false, message: 'Errore durante la registrazione' });
    }
});

// Logout
router.post('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Errore durante il logout' });
        }
        res.json({ success: true });
    });
});

// Verifica se l'utente è autenticato
router.get('/check', (req, res) => {
    if (req.isAuthenticated()) {
        return res.json({ 
            isAuthenticated: true, 
            user: { 
                id: req.user.id, 
                nome: req.user.nome, 
                cognome: req.user.cognome, 
                tipo: req.user.tipo,
                avatar: req.user.avatar
            } 
        });
    } else {
        return res.json({ isAuthenticated: false });
    }
});

module.exports = router;