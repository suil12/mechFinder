"use strict";

const { validationResult } = require('express-validator');
const db = require('../database/db');
const { Riparazione } = require('../models/riparazione');

// Bacheca riparazioni (pubblica o filtrata per utente)
exports.getRiparazioni = async (req, res) => {
    try {
        // Default filtri
        const filtri = {
            page: parseInt(req.query.page) || 1,
            stato: req.query.stato || '',
            categoria: req.query.categoria || '',
            q: req.query.q || '',
            ordina: req.query.ordina || 'recenti'
        };

        // Impostazioni di paginazione
        const perPage = 10;
        const offset = (filtri.page - 1) * perPage;

        // Costruisci la query base
        let query = `
            SELECT r.*, 
            c.nome as nome_cliente, c.cognome as cognome_cliente,
            (SELECT COUNT(*) FROM preventivi p WHERE p.id_riparazione = r.id) as n_preventivi
            FROM riparazioni r
            JOIN clienti c ON r.id_cliente = c.id
            WHERE 1=1
        `;

        const queryParams = [];

        // Aggiungi i filtri alla query
        if (filtri.stato) {
            query += ' AND r.stato = ?';
            queryParams.push(filtri.stato);
        }

        if (filtri.categoria) {
            query += ' AND r.categoria = ?';
            queryParams.push(filtri.categoria);
        }

        if (filtri.q) {
            query += ' AND (r.titolo LIKE ? OR r.descrizione LIKE ?)';
            queryParams.push(`%${filtri.q}%`, `%${filtri.q}%`);
        }

        // Se l'utente è un meccanico, verifica quali richieste ha già offerto un preventivo
        if (req.user && req.user.tipo === 'meccanico') {
            query = `
                SELECT r.*, 
                c.nome as nome_cliente, c.cognome as cognome_cliente,
                (SELECT COUNT(*) FROM preventivi p WHERE p.id_riparazione = r.id) as n_preventivi,
                EXISTS(SELECT 1 FROM preventivi p WHERE p.id_riparazione = r.id AND p.id_meccanico = ?) as meccanico_ha_offerto
                FROM riparazioni r
                JOIN clienti c ON r.id_cliente = c.id
                WHERE 1=1
            `;
            queryParams.unshift(req.user.id); // Aggiungi l'ID del meccanico all'inizio dei parametri
        }

        // Aggiungi ordinamento
        switch(filtri.ordina) {
            case 'urgenti':
                query += ' ORDER BY r.urgente DESC, r.data_richiesta DESC';
                break;
            case 'budget':
                query += ' ORDER BY r.budget DESC, r.data_richiesta DESC';
                break;
            case 'recenti':
            default:
                query += ' ORDER BY r.data_richiesta DESC';
        }

        // Aggiungi paginazione
        query += ' LIMIT ? OFFSET ?';
        queryParams.push(perPage, offset);

        // Esegui la query per ottenere le riparazioni
        const riparazioni = await db.query(query, queryParams);

        // Conta il totale delle riparazioni per la paginazione
        let countQuery = `
            SELECT COUNT(*) as total 
            FROM riparazioni r
            WHERE 1=1
        `;

        const countParams = [];

        if (filtri.stato) {
            countQuery += ' AND r.stato = ?';
            countParams.push(filtri.stato);
        }

        if (filtri.categoria) {
            countQuery += ' AND r.categoria = ?';
            countParams.push(filtri.categoria);
        }

        if (filtri.q) {
            countQuery += ' AND (r.titolo LIKE ? OR r.descrizione LIKE ?)';
            countParams.push(`%${filtri.q}%`, `%${filtri.q}%`);
        }

        const totalResult = await db.get(countQuery, countParams);
        const totalRiparazioni = totalResult.total;

        // Se l'utente è un cliente, recupera i suoi veicoli per il form di nuova richiesta
        let veicoli = [];
        if (req.user && req.user.tipo === 'cliente') {
            veicoli = await db.query('SELECT * FROM veicoli WHERE id_cliente = ?', [req.user.id]);
        }

        // Se l'utente è un meccanico, recupera le statistiche
        let stats = {};
        if (req.user && req.user.tipo === 'meccanico') {
            const richiesteGestite = await db.get(
                'SELECT COUNT(*) as count FROM preventivi WHERE id_meccanico = ?', 
                [req.user.id]
            );
            
            const preventiviAccettati = await db.get(
                'SELECT COUNT(*) as count FROM preventivi WHERE id_meccanico = ? AND stato = ?', 
                [req.user.id, 'accettato']
            );
            
            stats = {
                richiesteGestite: richiesteGestite.count,
                preventiviAccettati: preventiviAccettati.count
            };
        }

        // Renderizza la vista
        res.render('riparazioni', {
            title: 'Bacheca Riparazioni - MechFinder',
            active: 'riparazioni',
            riparazioni: riparazioni,
            filtri: filtri,
            veicoli: veicoli,
            stats: stats,
            pagination: {
                currentPage: filtri.page,
                totalPages: Math.ceil(totalRiparazioni / perPage),
                totalItems: totalRiparazioni
            },
            formatDate: (date) => {
                const d = new Date(date);
                return d.toLocaleDateString('it-IT', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }
        });
    } catch (err) {
        console.error('Errore nella visualizzazione della bacheca delle riparazioni:', err);
        req.flash('error', 'Si è verificato un errore nel caricamento della bacheca delle riparazioni.');
        res.redirect('/');
    }
};

// Dettaglio riparazione
exports.getDettaglioRiparazione = async (req, res) => {
    try {
        const riparazione = await Riparazione.getDettaglio(req.params.id);
        
        if (!riparazione) {
            req.flash('error', 'Riparazione non trovata.');
            return res.redirect('/riparazioni');
        }
        
        // Verifica che l'utente sia autorizzato a vedere questa riparazione
        if (req.user.tipo === 'cliente' && riparazione.id_cliente !== req.user.id) {
            req.flash('error', 'Non sei autorizzato a visualizzare questa riparazione.');
            return res.redirect('/riparazioni');
        } else if (req.user.tipo === 'meccanico' && riparazione.id_meccanico !== req.user.id) {
            req.flash('error', 'Non sei autorizzato a visualizzare questa riparazione.');
            return res.redirect('/riparazioni');
        }
        
        // Ottieni i commenti/messaggi
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
            [req.params.id]
        );
        
        res.render('riparazioni/dettaglio', {
            title: 'Dettaglio Riparazione - MechFinder',
            active: 'riparazioni',
            riparazione: riparazione,
            commenti: commenti
        });
    } catch (err) {
        console.error('Errore nel caricamento del dettaglio riparazione:', err);
        req.flash('error', 'Si è verificato un errore nel caricamento del dettaglio riparazione.');
        res.redirect('/riparazioni');
    }
};

