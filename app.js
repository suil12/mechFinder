"use strict";

const express = require('express');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const fileUpload = require('express-fileupload');
const methodOverride = require('method-override');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const bcrypt = require('bcrypt');

// Importazione dei modelli
const { Cliente, Meccanico, Admin } = require('./models/utente');

// Importazione delle routes
const staticRoutes = require('./routes/staticRoutes');
const authRoutes = require('./routes/authRoutes');
const clienteRoutes = require('./routes/clienteRoutes');
const meccanicoRoutes = require('./routes/meccanicoRoutes');
const apiRoutes = require('./routes/apiRoutes');
const riparazioneRoutes = require('./routes/riparazioneRoutes');
const chatbotRoutes = require('./routes/chatbotRoutes');
// Inizializzazione dell'app
const app = express();

// Impostazione della porta
const PORT = process.env.PORT || 3000;

// Middleware di protezione
app.use(helmet({
    contentSecurityPolicy: false // Disabilitato per semplificare lo sviluppo
}));

// Configurazione delle viste
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware per il parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(methodOverride('_method'));

// Middleware per file upload
app.use(fileUpload({
    limits: { fileSize: 5 * 1024 * 1024 }, // Limite di 5MB
    createParentPath: true
}));

// Configurazione della sessione
app.use(session({
    secret: 'mechfinder_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000 // 24 ore
    }
}));

// Configurazione dei messaggi flash
app.use(flash());

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

// Impostazione delle variabili locali per le viste
app.use((req, res, next) => {
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    res.locals.success_msg = req.flash('success');
    res.locals.error_msg = req.flash('error');
    res.locals.user = req.user || null;
    res.locals.isAuthenticated = req.isAuthenticated();
    
    // Aggiunta variabili per il tipo di utente
    res.locals.isCliente = req.isAuthenticated() && req.user.tipo === 'cliente';
    res.locals.isMeccanico = req.isAuthenticated() && req.user.tipo === 'meccanico';
    res.locals.isAdmin = req.isAuthenticated() && req.user.tipo === 'admin';
    
    next();
});

// Servire file statici
app.use(express.static(path.join(__dirname, 'public')));

// Utilizzo delle routes
app.use('/', staticRoutes);
app.use('/auth', authRoutes);
app.use('/cliente', clienteRoutes);
app.use('/meccanico', meccanicoRoutes);
app.use('/api', apiRoutes);
app.use('/riparazioni', riparazioneRoutes);
app.use('/api/chatbot', chatbotRoutes);
// Gestione degli errori 404
app.use((req, res) => {
    res.status(404).render('errors/404', {
        title: 'Pagina non trovata - MechFinder',
        active: ''
    });
});

// Gestione degli errori del server
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('errors/500', {
        title: 'Errore del server - MechFinder',
        active: '',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

// Avvio del server
app.listen(PORT, () => {
    console.log(`Server attivo su http://localhost:${PORT}`);
});