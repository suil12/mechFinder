"use strict";

require('dotenv').config();
const express = require('express');
const path = require('path');
const morgan = require('morgan');
const fileUpload = require('express-fileupload');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const flash = require('connect-flash');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');

// Import database e modelli
const db = require('./database/db');
const { Cliente, Meccanico } = require('./public/js/utente');
const { Riparazione } = require('./models/riparazione');

// Import routes
const authRoutes = require('./routes/authRoutes');
const clienteRoutes = require('./routes/clienteRoutes');
const meccanicoRoutes = require('./routes/meccanicoRoutes');
const riparazioneRoutes = require('./routes/riparazioneRoutes');
const apiRoutes = require('./routes/apiRoutes');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(morgan('dev')); // Logging
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(fileUpload({
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    createParentPath: true
}));

// Configurazione sessione
app.use(session({
    store: new SQLiteStore({ db: 'sessions.db', dir: './database' }),
    secret: process.env.SESSION_SECRET || 'mechfinder-super-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 1 settimana
}));

// Inizializzazione Passport
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// Configurazione Passport con LocalStrategy
passport.use('cliente', new LocalStrategy(
    { usernameField: 'email' },
    async (email, password, done) => {
        try {
            const cliente = await Cliente.findByEmail(email);
            if (!cliente) {
                return done(null, false, { message: 'Email non registrata' });
            }

            const match = await bcrypt.compare(password, cliente.password);
            if (!match) {
                return done(null, false, { message: 'Password non corretta' });
            }

            return done(null, cliente);
        } catch (err) {
            return done(err);
        }
    }
));

passport.use('meccanico', new LocalStrategy(
    { usernameField: 'email' },
    async (email, password, done) => {
        try {
            const meccanico = await Meccanico.findByEmail(email);
            if (!meccanico) {
                return done(null, false, { message: 'Email non registrata' });
            }

            const match = await bcrypt.compare(password, meccanico.password);
            if (!match) {
                return done(null, false, { message: 'Password non corretta' });
            }

            return done(null, meccanico);
        } catch (err) {
            return done(err);
        }
    }
));

// Serializzazione e deserializzazione utente
passport.serializeUser((user, done) => {
    done(null, { id: user.id, tipo: user.tipo });
});

passport.deserializeUser(async (user, done) => {
    try {
        let userObj;
        if (user.tipo === 'cliente') {
            userObj = await Cliente.findById(user.id);
        } else if (user.tipo === 'meccanico') {
            userObj = await Meccanico.findById(user.id);
        }
        
        if (!userObj) {
            return done(null, false);
        }
        
        done(null, userObj);
    } catch (err) {
        done(err);
    }
});

// Middleware per rendere disponibile l'utente autenticato in tutti i template
app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    res.locals.error = req.flash('error');
    res.locals.success = req.flash('success');
    next();
});

// Routes
app.use('/auth', authRoutes);
app.use('/cliente', clienteRoutes);
app.use('/meccanico', meccanicoRoutes);
app.use('/riparazioni', riparazioneRoutes);
app.use('/api', apiRoutes);

// Route principale
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Gestione errori 404
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// Gestione altri errori
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).sendFile(path.join(__dirname, 'public', '500.html'));
});

// Avvio del server
app.listen(port, () => {
    console.log(`Server MechFinder in esecuzione su http://localhost:${port}`);
});

// Gestione della chiusura del server
process.on('SIGINT', () => {
    console.log('Chiusura del server MechFinder...');
    db.close();
    process.exit(0);
});