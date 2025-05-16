"use strict";

const express = require('express');
const router = express.Router();
const passport = require('passport');
const { body, validationResult } = require('express-validator');
const authController = require('../controllers/authController');

// Middleware per verificare se l'utente è già autenticato
const isNotAuthenticated = (req, res, next) => {
    if (!req.isAuthenticated()) {
        return next();
    }
    // Redirect in base al tipo di utente
    if (req.user.tipo === 'cliente') {
        res.redirect('/cliente/dashboard');
    } else if (req.user.tipo === 'meccanico') {
        res.redirect('/meccanico/dashboard');
    } else if (req.user.tipo === 'admin') {
        res.redirect('/admin/dashboard');
    } else {
        res.redirect('/');
    }
};

// Login form (redirect a home in questo caso, visto che usi modali)
router.get('/login', isNotAuthenticated, (req, res) => {
    res.redirect('/');
});

// Login cliente
// Login cliente con gestione errori migliore
router.post('/login/cliente', (req, res, next) => {
    passport.authenticate('cliente', (err, user, info) => {
        if (err) {
            req.flash('error', 'Si è verificato un errore durante il login');
            return res.redirect('/');
        }
        if (!user) {
            req.flash('error', info.message || 'Email o password non validi');
            return res.redirect('/');
        }
        req.logIn(user, (err) => {
            if (err) {
                req.flash('error', 'Si è verificato un errore durante il login');
                return res.redirect('/');
            }
            return res.redirect('/cliente/dashboard');
        });
    })(req, res, next);
});

// Login meccanico
router.post('/login/meccanico', (req, res, next) => {
passport.authenticate('meccanico', (err, user, info) => {
    if (err) {
        req.flash('error', 'Si è verificato un errore durante il login');
        return res.redirect('/');
    }
    if (!user) {
        req.flash('error', info.message || 'Email o password non validi');
        return res.redirect('/');
    }
    req.logIn(user, (err) => {
        if (err) {
            req.flash('error', 'Si è verificato un errore durante il login');
            return res.redirect('/');
        }
        return res.redirect('/meccanico/dashboard');
    });
})(req, res, next);
});


// Login admin
router.post('/login/admin', (req, res, next) => {
passport.authenticate('admin', (err, user, info) => {
    if (err) {
        req.flash('error', 'Si è verificato un errore durante il login');
        return res.redirect('/');
    }
    if (!user) {
        req.flash('error', info.message || 'Email o password non validi');
        return res.redirect('/');
    }
    req.logIn(user, (err) => {
        if (err) {
            req.flash('error', 'Si è verificato un errore durante il login');
            return res.redirect('/');
        }
        return res.redirect('/admin/dashboard');
    });
})(req, res, next);
});


// Registrazione cliente
router.post('/register/cliente', [
    // Validazioni
    body('nome').trim().notEmpty().withMessage('Il nome è obbligatorio'),
    body('email').isEmail().withMessage('Email non valida')
        .custom(async (email) => {
            const exists = await authController.checkEmailExists(email);
            if (exists) {
                throw new Error('Email già registrata');
            }
            return true;
        }),
    body('password').isLength({ min: 6 }).withMessage('La password deve essere di almeno 6 caratteri'),
    body('password_confirm').custom((value, { req }) => {
        if (value !== req.body.password) {
            throw new Error('Le password non coincidono');
        }
        return true;
    })
], authController.registerCliente);

// Registrazione meccanico
router.post('/register/meccanico', [
    // Validazioni
    body('nome').trim().notEmpty().withMessage('Il nome è obbligatorio'),
    body('email').isEmail().withMessage('Email non valida')
        .custom(async (email) => {
            const exists = await authController.checkEmailExists(email);
            if (exists) {
                throw new Error('Email già registrata');
            }
            return true;
        }),
    body('password').isLength({ min: 6 }).withMessage('La password deve essere di almeno 6 caratteri'),
    body('password_confirm').custom((value, { req }) => {
        if (value !== req.body.password) {
            throw new Error('Le password non coincidono');
        }
        return true;
    }),
    body('officina').notEmpty().withMessage('Il nome dell\'officina è obbligatorio'),
    body('specializzazione').notEmpty().withMessage('La specializzazione è obbligatoria'),
    body('telefono').notEmpty().withMessage('Il telefono è obbligatorio'),
    body('citta').notEmpty().withMessage('La città è obbligatoria')
], authController.registerMeccanico);

// Logout
router.get('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) { return next(err); }
        req.flash('success', 'Logout effettuato con successo');
        res.redirect('/');
    });
});

// Endpoint per verificare lo stato di autenticazione dell'utente
router.get('/check', (req, res) => {
    if (req.isAuthenticated()) {
        // Ritorna le informazioni dell'utente senza la password
        const user = { ...req.user };
        delete user.password;
        res.json({
            isAuthenticated: true,
            user: user
        });
    } else {
        res.json({
            isAuthenticated: false
        });
    }
});

// Recupero password - Form
router.get('/reset-password', isNotAuthenticated, (req, res) => {
    res.render('auth/reset-password', {
        title: 'Recupera password - MechFinder',
        active: ''
    });
});

// Recupero password - Richiesta
router.post('/reset-password', [
    body('email').isEmail().withMessage('Email non valida')
], authController.requestPasswordReset);

// Recupero password - Form nuova password
router.get('/reset-password/:token', isNotAuthenticated, authController.getResetPasswordForm);

// Recupero password - Conferma nuova password
router.post('/reset-password/:token', [
    body('password').isLength({ min: 6 }).withMessage('La password deve essere di almeno 6 caratteri'),
    body('password_confirm').custom((value, { req }) => {
        if (value !== req.body.password) {
            throw new Error('Le password non coincidono');
        }
        return true;
    })
], authController.resetPassword);

module.exports = router;