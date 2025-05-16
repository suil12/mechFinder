"use strict";

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { Riparazione } = require('../models/riparazione');
const { Meccanico } = require('../models/utente');

// Middleware per verificare se l'utente è autenticato
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    req.flash('error', 'Devi accedere per utilizzare questa funzionalità.');
    res.redirect('/');
};

// Richiesta di riparazione (sia GET che POST)
router.get('/richiedi/:meccanico_id', isAuthenticated, async (req, res) => {
    try {
        // Controlla che l'utente sia un cliente
        if (req.user.tipo !== 'cliente') {
            req.flash('error', 'Solo i clienti possono richiedere riparazioni.');
            return res.redirect('/');
        }

        // Carica dati del meccanico selezionato
        const meccanico = await Meccanico.findById(req.params.meccanico_id);
        
        if (!meccanico) {
            req.flash('error', 'Meccanico non trovato.');
            return res.redirect('/meccanici');
        }
        
        res.render('riparazioni/richiedi', {
            title: 'Richiedi Riparazione - MechFinder',
            active: 'meccanici',
            meccanico: meccanico
        });
    } catch (err) {
        console.error(err);
        req.flash('error', 'Si è verificato un errore nel caricamento della pagina di richiesta.');
        res.redirect('/meccanici');
    }
});

router.post('/richiedi/:meccanico_id', isAuthenticated, [
    body('tipo_veicolo').trim().notEmpty().withMessage('Il tipo di veicolo è obbligatorio'),
    body('marca').trim().notEmpty().withMessage('La marca è obbligatoria'),
    body('modello').trim().notEmpty().withMessage('Il modello è obbligatorio'),
    body('anno').isInt({ min: 1900, max: new Date().getFullYear() }).withMessage('Anno non valido'),
    body('descrizione_problema').trim().notEmpty().withMessage('La descrizione del problema è obbligatoria'),
    body('data_preferita').isISO8601().toDate().withMessage('Data non valida')
], async (req, res) => {
    // Controlla che l'utente sia un cliente
    if (req.user.tipo !== 'cliente') {
        req.flash('error', 'Solo i clienti possono richiedere riparazioni.');
        return res.redirect('/');
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        try {
            const meccanico = await Meccanico.findById(req.params.meccanico_id);
            return res.render('riparazioni/richiedi', {
                title: 'Richiedi Riparazione - MechFinder',
                active: 'meccanici',
                meccanico: meccanico,
                errors: errors.array(),
                formData: req.body
            });
        } catch (err) {
            req.flash('error', 'Si è verificato un errore. Riprova.');
            return res.redirect(`/riparazioni/richiedi/${req.params.meccanico_id}`);
        }
    }

    try {
        const riparazione = new Riparazione({
            cliente_id: req.user.id,
            meccanico_id: req.params.meccanico_id,
            tipo_veicolo: req.body.tipo_veicolo,
            marca: req.body.marca,
            modello: req.body.modello,
            anno: req.body.anno,
            targa: req.body.targa || '',
            km: req.body.km || 0,
            descrizione_problema: req.body.descrizione_problema,
            data_preferita: req.body.data_preferita,
            note_cliente: req.body.note_cliente || '',
            stato: 'in_attesa',
            data_richiesta: new Date()
        });

        await riparazione.save();
        req.flash('success', 'Richiesta di riparazione inviata con successo.');
        res.redirect('/cliente/riparazioni');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Si è verificato un errore nell\'invio della richiesta di riparazione.');
        res.redirect(`/riparazioni/richiedi/${req.params.meccanico_id}`);
    }
});

