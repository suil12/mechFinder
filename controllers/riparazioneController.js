"use strict";

const { validationResult } = require('express-validator');
const db = require('../database/db');

"use strict";

const { validationResult } = require('express-validator');
const db = require('../database/db');

// Visualizza elenco riparazioni generali (solo per admin)
exports.getAll = async (req, res) => {
    try {
        // Solo un admin dovrebbe accedere a questa funzione
        if (req.user.tipo !== 'admin') {
            req.flash('error', 'Non sei autorizzato ad accedere a questa pagina.');
            return res.redirect('/');
        }
        
        const riparazioni = await db.query(`
            SELECT r.*, 
            c.nome as nome_cliente, c.cognome as cognome_cliente, 
            m.nome as nome_meccanico, m.cognome as cognome_meccanico, m.nome_officina
            FROM riparazioni r
            JOIN clienti c ON r.id_cliente = c.id
            JOIN meccanici m ON r.id_meccanico = m.id
            ORDER BY r.data_richiesta DESC
        `);
        
        res.render('admin/riparazioni', {
            title: 'Gestione Riparazioni - MechFinder Admin',
            active: 'riparazioni',
            riparazioni
        });
    } catch (err) {
        console.error('Errore nel recupero delle riparazioni:', err);
        req.flash('error', 'Si è verificato un errore nel caricamento delle riparazioni.');
        res.redirect('/admin/dashboard');
    }
};

// Creazione richiesta di riparazione
exports.create = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.flash('error', errors.array().map(err => err.msg).join(', '));
        return res.redirect('/riparazioni');
    }

    try {
        // Solo un cliente può creare una richiesta
        if (req.user.tipo !== 'cliente') {
            req.flash('error', 'Solo i clienti possono richiedere una riparazione.');
            return res.redirect('/');
        }
        
        // Controlla che il meccanico specificato esista
        const meccanico = await db.get(
            'SELECT * FROM meccanici WHERE id = ? AND verificato = 1',
            [req.body.id_meccanico]
        );
        
        if (!meccanico) {
            req.flash('error', 'Meccanico non trovato o non verificato.');
            return res.redirect('/meccanici');
        }
        
        // Inserisci la richiesta
        const result = await db.run(
            `INSERT INTO riparazioni 
            (id_cliente, id_meccanico, id_veicolo, descrizione, tipo_problema, 
            priorita, stato, data_richiesta) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                req.user.id,
                req.body.id_meccanico,
                req.body.id_veicolo || null,
                req.body.descrizione,
                req.body.tipo_problema || 'Generale',
                req.body.priorita || 'normale',
                'richiesta',
                new Date()
            ]
        );
        
        // Aggiungi il primo commento automatico
        await db.run(
            `INSERT INTO commenti 
            (id_riparazione, id_utente, tipo_utente, messaggio, data_creazione, automatico) 
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
                result.lastID,
                req.user.id,
                'cliente',
                'Richiesta di riparazione creata.',
                new Date(),
                1
            ]
        );
        
        req.flash('success', 'Richiesta di riparazione inviata con successo.');
        
        // Redirect alla vista dettaglio riparazione
        if (req.user.tipo === 'cliente') {
            res.redirect(`/cliente/riparazioni/${result.lastID}`);
        } else {
            res.redirect(`/riparazioni/${result.lastID}`);
        }
    } catch (err) {
        console.error('Errore nella creazione della richiesta di riparazione:', err);
        req.flash('error', 'Si è verificato un errore nella creazione della richiesta di riparazione.');
        res.redirect('/meccanici');
    }
};