// Aggiunge un nuovo commento a una riparazione
exports.aggiungiCommento = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.flash('error', errors.array().map(e => e.msg).join(', '));
        return res.redirect(`/riparazioni/${req.params.id}`);
    }
    
    try {
        const riparazione = await Riparazione.findById(req.params.id);
        
        if (!riparazione) {
            req.flash('error', 'Riparazione non trovata.');
            return res.redirect('/riparazioni');
        }
        
        // Verifica che l'utente sia autorizzato a commentare questa riparazione
        if (req.user.tipo === 'cliente' && riparazione.id_cliente !== req.user.id) {
            req.flash('error', 'Non sei autorizzato a commentare questa riparazione.');
            return res.redirect('/riparazioni');
        } else if (req.user.tipo === 'meccanico' && riparazione.id_meccanico !== req.user.id) {
            req.flash('error', 'Non sei autorizzato a commentare questa riparazione.');
            return res.redirect('/riparazioni');
        }
        
        // Inserisci il commento
        await db.run(
            `INSERT INTO commenti 
             (id_riparazione, id_utente, tipo_utente, messaggio, data_creazione) 
             VALUES (?, ?, ?, ?, ?)`,
            [
                req.params.id,
                req.user.id,
                req.user.tipo,
                req.body.messaggio,
                new Date()
            ]
        );
        
        req.flash('success', 'Commento aggiunto con successo.');
        res.redirect(`/riparazioni/${req.params.id}`);
    } catch (err) {
        console.error('Errore nell\'invio del commento:', err);
        req.flash('error', 'Si è verificato un errore nell\'invio del commento.');
        res.redirect(`/riparazioni/${req.params.id}`);
    }
};