// Visualizzazione dettaglio riparazione (accessibile sia al cliente che al meccanico)
router.get('/:id', isAuthenticated, async (req, res) => {
    try {
        const riparazione = await Riparazione.findById(req.params.id);
        
        if (!riparazione) {
            req.flash('error', 'Riparazione non trovata.');
            return res.redirect('/');
        }
        
        // Verifica che l'utente sia autorizzato a visualizzare questa riparazione
        if (req.user.tipo === 'cliente' && riparazione.cliente_id !== req.user.id) {
            req.flash('error', 'Non sei autorizzato a visualizzare questa riparazione.');
            return res.redirect('/cliente/riparazioni');
        } else if (req.user.tipo === 'meccanico' && riparazione.meccanico_id !== req.user.id) {
            req.flash('error', 'Non sei autorizzato a visualizzare questa riparazione.');
            return res.redirect('/meccanico/riparazioni');
        }
        
        // Carica i dati aggiuntivi necessari (cliente e meccanico)
        const datiAggiuntivi = await Riparazione.getDatiAggiuntivi(riparazione.id);
        
        res.render('riparazioni/dettaglio', {
            title: 'Dettaglio Riparazione - MechFinder',
            active: 'riparazioni',
            riparazione: riparazione,
            cliente: datiAggiuntivi.cliente,
            meccanico: datiAggiuntivi.meccanico
        });
    } catch (err) {
        console.error(err);
        req.flash('error', 'Si è verificato un errore nel caricamento del dettaglio riparazione.');
        res.redirect('/');
    }
});

// Aggiunta di un commento/messaggio a una riparazione
router.post('/:id/commenti', isAuthenticated, [
    body('messaggio').trim().notEmpty().withMessage('Il messaggio non può essere vuoto')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.flash('error', 'Il messaggio non può essere vuoto.');
        return res.redirect(`/riparazioni/${req.params.id}`);
    }

    try {
        const riparazione = await Riparazione.findById(req.params.id);
        
        if (!riparazione) {
            req.flash('error', 'Riparazione non trovata.');
            return res.redirect('/');
        }
        
        // Verifica che l'utente sia autorizzato a commentare questa riparazione
        if (req.user.tipo === 'cliente' && riparazione.cliente_id !== req.user.id) {
            req.flash('error', 'Non sei autorizzato a commentare questa riparazione.');
            return res.redirect('/cliente/riparazioni');
        } else if (req.user.tipo === 'meccanico' && riparazione.meccanico_id !== req.user.id) {
            req.flash('error', 'Non sei autorizzato a commentare questa riparazione.');
            return res.redirect('/meccanico/riparazioni');
        }
        
        // Aggiungi il commento
        await Riparazione.addCommento({
            riparazione_id: riparazione.id,
            utente_id: req.user.id,
            tipo_utente: req.user.tipo,
            messaggio: req.body.messaggio,
            data_creazione: new Date()
        });
        
        req.flash('success', 'Commento aggiunto con successo.');
        res.redirect(`/riparazioni/${req.params.id}`);
    } catch (err) {
        console.error(err);
        req.flash('error', 'Si è verificato un errore nell\'aggiunta del commento.');
        res.redirect(`/riparazioni/${req.params.id}`);
    }
});

// Annullamento di una riparazione (da parte del cliente)
router.post('/:id/annulla', isAuthenticated, async (req, res) => {
    try {
        const riparazione = await Riparazione.findById(req.params.id);
        
        if (!riparazione) {
            req.flash('error', 'Riparazione non trovata.');
            return res.redirect('/cliente/riparazioni');
        }
        
        // Verifica che l'utente sia il cliente associato a questa riparazione
        if (req.user.tipo !== 'cliente' || riparazione.cliente_id !== req.user.id) {
            req.flash('error', 'Non sei autorizzato ad annullare questa riparazione.');
            return res.redirect('/cliente/riparazioni');
        }
        
        // Verifica che la riparazione sia annullabile (solo se in attesa o in lavorazione)
        if (riparazione.stato !== 'in_attesa' && riparazione.stato !== 'in_lavorazione') {
            req.flash('error', 'Non è possibile annullare una riparazione già completata o annullata.');
            return res.redirect(`/riparazioni/${req.params.id}`);
        }
        
        // Aggiorna lo stato
        riparazione.stato = 'annullata';
        riparazione.note_cliente = req.body.motivo_annullamento || riparazione.note_cliente;
        
        await riparazione.update();
        req.flash('success', 'Riparazione annullata con successo.');
        res.redirect('/cliente/riparazioni');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Si è verificato un errore nell\'annullamento della riparazione.');
        res.redirect(`/riparazioni/${req.params.id}`);
    }
});

