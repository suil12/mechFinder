"use strict";

const express = require('express');
const router = express.Router();
const { Meccanico } = require('../public/js/utente');
const { Riparazione } = require('../models/riparazione');
const db = require('../database/db');

// Middleware per verificare se l'utente è autenticato
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ success: false, message: 'Non autorizzato' });
};

// Ottieni tutti i meccanici (con filtri)
router.get('/meccanici', async (req, res) => {
    try {
        const meccanici = await Meccanico.cerca({
            q: req.query.q,
            specializzazione: req.query.specializzazione,
            servizio: req.query.servizio,
            citta: req.query.citta,
            valutazione_min: req.query.valutazione_min,
            verificato: req.query.verificato === 'true',
            ordina: req.query.ordina,
            limit: req.query.limit,
            offset: req.query.offset
        });
        
        // Formatta i dati per la risposta
        const risultati = meccanici.map(meccanico => ({
            id: meccanico.id,
            nome: meccanico.nome,
            cognome: meccanico.cognome,
            nome_completo: meccanico.nome_completo,
            nome_officina: meccanico.nome_officina,
            specializzazione: meccanico.specializzazione,
            citta: meccanico.citta,
            valutazione: meccanico.valutazione,
            numero_recensioni: meccanico.numero_recensioni,
            verificato: meccanico.verificato,
            avatar: meccanico.avatar
        }));
        
        res.json(risultati);
    } catch (error) {
        console.error('Errore durante il recupero dei meccanici:', error);
        res.status(500).json({ success: false, message: 'Errore durante il recupero dei meccanici' });
    }
});

// Ottieni un meccanico specifico
router.get('/meccanici/:id', async (req, res) => {
    try {
        const meccanico = await Meccanico.findById(req.params.id);
        
        if (!meccanico) {
            return res.status(404).json({ success: false, message: 'Meccanico non trovato' });
        }
        
        // Ottieni i servizi offerti
        const servizi = await meccanico.getServizi();
        
        // Ottieni le recensioni
        const recensioni = await meccanico.getRecensioni();
        
        // Formatta i dati per la risposta
        const risultato = {
            id: meccanico.id,
            nome: meccanico.nome,
            cognome: meccanico.cognome,
            nome_completo: meccanico.nome_completo,
            nome_officina: meccanico.nome_officina,
            specializzazione: meccanico.specializzazione,
            telefono: meccanico.telefono,
            indirizzo: meccanico.indirizzo,
            citta: meccanico.citta,
            cap: meccanico.cap,
            latitudine: meccanico.latitudine,
            longitudine: meccanico.longitudine,
            descrizione: meccanico.descrizione,
            valutazione: meccanico.valutazione,
            numero_recensioni: meccanico.numero_recensioni,
            verificato: meccanico.verificato,
            avatar: meccanico.avatar,
            servizi,
            recensioni
        };
        
        res.json(risultato);
    } catch (error) {
        console.error('Errore durante il recupero del meccanico:', error);
        res.status(500).json({ success: false, message: 'Errore durante il recupero del meccanico' });
    }
});

// Ottieni le recensioni di un meccanico
router.get('/meccanici/:id/recensioni', async (req, res) => {
    try {
        const meccanico = await Meccanico.findById(req.params.id);
        
        if (!meccanico) {
            return res.status(404).json({ success: false, message: 'Meccanico non trovato' });
        }
        
        const recensioni = await meccanico.getRecensioni();
        res.json(recensioni);
    } catch (error) {
        console.error('Errore durante il recupero delle recensioni:', error);
        res.status(500).json({ success: false, message: 'Errore durante il recupero delle recensioni' });
    }
});

// Ottieni tutti i servizi disponibili
router.get('/servizi', async (req, res) => {
    try {
        const servizi = await db.query('SELECT * FROM servizi ORDER BY nome');
        res.json(servizi);
    } catch (error) {
        console.error('Errore durante il recupero dei servizi:', error);
        res.status(500).json({ success: false, message: 'Errore durante il recupero dei servizi' });
    }
});

// Ottieni dettagli di una riparazione
router.get('/riparazioni/:id', isAuthenticated, async (req, res) => {
    try {
        const dettaglio = await Riparazione.getDettaglio(req.params.id);
        
        if (!dettaglio) {
            return res.status(404).json({ success: false, message: 'Riparazione non trovata' });
        }
        
        // Verifica che l'utente sia autorizzato a vedere questa riparazione
        if (req.user.tipo === 'cliente' && dettaglio.id_cliente !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Non autorizzato' });
        }
        
        if (req.user.tipo === 'meccanico' && dettaglio.id_meccanico !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Non autorizzato' });
        }
        
        res.json(dettaglio);
    } catch (error) {
        console.error('Errore durante il recupero della riparazione:', error);
        res.status(500).json({ success: false, message: 'Errore durante il recupero della riparazione' });
    }
});

