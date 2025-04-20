"use strict";

const db = require('../database/db');

/**
 * Classe che rappresenta una riparazione
 */
class Riparazione {
    constructor(id, idCliente, idMeccanico, descrizione, stato, dataRichiesta, 
                idVeicolo = null, tipoProblema = null, priorita = 'normale',
                dataAccettazione = null, dataCompletamento = null, note = null) {
        this.id = id;
        this.id_cliente = idCliente;
        this.id_meccanico = idMeccanico;
        this.id_veicolo = idVeicolo;
        this.descrizione = descrizione;
        this.tipo_problema = tipoProblema;
        this.stato = stato;
        this.priorita = priorita;
        this.data_richiesta = dataRichiesta;
        this.data_accettazione = dataAccettazione;
        this.data_completamento = dataCompletamento;
        this.note = note;
    }
    
    /**
     * Trova una riparazione per ID
     * @param {number} id - ID della riparazione
     * @returns {Promise<Riparazione|null>} Riparazione trovata o null
     */
    static async findById(id) {
        try {
            const row = await db.get('SELECT * FROM riparazioni WHERE id = ?', [id]);
            if (!row) return null;
            
            return new Riparazione(
                row.id,
                row.id_cliente,
                row.id_meccanico,
                row.descrizione,
                row.stato,
                row.data_richiesta,
                row.id_veicolo,
                row.tipo_problema,
                row.priorita,
                row.data_accettazione,
                row.data_completamento,
                row.note
            );
        } catch (error) {
            console.error('Errore in Riparazione.findById:', error);
            throw error;
        }
    }
    
    /**
     * Ottiene una riparazione con dettagli completi
     * @param {number} id - ID della riparazione
     * @returns {Promise<Object|null>} Dettagli completi della riparazione o null
     */
    static async getDettaglio(id) {
        try {
            const row = await db.get(`
                SELECT 
                    r.*,
                    c.nome as nome_cliente, c.cognome as cognome_cliente, c.email as email_cliente,
                    c.telefono as telefono_cliente, c.avatar as avatar_cliente,
                    m.nome as nome_meccanico, m.cognome as cognome_meccanico, 
                    m.nome_officina, m.email as email_meccanico,
                    m.telefono as telefono_meccanico, m.avatar as avatar_meccanico,
                    m.specializzazione, m.valutazione,
                    v.marca, v.modello, v.anno, v.targa, v.tipo as tipo_veicolo
                FROM riparazioni r
                JOIN clienti c ON r.id_cliente = c.id
                JOIN meccanici m ON r.id_meccanico = m.id
                LEFT JOIN veicoli v ON r.id_veicolo = v.id
                WHERE r.id = ?
            `, [id]);
            
            if (!row) return null;
            
            // Ottieni il preventivo collegato, se esiste
            const preventivo = await db.get(
                'SELECT * FROM preventivi WHERE id_riparazione = ? ORDER BY data_creazione DESC LIMIT 1',
                [id]
            );
            
            // Ottieni la ricevuta collegata, se esiste
            const ricevuta = await db.get(
                'SELECT * FROM ricevute WHERE id_riparazione = ? ORDER BY data_emissione DESC LIMIT 1',
                [id]
            );
            
            return {
                ...row,
                preventivo,
                ricevuta
            };
        } catch (error) {
            console.error('Errore in Riparazione.getDettaglio:', error);
            throw error;
        }
    }
    
