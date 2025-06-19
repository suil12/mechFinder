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
        // Verifica che le password coincidano
        if (req.body.password !== req.body.password_confirm) {
            req.flash('error', 'Le password non coincidono');
            return res.redirect('/#registerModal');
        }
        
        // Verifica lunghezza password
        if (req.body.password.length < 6) {
            req.flash('error', 'La password deve essere di almeno 6 caratteri');
            return res.redirect('/#registerModal');
        }
        
        // Verifica se l'email è già registrata
        const emailExists = await exports.checkEmailExists(req.body.email);
        if (emailExists) {
            req.flash('error', 'Email già registrata');
            return res.redirect('/#registerModal');
        }
        
        // Hash della password
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        
        // Crea il nuovo cliente
        const nuovoCliente = {
            nome: req.body.nome,
            cognome: req.body.cognome || '', 
            email: req.body.email,
            password: hashedPassword,
            telefono: req.body.telefono || null,
            citta: req.body.citta || null,
            data_registrazione: new Date(),
            tipo: 'cliente'
        };
        
        const cliente = await Cliente.create(nuovoCliente);
        
        // redirect al login automatico dopo la registrazione
        req.login({ id: cliente.id, tipo: 'cliente' }, (err) => {
            if (err) {
                // console per dubug mio
                console.error('Errore login post-registrazione:', err);
                req.flash('success', 'Registrazione completata. Ora puoi accedere.');
                return res.redirect('/');
            }
            
            req.flash('success', 'Registrazione completata con successo!');
            res.redirect('/cliente/dashboard');
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
        // Verifica che le password coincidano
        if (req.body.password !== req.body.password_confirm) {
            req.flash('error', 'Le password non coincidono');
            return res.redirect('/#registerMeccanicoModal');
        }
        
        // Verifica lunghezza password
        if (req.body.password.length < 6) {
            req.flash('error', 'La password deve essere di almeno 6 caratteri');
            return res.redirect('/#registerMeccanicoModal');
        }
        
        // Verifica se l'email è già registrata
        const emailExists = await exports.checkEmailExists(req.body.email);
        if (emailExists) {
            req.flash('error', 'Email già registrata');
            return res.redirect('/#registerMeccanicoModal');
        }
        
        // Hash  password
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        
        // Crea il nuovo meccanico
        const nuovoMeccanico = {
            nome: req.body.nome,
            cognome: req.body.cognome || '',
            email: req.body.email,
            password: hashedPassword,
            officina: req.body.officina,
            specializzazione: req.body.specializzazione,
            telefono: req.body.telefono,
            citta: req.body.citta,
            descrizione: req.body.descrizione || '',
            data_registrazione: new Date(),
            verificato: false, //  verifica da parte dell'admin
            tipo: 'meccanico',
            valutazione: 0, 
            numero_recensioni: 0 
        };
        
        const meccanico = await Meccanico.create(nuovoMeccanico);
        
        // redirect al login automatico dopo la registrazione anche qui
        req.login({ id: meccanico.id, tipo: 'meccanico' }, (err) => {
            if (err) {
                console.error('Errore login post-registrazione:', err);
                req.flash('success', 'Registrazione completata. In attesa di verifica. Ora puoi accedere.');
                return res.redirect('/');
            }
            
            req.flash('success', 'Registrazione completata con successo! Il tuo account è in attesa di verifica.');
            res.redirect('/');
        });
    } catch (err) {
        console.error('Errore nella registrazione meccanico:', err);
        req.flash('error', 'Si è verificato un errore durante la registrazione. Riprova più tardi.');
        res.redirect('/#registerMeccanicoModal');
    }
};

// gestione di reset password test
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
            // cerca se invece è meccanico
            const meccanico = await Meccanico.findByEmail(email);
            if (meccanico) {
                user = meccanico;
                userType = 'meccanico';
            }
        }
        
        if (!user) {
            // Non esiste la email ma non dichiariamo
            req.flash('success', 'Se l\'email è registrata, riceverai un link per reimpostare la password.');
            return res.redirect('/auth/reset-password');
        }
        
        // Generazione token di reset
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetExpires = new Date(Date.now() + 3600000); // 1 ora
        
        // Salva token nel database
        if (userType === 'cliente') {
            await Cliente.updateResetToken(user.id, resetToken, resetExpires);
        } else {
            await Meccanico.updateResetToken(user.id, resetToken, resetExpires);
        }
        
        // gestione mail con link  reset per successiva implementazione
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
        
        // Hash  nuova password
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        
        // Aggiorno password e cancello  token
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