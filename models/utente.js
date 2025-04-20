"use strict";

const db = require('../database/db');
const bcrypt = require('bcrypt');

/**
 * Classe base per tutti gli utenti
 */
class Utente {
    constructor(id, nome, cognome, email, telefono = null) {
        this.id = id;
        this.nome = nome;
        this.cognome = cognome;
        this.email = email;
        this.telefono = telefono;
        this.nome_completo = `${nome} ${cognome}`;
    }
    
    static async hashPassword(password) {
        const saltRounds = 10;
        return await bcrypt.hash(password, saltRounds);
    }
}

/**
 * Classe Cliente che estende Utente
 */
class Cliente extends Utente {
    constructor(id, nome, cognome, email, telefono = null, indirizzo = null, citta = null, cap = null, avatar = 'default_avatar.png') {
        super(id, nome, cognome, email, telefono);
        this.indirizzo = indirizzo;
        this.citta = citta;
        this.cap = cap;
        this.avatar = avatar;
        this.tipo = 'cliente';
    }
    
    /**
     * Trova un cliente per ID
     * @param {number} id - ID del cliente
     * @returns {Promise<Cliente|null>} Cliente trovato o null
     */
    static async findById(id) {
        try {
            const row = await db.get('SELECT * FROM clienti WHERE id = ?', [id]);
            if (!row) return null;
            
            return new Cliente(
                row.id,
                row.nome,
                row.cognome,
                row.email,
                row.telefono,
                row.indirizzo,
                row.citta,
                row.cap,
                row.avatar
            );
        } catch (error) {
            console.error('Errore in Cliente.findById:', error);
            throw error;
        }
    }
    
    /**
     * Trova un cliente per email
     * @param {string} email - Email del cliente
     * @returns {Promise<Cliente|null>} Cliente trovato o null
     */
    static async findByEmail(email) {
        try {
            const row = await db.get('SELECT * FROM clienti WHERE email = ?', [email]);
            if (!row) return null;
            
            return new Cliente(
                row.id,
                row.nome,
                row.cognome,
                row.email,
                row.telefono,
                row.indirizzo,
                row.citta,
                row.cap,
                row.avatar
            );
        } catch (error) {
            console.error('Errore in Cliente.findByEmail:', error);
            throw error;
        }
    }
    
    /**
     * Registra un nuovo cliente
     * @param {Object} data - Dati del cliente
     * @returns {Promise<Cliente>} Nuovo cliente creato
     */
    static async register(data) {
        try {
            const hashedPassword = await Utente.hashPassword(data.password);
            
            const result = await db.run(
                'INSERT INTO clienti (nome, cognome, email, password, telefono, indirizzo, citta, cap) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [data.nome, data.cognome, data.email, hashedPassword, data.telefono, data.indirizzo, data.citta, data.cap]
            );
            
            return await Cliente.findById(result.id);
        } catch (error) {
            console.error('Errore in Cliente.register:', error);
            throw error;
        }
    }
    
    /**
     * Aggiorna i dati di un cliente
     * @param {Object} data - Nuovi dati del cliente
     * @returns {Promise<Cliente>} Cliente aggiornato
     */
    async update(data) {
        try {
            const updateFields = [];
            const updateValues = [];
            
            // Costruisci dinamicamente la query di aggiornamento
            for (const [key, value] of Object.entries(data)) {
                if (key !== 'id' && key !== 'password' && value !== undefined) {
                    updateFields.push(`${key} = ?`);
                    updateValues.push(value);
                }
            }
            
            // Aggiungi password se presente
            if (data.password) {
                const hashedPassword = await Utente.hashPassword(data.password);
                updateFields.push('password = ?');
                updateValues.push(hashedPassword);
            }
            
            // Aggiungi l'ID alla fine dei valori
            updateValues.push(this.id);
            
            await db.run(
                `UPDATE clienti SET ${updateFields.join(', ')} WHERE id = ?`,
                updateValues
            );
            
            // Aggiorna l'oggetto corrente
            const updatedCliente = await Cliente.findById(this.id);
            Object.assign(this, updatedCliente);
            
            return this;
        } catch (error) {
            console.error('Errore in Cliente.update:', error);
            throw error;
        }
    }
    
