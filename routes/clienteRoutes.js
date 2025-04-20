"use strict";

const express = require('express');
const router = express.Router();
const path = require('path');
const fileUpload = require('express-fileupload');
const { Cliente } = require('../public/js/utente');
const { Riparazione } = require('../models/riparazione');

// Middleware per verificare se l'utente è autenticato come cliente
const isCliente = (req, res, next) => {
    if (req.isAuthenticated() && req.user.tipo === 'cliente') {
        return next();
    }
    res.redirect('/auth/login');
};

// Dashboard cliente
router.get('/dashboard', isCliente, (req, res) => {
    res.sendFile(path.join(__dirname, '../public/cliente/dashboard.html'));
});

// Profilo cliente
router.get('/profilo', isCliente, (req, res) => {
    res.sendFile(path.join(__dirname, '../public/cliente/profilo.html'));
});

// Veicoli cliente
router.get('/veicoli', isCliente, (req, res) => {
    res.sendFile(path.join(__dirname, '../public/cliente/veicoli.html'));
});

// Riparazioni cliente
router.get('/riparazioni', isCliente, (req, res) => {
    res.sendFile(path.join(__dirname, '../public/cliente/riparazioni.html'));
});

// Dettaglio riparazione
router.get('/riparazioni/:id', isCliente, async (req, res) => {
    try {
        const riparazione = await Riparazione.getDettaglio(req.params.id);
        
        if (!riparazione || riparazione.id_cliente !== req.user.id) {
            return res.redirect('/cliente/riparazioni');
        }
        
        res.sendFile(path.join(__dirname, '../public/cliente/dettaglio-riparazione.html'));
    } catch (error) {
        console.error('Errore nel caricamento della pagina di dettaglio:', error);
        res.redirect('/cliente/riparazioni');
    }
});

// Nuova richiesta di riparazione
router.get('/nuova-riparazione', isCliente, (req, res) => {
    res.sendFile(path.join(__dirname, '../public/cliente/nuova-riparazione.html'));
});

// Recensioni cliente
router.get('/recensioni', isCliente, (req, res) => {
    res.sendFile(path.join(__dirname, '../public/cliente/recensioni.html'));
});

// Upload avatar cliente
router.post('/upload-avatar', isCliente, fileUpload(), async (req, res) => {
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
        const fileName = `cliente_${req.user.id}_${Date.now()}${fileExt}`;
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

// Aggiorna profilo cliente
router.post('/aggiorna-profilo', isCliente, async (req, res) => {
    try {
        await req.user.update({
            nome: req.body.nome,
            cognome: req.body.cognome,
            telefono: req.body.telefono,
            indirizzo: req.body.indirizzo,
            citta: req.body.citta,
            cap: req.body.cap
        });
        
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

module.exports = router;