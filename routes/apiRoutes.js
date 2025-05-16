"use strict";

const express = require('express');
const router = express.Router();
const { Meccanico } = require('../models/utente');
const { Riparazione } = require('../models/riparazione');
const db = require('../database/db');
// Middleware per verificare se l'utente è autenticato
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    return res.status(401).json({ success: false, message: 'Non autenticato' });
};

// Middleware per le richieste API
const apiResponse = (req, res, next) => {
    res.apiSuccess = (data) => {
        return res.json({
            success: true,
            data: data
        });
    };

    res.apiError = (message, statusCode = 400) => {
        return res.status(statusCode).json({
            success: false,
            message: message
        });
    };

    next();
};

router.use(apiResponse);

// API per ottenere la lista dei meccanici (pubblica)
// routes/apiRoutes.js
// Correggi la route /api/meccanici

router.get('/meccanici', async (req, res) => {
    try {
        let query = 'SELECT * FROM meccanici WHERE 1=1';
        const params = [];

        // Filtri
        if (req.query.specializzazione) {
            query += ' AND specializzazione = ?';
            params.push(req.query.specializzazione);
        }
        
        if (req.query.citta) {
            query += ' AND citta LIKE ?';
            params.push(`%${req.query.citta}%`);
        }
        
        if (req.query.verificato === 'true') {
            query += ' AND verificato = 1';
        }
        
        // Ricerca
        if (req.query.q) {
            const searchTerm = `%${req.query.q}%`;
            query += ' AND (nome LIKE ? OR cognome LIKE ? OR nome_officina LIKE ? OR descrizione LIKE ?)';
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }
        
        // Ordinamento
        let orderBy = 'nome ASC';
        if (req.query.ordina === 'valutazione') {
            orderBy = 'valutazione DESC';
        } else if (req.query.ordina === 'recensioni') {
            orderBy = 'numero_recensioni DESC';
        }
        query += ` ORDER BY ${orderBy}`;
        
        // Paginazione
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        
        query += ' LIMIT ? OFFSET ?';
        params.push(limit, offset);
        
        // Conta il totale per la paginazione
        const countQuery = query.replace(/SELECT \*/, 'SELECT COUNT(*) as total')
                               .replace(/ORDER BY.*$/, '');
        
        // Non includere LIMIT e OFFSET nei parametri per il conteggio
        const countParams = params.slice(0, -2);
        const countResult = await db.get(countQuery, countParams);
        
        // Ottieni i meccanici
        const meccanici = await db.query(query, params);
        
        res.apiSuccess({
            meccanici: meccanici,
            pagination: {
                page: page,
                limit: limit,
                total: countResult.total || 0,
                pages: Math.ceil((countResult.total || 0) / limit)
            }
        });
    } catch (err) {
        console.error(err);
        res.apiError('Si è verificato un errore nel recupero dei meccanici', 500);
    }
});

// API per ottenere i dettagli di un meccanico specifico (pubblica)
router.get('/meccanici/:id', async (req, res) => {
    try {
        const meccanico = await Meccanico.findById(req.params.id);
        
        if (!meccanico) {
            return res.apiError('Meccanico non trovato', 404);
        }
        
        // Ottieni anche le recensioni
        const recensioni = await Riparazione.getRecensioniByMeccanicoId(req.params.id);
        
        res.apiSuccess({
            meccanico: meccanico,
            recensioni: recensioni
        });
    } catch (err) {
        console.error(err);
        res.apiError('Si è verificato un errore nel recupero dei dettagli del meccanico', 500);
    }
});

// API per ottenere l'elenco dei servizi
router.get('/servizi', async (req, res) => {
    try {
        const servizi = [
            { id: 1, nome: 'Elettronica', descrizione: 'Riparazione e diagnosi di componenti elettronici' },
            { id: 2, nome: 'Meccanica Generale', descrizione: 'Riparazioni meccaniche generali e manutenzione' },
            { id: 3, nome: 'Revisioni', descrizione: 'Revisioni ministeriali e controlli periodici' },
            { id: 4, nome: 'Tagliandi', descrizione: 'Manutenzione programmata e tagliandi' },
            { id: 5, nome: 'Cambio Gomme', descrizione: 'Sostituzione, bilanciatura e riparazione pneumatici' },
            { id: 6, nome: 'Carrozzeria', descrizione: 'Riparazioni di carrozzeria e verniciatura' }
        ];
        
        res.apiSuccess(servizi);
    } catch (err) {
        console.error(err);
        res.apiError('Si è verificato un errore nel recupero dei servizi', 500);
    }
});