// Crea una nuova riparazione (cliente)
exports.creaRiparazione = async (req, res) => {
    // Verifica che l'utente sia un cliente
    if (req.user.tipo !== 'cliente') {
        req.flash('error', 'Solo i clienti possono creare richieste di riparazione.');
        return res.redirect('/riparazioni');
    }
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.flash('error', errors.array().map(e => e.msg).join(', '));
        return res.redirect('/riparazioni');
    }
    
    try {
        // Inserisci la nuova riparazione
        const result = await db.run(
            `INSERT INTO riparazioni 
             (id_cliente, id_meccanico, id_veicolo, titolo, descrizione, categoria, budget, citta, urgente, data_creazione) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                req.user.id,
                req.body.id_meccanico,
                req.body.id_veicolo || null,
                req.body.titolo,
                req.body.descrizione,
                req.body.categoria,
                req.body.budget || 0,
                req.body.citta,
                req.body.urgente ? 1 : 0,
                new Date()
            ]
        );
        
        req.flash('success', 'Richiesta di riparazione pubblicata con successo.');
        res.redirect(`/riparazioni/${result.lastID}`);
    } catch (err) {
        console.error('Errore nella creazione della riparazione:', err);
        req.flash('error', 'Si è verificato un errore nella creazione della riparazione.');
        res.redirect('/riparazioni');
    }
};

// Invia un preventivo (meccanico)
exports.inviaPreventivo = async (req, res) => {
    // Verifica che l'utente sia un meccanico
    if (req.user.tipo !== 'meccanico') {
        req.flash('error', 'Solo i meccanici possono inviare preventivi.');
        return res.redirect('/riparazioni');
    }
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.flash('error', errors.array().map(e => e.msg).join(', '));
        return res.redirect(`/riparazioni/${req.params.id}`);
    }
    
    try {
        const riparazione = await Riparazione.findById(req.params.id);
        
        if (!riparazione) {
            req.flash('error', 'Riparazione non trovata.');
            return res.redirect('/riparazioni');
        }
        
        if (riparazione.stato !== 'richiesta') {
            req.flash('error', 'Questa riparazione non accetta più preventivi.');
            return res.redirect(`/riparazioni/${req.params.id}`);
        }
        
        // Verifica se il meccanico ha già inviato un preventivo
        const preventivoEsistente = await db.get(
            'SELECT * FROM preventivi WHERE id_riparazione = ? AND id_meccanico = ?',
            [req.params.id, req.user.id]
        );
        
        if (preventivoEsistente) {
            req.flash('error', 'Hai già inviato un preventivo per questa riparazione.');
            return res.redirect(`/riparazioni/${req.params.id}`);
        }
        
        // Inserisci il preventivo
        await db.run(
            `INSERT INTO preventivi 
             (id_riparazione, id_meccanico, importo, descrizione, tempo_stimato, note, data_creazione) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                req.params.id,
                req.user.id,
                req.body.importo,
                req.body.descrizione,
                req.body.tempo_stimato,
                req.body.note || null,
                new Date()
            ]
        );
        
        req.flash('success', 'Preventivo inviato con successo.');
        res.redirect(`/riparazioni/${req.params.id}`);
    } catch (err) {
        console.error('Errore nell\'invio del preventivo:', err);
        req.flash('error', 'Si è verificato un errore nell\'invio del preventivo.');
        res.redirect(`/riparazioni/${req.params.id}`);
    }
};