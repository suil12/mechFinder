"use strict";

const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { validationResult } = require('express-validator');
const { Cliente, Meccanico } = require('../models/utente');
const { sendPasswordResetEmail } = require('../utils/emailService');

// Controlla se un'email è già registrata
exports.checkEmailExists = async (email) => {
    try {
        const cliente = await Cliente.findByEmail(email);
        if (cliente) return true;
        
        const meccanico = await Meccanico.findByEmail(email);
        if (meccanico) return true;
        
        return false;
    } catch (err) {
        console.error('Errore nella verifica email:', err);
        throw new Error('Errore nella verifica email');
    }
};

// Registrazione cliente
exports.registerCliente = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.flash('error', errors.array().map(err => err.msg).join(', '));
        return res.redirect('/#registerModal');
    }

    try {
        // Hash della password
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        
        // Crea il nuovo cliente
        const nuovoCliente = {
            nome: req.body.nome,
            cognome: req.body.cognome || '', // Ensure cognome is never undefined
            email: req.body.email,
            password: hashedPassword,
            telefono: req.body.telefono || null,
            citta: req.body.citta || null,
            data_registrazione: new Date(),
            tipo: 'cliente'
        };
        
        const cliente = await Cliente.create(nuovoCliente);
        
        // Login automatico dopo la registrazione
        req.login({ id: cliente.id, tipo: 'cliente' }, (err) => {
            if (err) {
                console.error('Errore login post-registrazione:', err);
                req.flash('success', 'Registrazione completata. Ora puoi accedere.');
                return res.redirect('/');
            }
            
            req.flash('success', 'Registrazione completata con successo!');
            res.redirect('/cliente/profilo');
        });
    } catch (err) {
        console.error('Errore nella registrazione cliente:', err);
        req.flash('error', 'Si è verificato un errore durante la registrazione. Riprova più tardi.');
        res.redirect('/#registerModal');
    }
};

// Registrazione meccanico
exports.registerMeccanico = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.flash('error', errors.array().map(err => err.msg).join(', '));
        return res.redirect('/#registerMeccanicoModal');
    }

    try {
        // Hash della password
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        
        // Crea il nuovo meccanico
        const nuovoMeccanico = {
            nome: req.body.nome,
            cognome: req.body.cognome || '', // Ensure cognome is never undefined
            email: req.body.email,
            password: hashedPassword,
            officina: req.body.officina,
            specializzazione: req.body.specializzazione,
            telefono: req.body.telefono,
            citta: req.body.citta,
            descrizione: req.body.descrizione || '',
            data_registrazione: new Date(),
            verificato: false, // Richiede verifica da parte dell'admin
            tipo: 'meccanico',
            valutazione: 0, // Default value to avoid undefined errors
            numero_recensioni: 0 // Default value to avoid undefined errors
        };
        
        const meccanico = await Meccanico.create(nuovoMeccanico);
        
        // Login automatico dopo la registrazione
        req.login({ id: meccanico.id, tipo: 'meccanico' }, (err) => {
            if (err) {
                console.error('Errore login post-registrazione:', err);
                req.flash('success', 'Registrazione completata. In attesa di verifica. Ora puoi accedere.');
                return res.redirect('/');
            }
            
            req.flash('success', 'Registrazione completata con successo! Il tuo account è in attesa di verifica.');
            res.redirect('/meccanico/profilo');
        });
    } catch (err) {
        console.error('Errore nella registrazione meccanico:', err);
        req.flash('error', 'Si è verificato un errore durante la registrazione. Riprova più tardi.');
        res.redirect('/#registerMeccanicoModal');
    }
};