    /**
     * Ottiene i veicoli di un cliente
     * @returns {Promise<Array>} Lista dei veicoli
     */
    async getVeicoli() {
        try {
            return await db.query(
                'SELECT * FROM veicoli WHERE id_cliente = ? ORDER BY id DESC',
                [this.id]
            );
        } catch (error) {
            console.error('Errore in Cliente.getVeicoli:', error);
            throw error;
        }
    }
    
    /**
     * Ottiene le riparazioni di un cliente
     * @param {string} stato - Filtro per stato delle riparazioni
     * @returns {Promise<Array>} Lista delle riparazioni
     */
    async getRiparazioni(stato = null) {
        try {
            let query = `
                SELECT r.*, m.nome as nome_meccanico, m.cognome as cognome_meccanico, 
                       m.nome_officina, m.specializzazione, v.marca, v.modello, v.targa
                FROM riparazioni r
                JOIN meccanici m ON r.id_meccanico = m.id
                LEFT JOIN veicoli v ON r.id_veicolo = v.id
                WHERE r.id_cliente = ?
            `;
            
            const params = [this.id];
            
            if (stato) {
                query += ' AND r.stato = ?';
                params.push(stato);
            }
            
            query += ' ORDER BY r.data_richiesta DESC';
            
            return await db.query(query, params);
        } catch (error) {
            console.error('Errore in Cliente.getRiparazioni:', error);
            throw error;
        }
    }
    
    /**
     * Crea una nuova richiesta di riparazione
     * @param {Object} data - Dati della riparazione
     * @returns {Promise<Object>} Riparazione creata
     */
    async creaRiparazione(data) {
        try {
            const result = await db.run(
                `INSERT INTO riparazioni 
                (id_cliente, id_meccanico, id_veicolo, descrizione, tipo_problema, priorita) 
                VALUES (?, ?, ?, ?, ?, ?)`,
                [this.id, data.id_meccanico, data.id_veicolo, data.descrizione, data.tipo_problema, data.priorita || 'normale']
            );
            
            return await db.get('SELECT * FROM riparazioni WHERE id = ?', [result.id]);
        } catch (error) {
            console.error('Errore in Cliente.creaRiparazione:', error);
            throw error;
        }
    }
    
    /**
     * Aggiunge un nuovo veicolo
     * @param {Object} data - Dati del veicolo
     * @returns {Promise<Object>} Veicolo creato
     */
    async aggiungiVeicolo(data) {
        try {
            const result = await db.run(
                'INSERT INTO veicoli (id_cliente, marca, modello, anno, targa, tipo) VALUES (?, ?, ?, ?, ?, ?)',
                [this.id, data.marca, data.modello, data.anno, data.targa, data.tipo]
            );
            
            return await db.get('SELECT * FROM veicoli WHERE id = ?', [result.id]);
        } catch (error) {
            console.error('Errore in Cliente.aggiungiVeicolo:', error);
            throw error;
        }
    }
    
    /**
     * Lascia una recensione per un meccanico
     * @param {Object} data - Dati della recensione
     * @returns {Promise<Object>} Recensione creata
     */
    async lasciaRecensione(data) {
        try {
            const result = await db.run(
                `INSERT INTO recensioni 
                (id_cliente, id_meccanico, id_riparazione, valutazione, commento) 
                VALUES (?, ?, ?, ?, ?)`,
                [this.id, data.id_meccanico, data.id_riparazione, data.valutazione, data.commento]
            );
            
            // Aggiorna la valutazione media del meccanico
            await db.run(`
                UPDATE meccanici 
                SET valutazione = (
                    SELECT AVG(valutazione) 
                    FROM recensioni 
                    WHERE id_meccanico = ?
                ),
                numero_recensioni = (
                    SELECT COUNT(*) 
                    FROM recensioni 
                    WHERE id_meccanico = ?
                )
                WHERE id = ?
            `, [data.id_meccanico, data.id_meccanico, data.id_meccanico]);
            
            return await db.get('SELECT * FROM recensioni WHERE id = ?', [result.id]);
        } catch (error) {
            console.error('Errore in Cliente.lasciaRecensione:', error);
            throw error;
        }
    }
    
    /**
     * Ottiene tutte le recensioni del cliente
     * @returns {Promise<Array>} Lista delle recensioni
     */
    async getRecensioni() {
        try {
            return await db.query(`
                SELECT r.*, m.nome as nome_meccanico, m.cognome as cognome_meccanico, 
                       m.nome_officina, m.specializzazione
                FROM recensioni r
                JOIN meccanici m ON r.id_meccanico = m.id
                WHERE r.id_cliente = ?
                ORDER BY r.data_recensione DESC
            `, [this.id]);
        } catch (error) {
            console.error('Errore in Cliente.getRecensioni:', error);
            throw error;
        }
    }
}

