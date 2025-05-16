// Configurazione di Passport.js per l'autenticazione
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const path = require('path');
const { Cliente, Meccanico, Admin } = require('../models/utente');

module.exports = function(app) {
    // Inizializzazione di Passport
    app.use(passport.initialize());
    app.use(passport.session());

    // Serializzazione dell'utente nella sessione
    passport.serializeUser((user, done) => {
        done(null, { id: user.id, tipo: user.tipo });
    });

    // Deserializzazione dell'utente dalla sessione
    passport.deserializeUser(async (userData, done) => {
        try {
            let user = null;
            
            if (userData.tipo === 'cliente') {
                user = await Cliente.findById(userData.id);
            } else if (userData.tipo === 'meccanico') {
                user = await Meccanico.findById(userData.id);
            } else if (userData.tipo === 'admin') {
                user = await Admin.findById(userData.id);
            }
            
            if (!user) {
                return done(null, false);
            }
            
            return done(null, user);
        } catch (err) {
            return done(err);
        }
    });

    // Strategia per il login dei clienti
    passport.use('cliente', new LocalStrategy({
        usernameField: 'email',
        passwordField: 'password'
    }, async (email, password, done) => {
        try {
            const cliente = await Cliente.findByEmail(email);
            
            if (!cliente) {
                return done(null, false, { message: 'Email o password non validi' });
            }
            
            const isMatch = await bcrypt.compare(password, cliente.password);
            
            if (!isMatch) {
                return done(null, false, { message: 'Email o password non validi' });
            }
            
            return done(null, cliente);
        } catch (err) {
            return done(err);
        }
    }));

    // Strategia per il login dei meccanici
    passport.use('meccanico', new LocalStrategy({
        usernameField: 'email',
        passwordField: 'password'
    }, async (email, password, done) => {
        try {
            const meccanico = await Meccanico.findByEmail(email);
            
            if (!meccanico) {
                return done(null, false, { message: 'Email o password non validi' });
            }
            
            const isMatch = await bcrypt.compare(password, meccanico.password);
            
            if (!isMatch) {
                return done(null, false, { message: 'Email o password non validi' });
            }
            
            return done(null, meccanico);
        } catch (err) {
            return done(err);
        }
    }));

    // Strategia per il login degli admin
    passport.use('admin', new LocalStrategy({
        usernameField: 'email',
        passwordField: 'password'
    }, async (email, password, done) => {
        try {
            const admin = await Admin.findByEmail(email);
            
            if (!admin) {
                return done(null, false, { message: 'Email o password non validi' });
            }
            
            const isMatch = await bcrypt.compare(password, admin.password);
            
            if (!isMatch) {
                return done(null, false, { message: 'Email o password non validi' });
            }
            
            return done(null, admin);
        } catch (err) {
            return done(err);
        }
    }));
};