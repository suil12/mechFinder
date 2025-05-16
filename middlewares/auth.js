"use strict";

// Middleware per verificare se l'utente è autenticato
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    // Salva l'URL richiesto per il redirect dopo il login
    req.session.returnTo = req.originalUrl;
    req.flash('error', 'Devi accedere per visualizzare questa pagina');
    res.redirect('/');
};

// Middleware per verificare se l'utente è un cliente
const isCliente = (req, res, next) => {
    if (req.isAuthenticated() && req.user.tipo === 'cliente') {
        return next();
    }
    if (req.isAuthenticated()) {
        req.flash('error', 'Non hai i permessi per accedere a questa pagina');
        return res.redirect('/');
    }
    req.session.returnTo = req.originalUrl;
    req.flash('error', 'Devi accedere come cliente per visualizzare questa pagina');
    res.redirect('/');
};

// Middleware per verificare se l'utente è un meccanico
const isMeccanico = (req, res, next) => {
    if (req.isAuthenticated() && req.user.tipo === 'meccanico') {
        return next();
    }
    if (req.isAuthenticated()) {
        req.flash('error', 'Non hai i permessi per accedere a questa pagina');
        return res.redirect('/');
    }
    req.session.returnTo = req.originalUrl;
    req.flash('error', 'Devi accedere come meccanico per visualizzare questa pagina');
    res.redirect('/');
};

// Middleware per verificare se l'utente è un admin
const isAdmin = (req, res, next) => {
    if (req.isAuthenticated() && req.user.tipo === 'admin') {
        return next();
    }
    if (req.isAuthenticated()) {
        req.flash('error', 'Non hai i permessi per accedere a questa pagina');
        return res.redirect('/');
    }
    req.session.returnTo = req.originalUrl;
    req.flash('error', 'Non hai i permessi per accedere a questa pagina');
    res.redirect('/');
};

module.exports = {
    isAuthenticated,
    isCliente,
    isMeccanico,
    isAdmin
};