/**
 * Classe Meccanico che estende Utente
 */
class Meccanico extends Utente {
    constructor(id, nome, cognome, email, specializzazione, telefono = null, 
                nome_officina = null, indirizzo = null, citta = null, cap = null, 
                latitudine = null, longitudine = null, descrizione = null, 
                valutazione = 0, numero_recensioni = 0, verificato = false, avatar = 'default_mechanic.png') {
        super(id, nome, cognome, email, telefono);
        this.specializzazione = specializzazione;
        this.nome_officina = nome_officina;
        this.indirizzo = indirizzo;
        this.citta = citta;
        this.cap = cap;
        this.latitudine = latitudine;
        this.longitudine = longitudine;
        this.descrizione = descrizione;
        this.valutazione = valutazione;
        this.numero_recensioni = numero_recensioni;
        this.verificato = verificato;
        this.avatar = avatar;
        this.tipo = 'meccanico';
    }
    
    /**
     * Trova un meccanico per ID
     * @param {number} id - ID del meccanico
     * @returns {Promise<Meccanico|null>} Meccanico trovato o null
     */
    static async findById(id) {
        try {
            const row = await db.get('SELECT * FROM meccanici WHERE id = ?', [id]);
            if (!row) return null;
            
            return new Meccanico(
                row.id,
                row.nome,
                row.cognome,
                row.email,
                row.specializzazione,
                row.telefono,
                row.nome_officina,
                row.indirizzo,
                row.citta,
                row.cap,
                row.latitudine,
                row.longitudine,
                row.descrizione,
                row.valutazione,
                row.numero_recensioni,
                Boolean(row.verificato),
                row.avatar
            );
        } catch (error) {
            console.error('Errore in Meccanico.findById:', error);
            throw error;
        }
    }
    
    /**
     * Trova un meccanico per email
     * @param {string} email - Email del meccanico
     * @returns {Promise<Meccanico|null>} Meccanico trovato o null
     */
    static async findByEmail(email) {
        try {
            const row = await db.get('SELECT * FROM meccanici WHERE email = ?', [email]);
            if (!row) return null;
            
            return new Meccanico(
                row.id,
                row.nome,
                row.cognome,
                row.email,
                row.specializzazione,
                row.telefono,
                row.nome_officina,
                row.indirizzo,
                row.citta,
                row.cap,
                row.latitudine,
                row.longitudine,
                row.descrizione,
                row.valutazione,
                row.numero_recensioni,
                Boolean(row.verificato),
                row.avatar
            );
        } catch (error) {
            console.error('Errore in Meccanico.findByEmail:', error);
            throw error;
        }
    }
    