// Cerca riparazioni (filtrate per utente autenticato)
router.get('/riparazioni', isAuthenticated, async (req, res) => {
    try {
        // Costruisci i filtri
        const filtri = {
            q: req.query.q,
            stato: req.query.stato,
            tipo_problema: req.query.tipo_problema,
            data_da: req.query.data_da,
            data_a: req.query.data_a,
            ordina: req.query.ordina,
            limit: req.query.limit,
            offset: req.query.offset
        };
        
        // Aggiungi filtro per utente
        if (req.user.tipo === 'cliente') {
            filtri.id_cliente = req.user.id;
        } else if (req.user.tipo === 'meccanico') {
            filtri.id_meccanico = req.user.id;
        }
        
        // Filtra per veicolo se specificato
        if (req.query.id_veicolo) {
            filtri.id_veicolo = req.query.id_veicolo;
        }
        
        const riparazioni = await Riparazione.cerca(filtri);
        res.json(riparazioni);
    } catch (error) {
        console.error('Errore durante la ricerca delle riparazioni:', error);
        res.status(500).json({ success: false, message: 'Errore durante la ricerca delle riparazioni' });
    }
});

// Crea una nuova richiesta di riparazione
router.post('/riparazioni', isAuthenticated, async (req, res) => {
    try {
        // Solo i clienti possono creare richieste di riparazione
        if (req.user.tipo !== 'cliente') {
            return res.status(403).json({ success: false, message: 'Solo i clienti possono creare richieste di riparazione' });
        }
        
        const riparazione = await Riparazione.create({
            id_cliente: req.user.id,
            id_meccanico: req.body.id_meccanico,
            id_veicolo: req.body.id_veicolo,
            descrizione: req.body.descrizione,
            tipo_problema: req.body.tipo_problema,
            priorita: req.body.priorita
        });
        
        res.status(201).json(riparazione);
    } catch (error) {
        console.error('Errore durante la creazione della riparazione:', error);
        res.status(500).json({ success: false, message: 'Errore durante la creazione della riparazione' });
    }
});

// Aggiorna lo stato di una riparazione
router.put('/riparazioni/:id/stato', isAuthenticated, async (req, res) => {
    try {
        const riparazione = await Riparazione.findById(req.params.id);
        
        if (!riparazione) {
            return res.status(404).json({ success: false, message: 'Riparazione non trovata' });
        }
        
        // Verifica l'autorizzazione
        if (req.user.tipo === 'cliente' && riparazione.id_cliente !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Non autorizzato' });
        }
        
        if (req.user.tipo === 'meccanico' && riparazione.id_meccanico !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Non autorizzato' });
        }
        
        // Verifica che lo stato richiesto sia valido
        const statoRichiesto = req.body.stato;
        const statiValidi = ['richiesta', 'preventivo', 'accettata', 'in_corso', 'completata', 'rifiutata'];
        
        if (!statiValidi.includes(statoRichiesto)) {
            return res.status(400).json({ success: false, message: 'Stato non valido' });
        }
        
        // Verifica che la transizione di stato sia valida
        const statoAttuale = riparazione.stato;
        
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
        
        if (!transizioniValide.includes(statoRichiesto)) {
            return res.status(400).json({ 
                success: false, 
                message: `Transizione di stato da '${statoAttuale}' a '${statoRichiesto}' non valida per un ${req.user.tipo}` 
            });
        }
        
        // Aggiorna lo stato
        await riparazione.aggiornaStato(statoRichiesto, req.body.note);
        
        res.json({ success: true, stato: statoRichiesto });
    } catch (error) {
        console.error('Errore durante l\'aggiornamento dello stato della riparazione:', error);
        res.status(500).json({ success: false, message: 'Errore durante l\'aggiornamento dello stato della riparazione' });
    }
});

