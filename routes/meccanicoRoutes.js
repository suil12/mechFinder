"use strict";

const express = require('express');
const router = express.Router();
const path = require('path');
const fileUpload = require('express-fileupload');
const { Meccanico } = require('../public/js/utente');
const { Riparazione } = require('../models/riparazione');
const db = require('../database/db');

// Middleware per verificare se l'utente è autenticato come meccanico
const isMeccanico = (req, res, next) => {
    if (req.isAuthenticated() && req.user.tipo === 'meccanico') {
        return next();
    }
    res.redirect('/auth/login');
};

// Dashboard meccanico
router.get('/dashboard', isMeccanico, (req, res) => {
    res.sendFile(path.join(__dirname, '../public/meccanico/dashboard.html'));
});

// Profilo meccanico
router.get('/profilo', isMeccanico, (req, res) => {
    res.sendFile(path.join(__dirname, '../public/meccanico/profilo.html'));
});

// Riparazioni meccanico
router.get('/riparazioni', isMeccanico, (req, res) => {
    res.sendFile(path.join(__dirname, '../public/meccanico/riparazioni.html'));
});

// Dettaglio riparazione
router.get('/riparazioni/:id', isMeccanico, async (req, res) => {
    try {
        const riparazione = await Riparazione.getDettaglio(req.params.id);
        
        if (!riparazione || riparazione.id_meccanico !== req.user.id) {
            return res.redirect('/meccanico/riparazioni');
        }
        
        res.sendFile(path.join(__dirname, '../public/meccanico/dettaglio-riparazione.html'));
    } catch (error) {
        console.error('Errore nel caricamento della pagina di dettaglio:', error);
        res.redirect('/meccanico/riparazioni');
    }
});

// Servizi meccanico
router.get('/servizi', isMeccanico, (req, res) => {
    res.sendFile(path.join(__dirname, '../public/meccanico/servizi.html'));
});

// Recensioni meccanico
router.get('/recensioni', isMeccanico, (req, res) => {
    res.sendFile(path.join(__dirname, '../public/meccanico/recensioni.html'));
});

// Upload avatar meccanico
router.post('/upload-avatar', isMeccanico, fileUpload(), async (req, res) => {
    try {
        if (!req.files || !req.files.avatar) {
            return res.status(400).json({ success: false, message: 'Nessun file caricato' });
        }
        
        const avatar = req.files.avatar;
        
        // Verifica l'estensione del file
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
        const fileExt = path.extname(avatar.name).toLowerCase();
        
        if (!allowedExtensions.includes(fileExt)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Formato file non supportato. Utilizza JPG, PNG o GIF' 
            });
        }
        
        // Verifica la dimensione del file (max 5MB)
        if (avatar.size > 5 * 1024 * 1024) {
            return res.status(400).json({ 
                success: false, 
                message: 'Il file è troppo grande. Dimensione massima: 5MB' 
            });
        }
        
        // Genera un nome file univoco
        const fileName = `meccanico_${req.user.id}_${Date.now()}${fileExt}`;
        const uploadPath = path.join(__dirname, '../public/uploads/avatars', fileName);
        
        // Sposta il file
        await avatar.mv(uploadPath);
        
        // Aggiorna l'avatar dell'utente nel database
        await req.user.update({ avatar: `/uploads/avatars/${fileName}` });
        
        res.json({ 
            success: true, 
            message: 'Avatar caricato con successo',
            avatar: `/uploads/avatars/${fileName}`
        });
    } catch (error) {
        console.error('Errore durante il caricamento dell\'avatar:', error);
        res.status(500).json({ success: false, message: 'Errore durante il caricamento dell\'avatar' });
    }
});

// Aggiorna profilo meccanico
router.post('/aggiorna-profilo', isMeccanico, async (req, res) => {
    try {
        await req.user.update({
            nome: req.body.nome,
            cognome: req.body.cognome,
            nome_officina: req.body.nome_officina,
            specializzazione: req.body.specializzazione,
            telefono: req.body.telefono,
            indirizzo: req.body.indirizzo,
            citta: req.body.citta,
            cap: req.body.cap,
            descrizione: req.body.descrizione
        });
        
        // Se sono state fornite coordinate geografiche, aggiornale
        if (req.body.latitudine && req.body.longitudine) {
            await req.user.aggiornaCoordinate(req.body.latitudine, req.body.longitudine);
        }
        
        // Se è stata fornita una nuova password, aggiornala
        if (req.body.password && req.body.password.length >= 6) {
            await req.user.update({ password: req.body.password });
        }
        
        res.json({ success: true, message: 'Profilo aggiornato con successo' });
    } catch (error) {
        console.error('Errore durante l\'aggiornamento del profilo:', error);
        res.status(500).json({ success: false, message: 'Errore durante l\'aggiornamento del profilo' });
    }
});

// Aggiorna servizi
router.post('/aggiorna-servizi', isMeccanico, async (req, res) => {
    try {
        const servizi = req.body.servizi;
        
        if (!Array.isArray(servizi)) {
            return res.status(400).json({ success: false, message: 'Formato non valido per i servizi' });
        }
        
        // Per ogni servizio nella lista
        for (const servizio of servizi) {
            if (!servizio.id_servizio || !servizio.prezzo) {
                continue; // Salta i servizi invalidi
            }
            
            await req.user.aggiungiServizio({
                id_servizio: servizio.id_servizio,
                prezzo: servizio.prezzo
            });
        }
        
        // Se è stato richiesto di rimuovere alcuni servizi
        if (req.body.rimuovi_servizi && Array.isArray(req.body.rimuovi_servizi)) {
            for (const idServizio of req.body.rimuovi_servizi) {
                await req.user.rimuoviServizio(idServizio);
            }
        }
        
        res.json({ success: true, message: 'Servizi aggiornati con successo' });
    } catch (error) {
        console.error('Errore durante l\'aggiornamento dei servizi:', error);
        res.status(500).json({ success: false, message: 'Errore durante l\'aggiornamento dei servizi' });
    }
});

module.exports = router;