// Richiesta di reset password
exports.requestPasswordReset = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.flash('error', errors.array().map(err => err.msg).join(', '));
        return res.redirect('/auth/reset-password');
    }

    try {
        const email = req.body.email;
        let user = null;
        let userType = null;
        
        // Cerca l'utente come cliente
        const cliente = await Cliente.findByEmail(email);
        if (cliente) {
            user = cliente;
            userType = 'cliente';
        } else {
            // Cerca l'utente come meccanico
            const meccanico = await Meccanico.findByEmail(email);
            if (meccanico) {
                user = meccanico;
                userType = 'meccanico';
            }
        }
        
        if (!user) {
            // Non indichiamo che l'email non esiste per motivi di sicurezza
            req.flash('success', 'Se l\'email è registrata, riceverai un link per reimpostare la password.');
            return res.redirect('/auth/reset-password');
        }
        
        // Genera token di reset
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetExpires = new Date(Date.now() + 3600000); // 1 ora
        
        // Salva token nel database
        if (userType === 'cliente') {
            await Cliente.updateResetToken(user.id, resetToken, resetExpires);
        } else {
            await Meccanico.updateResetToken(user.id, resetToken, resetExpires);
        }
        
        // Invia email con link di reset
        const resetUrl = `${req.protocol}://${req.get('host')}/auth/reset-password/${resetToken}`;
        await sendPasswordResetEmail(user.email, user.nome, resetUrl);
        
        req.flash('success', 'Email di reset password inviata. Controlla la tua casella di posta.');
        res.redirect('/auth/reset-password');
    } catch (err) {
        console.error('Errore nella richiesta di reset password:', err);
        req.flash('error', 'Si è verificato un errore nell\'invio dell\'email di reset. Riprova più tardi.');
        res.redirect('/auth/reset-password');
    }
};

// Form per impostare nuova password
exports.getResetPasswordForm = async (req, res) => {
    try {
        const token = req.params.token;
        let user = null;
        
        // Cerca il token tra i clienti
        const cliente = await Cliente.findByResetToken(token);
        if (cliente && cliente.reset_token_expires > new Date()) {
            user = cliente;
        } else {
            // Cerca il token tra i meccanici
            const meccanico = await Meccanico.findByResetToken(token);
            if (meccanico && meccanico.reset_token_expires > new Date()) {
                user = meccanico;
            }
        }
        
        if (!user) {
            req.flash('error', 'Il link di reset password non è valido o è scaduto.');
            return res.redirect('/auth/reset-password');
        }
        
        res.render('auth/new-password', {
            title: 'Nuova password - MechFinder',
            token: token,
            active: ''
        });
    } catch (err) {
        console.error('Errore nella visualizzazione del form di reset password:', err);
        req.flash('error', 'Si è verificato un errore. Riprova più tardi.');
        res.redirect('/auth/reset-password');
    }
};

// Conferma reset password
exports.resetPassword = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.flash('error', errors.array().map(err => err.msg).join(', '));
        return res.redirect(`/auth/reset-password/${req.params.token}`);
    }

    try {
        const token = req.params.token;
        let user = null;
        let userType = null;
        
        // Cerca il token tra i clienti
        const cliente = await Cliente.findByResetToken(token);
        if (cliente && cliente.reset_token_expires > new Date()) {
            user = cliente;
            userType = 'cliente';
        } else {
            // Cerca il token tra i meccanici
            const meccanico = await Meccanico.findByResetToken(token);
            if (meccanico && meccanico.reset_token_expires > new Date()) {
                user = meccanico;
                userType = 'meccanico';
            }
        }
        
        if (!user) {
            req.flash('error', 'Il link di reset password non è valido o è scaduto.');
            return res.redirect('/auth/reset-password');
        }
        
        // Hash della nuova password
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        
        // Aggiorna la password e cancella il token
        if (userType === 'cliente') {
            await Cliente.updatePassword(user.id, hashedPassword);
        } else {
            await Meccanico.updatePassword(user.id, hashedPassword);
        }
        
        req.flash('success', 'Password aggiornata con successo. Ora puoi accedere con la nuova password.');
        res.redirect('/');
    } catch (err) {
        console.error('Errore nel reset della password:', err);
        req.flash('error', 'Si è verificato un errore nell\'aggiornamento della password. Riprova più tardi.');
        res.redirect(`/auth/reset-password/${req.params.token}`);
    }
};