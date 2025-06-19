"use strict";

const db = require('../database/db');
const bcrypt = require('bcrypt');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { validationResult } = require('express-validator');

const meccanicoController = {
    // Dashboard principale del meccanico
    getDashboard: async (req, res) => {
        try {
            const meccanicoId = req.user.id;
            
            // Recupera richieste in attesa (non ancora assegnate a nessun meccanico)
            const richiestePendenti = await db.all(`
                SELECT r.*, c.nome, c.cognome, c.telefono, c.email, v.marca, v.modello, v.anno, v.targa
                FROM riparazioni r
                JOIN clienti c ON r.id_cliente = c.id
                LEFT JOIN veicoli v ON r.id_veicolo = v.id
                WHERE r.stato = 'in_attesa' AND r.id_meccanico IS NULL
                ORDER BY r.data_richiesta DESC
                LIMIT 10
            `);
            
            // Recupera riparazioni del meccanico per stato
            const riparazioniAccettate = await db.all(`
                SELECT r.*, c.nome, c.cognome, c.telefono, c.email, v.marca, v.modello, v.anno, v.targa
                FROM riparazioni r
                JOIN clienti c ON r.id_cliente = c.id
                LEFT JOIN veicoli v ON r.id_veicolo = v.id
                WHERE r.id_meccanico = ? AND r.stato = 'accettata'
                ORDER BY r.data_accettazione DESC
            `, [meccanicoId]);
            
            const riparazioniInCorso = await db.all(`
                SELECT r.*, c.nome, c.cognome, c.telefono, c.email, v.marca, v.modello, v.anno, v.targa
                FROM riparazioni r
                JOIN clienti c ON r.id_cliente = c.id
                LEFT JOIN veicoli v ON r.id_veicolo = v.id
                WHERE r.id_meccanico = ? AND r.stato = 'in_corso'
                ORDER BY r.data_inizio DESC
            `, [meccanicoId]);
            
            const riparazioniCompletate = await db.all(`
                SELECT r.*, c.nome, c.cognome, c.telefono, c.email, v.marca, v.modello, v.anno, v.targa
                FROM riparazioni r
                JOIN clienti c ON r.id_cliente = c.id
                LEFT JOIN veicoli v ON r.id_veicolo = v.id
                WHERE r.id_meccanico = ? AND r.stato = 'completata'
                ORDER BY r.data_completamento DESC
                LIMIT 10
            `, [meccanicoId]);
            
            // Calcola statistiche mensili
            const dataInizio = new Date();
            dataInizio.setMonth(dataInizio.getMonth() - 1);
            const statisticheMensili = await db.get(`
                SELECT 
                    COUNT(*) as totale_riparazioni,
                    SUM(CASE WHEN r.stato = 'completata' THEN 1 ELSE 0 END) as completate,
                    AVG(CASE WHEN r.stato = 'completata' THEN r.costo ELSE NULL END) as guadagno_medio,
                    SUM(CASE WHEN r.stato = 'completata' THEN r.costo ELSE 0 END) as guadagno_totale
                FROM riparazioni r
                WHERE r.id_meccanico = ? AND r.data_richiesta >= ?
            `, [meccanicoId, dataInizio.toISOString()]);
            
            // Recupera recensioni recenti
            const recensioniRecenti = await db.all(`
                SELECT rec.*, c.nome, c.cognome, r.descrizione as riparazione_descrizione
                FROM recensioni rec
                JOIN clienti c ON rec.id_cliente = c.id
                LEFT JOIN riparazioni r ON rec.id_riparazione = r.id
                WHERE rec.id_meccanico = ?
                ORDER BY rec.data_recensione DESC
                LIMIT 5
            `, [meccanicoId]);

            // Recupera notifiche non lette
            const notifiche = await db.all(`
                SELECT * FROM notifiche 
                WHERE id_utente = ? AND tipo_utente = 'meccanico' AND letta = 0
                ORDER BY data_creazione DESC
                LIMIT 10
            `, [meccanicoId]);
            
            res.render('meccanico/dashboard_complete', {
                title: 'Dashboard Meccanico - MechFinder',
                active: 'dashboard',
                user: req.user,
                richiestePendenti,
                riparazioniInAttesa: richiestePendenti, // Alias per compatibilità template
                riparazioniAccettate,
                riparazioniInCorso,
                riparazioniCompletate,
                statisticheMensili: statisticheMensili || { 
                    totale_riparazioni: 0, 
                    completate: 0, 
                    guadagno_medio: 0, 
                    guadagno_totale: 0 
                },
                recensioniRecenti,
                notifiche,
                isMeccanico: true,
                isAuthenticated: true
            });
        } catch (error) {
            console.error('Errore nel caricamento dashboard meccanico:', error);
            req.flash('error', 'Errore nel caricamento della dashboard.');
            res.redirect('/');
        }
    },

    // Accetta una richiesta di riparazione
    accettaRichiesta: async (req, res) => {
        try {
            const { riparazione_id, descrizione_preventivo, costo_preventivo } = req.body;
            const meccanicoId = req.user.id;
            
            // Verifica che la riparazione sia ancora disponibile
            const riparazione = await db.get(
                'SELECT * FROM riparazioni WHERE id = ? AND stato = "in_attesa" AND id_meccanico IS NULL',
                [riparazione_id]
            );
            
            if (!riparazione) {
                return res.json({ success: false, message: 'Riparazione non più disponibile.' });
            }
            
            // Aggiorna la riparazione con preventivo
            await db.run(`
                UPDATE riparazioni 
                SET id_meccanico = ?, stato = 'accettata', data_accettamento = ?, 
                    descrizione_preventivo = ?, costo = ?
                WHERE id = ?
            `, [meccanicoId, new Date().toISOString(), descrizione_preventivo, costo_preventivo, riparazione_id]);
            
            // Crea notifica per il cliente
            await db.run(`
                INSERT INTO notifiche (id_utente, tipo_utente, titolo, messaggio, tipo_notifica, dati_extra)
                VALUES (?, 'cliente', 'Riparazione Accettata', 
                        'Un meccanico ha accettato la tua richiesta di riparazione. Preventivo: €${costo_preventivo}', 
                        'riparazione_accettata', ?)
            `, [riparazione.id_cliente, JSON.stringify({ riparazione_id, costo_preventivo })]);

            // Crea notifica per admin
            await db.run(`
                INSERT INTO notifiche (id_utente, tipo_utente, titolo, messaggio, tipo_notifica, dati_extra)
                VALUES (1, 'admin', 'Riparazione Accettata', 
                        'Riparazione #${riparazione_id} accettata da meccanico', 
                        'riparazione_accettata', ?)
            `, [JSON.stringify({ riparazione_id, meccanico_id: meccanicoId })]);
            
            res.json({ success: true, message: 'Richiesta accettata con successo!' });
        } catch (error) {
            console.error('Errore nell\'accettazione richiesta:', error);
            res.json({ success: false, message: 'Errore nell\'accettazione della richiesta.' });
        }
    },

    // Inizia una riparazione
    iniziaRiparazione: async (req, res) => {
        try {
            const { riparazione_id } = req.body;
            const meccanicoId = req.user.id;
            
            // Verifica che la riparazione appartenga al meccanico e sia accettata
            const riparazione = await db.get(
                'SELECT * FROM riparazioni WHERE id = ? AND id_meccanico = ? AND stato = "accettata"',
                [riparazione_id, meccanicoId]
            );
            
            if (!riparazione) {
                return res.json({ success: false, message: 'Riparazione non trovata o non autorizzata.' });
            }
            
            // Aggiorna stato a "in_corso"
            await db.run(
                'UPDATE riparazioni SET stato = "in_corso", data_inizio = ? WHERE id = ?',
                [new Date().toISOString(), riparazione_id]
            );
            
            // Crea notifica per il cliente
            await db.run(`
                INSERT INTO notifiche (id_utente, tipo_utente, titolo, messaggio, tipo_notifica, dati_extra)
                VALUES (?, 'cliente', 'Riparazione Iniziata', 
                        'Il meccanico ha iniziato a lavorare sulla tua riparazione', 
                        'riparazione_iniziata', ?)
            `, [riparazione.id_cliente, JSON.stringify({ riparazione_id })]);
            
            res.json({ success: true, message: 'Riparazione iniziata con successo!' });
        } catch (error) {
            console.error('Errore nell\'inizio riparazione:', error);
            res.json({ success: false, message: 'Errore nell\'inizio della riparazione.' });
        }
    },

    // Completa una riparazione
    completaRiparazione: async (req, res) => {
        try {
            const { riparazione_id, note_completamento, costo_finale } = req.body;
            const meccanicoId = req.user.id;
            
            // Verifica che la riparazione appartenga al meccanico e sia in corso
            const riparazione = await db.get(
                'SELECT * FROM riparazioni WHERE id = ? AND id_meccanico = ? AND stato = "in_corso"',
                [riparazione_id, meccanicoId]
            );
            
            if (!riparazione) {
                return res.json({ success: false, message: 'Riparazione non trovata o non autorizzata.' });
            }
            
            // Aggiorna stato a "completata"
            await db.run(`
                UPDATE riparazioni 
                SET stato = 'completata', data_completamento = ?, note = ?, costo = ?
                WHERE id = ?
            `, [new Date().toISOString(), note_completamento, costo_finale, riparazione_id]);
            
            // Genera PDF automaticamente
            const pdfPath = await meccanicoController.generaPDFRiparazione(riparazione_id);
            
            // Crea notifica per il cliente con link al PDF
            await db.run(`
                INSERT INTO notifiche (id_utente, tipo_utente, titolo, messaggio, tipo_notifica, dati_extra)
                VALUES (?, 'cliente', 'Riparazione Completata', 
                        'La tua riparazione è stata completata. Certificato disponibile per il download.', 
                        'riparazione_completata', ?)
            `, [riparazione.id_cliente, JSON.stringify({ riparazione_id, pdf_path: pdfPath })]);
            
            res.json({ success: true, message: 'Riparazione completata con successo!' });
        } catch (error) {
            console.error('Errore nel completamento riparazione:', error);
            res.json({ success: false, message: 'Errore nel completamento della riparazione.' });
        }
    },

    // Genera PDF per certificato riparazione
    generaPDFRiparazione: async (riparazioneId) => {
        try {
            // Recupera dati completi della riparazione
            const riparazione = await db.get(`
                SELECT r.*, c.nome, c.cognome, c.telefono, c.email, c.indirizzo,
                       m.nome as meccanico_nome, m.cognome as meccanico_cognome, 
                       m.nome_officina, m.telefono as meccanico_telefono,
                       v.marca, v.modello, v.anno, v.targa
                FROM riparazioni r
                JOIN clienti c ON r.id_cliente = c.id
                JOIN meccanici m ON r.id_meccanico = m.id
                LEFT JOIN veicoli v ON r.id_veicolo = v.id
                WHERE r.id = ?
            `, [riparazioneId]);
            
            if (!riparazione) {
                throw new Error('Riparazione non trovata');
            }
            
            // Crea directory se non esiste
            const pdfDir = path.join(__dirname, '../public/pdf');
            if (!fs.existsSync(pdfDir)) {
                fs.mkdirSync(pdfDir, { recursive: true });
            }
            
            const pdfPath = path.join(pdfDir, `riparazione_${riparazioneId}_${Date.now()}.pdf`);
            const doc = new PDFDocument();
            
            // Stream il PDF al file
            doc.pipe(fs.createWriteStream(pdfPath));
            
            // Header del documento
            doc.fontSize(20).text('CERTIFICATO DI RIPARAZIONE', 50, 50, { align: 'center' });
            doc.fontSize(12).text('MechFinder - Sistema di Gestione Riparazioni', 50, 80, { align: 'center' });
            
            // Linea separatrice
            doc.moveTo(50, 100).lineTo(550, 100).stroke();
            
            // Informazioni riparazione
            doc.fontSize(14).text('DETTAGLI RIPARAZIONE', 50, 120);
            doc.fontSize(10)
                .text(`ID Riparazione: #${riparazione.id}`, 50, 145)
                .text(`Data Completamento: ${new Date(riparazione.data_completamento).toLocaleDateString('it-IT')}`, 300, 145)
                .text(`Tipo: ${riparazione.tipo_riparazione || 'Non specificato'}`, 50, 165)
                .text(`Costo: €${parseFloat(riparazione.costo || 0).toFixed(2)}`, 300, 165);
            
            // Informazioni cliente
            doc.fontSize(14).text('CLIENTE', 50, 200);
            doc.fontSize(10)
                .text(`Nome: ${riparazione.nome} ${riparazione.cognome}`, 50, 225)
                .text(`Email: ${riparazione.email}`, 50, 245)
                .text(`Telefono: ${riparazione.telefono || 'Non fornito'}`, 300, 225);
            
            // Informazioni veicolo
            if (riparazione.marca) {
                doc.fontSize(14).text('VEICOLO', 50, 280);
                doc.fontSize(10)
                    .text(`Marca/Modello: ${riparazione.marca} ${riparazione.modello}`, 50, 305)
                    .text(`Anno: ${riparazione.anno || 'Non specificato'}`, 300, 305)
                    .text(`Targa: ${riparazione.targa || 'Non specificata'}`, 50, 325);
            }
            
            // Informazioni officina
            doc.fontSize(14).text('OFFICINA', 50, 360);
            doc.fontSize(10)
                .text(`Nome: ${riparazione.nome_officina}`, 50, 385)
                .text(`Meccanico: ${riparazione.meccanico_nome} ${riparazione.meccanico_cognome}`, 50, 405)
                .text(`Telefono: ${riparazione.meccanico_telefono || 'Non fornito'}`, 300, 385);
            
            // Descrizione lavori
            doc.fontSize(14).text('DESCRIZIONE LAVORI', 50, 440);
            doc.fontSize(10).text(riparazione.descrizione, 50, 465, { width: 500 });
            
            if (riparazione.note) {
                doc.fontSize(14).text('NOTE AGGIUNTIVE', 50, 520);
                doc.fontSize(10).text(riparazione.note, 50, 545, { width: 500 });
            }
            
            // Footer
            doc.fontSize(8)
                .text('Questo documento è stato generato automaticamente da MechFinder', 50, 700, { align: 'center' })
                .text(`Generato il: ${new Date().toLocaleDateString('it-IT')} alle ${new Date().toLocaleTimeString('it-IT')}`, 50, 715, { align: 'center' });
            
            doc.end();
            
            return `/pdf/${path.basename(pdfPath)}`;
        } catch (error) {
            console.error('Errore nella generazione PDF:', error);
            throw error;
        }
    },

    // Download PDF riparazione
    downloadPDF: async (req, res) => {
        try {
            const { riparazione_id } = req.params;
            const meccanicoId = req.user.id;
            
            // Verifica autorizzazione
            const riparazione = await db.get(
                'SELECT * FROM riparazioni WHERE id = ? AND id_meccanico = ? AND stato = "completata"',
                [riparazione_id, meccanicoId]
            );
            
            if (!riparazione) {
                req.flash('error', 'Riparazione non trovata o non autorizzata.');
                return res.redirect('/meccanico/dashboard');
            }
            
            // Genera o recupera PDF esistente
            const pdfPath = await meccanicoController.generaPDFRiparazione(riparazione_id);
            const fullPath = path.join(__dirname, '../public', pdfPath);
            
            if (!fs.existsSync(fullPath)) {
                req.flash('error', 'PDF non trovato.');
                return res.redirect('/meccanico/dashboard');
            }
            
            res.download(fullPath, `certificato_riparazione_${riparazione_id}.pdf`);
        } catch (error) {
            console.error('Errore nel download PDF:', error);
            req.flash('error', 'Errore nel download del PDF.');
            res.redirect('/meccanico/dashboard');
        }
    },

    // Visualizza tutte le recensioni
    getRecensioni: async (req, res) => {
        try {
            const meccanicoId = req.user.id;
            
            const recensioni = await db.all(`
                SELECT rec.*, c.nome, c.cognome, r.descrizione as riparazione_descrizione
                FROM recensioni rec
                JOIN clienti c ON rec.id_cliente = c.id
                LEFT JOIN riparazioni r ON rec.id_riparazione = r.id
                WHERE rec.id_meccanico = ?
                ORDER BY rec.data_recensione DESC
            `, [meccanicoId]);
            
            // Calcola statistiche recensioni
            const stats = await db.get(`
                SELECT 
                    COUNT(*) as totale,
                    AVG(valutazione) as media,
                    COUNT(CASE WHEN valutazione = 5 THEN 1 END) as cinque_stelle,
                    COUNT(CASE WHEN valutazione = 4 THEN 1 END) as quattro_stelle,
                    COUNT(CASE WHEN valutazione = 3 THEN 1 END) as tre_stelle,
                    COUNT(CASE WHEN valutazione = 2 THEN 1 END) as due_stelle,
                    COUNT(CASE WHEN valutazione = 1 THEN 1 END) as una_stella
                FROM recensioni 
                WHERE id_meccanico = ?
            `, [meccanicoId]);
            
            res.json({
                success: true,
                recensioni,
                stats: stats || { totale: 0, media: 0, cinque_stelle: 0, quattro_stelle: 0, tre_stelle: 0, due_stelle: 0, una_stella: 0 }
            });
        } catch (error) {
            console.error('Errore nel caricamento recensioni:', error);
            req.flash('error', 'Errore nel caricamento delle recensioni.');
            res.redirect('/meccanico/dashboard');
        }
    },

    // Visualizza tutte le riparazioni
    getTutteRiparazioni: async (req, res) => {
        try {
            const meccanicoId = req.user.id;
            
            const riparazioni = await db.all(`
                SELECT r.*, 
                       c.nome as cliente_nome, c.cognome as cliente_cognome,
                       v.marca, v.modello, v.anno, v.targa
                FROM riparazioni r
                JOIN clienti c ON r.id_cliente = c.id
                LEFT JOIN veicoli v ON r.id_veicolo = v.id
                WHERE r.id_meccanico = ?
                ORDER BY r.data_richiesta DESC
            `, [meccanicoId]);
            
            // Calcola statistiche riparazioni
            const stats = await db.get(`
                SELECT 
                    COUNT(*) as totale,
                    COUNT(CASE WHEN stato = 'in_attesa' THEN 1 END) as in_attesa,
                    COUNT(CASE WHEN stato = 'accettata' THEN 1 END) as accettate,
                    COUNT(CASE WHEN stato = 'in_corso' THEN 1 END) as in_corso,
                    COUNT(CASE WHEN stato = 'completata' THEN 1 END) as completate,
                    SUM(CASE WHEN costo IS NOT NULL THEN costo ELSE 0 END) as fatturato_totale
                FROM riparazioni 
                WHERE id_meccanico = ?
            `, [meccanicoId]);
            
            res.json({
                success: true,
                riparazioni,
                stats: stats || { totale: 0, in_attesa: 0, accettate: 0, in_corso: 0, completate: 0, fatturato_totale: 0 }
            });
        } catch (error) {
            console.error('Errore nel caricamento riparazioni:', error);
            res.json({
                success: false,
                message: 'Errore nel caricamento delle riparazioni'
            });
        }
    },

    // Aggiorna profilo meccanico
    aggiornaProfilo: async (req, res) => {
        try {
            const meccanicoId = req.user.id;
            const { nome, cognome, nome_officina, telefono, indirizzo, citta, cap, descrizione } = req.body;
            
            await db.run(`
                UPDATE meccanici 
                SET nome = ?, cognome = ?, nome_officina = ?, telefono = ?, 
                    indirizzo = ?, citta = ?, cap = ?, descrizione = ?
                WHERE id = ?
            `, [nome, cognome, nome_officina, telefono, indirizzo, citta, cap, descrizione, meccanicoId]);
            
            req.flash('success', 'Profilo aggiornato con successo!');
            res.redirect('/meccanico/dashboard');
        } catch (error) {
            console.error('Errore nell\'aggiornamento profilo:', error);
            req.flash('error', 'Errore nell\'aggiornamento del profilo.');
            res.redirect('/meccanico/dashboard');
        }
    },

    // Gestione notifiche
    getNotifiche: async (req, res) => {
        try {
            const meccanicoId = req.user.id;
            
            const notifiche = await db.all(`
                SELECT * FROM notifiche 
                WHERE id_utente = ? AND tipo_utente = 'meccanico'
                ORDER BY data_creazione DESC
                LIMIT 50
            `, [meccanicoId]);
            
            res.json({ success: true, notifiche });
        } catch (error) {
            console.error('Errore nel recupero notifiche:', error);
            res.json({ success: false, message: 'Errore nel recupero delle notifiche.' });
        }
    },

    // Segna notifica come letta
    segnaNotificaLetta: async (req, res) => {
        try {
            const { notifica_id } = req.params;
            const meccanicoId = req.user.id;
            
            await db.run(
                'UPDATE notifiche SET letta = 1 WHERE id = ? AND id_utente = ? AND tipo_utente = "meccanico"',
                [notifica_id, meccanicoId]
            );
            
            res.json({ success: true });
        } catch (error) {
            console.error('Errore nell\'aggiornamento notifica:', error);
            res.json({ success: false, message: 'Errore nell\'aggiornamento della notifica.' });
        }
    },

    // Visualizza profilo meccanico
    getProfilo: async (req, res) => {
        try {
            const meccanicoId = req.user.id;
            
            // Recupera dati completi del meccanico
            const meccanico = await db.get('SELECT * FROM meccanici WHERE id = ?', [meccanicoId]);
            
            // Recupera statistiche 
            const statistiche = await db.get(`
                SELECT 
                    COUNT(*) as totale_riparazioni,
                    SUM(CASE WHEN stato = 'completata' THEN 1 ELSE 0 END) as completate,
                    AVG(CASE WHEN stato = 'completata' THEN costo ELSE NULL END) as guadagno_medio,
                    SUM(CASE WHEN stato = 'completata' THEN costo ELSE 0 END) as guadagno_totale
                FROM riparazioni WHERE id_meccanico = ?
            `, [meccanicoId]);

            // Recupera recensioni per il calcolo della valutazione
            const recensioni = await db.all(`
                SELECT valutazione FROM recensioni WHERE id_meccanico = ?
            `, [meccanicoId]);

            const valutazioneMedia = recensioni.length > 0 
                ? recensioni.reduce((sum, r) => sum + r.valutazione, 0) / recensioni.length 
                : 0;

            res.render('meccanico/dashboard_complete', {
                title: 'Profilo Meccanico - MechFinder',
                active: 'profilo',
                user: req.user,
                meccanico,
                statistiche: statistiche || { 
                    totale_riparazioni: 0, 
                    completate: 0, 
                    guadagno_medio: 0, 
                    guadagno_totale: 0 
                },
                valutazioneMedia: valutazioneMedia.toFixed(1),
                numeroRecensioni: recensioni.length,
                showProfiloModal: true,
                isMeccanico: true,
                isAuthenticated: true
            });
        } catch (error) {
            console.error('Errore nel caricamento profilo:', error);
            req.flash('error', 'Errore nel caricamento del profilo.');
            res.redirect('/meccanico/dashboard');
        }
    }
};

module.exports = meccanicoController;