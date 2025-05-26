"use strict";

const express = require('express');
const router = express.Router();
const db = require('../database/db');
// Importa esplicitamente la funzione
const { getServiceIcon } = require('../utils/serviceIcons');

// Home page
router.get('/', async (req, res) => {
    try {
        // Ottengo i meccanici più valutati
        const meccaniciEvidenziati = await db.query(
            'SELECT * FROM meccanici WHERE verificato = 1 ORDER BY valutazione DESC LIMIT 5'
        );
        
        // Ottengo alcuni servizi
        const servizi = await db.query('SELECT * FROM servizi LIMIT 6');
        
        // Ottengo le recensioni in evidenza
        const recensioni = await db.query(
            `SELECT r.*, c.nome as nome_cliente, c.cognome as cognome_cliente 
             FROM recensioni r 
             JOIN clienti c ON r.id_cliente = c.id 
             ORDER BY r.valutazione DESC LIMIT 3`
        );
        
        res.render('index', { 
            title: 'MechFinder - Trova il meccanico più adatto a te',
            active: 'index',
            meccaniciEvidenziati,
            servizi,
            recensioni,
            query: req.query.q || '',
            getServiceIcon
        });
    } catch (err) {
        console.error('Errore nella home page:', err);
        res.render('index', { 
            title: 'MechFinder - Trova il meccanico più adatto a te',
            active: 'index',
            meccaniciEvidenziati: [],
            servizi: [],
            recensioni: [],
            query: req.query.q || '',
            getServiceIcon
        });
    }
});

// Ricerca
router.get('/search', async (req, res) => {
    try {
        const query = req.query.q || '';
        const tipo = req.query.tipo || 'all';
        
        let meccanici = [];
        let servizi = [];
        
        if (tipo === 'all' || tipo === 'meccanici') {
            // Cerca meccanici
            meccanici = await db.query(
                `SELECT * FROM meccanici 
                 WHERE verificato = 1 AND (
                     nome LIKE ? OR 
                     cognome LIKE ? OR 
                     nome_officina LIKE ? OR 
                     specializzazione LIKE ? OR 
                     citta LIKE ? OR 
                     descrizione LIKE ?
                 ) ORDER BY valutazione DESC LIMIT 10`,
                [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`]
            );
        }
        
        if (tipo === 'all' || tipo === 'servizi') {
            // Cerca servizi
            servizi = await db.query(
                `SELECT * FROM servizi 
                 WHERE nome LIKE ? OR descrizione LIKE ? 
                 LIMIT 10`,
                [`%${query}%`, `%${query}%`]
            );
        }
        
        res.render('search-results', {
            title: `Risultati ricerca: ${query} - MechFinder`,
            active: 'search',
            query,
            tipo,
            meccanici,
            servizi
        });
        
    } catch (err) {
        console.error('Errore nella ricerca:', err);
        req.flash('error', 'Si è verificato un errore durante la ricerca.');
        res.redirect('/');
    }
});

// Pagina Servizi
router.get('/servizi', async (req, res) => {
    try {
        const servizi = await db.query('SELECT * FROM servizi');
        
        res.render('servizi', { 
            title: 'Servizi - MechFinder',
            active: 'servizi',
            servizi
        });
    } catch (err) {
        console.error('Errore nella pagina servizi:', err);
        req.flash('error', 'Si è verificato un errore nel caricamento dei servizi.');
        res.redirect('/');
    }
});

// Elenco Meccanici
router.get('/meccanici', async (req, res) => {
    try {
        // Filtri dalla query string
        const citta = req.query.citta || '';
        const specializzazione = req.query.specializzazione || '';
        const nome = req.query.nome || '';
        
        // Costruisci la query SQL base
        let query = 'SELECT * FROM meccanici WHERE verificato = 1';
        const params = [];
        
        // Aggiungi i filtri se presenti
        if (citta) {
            query += ' AND citta LIKE ?';
            params.push(`%${citta}%`);
        }
        
        if (specializzazione) {
            query += ' AND specializzazione = ?';
            params.push(specializzazione);
        }
        
        if (nome) {
            query += ' AND (nome LIKE ? OR cognome LIKE ? OR nome_officina LIKE ?)';
            params.push(`%${nome}%`, `%${nome}%`, `%${nome}%`);
        }
        
        // Ordinamento
        query += ' ORDER BY valutazione DESC';
        
        // Esegui la query
        const meccanici = await db.query(query, params);
        
        // Ottieni le specializzazioni per i filtri
        const specializzazioni = await db.query(
            'SELECT DISTINCT specializzazione FROM meccanici WHERE verificato = 1'
        );
        
        // Ottieni le città per i filtri
        const citta_list = await db.query(
            'SELECT DISTINCT citta FROM meccanici WHERE verificato = 1 AND citta IS NOT NULL'
        );
        
        res.render('meccanici', { 
            title: 'I Nostri Meccanici - MechFinder',
            active: 'meccanici',
            meccanici,
            specializzazioni,
            citta_list,
            filtri: {
                citta,
                specializzazione,
                nome
            }
        });
    } catch (err) {
        console.error('Errore nella pagina meccanici:', err);
        req.flash('error', 'Si è verificato un errore nel caricamento dei meccanici.');
        res.redirect('/');
    }
});

// Dettaglio Meccanico
router.get('/meccanici/:id', async (req, res) => {
    try {
        const meccanico = await db.get(
            'SELECT * FROM meccanici WHERE id = ? AND verificato = 1',
            [req.params.id]
        );
        
        if (!meccanico) {
            req.flash('error', 'Meccanico non trovato o non verificato.');
            return res.redirect('/meccanici');
        }
        
        // Ottieni i servizi offerti dal meccanico
        const servizi = await db.query(
            `SELECT s.*, sm.prezzo 
             FROM servizi s
             JOIN servizi_meccanici sm ON s.id = sm.id_servizio
             WHERE sm.id_meccanico = ?`,
            [meccanico.id]
        );
        
        // Ottieni gli orari di apertura
        const orari = await db.query(
            'SELECT * FROM orari_meccanici WHERE id_meccanico = ? ORDER BY giorno',
            [meccanico.id]
        );
        
        // Ottieni le recensioni
        const recensioni = await db.query(
            `SELECT r.*, c.nome as nome_cliente, c.cognome as cognome_cliente, c.avatar as avatar_cliente
             FROM recensioni r
             JOIN clienti c ON r.id_cliente = c.id
             WHERE r.id_meccanico = ?
             ORDER BY r.data_recensione DESC`,
            [meccanico.id]
        );
        
        res.render('meccanico-profilo', {
            title: `${meccanico.nome_officina || `${meccanico.nome} ${meccanico.cognome}`} - MechFinder`,
            active: 'meccanici',
            meccanico,
            servizi,
            orari,
            recensioni
        });
    } catch (err) {
        console.error('Errore nel dettaglio meccanico:', err);
        req.flash('error', 'Si è verificato un errore nel caricamento del profilo del meccanico.');
        res.redirect('/meccanici');
    }
});

// Chi Siamo
router.get('/chi-siamo', (req, res) => {
    res.render('chi-siamo', { 
        title: 'Chi Siamo - MechFinder',
        active: 'chi-siamo'
    });
});

// Contatti
router.get('/contatti', (req, res) => {
    res.render('contatti', { 
        title: 'Contatti - MechFinder',
        active: 'contatti'
    });
});

module.exports = router;