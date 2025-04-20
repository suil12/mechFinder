"use strict";

/**
 * Script per popolare il database con dati iniziali
 * Esegui con: node database/seed.js
 */

const db = require('./db');
const bcrypt = require('bcrypt');

async function seed() {
    console.log('Inizializzazione del database con dati di esempio...');
    
    try {
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
                    indirizzo, citta, cap, descrizione, valutazione, numero_recensioni, verificato
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    meccanico.nome, meccanico.cognome, meccanico.nome_officina, meccanico.specializzazione,
                    meccanico.email, meccanico.password, meccanico.telefono, meccanico.indirizzo,
                    meccanico.citta, meccanico.cap, meccanico.descrizione, meccanico.valutazione,
                    meccanico.numero_recensioni, 1 // tutti verificati
                ]
            );
        }
        console.log('Meccanici inseriti.');
        
        // 3. Inserisci clienti di esempio
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
                    nome, cognome, email, password, telefono, indirizzo, citta, cap
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    cliente.nome, cliente.cognome, cliente.email, cliente.password,
                    cliente.telefono, cliente.indirizzo, cliente.citta, cliente.cap
                ]
            );
        }
        console.log('Clienti inseriti.');
        
        // 4. Inserisci veicoli di esempio
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
        
        // 5. Inserisci riparazioni di esempio
        console.log('Inserimento riparazioni...');
        // Elimina le riparazioni esistenti
        await db.run('DELETE FROM riparazioni');
        console.log('Tabella riparazioni svuotata.');
        
        // Ottieni gli ID dei meccanici
        const meccaniciIds = await db.query('SELECT id FROM meccanici');
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
                
                await db.run(
                    `INSERT INTO riparazioni (
                        id_cliente, id_meccanico, id_veicolo, descrizione, 
                        tipo_problema, stato, data_richiesta
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        clientiIds[i].id, 
                        meccaniciIds[j].id, 
                        veicoloCliente.id,
                        problema,
                        'Meccanica', // Tipo problema generico
                        stato,
                        dataRichiesta.toISOString()
                    ]
                );
            }
        }
        console.log('Riparazioni inserite.');
        
        // 6. Inserisci recensioni di esempio
        console.log('Inserimento recensioni...');
        // Elimina le recensioni esistenti
        await db.run('DELETE FROM recensioni');
        console.log('Tabella recensioni svuotata.');
        
        const commenti = [
            'Ottimo servizio, molto professionale.',
            'Lavoro eseguito in tempi rapidi e a un prezzo ragionevole.',
            'Personale cordiale e competente.',
            'Ho trovato finalmente un meccanico di fiducia!',
            'Riparazione fatta correttamente al primo tentativo.',
            'Prezzi un po\' alti ma il lavoro è stato fatto bene.',
            'Consigliatissimo per chi cerca professionalità.',
            'Mi hanno risolto un problema che altri non avevano individuato.'
        ];
        
        // Ottieni le riparazioni completate
        const riparazioni = await db.query('SELECT id, id_cliente, id_meccanico FROM riparazioni WHERE stato = ?', ['completata']);
        
        // Crea recensioni per riparazioni completate
        for (const riparazione of riparazioni) {
            const valutazione = Math.floor(Math.random() * 3) + 3; // Valutazione da 3 a 5
            const commento = commenti[Math.floor(Math.random() * commenti.length)];
            
            await db.run(
                `INSERT INTO recensioni (
                    id_cliente, id_meccanico, id_riparazione, valutazione, commento
                ) VALUES (?, ?, ?, ?, ?)`,
                [
                    riparazione.id_cliente,
                    riparazione.id_meccanico,
                    riparazione.id,
                    valutazione,
                    commento
                ]
            );
        }
        
        // Aggiorna le valutazioni medie dei meccanici
        for (const meccanico of meccaniciIds) {
            const recensioni = await db.query('SELECT AVG(valutazione) as media, COUNT(*) as totale FROM recensioni WHERE id_meccanico = ?', [meccanico.id]);
            if (recensioni[0].totale > 0) {
                await db.run(
                    'UPDATE meccanici SET valutazione = ?, numero_recensioni = ? WHERE id = ?',
                    [recensioni[0].media, recensioni[0].totale, meccanico.id]
                );
            }
        }
        console.log('Recensioni inserite.');
        
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