// Completamento di una riparazione (da parte del meccanico)
router.post('/:id/completa', isAuthenticated, [
    body('descrizione_intervento').trim().notEmpty().withMessage('La descrizione dell\'intervento è obbligatoria'),
    body('costo').isFloat({ min: 0 }).withMessage('Il costo deve essere un numero positivo')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.flash('error', 'I campi inseriti non sono validi.');
        return res.redirect(`/meccanico/riparazioni/${req.params.id}`);
    }

    try {
        const riparazione = await Riparazione.findById(req.params.id);
        
        if (!riparazione) {
            req.flash('error', 'Riparazione non trovata.');
            return res.redirect('/meccanico/riparazioni');
        }
        
        // Verifica che l'utente sia il meccanico associato a questa riparazione
        if (req.user.tipo !== 'meccanico' || riparazione.meccanico_id !== req.user.id) {
            req.flash('error', 'Non sei autorizzato a completare questa riparazione.');
            return res.redirect('/meccanico/riparazioni');
        }
        
        // Verifica che la riparazione sia in lavorazione
        if (riparazione.stato !== 'in_lavorazione') {
            req.flash('error', 'Solo le riparazioni in lavorazione possono essere completate.');
            return res.redirect(`/meccanico/riparazioni/${req.params.id}`);
        }
        
        // Aggiorna lo stato e i dettagli
        riparazione.stato = 'completata';
        riparazione.descrizione_intervento = req.body.descrizione_intervento;
        riparazione.costo = req.body.costo;
        riparazione.data_completamento = new Date();
        riparazione.note_meccanico = req.body.note_meccanico || riparazione.note_meccanico;
        
        await riparazione.update();
        req.flash('success', 'Riparazione completata con successo.');
        res.redirect('/meccanico/riparazioni');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Si è verificato un errore nel completamento della riparazione.');
        res.redirect(`/meccanico/riparazioni/${req.params.id}`);
    }
});

// Aggiunta valutazione e recensione (da parte del cliente dopo completamento)
router.post('/:id/recensione', isAuthenticated, [
    body('valutazione').isInt({ min: 1, max: 5 }).withMessage('La valutazione deve essere un numero da 1 a 5'),
    body('recensione').trim().notEmpty().withMessage('La recensione non può essere vuota')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.flash('error', 'I campi inseriti non sono validi.');
        return res.redirect(`/riparazioni/${req.params.id}`);
    }

    try {
        const riparazione = await Riparazione.findById(req.params.id);
        
        if (!riparazione) {
            req.flash('error', 'Riparazione non trovata.');
            return res.redirect('/cliente/riparazioni');
        }
        
        // Verifica che l'utente sia il cliente associato a questa riparazione
        if (req.user.tipo !== 'cliente' || riparazione.cliente_id !== req.user.id) {
            req.flash('error', 'Non sei autorizzato a recensire questa riparazione.');
            return res.redirect('/cliente/riparazioni');
        }
        
        // Verifica che la riparazione sia completata e non già recensita
        if (riparazione.stato !== 'completata') {
            req.flash('error', 'Solo le riparazioni completate possono essere recensite.');
            return res.redirect(`/riparazioni/${req.params.id}`);
        }
        
        if (riparazione.valutazione) {
            req.flash('error', 'Hai già recensito questa riparazione.');
            return res.redirect(`/riparazioni/${req.params.id}`);
        }
        
        // Aggiorna la riparazione con la valutazione
        riparazione.valutazione = req.body.valutazione;
        riparazione.recensione = req.body.recensione;
        riparazione.data_recensione = new Date();
        
        await riparazione.update();
        
        // Aggiorna anche la valutazione media del meccanico
        await Meccanico.aggiornaValutazioneMedia(riparazione.meccanico_id);
        
        req.flash('success', 'Recensione aggiunta con successo.');
        res.redirect(`/riparazioni/${req.params.id}`);
    } catch (err) {
        console.error(err);
        req.flash('error', 'Si è verificato un errore nell\'aggiunta della recensione.');
        res.redirect(`/riparazioni/${req.params.id}`);
    }
});

module.exports = router;