    /**
     * Registra un nuovo meccanico
     * @param {Object} data - Dati del meccanico
     * @returns {Promise<Meccanico>} Nuovo meccanico creato
     */
    static async register(data) {
        try {
            const hashedPassword = await Utente.hashPassword(data.password);
            
            const result = await db.run(
                `INSERT INTO meccanici (
                    nome, cognome, email, password, specializzazione, telefono, 
                    nome_officina, indirizzo, citta, cap, descrizione
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    data.nome, data.cognome, data.email, hashedPassword, data.specializzazione, 
                    data.telefono, data.nome_officina, data.indirizzo, data.citta, data.cap, data.descrizione
                ]
            );
            
            return await Meccanico.findById(result.id);
        } catch (error) {
            console.error('Errore in Meccanico.register:', error);
            throw error;
        }
    }
    
    /**
     * Aggiorna i dati di un meccanico
     * @param {Object} data - Nuovi dati del meccanico
     * @returns {Promise<Meccanico>} Meccanico aggiornato
     */
    async update(data) {
        try {
            const updateFields = [];
            const updateValues = [];
            
            // Costruisci dinamicamente la query di aggiornamento
            for (const [key, value] of Object.entries(data)) {
                if (key !== 'id' && key !== 'password' && value !== undefined) {
                    updateFields.push(`${key} = ?`);
                    updateValues.push(value);
                }
            }
            
            // Aggiungi password se presente
            if (data.password) {
                const hashedPassword = await Utente.hashPassword(data.password);
                updateFields.push('password = ?');
                updateValues.push(hashedPassword);
            }
            
            // Aggiungi l'ID alla fine dei valori
            updateValues.push(this.id);
            
            await db.run(
                `UPDATE meccanici SET ${updateFields.join(', ')} WHERE id = ?`,
                updateValues
            );
            
            // Aggiorna l'oggetto corrente
            const updatedMeccanico = await Meccanico.findById(this.id);
            Object.assign(this, updatedMeccanico);
            
            return this;
        } catch (error) {
            console.error('Errore in Meccanico.update:', error);
            throw error;
        }
    }
    
    /**
     * Aggiorna le coordinate geografiche del meccanico
     * @param {number} lat - Latitudine
     * @param {number} lng - Longitudine
     * @returns {Promise<Meccanico>} Meccanico aggiornato
     */
    async aggiornaCoordinate(lat, lng) {
        try {
            await db.run(
                'UPDATE meccanici SET latitudine = ?, longitudine = ? WHERE id = ?',
                [lat, lng, this.id]
            );
            
            this.latitudine = lat;
            this.longitudine = lng;
            
            return this;
        } catch (error) {
            console.error('Errore in Meccanico.aggiornaCoordinate:', error);
            throw error;
        }
    }
    
    /**
     * Ottiene le riparazioni di un meccanico
     * @param {string} stato - Filtro per stato delle riparazioni
     * @returns {Promise<Array>} Lista delle riparazioni
     */
    async getRiparazioni(stato = null) {
        try {
            let query = `
                SELECT r.*, c.nome as nome_cliente, c.cognome as cognome_cliente, 
                       c.telefono as telefono_cliente, v.marca, v.modello, v.targa
                FROM riparazioni r
                JOIN clienti c ON r.id_cliente = c.id
                LEFT JOIN veicoli v ON r.id_veicolo = v.id
                WHERE r.id_meccanico = ?
            `;
            
            const params = [this.id];
            
            if (stato) {
                query += ' AND r.stato = ?';
                params.push(stato);
            }
            
            query += ' ORDER BY r.data_richiesta DESC';
            
            return await db.query(query, params);
        } catch (error) {
            console.error('Errore in Meccanico.getRiparazioni:', error);
            throw error;
        }
    }
    
    /**
     * Crea un nuovo preventivo per una riparazione
     * @param {Object} data - Dati del preventivo
     * @returns {Promise<Object>} Preventivo creato
     */
    async creaPreventivo(data) {
        try {
            // Verifica che la riparazione esista e appartenga a questo meccanico
            const riparazione = await db.get(
                'SELECT * FROM riparazioni WHERE id = ? AND id_meccanico = ?',
                [data.id_riparazione, this.id]
            );
            
            if (!riparazione) {
                throw new Error('Riparazione non trovata o non autorizzata');
            }
            
            // Calcola la data di scadenza (default: 7 giorni)
            const dataScadenza = new Date();
            dataScadenza.setDate(dataScadenza.getDate() + (data.giorni_validita || 7));
            
            const result = await db.run(
                `INSERT INTO preventivi 
                (id_riparazione, importo, descrizione, data_scadenza) 
                VALUES (?, ?, ?, ?)`,
                [data.id_riparazione, data.importo, data.descrizione, dataScadenza.toISOString()]
            );
            
            // Aggiorna lo stato della riparazione
            await db.run(
                'UPDATE riparazioni SET stato = ? WHERE id = ?',
                ['preventivo', data.id_riparazione]
            );
            
            return await db.get('SELECT * FROM preventivi WHERE id = ?', [result.id]);
        } catch (error) {
            console.error('Errore in Meccanico.creaPreventivo:', error);
            throw error;
        }
    }
    
    /**
     * Emette una ricevuta per una riparazione completata
     * @param {Object} data - Dati della ricevuta
     * @returns {Promise<Object>} Ricevuta creata
     */
    async emettiRicevuta(data) {
        try {
            // Verifica che la riparazione esista e appartenga a questo meccanico
            const riparazione = await db.get(
                'SELECT * FROM riparazioni WHERE id = ? AND id_meccanico = ?',
                [data.id_riparazione, this.id]
            );
            
            if (!riparazione) {
                throw new Error('Riparazione non trovata o non autorizzata');
            }
            
            // Controlla che la riparazione sia completata
            if (riparazione.stato !== 'completata') {
                throw new Error('La riparazione deve essere completata prima di emettere la ricevuta');
            }
            
            const result = await db.run(
                `INSERT INTO ricevute 
                (id_riparazione, importo, descrizione, numero_fattura, metodo_pagamento) 
                VALUES (?, ?, ?, ?, ?)`,
                [
                    data.id_riparazione, 
                    data.importo, 
                    data.descrizione, 
                    data.numero_fattura, 
                    data.metodo_pagamento
                ]
            );
            
            return await db.get('SELECT * FROM ricevute WHERE id = ?', [result.id]);
        } catch (error) {
            console.error('Errore in Meccanico.emettiRicevuta:', error);
            throw error;
        }
    }
    
    /**
     * Aggiorna lo stato di una riparazione
     * @param {number} idRiparazione - ID della riparazione
     * @param {string} nuovoStato - Nuovo stato
     * @param {string} note - Note opzionali
     * @returns {Promise<Object>} Riparazione aggiornata
     */
    async aggiornaStatoRiparazione(idRiparazione, nuovoStato, note = null) {
        try {
            // Verifica che la riparazione esista e appartenga a questo meccanico
            const riparazione = await db.get(
                'SELECT * FROM riparazioni WHERE id = ? AND id_meccanico = ?',
                [idRiparazione, this.id]
            );
            
            if (!riparazione) {
                throw new Error('Riparazione non trovata o non autorizzata');
            }
            
            let query = 'UPDATE riparazioni SET stato = ?';
            const params = [nuovoStato];
            
            // Aggiungi campi aggiuntivi in base al nuovo stato
            if (nuovoStato === 'accettata') {
                query += ', data_accettazione = CURRENT_TIMESTAMP';
            } else if (nuovoStato === 'completata') {
                query += ', data_completamento = CURRENT_TIMESTAMP';
            }
            
            // Aggiungi note se presenti
            if (note) {
                query += ', note = ?';
                params.push(note);
            }
            
            query += ' WHERE id = ?';
            params.push(idRiparazione);
            
            await db.run(query, params);
            
            return await db.get('SELECT * FROM riparazioni WHERE id = ?', [idRiparazione]);
        } catch (error) {
            console.error('Errore in Meccanico.aggiornaStatoRiparazione:', error);
            throw error;
        }
    }
    
    /**
     * Ottiene le recensioni di un meccanico
     * @returns {Promise<Array>} Lista delle recensioni
     */
    async getRecensioni() {
        try {
            return await db.query(`
                SELECT r.*, c.nome as nome_cliente, c.cognome as cognome_cliente,
                       c.avatar as avatar_cliente
                FROM recensioni r
                JOIN clienti c ON r.id_cliente = c.id
                WHERE r.id_meccanico = ?
                ORDER BY r.data_recensione DESC
            `, [this.id]);
        } catch (error) {
            console.error('Errore in Meccanico.getRecensioni:', error);
            throw error;
        }
    }
    
    /**
     * Ottiene i servizi offerti da un meccanico
     * @returns {Promise<Array>} Lista dei servizi
     */
    async getServizi() {
        try {
            return await db.query(`
                SELECT s.*, sm.prezzo
                FROM servizi s
                JOIN servizi_meccanici sm ON s.id = sm.id_servizio
                WHERE sm.id_meccanico = ?
                ORDER BY s.nome
            `, [this.id]);
        } catch (error) {
            console.error('Errore in Meccanico.getServizi:', error);
            throw error;
        }
    }
    
    /**
     * Aggiunge un servizio all'offerta del meccanico
     * @param {Object} data - Dati del servizio
     * @returns {Promise<Object>} Servizio aggiunto
     */
    async aggiungiServizio(data) {
        try {
            // Verifica se il servizio è già offerto
            const esistente = await db.get(
                'SELECT * FROM servizi_meccanici WHERE id_meccanico = ? AND id_servizio = ?',
                [this.id, data.id_servizio]
            );
            
            if (esistente) {
                // Aggiorna il prezzo se il servizio esiste già
                await db.run(
                    'UPDATE servizi_meccanici SET prezzo = ? WHERE id = ?',
                    [data.prezzo, esistente.id]
                );
                return await db.get('SELECT * FROM servizi_meccanici WHERE id = ?', [esistente.id]);
            } else {
                // Altrimenti aggiungi il nuovo servizio
                const result = await db.run(
                    'INSERT INTO servizi_meccanici (id_meccanico, id_servizio, prezzo) VALUES (?, ?, ?)',
                    [this.id, data.id_servizio, data.prezzo]
                );
                return await db.get('SELECT * FROM servizi_meccanici WHERE id = ?', [result.id]);
            }
        } catch (error) {
            console.error('Errore in Meccanico.aggiungiServizio:', error);
            throw error;
        }
    }
    
    /**
     * Rimuove un servizio dall'offerta del meccanico
     * @param {number} idServizio - ID del servizio
     * @returns {Promise<boolean>} true se rimosso con successo
     */
    async rimuoviServizio(idServizio) {
        try {
            await db.run(
                'DELETE FROM servizi_meccanici WHERE id_meccanico = ? AND id_servizio = ?',
                [this.id, idServizio]
            );
            return true;
        } catch (error) {
            console.error('Errore in Meccanico.rimuoviServizio:', error);
            throw error;
        }
    }
    
    /**
     * Cerca meccanici in base a vari criteri
     * @param {Object} filtri - Criteri di ricerca
     * @returns {Promise<Array<Meccanico>>} Lista dei meccanici trovati
     */
    static async cerca(filtri = {}) {
        try {
            let query = `
                SELECT m.* 
                FROM meccanici m
                LEFT JOIN servizi_meccanici sm ON m.id = sm.id_meccanico
                LEFT JOIN servizi s ON sm.id_servizio = s.id
                WHERE 1=1
            `;
            
            const params = [];
            
            // Filtro per nome o nome officina
            if (filtri.q) {
                query += ` AND (
                    m.nome LIKE ? OR 
                    m.cognome LIKE ? OR 
                    m.nome_officina LIKE ? OR
                    m.specializzazione LIKE ?
                )`;
                const searchTerm = `%${filtri.q}%`;
                params.push(searchTerm, searchTerm, searchTerm, searchTerm);
            }
            
            // Filtro per specializzazione
            if (filtri.specializzazione) {
                query += ' AND m.specializzazione = ?';
                params.push(filtri.specializzazione);
            }
            
            // Filtro per servizio
            if (filtri.servizio) {
                query += ' AND s.nome = ?';
                params.push(filtri.servizio);
            }
            
            // Filtro per città
            if (filtri.citta) {
                query += ' AND m.citta = ?';
                params.push(filtri.citta);
            }
            
            // Filtro per valutazione minima
            if (filtri.valutazione_min) {
                query += ' AND m.valutazione >= ?';
                params.push(filtri.valutazione_min);
            }
            
            // Filtro per meccanici verificati
            if (filtri.verificato) {
                query += ' AND m.verificato = 1';
            }
            
            // Group by per evitare duplicati se si usa il join con servizi
            query += ' GROUP BY m.id';
            
            // Ordinamento
            if (filtri.ordina === 'valutazione') {
                query += ' ORDER BY m.valutazione DESC, m.numero_recensioni DESC';
            } else if (filtri.ordina === 'recensioni') {
                query += ' ORDER BY m.numero_recensioni DESC, m.valutazione DESC';
            } else if (filtri.ordina === 'nome') {
                query += ' ORDER BY m.nome ASC';
            } else {
                query += ' ORDER BY m.id DESC'; // Default: più recenti
            }
            
            // Paginazione
            if (filtri.limit) {
                query += ' LIMIT ?';
                params.push(parseInt(filtri.limit));
                
                if (filtri.offset) {
                    query += ' OFFSET ?';
                    params.push(parseInt(filtri.offset));
                }
            }
            
            const rows = await db.query(query, params);
            
            // Converte i risultati in oggetti Meccanico
            return rows.map(row => new Meccanico(
                row.id,
                row.nome,
                row.cognome,
                row.email,
                row.specializzazione,
                row.telefono,
                row.nome_officina,
                row.indirizzo,
                row.citta,
                row.cap,
                row.latitudine,
                row.longitudine,
                row.descrizione,
                row.valutazione,
                row.numero_recensioni,
                Boolean(row.verificato),
                row.avatar
            ));
        } catch (error) {
            console.error('Errore in Meccanico.cerca:', error);
            throw error;
        }
    }
}

// Esporta le classi per l'uso in altri moduli
module.exports = { Utente, Cliente, Meccanico };