// API per ottenere le riparazioni dell'utente corrente
router.get('/riparazioni', isAuthenticated, async (req, res) => {
    try {
        let riparazioni;
        
        if (req.user.tipo === 'cliente') {
            riparazioni = await Riparazione.findByClienteId(req.user.id);
        } else if (req.user.tipo === 'meccanico') {
            riparazioni = await Riparazione.findByMeccanicoId(req.user.id);
        } else {
            return res.apiError('Tipo utente non valido', 400);
        }
        
        res.apiSuccess(riparazioni);
    } catch (err) {
        console.error(err);
        res.apiError('Si è verificato un errore nel recupero delle riparazioni', 500);
    }
});

// API per ottenere i dettagli di una riparazione specifica
router.get('/riparazioni/:id', isAuthenticated, async (req, res) => {
    try {
        const riparazione = await Riparazione.findById(req.params.id);
        
        if (!riparazione) {
            return res.apiError('Riparazione non trovata', 404);
        }
        
        // Verifica che l'utente sia autorizzato a visualizzare questa riparazione
        if (req.user.tipo === 'cliente' && riparazione.cliente_id !== req.user.id) {
            return res.apiError('Non autorizzato', 403);
        } else if (req.user.tipo === 'meccanico' && riparazione.meccanico_id !== req.user.id) {
            return res.apiError('Non autorizzato', 403);
        }
        
        // Ottieni i dati aggiuntivi
        const datiAggiuntivi = await Riparazione.getDatiAggiuntivi(riparazione.id);
        
        // Ottieni i commenti
        const commenti = await Riparazione.getCommentiByRiparazioneId(riparazione.id);
        
        res.apiSuccess({
            riparazione: riparazione,
            cliente: datiAggiuntivi.cliente,
            meccanico: datiAggiuntivi.meccanico,
            commenti: commenti
        });
    } catch (err) {
        console.error(err);
        res.apiError('Si è verificato un errore nel recupero dei dettagli della riparazione', 500);
    }
});

// API per aggiornare lo stato di una riparazione (meccanico)
router.put('/riparazioni/:id/stato', isAuthenticated, async (req, res) => {
    try {
        if (req.user.tipo !== 'meccanico') {
            return res.apiError('Solo i meccanici possono aggiornare lo stato delle riparazioni', 403);
        }
        
        const riparazione = await Riparazione.findById(req.params.id);
        
        if (!riparazione) {
            return res.apiError('Riparazione non trovata', 404);
        }
        
        if (riparazione.meccanico_id !== req.user.id) {
            return res.apiError('Non autorizzato a modificare questa riparazione', 403);
        }
        
        // Verifica stato valido
        const statiValidi = ['in_attesa', 'in_lavorazione', 'completata', 'annullata'];
        if (!statiValidi.includes(req.body.stato)) {
            return res.apiError('Stato non valido', 400);
        }
        
        riparazione.stato = req.body.stato;
        if (req.body.note_meccanico) {
            riparazione.note_meccanico = req.body.note_meccanico;
        }
        
        // Se lo stato è 'completata', verifica i campi obbligatori
        if (req.body.stato === 'completata') {
            if (!req.body.descrizione_intervento || !req.body.costo) {
                return res.apiError('Descrizione intervento e costo sono obbligatori per completare la riparazione', 400);
            }
            
            riparazione.descrizione_intervento = req.body.descrizione_intervento;
            riparazione.costo = req.body.costo;
            riparazione.data_completamento = new Date();
        }
        
        await riparazione.update();
        res.apiSuccess({ message: 'Stato riparazione aggiornato con successo', riparazione: riparazione });
    } catch (err) {
        console.error(err);
        res.apiError('Si è verificato un errore nell\'aggiornamento dello stato della riparazione', 500);
    }
});

