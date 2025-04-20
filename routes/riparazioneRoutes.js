"use strict";

const express = require('express');
const router = express.Router();
const path = require('path');
const { Riparazione } = require('../models/riparazione');

// Middleware per verificare se l'utente è autenticato
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/auth/login');
};

// Middleware per verificare l'accesso alla riparazione
const canAccessRiparazione = async (req, res, next) => {
    try {
        const riparazione = await Riparazione.getDettaglio(req.params.id);
        
        if (!riparazione) {
            return res.status(404).redirect('/');
        }
        
        // Verifica che l'utente sia autorizzato a vedere questa riparazione
        if (req.user.tipo === 'cliente' && riparazione.id_cliente !== req.user.id) {
            return res.status(403).redirect('/');
        }
        
        if (req.user.tipo === 'meccanico' && riparazione.id_meccanico !== req.user.id) {
            return res.status(403).redirect('/');
        }
        
        // Passa i dettagli della riparazione alla prossima funzione
        req.riparazione = riparazione;
        next();
    } catch (error) {
        console.error('Errore nell\'accesso alla riparazione:', error);
        res.status(500).redirect('/');
    }
};

// Pagina di dettaglio riparazione (redirect in base al tipo di utente)
router.get('/:id', isAuthenticated, canAccessRiparazione, (req, res) => {
    if (req.user.tipo === 'cliente') {
        res.redirect(`/cliente/riparazioni/${req.params.id}`);
    } else if (req.user.tipo === 'meccanico') {
        res.redirect(`/meccanico/riparazioni/${req.params.id}`);
    } else {
        res.redirect('/');
    }
});

// API per ottenere dettagli di una riparazione
router.get('/:id/dettaglio', isAuthenticated, canAccessRiparazione, (req, res) => {
    res.json(req.riparazione);
});

// API per creare un preventivo
router.post('/:id/preventivo', isAuthenticated, canAccessRiparazione, async (req, res) => {
    try {
        // Solo i meccanici possono creare preventivi
        if (req.user.tipo !== 'meccanico') {
            return res.status(403).json({ success: false, message: 'Solo i meccanici possono creare preventivi' });
        }
        
        // Verifica che la riparazione sia in stato "richiesta"
        if (req.riparazione.stato !== 'richiesta') {
            return res.status(400).json({ 
                success: false, 
                message: `Non puoi creare un preventivo per una riparazione in stato "${req.riparazione.stato}"` 
            });
        }
        
        const riparazione = await Riparazione.findById(req.params.id);
        
        const preventivo = await riparazione.creaPreventivo({
            importo: req.body.importo,
            descrizione: req.body.descrizione,
            giorni_validita: req.body.giorni_validita
        });
        
        res.json({ success: true, preventivo });
    } catch (error) {
        console.error('Errore durante la creazione del preventivo:', error);
        res.status(500).json({ success: false, message: 'Errore durante la creazione del preventivo' });
    }
});

// API per emettere una ricevuta
router.post('/:id/ricevuta', isAuthenticated, canAccessRiparazione, async (req, res) => {
    try {
        // Solo i meccanici possono emettere ricevute
        if (req.user.tipo !== 'meccanico') {
            return res.status(403).json({ success: false, message: 'Solo i meccanici possono emettere ricevute' });
        }
        
        // Verifica che la riparazione sia completata
        if (req.riparazione.stato !== 'completata') {
            return res.status(400).json({ 
                success: false, 
                message: 'Puoi emettere ricevute solo per riparazioni completate' 
            });
        }
        
        const riparazione = await Riparazione.findById(req.params.id);
        
        const ricevuta = await riparazione.emettiRicevuta({
            importo: req.body.importo,
            descrizione: req.body.descrizione,
            numero_fattura: req.body.numero_fattura,
            metodo_pagamento: req.body.metodo_pagamento
        });
        
        res.json({ success: true, ricevuta });
    } catch (error) {
        console.error('Errore durante l\'emissione della ricevuta:', error);
        res.status(500).json({ success: false, message: 'Errore durante l\'emissione della ricevuta' });
    }
});

// API per aggiornare lo stato di una riparazione
router.post('/:id/stato', isAuthenticated, canAccessRiparazione, async (req, res) => {
    try {
        const nuovoStato = req.body.stato;
        const note = req.body.note;
        
        // Verifica che lo stato richiesto sia valido
        const statiValidi = ['richiesta', 'preventivo', 'accettata', 'in_corso', 'completata', 'rifiutata'];
        
        if (!statiValidi.includes(nuovoStato)) {
            return res.status(400).json({ success: false, message: 'Stato non valido' });
        }
        
        // Verifica che la transizione di stato sia valida
        const statoAttuale = req.riparazione.stato;
        
        // Definisci le transizioni di stato valide per tipo di utente
        const transizioniClienteValide = {
            'preventivo': ['accettata', 'rifiutata'],
            'completata': ['accettata'] // Per confermare una riparazione completata
        };
        
        const transizioniMeccanicoValide = {
            'richiesta': ['preventivo', 'accettata', 'rifiutata'],
            'accettata': ['in_corso'],
            'in_corso': ['completata']
        };
        
        let transizioniValide;
        
        if (req.user.tipo === 'cliente') {
            transizioniValide = transizioniClienteValide[statoAttuale] || [];
        } else {
            transizioniValide = transizioniMeccanicoValide[statoAttuale] || [];
        }
        
        if (!transizioniValide.includes(nuovoStato)) {
            return res.status(400).json({ 
                success: false, 
                message: `Transizione di stato da '${statoAttuale}' a '${nuovoStato}' non valida per un ${req.user.tipo}` 
            });
        }
        
        // Aggiorna lo stato
        const riparazione = await Riparazione.findById(req.params.id);
        await riparazione.aggiornaStato(nuovoStato, note);
        
        res.json({ success: true, stato: nuovoStato });
    } catch (error) {
        console.error('Errore durante l\'aggiornamento dello stato:', error);
        res.status(500).json({ success: false, message: 'Errore durante l\'aggiornamento dello stato' });
    }
});

// API per ottenere lo storico degli stati di una riparazione
router.get('/:id/storico', isAuthenticated, canAccessRiparazione, async (req, res) => {
    try {
        // Implementazione esempio (da completare con tabella stati_storici)
        res.json([
            {
                stato: 'richiesta',
                data: req.riparazione.data_richiesta,
                note: 'Richiesta iniziale'
            },
            ...(req.riparazione.data_accettazione ? [{
                stato: 'accettata',
                data: req.riparazione.data_accettazione,
                note: 'Riparazione accettata'
            }] : []),
            ...(req.riparazione.data_completamento ? [{
                stato: 'completata',
                data: req.riparazione.data_completamento,
                note: req.riparazione.note || 'Riparazione completata'
            }] : [])
        ]);
    } catch (error) {
        console.error('Errore durante il recupero dello storico:', error);
        res.status(500).json({ success: false, message: 'Errore durante il recupero dello storico' });
    }
});

module.exports = router;