// Vista dettaglio riparazione
exports.getById = async (req, res) => {
    try {
        // Ottieni la riparazione con i dettagli di cliente e meccanico
        const riparazione = await db.get(
            `SELECT r.*, 
            c.nome as nome_cliente, c.cognome as cognome_cliente, 
            c.email as email_cliente, c.telefono as telefono_cliente, c.avatar as avatar_cliente,
            m.nome as nome_meccanico, m.cognome as cognome_meccanico, 
            m.nome_officina, m.email as email_meccanico,
            m.telefono as telefono_meccanico, m.avatar as avatar_meccanico,
            v.marca, v.modello, v.anno, v.targa, v.tipo as tipo_veicolo
            FROM riparazioni r
            JOIN clienti c ON r.id_cliente = c.id
            JOIN meccanici m ON r.id_meccanico = m.id
            LEFT JOIN veicoli v ON r.id_veicolo = v.id
            WHERE r.id = ?`,
            [req.params.id]
        );
        
        if (!riparazione) {
            req.flash('error', 'Riparazione non trovata.');
            return res.redirect('/');
        }
        
        // Verifica che l'utente sia autorizzato (cliente o meccanico coinvolto, o admin)
        if (req.user.tipo === 'cliente' && riparazione.id_cliente !== req.user.id) {
            req.flash('error', 'Non sei autorizzato a visualizzare questa riparazione.');
            return res.redirect('/cliente/riparazioni');
        } else if (req.user.tipo === 'meccanico' && riparazione.id_meccanico !== req.user.id) {
            req.flash('error', 'Non sei autorizzato a visualizzare questa riparazione.');
            return res.redirect('/meccanico/riparazioni');
        }
        
        // Ottieni il preventivo, se presente
        const preventivo = await db.get(
            'SELECT * FROM preventivi WHERE id_riparazione = ? ORDER BY data_creazione DESC LIMIT 1',
            [riparazione.id]
        );
        
        // Ottieni i commenti
        const commenti = await db.query(
            `SELECT c.*, 
             CASE 
                WHEN c.tipo_utente = 'cliente' THEN cl.nome || ' ' || cl.cognome
                WHEN c.tipo_utente = 'meccanico' THEN m.nome || ' ' || m.cognome
             END as nome_utente,
             CASE 
                WHEN c.tipo_utente = 'cliente' THEN cl.avatar
                WHEN c.tipo_utente = 'meccanico' THEN m.avatar
             END as avatar_utente
             FROM commenti c
             LEFT JOIN clienti cl ON c.id_utente = cl.id AND c.tipo_utente = 'cliente'
             LEFT JOIN meccanici m ON c.id_utente = m.id AND c.tipo_utente = 'meccanico'
             WHERE c.id_riparazione = ?
             ORDER BY c.data_creazione ASC`,
            [riparazione.id]
        );
        
        // Renderizza la vista appropriata in base al tipo di utente
        let viewPath;
        if (req.user.tipo === 'cliente') {
            viewPath = 'cliente/dettaglio-riparazione';
        } else if (req.user.tipo === 'meccanico') {
            viewPath = 'meccanico/dettaglio-riparazione';
        } else {
            viewPath = 'admin/dettaglio-riparazione';
        }
        
        res.render(viewPath, {
            title: 'Dettaglio Riparazione - MechFinder',
            active: 'riparazioni',
            riparazione,
            preventivo,
            commenti
        });
    } catch (err) {
        console.error('Errore nel recupero del dettaglio riparazione:', err);
        req.flash('error', 'Si è verificato un errore nel caricamento del dettaglio riparazione.');
        res.redirect('/');
    }
};

// Aggiungi commento a una riparazione
exports.addComment = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.flash('error', errors.array().map(err => err.msg).join(', '));
        return res.redirect(`/riparazioni/${req.params.id}`);
    }

    try {
        const riparazione = await db.get(
            'SELECT * FROM riparazioni WHERE id = ?',
            [req.params.id]
        );
        
        if (!riparazione) {
            req.flash('error', 'Riparazione non trovata.');
            return res.redirect('/');
        }
        
        // Verifica che l'utente sia autorizzato (cliente o meccanico coinvolto)
        if (req.user.tipo === 'cliente' && riparazione.id_cliente !== req.user.id) {
            req.flash('error', 'Non sei autorizzato a commentare questa riparazione.');
            return res.redirect('/cliente/riparazioni');
        } else if (req.user.tipo === 'meccanico' && riparazione.id_meccanico !== req.user.id) {
            req.flash('error', 'Non sei autorizzato a commentare questa riparazione.');
            return res.redirect('/meccanico/riparazioni');
        }
        
        // Inserisci il commento
        await db.run(
            `INSERT INTO commenti 
            (id_riparazione, id_utente, tipo_utente, messaggio, data_creazione)
            VALUES (?, ?, ?, ?, ?)`,
            [
                riparazione.id,
                req.user.id,
                req.user.tipo,
                req.body.messaggio,
                new Date()
            ]
        );
        
        req.flash('success', 'Commento aggiunto con successo.');
        
        // Redirect in base al tipo di utente
        if (req.user.tipo === 'cliente') {
            res.redirect(`/cliente/riparazioni/${riparazione.id}`);
        } else if (req.user.tipo === 'meccanico') {
            res.redirect(`/meccanico/riparazioni/${riparazione.id}`);
        } else {
            res.redirect(`/riparazioni/${riparazione.id}`);
        }
    } catch (err) {
        console.error('Errore nell\'aggiunta del commento:', err);
        req.flash('error', 'Si è verificato un errore nell\'aggiunta del commento.');
        res.redirect(`/riparazioni/${req.params.id}`);
    }
};