// API per aggiungere un commento a una riparazione
router.post('/riparazioni/:id/commenti', isAuthenticated, async (req, res) => {
    try {
        const riparazione = await Riparazione.findById(req.params.id);
        
        if (!riparazione) {
            return res.apiError('Riparazione non trovata', 404);
        }
        
        // Verifica che l'utente sia autorizzato a commentare questa riparazione
        if (req.user.tipo === 'cliente' && riparazione.cliente_id !== req.user.id) {
            return res.apiError('Non autorizzato', 403);
        } else if (req.user.tipo === 'meccanico' && riparazione.meccanico_id !== req.user.id) {
            return res.apiError('Non autorizzato', 403);
        }
        
        // Verifica che il messaggio sia presente
        if (!req.body.messaggio || req.body.messaggio.trim() === '') {
            return res.apiError('Il messaggio non può essere vuoto', 400);
        }
        
        // Aggiungi il commento
        const commentoId = await Riparazione.addCommento({
            riparazione_id: riparazione.id,
            utente_id: req.user.id,
            tipo_utente: req.user.tipo,
            messaggio: req.body.messaggio,
            data_creazione: new Date()
        });
        
        const commento = await Riparazione.getCommentoById(commentoId);
        
        res.apiSuccess({
            message: 'Commento aggiunto con successo',
            commento: commento
        });
    } catch (err) {
        console.error(err);
        res.apiError('Si è verificato un errore nell\'aggiunta del commento', 500);
    }
});

// API per ottenere statistiche (dashboard meccanico)
router.get('/stats/meccanico', isAuthenticated, async (req, res) => {
    try {
        if (req.user.tipo !== 'meccanico') {
            return res.apiError('Non autorizzato', 403);
        }
        
        const meccanico_id = req.user.id;
        
        // Conteggio riparazioni per stato
        const riparazioniPerStato = await Riparazione.countByMeccanicoIdGroupByStato(meccanico_id);
        
        // Riparazioni recenti
        const riparazioniRecenti = await Riparazione.findByMeccanicoId(meccanico_id, 'data_richiesta DESC', 5);
        
        // Valutazione media
        const meccanico = await Meccanico.findById(meccanico_id);
        
        // Guadagni totali
        const guadagniTotali = await Riparazione.sumCostoByMeccanicoId(meccanico_id);
        
        // Recensioni recenti
        const recensioniRecenti = await Riparazione.getRecensioniRecentiByMeccanicoId(meccanico_id, 3);
        
        res.apiSuccess({
            riparazioniPerStato: riparazioniPerStato,
            riparazioniRecenti: riparazioniRecenti,
            valutazioneMedia: meccanico.valutazione_media,
            numRecensioni: meccanico.num_recensioni,
            guadagniTotali: guadagniTotali,
            recensioniRecenti: recensioniRecenti
        });
    } catch (err) {
        console.error(err);
        res.apiError('Si è verificato un errore nel recupero delle statistiche', 500);
    }
});

// API per ottenere statistiche (dashboard cliente)
router.get('/stats/cliente', isAuthenticated, async (req, res) => {
    try {
        if (req.user.tipo !== 'cliente') {
            return res.apiError('Non autorizzato', 403);
        }
        
        const cliente_id = req.user.id;
        
        // Conteggio riparazioni per stato
        const riparazioniPerStato = await Riparazione.countByClienteIdGroupByStato(cliente_id);
        
        // Riparazioni recenti
        const riparazioniRecenti = await Riparazione.findByClienteId(cliente_id, 'data_richiesta DESC', 5);
        
        // Spesa totale
        const spesaTotale = await Riparazione.sumCostoByClienteId(cliente_id);
        
        // Meccanici più utilizzati
        const meccaniciPiuUtilizzati = await Riparazione.getMeccaniciPiuUtilizzatiByClienteId(cliente_id, 3);
        
        res.apiSuccess({
            riparazioniPerStato: riparazioniPerStato,
            riparazioniRecenti: riparazioniRecenti,
            spesaTotale: spesaTotale,
            meccaniciPiuUtilizzati: meccaniciPiuUtilizzati
        });
    } catch (err) {
        console.error(err);
        res.apiError('Si è verificato un errore nel recupero delle statistiche', 500);
    }
});
// Aggiungi questa route in apiRoutes.js
router.get('/recensioni/featured', async (req, res) => {
    try {
        const recensioni = await db.query(
            `SELECT r.*, c.nome || ' ' || SUBSTR(c.cognome, 1, 1) || '.' as nome_cliente
             FROM recensioni r
             JOIN clienti c ON r.id_cliente = c.id
             ORDER BY r.valutazione DESC, r.data_recensione DESC
             LIMIT 3`
        );
        
        res.apiSuccess(recensioni);
    } catch (err) {
        console.error('Errore nel recupero delle recensioni in evidenza:', err);
        res.apiError('Si è verificato un errore nel recupero delle recensioni', 500);
    }
});

module.exports = router;