// Crea un preventivo per una riparazione
router.post('/riparazioni/:id/preventivi', isAuthenticated, async (req, res) => {
    try {
        // Solo i meccanici possono creare preventivi
        if (req.user.tipo !== 'meccanico') {
            return res.status(403).json({ success: false, message: 'Solo i meccanici possono creare preventivi' });
        }
        
        const riparazione = await Riparazione.findById(req.params.id);
        
        if (!riparazione) {
            return res.status(404).json({ success: false, message: 'Riparazione non trovata' });
        }
        
        // Verifica che la riparazione appartenga a questo meccanico
        if (riparazione.id_meccanico !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Non autorizzato' });
        }
        
        const preventivo = await riparazione.creaPreventivo({
            importo: req.body.importo,
            descrizione: req.body.descrizione,
            giorni_validita: req.body.giorni_validita
        });
        
        res.status(201).json(preventivo);
    } catch (error) {
        console.error('Errore durante la creazione del preventivo:', error);
        res.status(500).json({ success: false, message: 'Errore durante la creazione del preventivo' });
    }
});

// Accetta un preventivo
router.post('/preventivi/:id/accetta', isAuthenticated, async (req, res) => {
    try {
        // Solo i clienti possono accettare preventivi
        if (req.user.tipo !== 'cliente') {
            return res.status(403).json({ success: false, message: 'Solo i clienti possono accettare preventivi' });
        }
        
        // Ottieni il preventivo
        const preventivo = await db.get('SELECT * FROM preventivi WHERE id = ?', [req.params.id]);
        
        if (!preventivo) {
            return res.status(404).json({ success: false, message: 'Preventivo non trovato' });
        }
        
        // Ottieni la riparazione associata
        const riparazione = await Riparazione.findById(preventivo.id_riparazione);
        
        if (!riparazione) {
            return res.status(404).json({ success: false, message: 'Riparazione non trovata' });
        }
        
        // Verifica che la riparazione appartenga a questo cliente
        if (riparazione.id_cliente !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Non autorizzato' });
        }
        
        // Verifica che il preventivo non sia già stato accettato o rifiutato
        if (preventivo.stato !== 'in_attesa') {
            return res.status(400).json({ success: false, message: `Il preventivo è già stato ${preventivo.stato}` });
        }
        
        // Accetta il preventivo
        const preventivoAggiornato = await riparazione.accettaPreventivo(preventivo.id);
        
        res.json({ success: true, preventivo: preventivoAggiornato });
    } catch (error) {
        console.error('Errore durante l\'accettazione del preventivo:', error);
        res.status(500).json({ success: false, message: 'Errore durante l\'accettazione del preventivo' });
    }
});

// Rifiuta un preventivo
router.post('/preventivi/:id/rifiuta', isAuthenticated, async (req, res) => {
    try {
        // Solo i clienti possono rifiutare preventivi
        if (req.user.tipo !== 'cliente') {
            return res.status(403).json({ success: false, message: 'Solo i clienti possono rifiutare preventivi' });
        }
        
        // Ottieni il preventivo
        const preventivo = await db.get('SELECT * FROM preventivi WHERE id = ?', [req.params.id]);
        
        if (!preventivo) {
            return res.status(404).json({ success: false, message: 'Preventivo non trovato' });
        }
        
        // Ottieni la riparazione associata
        const riparazione = await Riparazione.findById(preventivo.id_riparazione);
        
        if (!riparazione) {
            return res.status(404).json({ success: false, message: 'Riparazione non trovata' });
        }
        
        // Verifica che la riparazione appartenga a questo cliente
        if (riparazione.id_cliente !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Non autorizzato' });
        }
        
        // Verifica che il preventivo non sia già stato accettato o rifiutato
        if (preventivo.stato !== 'in_attesa') {
            return res.status(400).json({ success: false, message: `Il preventivo è già stato ${preventivo.stato}` });
        }
        
        // Rifiuta il preventivo
        const preventivoAggiornato = await riparazione.rifiutaPreventivo(preventivo.id);
        
        res.json({ success: true, preventivo: preventivoAggiornato });
    } catch (error) {
        console.error('Errore durante il rifiuto del preventivo:', error);
        res.status(500).json({ success: false, message: 'Errore durante il rifiuto del preventivo' });
    }
});

