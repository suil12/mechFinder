"use strict";

// processo di seeding del db, facilita gestione in env di svilupo

const db = require('./db');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

async function seed() {
    console.log('Inizializzazione del database con dati di esempio...');
    
    try {
        // lettura schema db
        console.log('Creazione schema del database...');
        const schemaSQL = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
        
        // divide schema in istruzioni SQL
        const sqlStatements = schemaSQL
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0);
        
        // eseguo ogni istruzione SQL separatamente
        for (const stmt of sqlStatements) {
            await db.run(stmt + ';');
        }
        
        console.log('Schema creato con successo.');
        

        // gestione hashing  password
        async function hashPassword(password) {
            const saltRounds = 10;
            return await bcrypt.hash(password, saltRounds);
        }
        
        // password di default in sviluppo, da spostare poi in env
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
        
        // droppo i servizi esistenti
        await db.run('DELETE FROM servizi');
        console.log('Tabella servizi svuotata.');
        
        // insert nuovi servizi
        for (const servizio of servizi) {
            await db.run(
                'INSERT INTO servizi (nome, descrizione, icona) VALUES (?, ?, ?)',
                [servizio.nome, servizio.descrizione, servizio.icona]
            );
        }
        console.log('Servizi inseriti.');
        
        // 2. Inserisci meccanici di esempio
        console.log('Inserimento meccanici...');
        // droppo i meccanici esistenti
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
                numero_recensioni: 24,
                avatar: '/media/img/meccanico.jpeg'
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
                numero_recensioni: 18,
                avatar: '/media/img/meccanico1.jpeg'
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
                numero_recensioni: 15,
                avatar: '/media/img/meccanico2.png'
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
                numero_recensioni: 32,
                avatar: '/media/img/meccanico3.png'
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
                numero_recensioni: 21,
                avatar: '/media/img/default_mechanic.png'
            }
        ];
        
        for (const meccanico of meccanici) {
            await db.run(
                `INSERT INTO meccanici (
                    nome, cognome, nome_officina, specializzazione, email, password, telefono, 
                    indirizzo, citta, cap, descrizione, valutazione, numero_recensioni, verificato, tipo, avatar
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
                    1, 
                    'meccanico',
                    meccanico.avatar 
                ]
            );
        }
        console.log('Meccanici inseriti.');
        
        
        // 3. Inserisci orari meccanici
        console.log('Inserimento orari meccanici...');
        // solito drop
        await db.run('DELETE FROM orari_meccanici');
        console.log('Tabella orari_meccanici svuotata.');
        
        // recupero ID dei meccanici inseriti
        const meccaniciIds = await db.query('SELECT id FROM meccanici');
        
        // orari standard per tutti i meccanici
        for (const meccanico of meccaniciIds) {
            for (let giorno = 0; giorno < 7; giorno++) {

                
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

        await db.run('DELETE FROM servizi_meccanici');
        console.log('Tabella servizi_meccanici svuotata.');
        
  
        const serviziIds = await db.query('SELECT id, nome FROM servizi');
        
        // Associa servizi ai meccanici
        for (const meccanico of meccaniciIds) {
            // ad  meccanico genero un numero random di servizi, tra 3 e 6
            const numServizi = Math.floor(Math.random() * 3) + 3; 
            const serviziDisponibili = [...serviziIds];
            
            for (let i = 0; i < numServizi && serviziDisponibili.length > 0; i++) {
                // selezione casuale dai servizi
                const randomIndex = Math.floor(Math.random() * serviziDisponibili.length);
                const servizio = serviziDisponibili.splice(randomIndex, 1)[0];
                
                // Prezzo lo genero anche casuale tra i 50 e 200
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
    // droppo esistenti
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
                cap: '20100',
                avatar: '/media/img/default_mechanic.png'
            },
            {
                nome: 'Laura',
                cognome: 'Bianchi',
                email: 'laura@esempio.it',
                password: defaultPassword,
                telefono: '3398765432',
                indirizzo: 'Via Roma 56',
                citta: 'Roma',
                cap: '00100',
                avatar: '/media/img/default_mechanic.png'
            },
            {
                nome: 'Giovanni',
                cognome: 'Verdi',
                email: 'giovanni@esempio.it',
                password: defaultPassword,
                telefono: '3351234567',
                indirizzo: 'Corso Nazionale 78',
                citta: 'Torino',
                cap: '10100',
                avatar: '/media/img/default_mechanic.png'
            }
        ];
        
        for (const cliente of clienti) {
            await db.run(
                `INSERT INTO clienti (
                    nome, cognome, email, password, telefono, indirizzo, citta, cap, tipo, avatar
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    cliente.nome, 
                    cliente.cognome, 
                    cliente.email, 
                    cliente.password,
                    cliente.telefono, 
                    cliente.indirizzo, 
                    cliente.citta, 
                    cliente.cap, 
                    'cliente',
                    cliente.avatar
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
            `INSERT INTO admin (nome, email, password, tipo, avatar)
             VALUES (?, ?, ?, ?, ?)`,
            ['Admin', 'admin@mechfinder.it', adminPassword, 'admin', '/media/img/default_mechanic.png']
        );
        console.log('Admin inserito.');
        
        // 7. Inserisci veicoli di esempio
        console.log('Inserimento veicoli...');

        await db.run('DELETE FROM veicoli');
        console.log('Tabella veicoli svuotata.');
        

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
        
       
        for (let i = 0; i < clientiIds.length; i++) {
            for (let j = 0; j < Math.min(3, meccaniciIds.length); j++) {
     
                const veicoloCliente = veicoliIds.find(v => v.id_cliente === clientiIds[i].id);
                if (!veicoloCliente) continue;
                
                // Seleziona alcuni stati a caso per le riparazioni
                const stato = stati[Math.floor(Math.random() * stati.length)];
                const problema = problemi[Math.floor(Math.random() * problemi.length)];
                
               
                const dataRichiesta = new Date();
                dataRichiesta.setDate(dataRichiesta.getDate() - Math.floor(Math.random() * 30));
                
                // Costo casuale 
                const costo = stato === 'completata' ? Math.floor(Math.random() * 401) + 100 : null;
                const dataCompletamento = stato === 'completata' ? new Date(dataRichiesta.getTime() + (Math.random() * 604800000)) : null; // Fino a 7 giorni dopo
                
                // Data inizio per le riparazioni
                const dataInizio = (stato === 'in_corso' || stato === 'completata') ? new Date(dataRichiesta.getTime() + (Math.random() * 172800000)) : null; // Fino a 2 giorni dopo
                
                const result = await db.run(
                    `INSERT INTO riparazioni (
                        id_cliente, id_meccanico, id_veicolo, descrizione, 
                        tipo_riparazione, stato, data_richiesta, data_inizio, data_completamento, costo
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        clientiIds[i].id, 
                        meccaniciIds[j].id, 
                        veicoloCliente.id,
                        problema,
                        'Meccanica Generale', // Tipo riparazione
                        stato,
                        dataRichiesta.toISOString(),
                        dataInizio ? dataInizio.toISOString() : null,
                        dataCompletamento ? dataCompletamento.toISOString() : null,
                        costo
                    ]
                );
                
                // Inserisci alcuni commenti per questa riparazione
                if (result && result.lastID) {
                  
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
                    const valutazione = Math.floor(Math.random() * 3) + 3;
                    const commentiRecensione = [
                        'Ottimo servizio, molto professionale.',
                        'Lavoro eseguito in tempi rapidi e a un prezzo ragionevole.',
                        'Personale cordiale e competente.',
                        'Ho trovato finalmente un meccanico di fiducia!',
                        'Riparazione fatta correttamente al primo tentativo.'
                    ];
                    const commento = commentiRecensione[Math.floor(Math.random() * commentiRecensione.length)];
                    
                    
                    const dataRecensione = new Date(dataCompletamento.getTime() + 86400000); 
                    
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
  
        await db.close();
    }
}

seed();