    /**
     * Crea una nuova riparazione
     * @param {Object} data - Dati della riparazione
     * @returns {Promise<Riparazione>} Nuova riparazione creata
     */
    static async create(data) {
        try {
            const result = await db.run(
                `INSERT INTO riparazioni 
                (id_cliente, id_meccanico, id_veicolo, descrizione, tipo_problema, priorita) 
                VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    data.id_cliente, 
                    data.id_meccanico, 
                    data.id_veicolo, 
                    data.descrizione, 
                    data.tipo_problema,
                    data.priorita || 'normale'
                ]
            );
            
            return await Riparazione.findById(result.id);
        } catch (error) {
            console.error('Errore in Riparazione.create:', error);
            throw error;
        }
    }
    
    /**
     * Aggiorna lo stato di una riparazione
     * @param {string} nuovoStato - Nuovo stato della riparazione
     * @param {string} note - Note opzionali
     * @returns {Promise<Riparazione>} Riparazione aggiornata
     */
    async aggiornaStato(nuovoStato, note = null) {
        try {
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
            params.push(this.id);
            
            await db.run(query, params);
            
            // Aggiorna l'istanza corrente
            const riparazione = await Riparazione.findById(this.id);
            Object.assign(this, riparazione);
            
            return this;
        } catch (error) {
            console.error('Errore in Riparazione.aggiornaStato:', error);
            throw error;
        }
    }
    
    /**
     * Ottiene il preventivo associato a una riparazione
     * @returns {Promise<Object|null>} Preventivo o null
     */
    async getPreventivo() {
        try {
            return await db.get(
                'SELECT * FROM preventivi WHERE id_riparazione = ? ORDER BY data_creazione DESC LIMIT 1',
                [this.id]
            );
        } catch (error) {
            console.error('Errore in Riparazione.getPreventivo:', error);
            throw error;
        }
    }
    
    /**
     * Ottiene la ricevuta associata a una riparazione
     * @returns {Promise<Object|null>} Ricevuta o null
     */
    async getRicevuta() {
        try {
            return await db.get(
                'SELECT * FROM ricevute WHERE id_riparazione = ? ORDER BY data_emissione DESC LIMIT 1',
                [this.id]
            );
        } catch (error) {
            console.error('Errore in Riparazione.getRicevuta:', error);
            throw error;
        }
    }
    
    /**
     * Crea un nuovo preventivo per la riparazione
     * @param {Object} data - Dati del preventivo
     * @returns {Promise<Object>} Preventivo creato
     */
    async creaPreventivo(data) {
        try {
            // Calcola la data di scadenza (default: 7 giorni)
            const dataScadenza = new Date();
            dataScadenza.setDate(dataScadenza.getDate() + (data.giorni_validita || 7));
            
            const result = await db.run(
                `INSERT INTO preventivi 
                (id_riparazione, importo, descrizione, data_scadenza) 
                VALUES (?, ?, ?, ?)`,
                [this.id, data.importo, data.descrizione, dataScadenza.toISOString()]
            );
            
            // Aggiorna lo stato della riparazione
            await this.aggiornaStato('preventivo');
            
            return await db.get('SELECT * FROM preventivi WHERE id = ?', [result.id]);
        } catch (error) {
            console.error('Errore in Riparazione.creaPreventivo:', error);
            throw error;
        }
    }
    
    /**
     * Accetta un preventivo
     * @param {number} preventivoId - ID del preventivo
     * @returns {Promise<Object>} Preventivo aggiornato
     */
    async accettaPreventivo(preventivoId) {
        try {
            // Verifica che il preventivo esista e sia collegato a questa riparazione
            const preventivo = await db.get(
                'SELECT * FROM preventivi WHERE id = ? AND id_riparazione = ?',
                [preventivoId, this.id]
            );
            
            if (!preventivo) {
                throw new Error('Preventivo non trovato o non collegato a questa riparazione');
            }
            
            // Aggiorna lo stato del preventivo
            await db.run(
                'UPDATE preventivi SET stato = ? WHERE id = ?',
                ['accettato', preventivoId]
            );
            
            // Aggiorna lo stato della riparazione
            await this.aggiornaStato('accettata');
            
            return await db.get('SELECT * FROM preventivi WHERE id = ?', [preventivoId]);
        } catch (error) {
            console.error('Errore in Riparazione.accettaPreventivo:', error);
            throw error;
        }
    }
    
    /**
     * Rifiuta un preventivo
     * @param {number} preventivoId - ID del preventivo
     * @returns {Promise<Object>} Preventivo aggiornato
     */
    async rifiutaPreventivo(preventivoId) {
        try {
            // Verifica che il preventivo esista e sia collegato a questa riparazione
            const preventivo = await db.get(
                'SELECT * FROM preventivi WHERE id = ? AND id_riparazione = ?',
                [preventivoId, this.id]
            );
            
            if (!preventivo) {
                throw new Error('Preventivo non trovato o non collegato a questa riparazione');
            }
            
            // Aggiorna lo stato del preventivo
            await db.run(
                'UPDATE preventivi SET stato = ? WHERE id = ?',
                ['rifiutato', preventivoId]
            );
            
            // La riparazione torna a stato "richiesta"
            await this.aggiornaStato('richiesta', 'Preventivo rifiutato dal cliente');
            
            return await db.get('SELECT * FROM preventivi WHERE id = ?', [preventivoId]);
        } catch (error) {
            console.error('Errore in Riparazione.rifiutaPreventivo:', error);
            throw error;
        }
    }
    
    /**
     * Emette una ricevuta per la riparazione
     * @param {Object} data - Dati della ricevuta
     * @returns {Promise<Object>} Ricevuta creata
     */
    async emettiRicevuta(data) {
        try {
            // Controlla che la riparazione sia completata
            if (this.stato !== 'completata') {
                throw new Error('La riparazione deve essere completata prima di emettere la ricevuta');
            }
            
            const result = await db.run(
                `INSERT INTO ricevute 
                (id_riparazione, importo, descrizione, numero_fattura, metodo_pagamento) 
                VALUES (?, ?, ?, ?, ?)`,
                [
                    this.id, 
                    data.importo, 
                    data.descrizione, 
                    data.numero_fattura, 
                    data.metodo_pagamento
                ]
            );
            
            return await db.get('SELECT * FROM ricevute WHERE id = ?', [result.id]);
        } catch (error) {
            console.error('Errore in Riparazione.emettiRicevuta:', error);
            throw error;
        }
    }
    
    /**
     * Cerca riparazioni in base a vari criteri
     * @param {Object} filtri - Criteri di ricerca
     * @returns {Promise<Array<Object>>} Lista delle riparazioni trovate
     */
    static async cerca(filtri = {}) {
        try {
            let query = `
                SELECT 
                    r.*,
                    c.nome as nome_cliente, c.cognome as cognome_cliente,
                    m.nome as nome_meccanico, m.cognome as cognome_meccanico, 
                    m.nome_officina, m.specializzazione,
                    v.marca, v.modello, v.targa
                FROM riparazioni r
                JOIN clienti c ON r.id_cliente = c.id
                JOIN meccanici m ON r.id_meccanico = m.id
                LEFT JOIN veicoli v ON r.id_veicolo = v.id
                WHERE 1=1
            `;
            
            const params = [];
            
            // Filtri per ID cliente o meccanico
            if (filtri.id_cliente) {
                query += ' AND r.id_cliente = ?';
                params.push(filtri.id_cliente);
            }
            
            if (filtri.id_meccanico) {
                query += ' AND r.id_meccanico = ?';
                params.push(filtri.id_meccanico);
            }
            
            // Filtro per stato
            if (filtri.stato) {
                query += ' AND r.stato = ?';
                params.push(filtri.stato);
            }
            
            // Filtro per tipo problema
            if (filtri.tipo_problema) {
                query += ' AND r.tipo_problema = ?';
                params.push(filtri.tipo_problema);
            }
            
            // Filtro per data (da/a)
            if (filtri.data_da) {
                query += ' AND r.data_richiesta >= ?';
                params.push(filtri.data_da);
            }
            
            if (filtri.data_a) {
                query += ' AND r.data_richiesta <= ?';
                params.push(filtri.data_a);
            }
            
            // Filtro per veicolo
            if (filtri.id_veicolo) {
                query += ' AND r.id_veicolo = ?';
                params.push(filtri.id_veicolo);
            }
            
            // Ricerca testuale nella descrizione
            if (filtri.q) {
                query += ' AND r.descrizione LIKE ?';
                params.push(`%${filtri.q}%`);
            }
            
            // Ordinamento
            if (filtri.ordina === 'data_asc') {
                query += ' ORDER BY r.data_richiesta ASC';
            } else if (filtri.ordina === 'priorita') {
                query += ` ORDER BY 
                    CASE r.priorita 
                        WHEN 'alta' THEN 1 
                        WHEN 'normale' THEN 2 
                        WHEN 'bassa' THEN 3 
                    END,
                    r.data_richiesta DESC`;
            } else {
                query += ' ORDER BY r.data_richiesta DESC'; // Default: più recenti prima
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
            
            return await db.query(query, params);
        } catch (error) {
            console.error('Errore in Riparazione.cerca:', error);
            throw error;
        }
    }
}

module.exports = { Riparazione };