// Lascia una recensione
router.post('/meccanici/:id/recensioni', isAuthenticated, async (req, res) => {
    try {
        // Solo i clienti possono lasciare recensioni
        if (req.user.tipo !== 'cliente') {
            return res.status(403).json({ success: false, message: 'Solo i clienti possono lasciare recensioni' });
        }
        
        // Verifica che la valutazione sia valida (1-5)
        const valutazione = parseInt(req.body.valutazione);
        if (isNaN(valutazione) || valutazione < 1 || valutazione > 5) {
            return res.status(400).json({ success: false, message: 'La valutazione deve essere un numero da 1 a 5' });
        }
        
        // Se è specificata una riparazione, verifica che esista e appartenga al cliente
        if (req.body.id_riparazione) {
            const riparazione = await Riparazione.findById(req.body.id_riparazione);
            
            if (!riparazione) {
                return res.status(404).json({ success: false, message: 'Riparazione non trovata' });
            }
            
            if (riparazione.id_cliente !== req.user.id || riparazione.id_meccanico !== parseInt(req.params.id)) {
                return res.status(403).json({ success: false, message: 'Non autorizzato: la riparazione non corrisponde' });
            }
            
            // Verifica che la riparazione sia completata
            if (riparazione.stato !== 'completata') {
                return res.status(400).json({ success: false, message: 'Puoi recensire solo riparazioni completate' });
            }
            
            // Verifica che non esista già una recensione per questa riparazione
            const recensioneEsistente = await db.get(
                'SELECT * FROM recensioni WHERE id_riparazione = ?',
                [req.body.id_riparazione]
            );
            
            if (recensioneEsistente) {
                return res.status(400).json({ success: false, message: 'Hai già recensito questa riparazione' });
            }
        }
        
        // Crea la recensione
        const recensione = await req.user.lasciaRecensione({
            id_meccanico: req.params.id,
            id_riparazione: req.body.id_riparazione || null,
            valutazione,
            commento: req.body.commento
        });
        
        res.status(201).json(recensione);
    } catch (error) {
        console.error('Errore durante la creazione della recensione:', error);
        res.status(500).json({ success: false, message: 'Errore durante la creazione della recensione' });
    }
});

// Ottieni veicoli dell'utente
router.get('/veicoli', isAuthenticated, async (req, res) => {
    try {
        // Solo i clienti hanno veicoli
        if (req.user.tipo !== 'cliente') {
            return res.status(403).json({ success: false, message: 'Solo i clienti hanno veicoli' });
        }
        
        const veicoli = await req.user.getVeicoli();
        res.json(veicoli);
    } catch (error) {
        console.error('Errore durante il recupero dei veicoli:', error);
        res.status(500).json({ success: false, message: 'Errore durante il recupero dei veicoli' });
    }
});

// Aggiungi un veicolo
router.post('/veicoli', isAuthenticated, async (req, res) => {
    try {
        // Solo i clienti possono aggiungere veicoli
        if (req.user.tipo !== 'cliente') {
            return res.status(403).json({ success: false, message: 'Solo i clienti possono aggiungere veicoli' });
        }
        
        // Verifica i dati del veicolo
        if (!req.body.marca || !req.body.modello) {
            return res.status(400).json({ success: false, message: 'Marca e modello sono obbligatori' });
        }
        
        const veicolo = await req.user.aggiungiVeicolo({
            marca: req.body.marca,
            modello: req.body.modello,
            anno: req.body.anno,
            targa: req.body.targa,
            tipo: req.body.tipo
        });
        
        res.status(201).json(veicolo);
    } catch (error) {
        console.error('Errore durante l\'aggiunta del veicolo:', error);
        res.status(500).json({ success: false, message: 'Errore durante l\'aggiunta del veicolo' });
    }
});

// Elimina un veicolo
router.delete('/veicoli/:id', isAuthenticated, async (req, res) => {
    try {
        // Solo i clienti possono eliminare veicoli
        if (req.user.tipo !== 'cliente') {
            return res.status(403).json({ success: false, message: 'Solo i clienti possono eliminare veicoli' });
        }
        
        // Verifica che il veicolo esista e appartenga a questo cliente
        const veicolo = await db.get(
            'SELECT * FROM veicoli WHERE id = ? AND id_cliente = ?',
            [req.params.id, req.user.id]
        );
        
        if (!veicolo) {
            return res.status(404).json({ success: false, message: 'Veicolo non trovato o non autorizzato' });
        }
        
        // Elimina il veicolo
        await db.run('DELETE FROM veicoli WHERE id = ?', [req.params.id]);
        
        res.json({ success: true, message: 'Veicolo eliminato con successo' });
    } catch (error) {
        console.error('Errore durante l\'eliminazione del veicolo:', error);
        res.status(500).json({ success: false, message: 'Errore durante l\'eliminazione del veicolo' });
    }
});

module.exports = router;