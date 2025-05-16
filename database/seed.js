"use strict";

/**
 * Script per popolare il database con dati iniziali
 * Esegui con: node database/seed.js
 */

const db = require('./db');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

async function seed() {
    console.log('Inizializzazione del database con dati di esempio...');
    
    try {
        // Leggi lo schema SQL
        console.log('Creazione schema del database...');
        const schemaSQL = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
        
        // Divide lo schema in singole istruzioni SQL
        const sqlStatements = schemaSQL
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0);
        
        // Esegui ogni istruzione SQL separatamente
        for (const stmt of sqlStatements) {
            await db.run(stmt + ';');
        }
        
        console.log('Schema creato con successo.');
        
        // Resto del codice...
        // Funzione per l'hashing delle password
        async function hashPassword(password) {
            const saltRounds = 10;
            return await bcrypt.hash(password, saltRounds);
        }
        
        // Password di default per tutti gli utenti di test
        const defaultPassword = await hashPassword('password123');
        
        // 1. Inserisci i servizi
        console.log('Inserimento servizi...');
        const servizi = [
            { nome: 'Elettronica', descrizione: 'Riparazioni elettroniche e diagnostica', icona: 'elettronica.jpg' },
            { nome: 'Meccanica Generale', descrizione: 'Riparazioni di motore e parti meccaniche', icona: 'meccanicagen.webp' },
            { nome: 'Revisioni', descrizione: 'Controlli tecnici e revisioni periodiche', icona: 'revisioni.jpg' },
            { nome: 'Tagliandi', descrizione: 'Manutenzione ordinaria e tagliandi', icona: 'meccanico3.png' },
            { nome: 'Cambio Gomme', descrizione: 'Sostituzione e bilanciatura pneumatici', icona: 'gomme.jpeg' },
            { nome: 'Carrozzeria', descrizione: 'Riparazioni di carrozzeria e verniciatura', icona: 'carrozzeria.jpg' }
        ];
        
        // Elimina i servizi esistenti
        await db.run('DELETE FROM servizi');
        console.log('Tabella servizi svuotata.');
        
        // Inserisci i nuovi servizi
        for (const servizio of servizi) {
            await db.run(
                'INSERT INTO servizi (nome, descrizione, icona) VALUES (?, ?, ?)',
                [servizio.nome, servizio.descrizione, servizio.icona]
            );
        }
        console.log('Servizi inseriti.');
        
        // 2. Inserisci meccanici di esempio
        console.log('Inserimento meccanici...');
        // Elimina i meccanici esistenti
        await db.run('DELETE FROM meccanici');
        console.log('Tabella meccanici svuotata.');
        
        const meccanici = [
            {
                nome: 'Mario', 
                cognome: 'Rossi', 
                nome_officina: 'Officina Rossi',
                specializzazione: 'Meccanica Generale',
                email: 'mario@esempio.it',
                password: defaultPassword,
                telefono: '3394567890',
                indirizzo: 'Via Roma 123',
                citta: 'Milano',
                cap: '20100',
                descrizione: 'Specializzato in riparazioni di auto di tutte le marche, con oltre 20 anni di esperienza.',
                valutazione: 4.8,
                numero_recensioni: 24
            },
            {
                nome: 'Giuseppe', 
                cognome: 'Verdi', 
                nome_officina: 'Autofficina Verdi',
                specializzazione: 'Elettronica',
                email: 'giuseppe@esempio.it',
                password: defaultPassword,
                telefono: '3381234567',
                indirizzo: 'Via Torino 45',
                citta: 'Roma',
                cap: '00100',
                descrizione: 'Esperto in diagnostica elettronica e riparazioni centraline di nuova generazione.',
                valutazione: 4.5,
                numero_recensioni: 18
            },
            {
                nome: 'Luigi', 
                cognome: 'Bianchi', 
                nome_officina: 'Gomme & Tagliandi',
                specializzazione: 'Cambio Gomme',
                email: 'luigi@esempio.it',
                password: defaultPassword,
                telefono: '3409876543',
                indirizzo: 'Corso Vittorio 78',
                citta: 'Torino',
                cap: '10100',
                descrizione: 'Specializzato in pneumatici di tutte le marche, estate e inverno.',
                valutazione: 4.2,
                numero_recensioni: 15
            },
            {
                nome: 'Antonio', 
                cognome: 'Ferrari', 
                nome_officina: 'Carrozzeria Ferrari',
                specializzazione: 'Carrozzeria',
                email: 'antonio@esempio.it',
                password: defaultPassword,
                telefono: '3358765432',
                indirizzo: 'Via Mazzini 34',
                citta: 'Napoli',
                cap: '80100',
                descrizione: 'Carrozzieri da tre generazioni, con esperienza su auto di lusso e d\'epoca.',
                valutazione: 4.9,
                numero_recensioni: 32
            },
            {
                nome: 'Francesco', 
                cognome: 'Esposito', 
                nome_officina: 'Revisioni Express',
                specializzazione: 'Revisioni',
                email: 'francesco@esempio.it',
                password: defaultPassword,
                telefono: '3332345678',
                indirizzo: 'Corso Garibaldi 90',
                citta: 'Firenze',
                cap: '50100',
                descrizione: 'Centro specializzato in revisioni auto e moto, con strumentazione all\'avanguardia.',
                valutazione: 4.4,
                numero_recensioni: 21
            }
        ];
        
        for (const meccanico of meccanici) {
            await db.run(
                `INSERT INTO meccanici (
                    nome, cognome, nome_officina, specializzazione, email, password, telefono, 
                    indirizzo, citta, cap, descrizione, valutazione, numero_recensioni, verificato, tipo
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    meccanico.nome, 
                    meccanico.cognome, 
                    meccanico.nome_officina, 
                    meccanico.specializzazione,
                    meccanico.email, 
                    meccanico.password, 
                    meccanico.telefono, 
                    meccanico.indirizzo,
                    meccanico.citta, 
                    meccanico.cap, 
                    meccanico.descrizione, 
                    meccanico.valutazione,
                    meccanico.numero_recensioni, 
                    1, // tutti verificati
                    'meccanico' // tipo
                ]
            );
        }
        console.log('Meccanici inseriti.');
        
        // Resto del codice identico...
        
        // 3. Inserisci orari meccanici
        console.log('Inserimento orari meccanici...');
        // Elimina gli orari esistenti
        await db.run('DELETE FROM orari_meccanici');
        console.log('Tabella orari_meccanici svuotata.');
        
        // Ottieni gli ID dei meccanici inseriti
        const meccaniciIds = await db.query('SELECT id FROM meccanici');
        
        // Crea orari standard per tutti i meccanici
        for (const meccanico of meccaniciIds) {
            for (let giorno = 0; giorno < 7; giorno++) {
                // Giorni 0-4 (lunedì-venerdì): aperti
                // Giorni 5 (sabato): aperto mezza giornata
                // Giorni 6 (domenica): chiuso
                
                if (giorno <= 4) {
                    // Lunedì-Venerdì: 8:30-12:30, 14:30-18:30
                    await db.run(
                        `INSERT INTO orari_meccanici (id_meccanico, giorno, apertura, chiusura, pausa_inizio, pausa_fine, chiuso)
                         VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [meccanico.id, giorno, '08:30', '18:30', '12:30', '14:30', 0]
                    );
                } else if (giorno === 5) {
                    // Sabato: 8:30-12:30, chiuso pomeriggio
                    await db.run(
                        `INSERT INTO orari_meccanici (id_meccanico, giorno, apertura, chiusura, pausa_inizio, pausa_fine, chiuso)
                         VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [meccanico.id, giorno, '08:30', '12:30', null, null, 0]
                    );
                } else {
                    // Domenica: chiuso
                    await db.run(
                        `INSERT INTO orari_meccanici (id_meccanico, giorno, apertura, chiusura, pausa_inizio, pausa_fine, chiuso)
                         VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [meccanico.id, giorno, null, null, null, null, 1]
                    );
                }
            }
        }
        console.log('Orari meccanici inseriti.');
        // 4. Inserisci servizi-meccanici
        console.log('Inserimento relazioni servizi-meccanici...');
        // Elimina le relazioni esistenti
        await db.run('DELETE FROM servizi_meccanici');
        console.log('Tabella servizi_meccanici svuotata.');
        
        // Ottieni gli ID dei servizi
        const serviziIds = await db.query('SELECT id, nome FROM servizi');
        
        // Associa servizi ai meccanici
        for (const meccanico of meccaniciIds) {
            // Ogni meccanico offre 3-5 servizi
            const numServizi = Math.floor(Math.random() * 3) + 3; // 3, 4 o 5 servizi
            const serviziDisponibili = [...serviziIds];
            
            for (let i = 0; i < numServizi && serviziDisponibili.length > 0; i++) {
                // Seleziona un servizio casuale
                const randomIndex = Math.floor(Math.random() * serviziDisponibili.length);
                const servizio = serviziDisponibili.splice(randomIndex, 1)[0];
                
                // Prezzo casuale tra 50 e 200 euro
                const prezzo = Math.floor(Math.random() * 151) + 50;
                
                await db.run(
                    `INSERT INTO servizi_meccanici (id_meccanico, id_servizio, prezzo, attivo)
                     VALUES (?, ?, ?, ?)`,
                    [meccanico.id, servizio.id, prezzo, 1]
                );
            }
        }
        console.log('Relazioni servizi-meccanici inserite.');
        
        // 5. Inserisci clienti di esempio
        console.log('Inserimento clienti...');
        // Elimina i clienti esistenti
        await db.run('DELETE FROM clienti');
        console.log('Tabella clienti svuotata.');
        
        const clienti = [
            {
                nome: 'Marco',
                cognome: 'Rossi',
                email: 'marco@esempio.it',
                password: defaultPassword,
                telefono: '3336789012',
                indirizzo: 'Via Veneto 12',
                citta: 'Milano',
                cap: '20100'
            },
            {
                nome: 'Laura',
                cognome: 'Bianchi',
                email: 'laura@esempio.it',
                password: defaultPassword,
                telefono: '3398765432',
                indirizzo: 'Via Roma 56',
                citta: 'Roma',
                cap: '00100'
            },
            {
                nome: 'Giovanni',
                cognome: 'Verdi',
                email: 'giovanni@esempio.it',
                password: defaultPassword,
                telefono: '3351234567',
                indirizzo: 'Corso Nazionale 78',
                citta: 'Torino',
                cap: '10100'
            }
        ];
        
        for (const cliente of clienti) {
            await db.run(
                `INSERT INTO clienti (
                    nome, cognome, email, password, telefono, indirizzo, citta, cap, tipo
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    cliente.nome, 
                    cliente.cognome, 
                    cliente.email, 
                    cliente.password,
                    cliente.telefono, 
                    cliente.indirizzo, 
                    cliente.citta, 
                    cliente.cap, 
                    'cliente'
                ]
            );
        }
        console.log('Clienti inseriti.');
        
        // 6. Inserisci admin di default
        console.log('Inserimento admin...');
        await db.run('DELETE FROM admin');
        console.log('Tabella admin svuotata.');
        
        const adminPassword = await hashPassword('admin123');
        await db.run(
            `INSERT INTO admin (nome, email, password, tipo)
             VALUES (?, ?, ?, ?)`,
            ['Admin', 'admin@mechfinder.it', adminPassword, 'admin']
        );
        console.log('Admin inserito.');
        
        // 7. Inserisci veicoli di esempio
        console.log('Inserimento veicoli...');
        // Elimina i veicoli esistenti
        await db.run('DELETE FROM veicoli');
        console.log('Tabella veicoli svuotata.');
        
        // Ottieni gli ID dei clienti
        const clientiIds = await db.query('SELECT id FROM clienti');
        
        const veicoli = [
            {
                id_cliente: clientiIds[0].id,
                marca: 'Fiat',
                modello: 'Panda',
                anno: 2018,
                targa: 'AB123CD',
                tipo: 'auto'
            },
            {
                id_cliente: clientiIds[0].id,
                marca: 'Honda',
                modello: 'CBR 600',
                anno: 2019,
                targa: 'XY45678',
                tipo: 'moto'
            },
            {
                id_cliente: clientiIds[1].id,
                marca: 'Volkswagen',
                modello: 'Golf',
                anno: 2020,
                targa: 'EF456GH',
                tipo: 'auto'
            },
            {
                id_cliente: clientiIds[2].id,
                marca: 'Ford',
                modello: 'Focus',
                anno: 2017,
                targa: 'IJ789KL',
                tipo: 'auto'
            }
        ];
        
        for (const veicolo of veicoli) {
            await db.run(
                'INSERT INTO veicoli (id_cliente, marca, modello, anno, targa, tipo) VALUES (?, ?, ?, ?, ?, ?)',
                [veicolo.id_cliente, veicolo.marca, veicolo.modello, veicolo.anno, veicolo.targa, veicolo.tipo]
            );
        }
        console.log('Veicoli inseriti.');
        
        // 8. Inserisci riparazioni di esempio
        console.log('Inserimento riparazioni...');
        // Elimina le riparazioni esistenti
        await db.run('DELETE FROM riparazioni');
        console.log('Tabella riparazioni svuotata.');
        
        // Ottieni gli ID dei veicoli
        const veicoliIds = await db.query('SELECT id, id_cliente FROM veicoli');
        
        const stati = ['richiesta', 'preventivo', 'accettata', 'in_corso', 'completata', 'rifiutata'];
        const problemi = [
            'Il motore fa un rumore strano',
            'L\'auto non parte',
            'Cambio dell\'olio e filtri',
            'Problemi con l\'impianto elettrico',
            'Controllo generale prima di un viaggio',
            'Rumore dalle sospensioni',
            'Cambio gomme stagionale',
            'Problema con l\'aria condizionata'
        ];
        
        // Elimina commenti e recensioni
        await db.run('DELETE FROM commenti');
        await db.run('DELETE FROM recensioni');
        console.log('Tabelle commenti e recensioni svuotate.');
        
        // Crea alcune riparazioni per ogni combinazione cliente-meccanico
        for (let i = 0; i < clientiIds.length; i++) {
            for (let j = 0; j < Math.min(3, meccaniciIds.length); j++) {
                // Trova un veicolo per questo cliente
                const veicoloCliente = veicoliIds.find(v => v.id_cliente === clientiIds[i].id);
                if (!veicoloCliente) continue;
                
                // Seleziona alcuni stati a caso per le riparazioni
                const stato = stati[Math.floor(Math.random() * stati.length)];
                const problema = problemi[Math.floor(Math.random() * problemi.length)];
                
                // Data casuale negli ultimi 30 giorni
                const dataRichiesta = new Date();
                dataRichiesta.setDate(dataRichiesta.getDate() - Math.floor(Math.random() * 30));
                
                // Costo casuale per riparazioni completate
                const costo = stato === 'completata' ? Math.floor(Math.random() * 401) + 100 : null;
                const dataCompletamento = stato === 'completata' ? new Date(dataRichiesta.getTime() + (Math.random() * 604800000)) : null; // Fino a 7 giorni dopo
                
                // Data inizio per le riparazioni in corso/completate
                const dataInizio = (stato === 'in_corso' || stato === 'completata') ? new Date(dataRichiesta.getTime() + (Math.random() * 172800000)) : null; // Fino a 2 giorni dopo
                
                const result = await db.run(
                    `INSERT INTO riparazioni (
                        id_cliente, id_meccanico, id_veicolo, descrizione, 
                        tipo_problema, stato, data_richiesta, data_inizio, data_completamento, costo
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        clientiIds[i].id, 
                        meccaniciIds[j].id, 
                        veicoloCliente.id,
                        problema,
                        'Meccanica', // Tipo problema generico
                        stato,
                        dataRichiesta.toISOString(),
                        dataInizio ? dataInizio.toISOString() : null,
                        dataCompletamento ? dataCompletamento.toISOString() : null,
                        costo
                    ]
                );
                
                // Inserisci alcuni commenti per questa riparazione
                if (result && result.lastID) {
                    // Primo commento dal cliente (creazione richiesta)
                    await db.run(
                        `INSERT INTO commenti (id_riparazione, id_utente, tipo_utente, messaggio, data_creazione, automatico)
                         VALUES (?, ?, ?, ?, ?, ?)`,
                        [result.lastID, clientiIds[i].id, 'cliente', 'Ho bisogno di assistenza per questo problema.', dataRichiesta.toISOString(), 0]
                    );
                    
                    // Se lo stato è oltre "richiesta", aggiungi una risposta dal meccanico
                    if (stato !== 'richiesta') {
                        const dataMeccanico = new Date(dataRichiesta.getTime() + 86400000); // 1 giorno dopo
                        await db.run(
                            `INSERT INTO commenti (id_riparazione, id_utente, tipo_utente, messaggio, data_creazione, automatico)
                             VALUES (?, ?, ?, ?, ?, ?)`,
                            [result.lastID, meccaniciIds[j].id, 'meccanico', 'Possiamo aiutarti. Ti preparerò un preventivo al più presto.', dataMeccanico.toISOString(), 0]
                        );
                    }
                    
                    // Se lo stato è "completata", aggiungi un messaggio di conclusione
                    if (stato === 'completata') {
                        await db.run(
                            `INSERT INTO commenti (id_riparazione, id_utente, tipo_utente, messaggio, data_creazione, automatico)
                             VALUES (?, ?, ?, ?, ?, ?)`,
                            [result.lastID, meccaniciIds[j].id, 'meccanico', 'La riparazione è stata completata con successo.', dataCompletamento.toISOString(), 1]
                        );
                    }
                }
                
                // Se lo stato è "completata", aggiungi una recensione
                if (stato === 'completata') {
                    // Valutazione casuale 3-5 stelle
                    const valutazione = Math.floor(Math.random() * 3) + 3;
                    const commentiRecensione = [
                        'Ottimo servizio, molto professionale.',
                        'Lavoro eseguito in tempi rapidi e a un prezzo ragionevole.',
                        'Personale cordiale e competente.',
                        'Ho trovato finalmente un meccanico di fiducia!',
                        'Riparazione fatta correttamente al primo tentativo.'
                    ];
                    const commento = commentiRecensione[Math.floor(Math.random() * commentiRecensione.length)];
                    
                    // Data recensione (poco dopo il completamento)
                    const dataRecensione = new Date(dataCompletamento.getTime() + 86400000); // 1 giorno dopo
                    
                    await db.run(
                        `INSERT INTO recensioni (id_cliente, id_meccanico, id_riparazione, valutazione, commento, data_recensione)
                         VALUES (?, ?, ?, ?, ?, ?)`,
                        [clientiIds[i].id, meccaniciIds[j].id, result.lastID, valutazione, commento, dataRecensione.toISOString()]
                    );
                }
            }
        }
        console.log('Riparazioni, commenti e recensioni inseriti.');
        
        // 9. Aggiorna le medie delle valutazioni dei meccanici
        console.log('Aggiornamento valutazioni meccanici...');
        for (const meccanico of meccaniciIds) {
            const recensioni = await db.get(
                'SELECT AVG(valutazione) as media, COUNT(*) as totale FROM recensioni WHERE id_meccanico = ?',
                [meccanico.id]
            );
            
            if (recensioni && recensioni.totale > 0) {
                await db.run(
                    'UPDATE meccanici SET valutazione = ?, numero_recensioni = ? WHERE id = ?',
                    [recensioni.media || 0, recensioni.totale || 0, meccanico.id]
                );
            }
        }
        console.log('Valutazioni meccanici aggiornate.');
        
        console.log('Popolamento del database completato con successo!');
    } catch (error) {
        console.error('Errore durante il popolamento del database:', error);
    } finally {
        // Chiudi la connessione al database
        await db.close();
    }
}

// Esegui la funzione di seed
seed();