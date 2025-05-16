"use strict";

const db = require('../database/db');
// Classe Cliente
class Cliente {
    constructor(data) {
        this.id = data.id;
        this.nome = data.nome;
        this.cognome = data.cognome;
        this.email = data.email;
        this.password = data.password;
        this.telefono = data.telefono;
        this.indirizzo = data.indirizzo;
        this.citta = data.citta;
        this.cap = data.cap;
        this.avatar = data.avatar;
        this.data_registrazione = data.data_registrazione;
        this.reset_token = data.reset_token;
        this.reset_token_expires = data.reset_token_expires;
        this.email_notifications = data.email_notifications === 1;
        this.sms_notifications = data.sms_notifications === 1;
        this.reminder_notifications = data.reminder_notifications === 1;
        this.promotions_notifications = data.promotions_notifications === 1;
        this.tipo = 'cliente';
    }

    static async findById(id) {
        try {
            const row = await db.get('SELECT * FROM clienti WHERE id = ?', [id]);
            if (!row) return null;
            return new Cliente(row);
        } catch (err) {
            console.error('Errore in Cliente.findById:', err);
            throw err;
        }
    }

    static async findByEmail(email) {
        try {
            const row = await db.get('SELECT * FROM clienti WHERE email = ?', [email]);
            if (!row) return null;
            return new Cliente(row);
        } catch (err) {
            console.error('Errore in Cliente.findByEmail:', err);
            throw err;
        }
    }

    static async findByResetToken(token) {
        try {
            const row = await db.get('SELECT * FROM clienti WHERE reset_token = ?', [token]);
            if (!row) return null;
            return new Cliente(row);
        } catch (err) {
            console.error('Errore in Cliente.findByResetToken:', err);
            throw err;
        }
    }

    static async create(data) {
        try {
            const result = await db.run(
                `INSERT INTO clienti (
                    nome, cognome, email, password, telefono, indirizzo, citta, cap, 
                    data_registrazione, email_notifications, sms_notifications, 
                    reminder_notifications, promotions_notifications, tipo
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    data.nome,
                    data.cognome || '',
                    data.email,
                    data.password,
                    data.telefono || null,
                    data.indirizzo || null,
                    data.citta || null,
                    data.cap || null,
                    data.data_registrazione || new Date().toISOString(),
                    data.email_notifications !== undefined ? data.email_notifications : 1,
                    data.sms_notifications !== undefined ? data.sms_notifications : 0,
                    data.reminder_notifications !== undefined ? data.reminder_notifications : 1,
                    data.promotions_notifications !== undefined ? data.promotions_notifications : 0,
                    'cliente'
                ]
            );
            
            const row = await db.get('SELECT * FROM clienti WHERE id = ?', [result.id]);
            return new Cliente(row);
        } catch (err) {
            console.error('Errore in Cliente.create:', err);
            throw err;
        }
    }

    async update() {
        try {
            await db.run(
                `UPDATE clienti SET 
                    nome = ?, cognome = ?, email = ?, telefono = ?, indirizzo = ?,
                    citta = ?, cap = ?, avatar = ?, email_notifications = ?, 
                    sms_notifications = ?, reminder_notifications = ?, promotions_notifications = ?
                WHERE id = ?`,
                [
                    this.nome,
                    this.cognome,
                    this.email,
                    this.telefono,
                    this.indirizzo,
                    this.citta,
                    this.cap,
                    this.avatar,
                    this.email_notifications ? 1 : 0,
                    this.sms_notifications ? 1 : 0,
                    this.reminder_notifications ? 1 : 0,
                    this.promotions_notifications ? 1 : 0,
                    this.id
                ]
            );
            return true;
        } catch (err) {
            console.error('Errore in Cliente.update:', err);
            throw err;
        }
    }

    static async updatePassword(id, password) {
        try {
            await db.run(
                'UPDATE clienti SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
                [password, id]
            );
            return true;
        } catch (err) {
            console.error('Errore in Cliente.updatePassword:', err);
            throw err;
        }
    }

    static async updateResetToken(id, token, expires) {
        try {
            await db.run(
                'UPDATE clienti SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
                [token, expires, id]
            );
            return true;
        } catch (err) {
            console.error('Errore in Cliente.updateResetToken:', err);
            throw err;
        }
    }
    
    // Altri metodi utili...
}
// Classe Meccanico
class Meccanico {
    constructor(data) {
        this.id = data.id;
        this.nome = data.nome;
        this.cognome = data.cognome;
        this.nome_officina = data.nome_officina;
        this.specializzazione = data.specializzazione;
        this.email = data.email;
        this.password = data.password;
        this.telefono = data.telefono;
        this.indirizzo = data.indirizzo;
        this.citta = data.citta;
        this.cap = data.cap;
        this.latitudine = data.latitudine;
        this.longitudine = data.longitudine;
        this.descrizione = data.descrizione;
        this.valutazione = data.valutazione || 0;
        this.numero_recensioni = data.numero_recensioni || 0;
        this.data_registrazione = data.data_registrazione;
        this.avatar = data.avatar;
        this.verificato = data.verificato === 1;
        this.reset_token = data.reset_token;
        this.reset_token_expires = data.reset_token_expires;
        this.tipo = 'meccanico';
    }

    static async findById(id) {
        try {
            const row = await db.get('SELECT * FROM meccanici WHERE id = ?', [id]);
            if (!row) return null;
            return new Meccanico(row);
        } catch (err) {
            console.error('Errore in Meccanico.findById:', err);
            throw err;
        }
    }

    static async findByEmail(email) {
        try {
            const row = await db.get('SELECT * FROM meccanici WHERE email = ?', [email]);
            if (!row) return null;
            return new Meccanico(row);
        } catch (err) {
            console.error('Errore in Meccanico.findByEmail:', err);
            throw err;
        }
    }

    static async findByResetToken(token) {
        try {
            const row = await db.get('SELECT * FROM meccanici WHERE reset_token = ?', [token]);
            if (!row) return null;
            return new Meccanico(row);
        } catch (err) {
            console.error('Errore in Meccanico.findByResetToken:', err);
            throw err;
        }
    }

    static async getAll(filters = {}, sortBy = 'nome', order = 'ASC', limit = 100, offset = 0) {
        try {
            let query = 'SELECT * FROM meccanici WHERE 1=1';
            const params = [];

            // Applica i filtri
            if (filters.nome) {
                query += ' AND (nome LIKE ? OR cognome LIKE ?)';
                params.push(`%${filters.nome}%`, `%${filters.nome}%`);
            }

            if (filters.specializzazione) {
                query += ' AND specializzazione = ?';
                params.push(filters.specializzazione);
            }

            if (filters.citta) {
                query += ' AND citta LIKE ?';
                params.push(`%${filters.citta}%`);
            }

            if (filters.verificato !== undefined) {
                query += ' AND verificato = ?';
                params.push(filters.verificato ? 1 : 0);
            }

            // Applica ordinamento
            query += ` ORDER BY ${sortBy} ${order}`;

            // Applica paginazione
            query += ' LIMIT ? OFFSET ?';
            params.push(limit, offset);

            const rows = await db.query(query, params);
            return rows.map(row => new Meccanico(row));
        } catch (err) {
            console.error('Errore in Meccanico.getAll:', err);
            throw err;
        }
    }

    static async count(filters = {}) {
        try {
            let query = 'SELECT COUNT(*) as count FROM meccanici WHERE 1=1';
            const params = [];

            // Applica i filtri
            if (filters.nome) {
                query += ' AND (nome LIKE ? OR cognome LIKE ?)';
                params.push(`%${filters.nome}%`, `%${filters.nome}%`);
            }

            if (filters.specializzazione) {
                query += ' AND specializzazione = ?';
                params.push(filters.specializzazione);
            }

            if (filters.citta) {
                query += ' AND citta LIKE ?';
                params.push(`%${filters.citta}%`);
            }

            if (filters.verificato !== undefined) {
                query += ' AND verificato = ?';
                params.push(filters.verificato ? 1 : 0);
            }

            const result = await db.get(query, params);
            return result.count;
        } catch (err) {
            console.error('Errore in Meccanico.count:', err);
            throw err;
        }
    }

    static async create(data) {
        try {
            const result = await db.run(
                `INSERT INTO meccanici (
                    nome, cognome, nome_officina, specializzazione, email, password,
                    telefono, indirizzo, citta, cap, latitudine, longitudine,
                    descrizione, data_registrazione, verificato, tipo
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    data.nome,
                    data.cognome || '',
                    data.nome_officina || '',
                    data.specializzazione,
                    data.email,
                    data.password,
                    data.telefono || null,
                    data.indirizzo || null,
                    data.citta || null,
                    data.cap || null,
                    data.latitudine || null,
                    data.longitudine || null,
                    data.descrizione || null,
                    data.data_registrazione || new Date().toISOString(),
                    data.verificato ? 1 : 0,
                    'meccanico'
                ]
            );
            
            const row = await db.get('SELECT * FROM meccanici WHERE id = ?', [result.id]);
            return new Meccanico(row);
        } catch (err) {
            console.error('Errore in Meccanico.create:', err);
            throw err;
        }
    }

    async update() {
        try {
            await db.run(
                `UPDATE meccanici SET 
                    nome = ?, cognome = ?, nome_officina = ?, specializzazione = ?,
                    email = ?, telefono = ?, indirizzo = ?, citta = ?, cap = ?,
                    latitudine = ?, longitudine = ?, descrizione = ?, avatar = ?,
                    verificato = ?
                WHERE id = ?`,
                [
                    this.nome,
                    this.cognome,
                    this.nome_officina,
                    this.specializzazione,
                    this.email,
                    this.telefono,
                    this.indirizzo,
                    this.citta,
                    this.cap,
                    this.latitudine,
                    this.longitudine,
                    this.descrizione,
                    this.avatar,
                    this.verificato ? 1 : 0,
                    this.id
                ]
            );
            return true;
        } catch (err) {
            console.error('Errore in Meccanico.update:', err);
            throw err;
        }
    }

    static async updatePassword(id, password) {
        try {
            await db.run(
                'UPDATE meccanici SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
                [password, id]
            );
            return true;
        } catch (err) {
            console.error('Errore in Meccanico.updatePassword:', err);
            throw err;
        }
    }

    static async updateResetToken(id, token, expires) {
        try {
            await db.run(
                'UPDATE meccanici SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
                [token, expires, id]
            );
            return true;
        } catch (err) {
            console.error('Errore in Meccanico.updateResetToken:', err);
            throw err;
        }
    }

    static async updateVerificato(id, verificato) {
        try {
            await db.run(
                'UPDATE meccanici SET verificato = ? WHERE id = ?',
                [verificato ? 1 : 0, id]
            );
            return true;
        } catch (err) {
            console.error('Errore in Meccanico.updateVerificato:', err);
            throw err;
        }
    }

    static async delete(id) {
        try {
            await db.run('DELETE FROM meccanici WHERE id = ?', [id]);
            return true;
        } catch (err) {
            console.error('Errore in Meccanico.delete:', err);
            throw err;
        }
    }

    static async aggiornaValutazioneMedia(id) {
        try {
            const result = await db.get(
                'SELECT AVG(valutazione) as media, COUNT(*) as totale FROM recensioni WHERE id_meccanico = ?',
                [id]
            );
            
            const media = result.media || 0;
            const totale = result.totale || 0;
            
            await db.run(
                'UPDATE meccanici SET valutazione = ?, numero_recensioni = ? WHERE id = ?',
                [media, totale, id]
            );
            
            return { media, totale };
        } catch (err) {
            console.error('Errore in Meccanico.aggiornaValutazioneMedia:', err);
            throw err;
        }
    }

    static async getOrari(id_meccanico) {
        try {
            const rows = await db.query(
                'SELECT * FROM orari_meccanici WHERE id_meccanico = ? ORDER BY giorno',
                [id_meccanico]
            );
            return rows;
        } catch (err) {
            console.error('Errore in Meccanico.getOrari:', err);
            throw err;
        }
    }

    static async updateOrari(id_meccanico, orari) {
        try {
            // Prima elimina gli orari esistenti
            await db.run('DELETE FROM orari_meccanici WHERE id_meccanico = ?', [id_meccanico]);
            
            // Poi inserisci i nuovi orari
            const stmt = db.db.prepare(
                `INSERT INTO orari_meccanici (
                    id_meccanico, giorno, apertura, chiusura, pausa_inizio, pausa_fine, chiuso
                ) VALUES (?, ?, ?, ?, ?, ?, ?)`
            );
            
            for (const orario of orari) {
                stmt.run(
                    id_meccanico,
                    orario.giorno,
                    orario.apertura || null,
                    orario.chiusura || null,
                    orario.pausa_inizio || null,
                    orario.pausa_fine || null,
                    orario.chiuso ? 1 : 0
                );
            }
            
            stmt.finalize();
            return true;
        } catch (err) {
            console.error('Errore in Meccanico.updateOrari:', err);
            throw err;
        }
    }

    static async getServizi(id_meccanico) {
        try {
            const rows = await db.query(
                `SELECT s.id, s.nome, s.descrizione, s.icona, sm.prezzo
                 FROM servizi s
                 JOIN servizi_meccanici sm ON s.id = sm.id_servizio
                 WHERE sm.id_meccanico = ?`,
                [id_meccanico]
            );
            return rows;
        } catch (err) {
            console.error('Errore in Meccanico.getServizi:', err);
            throw err;
        }
    }

    static async aggiungiServizio(id_meccanico, id_servizio, prezzo) {
        try {
            await db.run(
                'INSERT INTO servizi_meccanici (id_meccanico, id_servizio, prezzo) VALUES (?, ?, ?)',
                [id_meccanico, id_servizio, prezzo]
            );
            return true;
        } catch (err) {
            console.error('Errore in Meccanico.aggiungiServizio:', err);
            throw err;
        }
    }

    static async rimuoviServizio(id_meccanico, id_servizio) {
        try {
            await db.run(
                'DELETE FROM servizi_meccanici WHERE id_meccanico = ? AND id_servizio = ?',
                [id_meccanico, id_servizio]
            );
            return true;
        } catch (err) {
            console.error('Errore in Meccanico.rimuoviServizio:', err);
            throw err;
        }
    }

    static async updateServizioPrezzo(id_meccanico, id_servizio, prezzo) {
        try {
            await db.run(
                'UPDATE servizi_meccanici SET prezzo = ? WHERE id_meccanico = ? AND id_servizio = ?',
                [prezzo, id_meccanico, id_servizio]
            );
            return true;
        } catch (err) {
            console.error('Errore in Meccanico.updateServizioPrezzo:', err);
            throw err;
        }
    }

    static async getRecensioni(id_meccanico, limit = 10, offset = 0) {
        try {
            const rows = await db.query(
                `SELECT r.*, c.nome as nome_cliente, c.cognome as cognome_cliente, c.avatar as avatar_cliente
                 FROM recensioni r
                 JOIN clienti c ON r.id_cliente = c.id
                 WHERE r.id_meccanico = ?
                 ORDER BY r.data_recensione DESC
                 LIMIT ? OFFSET ?`,
                [id_meccanico, limit, offset]
            );
            return rows;
        } catch (err) {
            console.error('Errore in Meccanico.getRecensioni:', err);
            throw err;
        }
    }

    static async countRecensioni(id_meccanico) {
        try {
            const result = await db.get(
                'SELECT COUNT(*) as count FROM recensioni WHERE id_meccanico = ?',
                [id_meccanico]
            );
            return result.count;
        } catch (err) {
            console.error('Errore in Meccanico.countRecensioni:', err);
            throw err;
        }
    }

    static async getNomeCompleto(id) {
        try {
            const meccanico = await this.findById(id);
            if (!meccanico) return null;
            return `${meccanico.nome} ${meccanico.cognome}`;
        } catch (err) {
            console.error('Errore in Meccanico.getNomeCompleto:', err);
            throw err;
        }
    }

    getNomeCompleto() {
        return `${this.nome} ${this.cognome}`;
    }
}
class Admin {
    constructor(data) {
        this.id = data.id;
        this.nome = data.nome;
        this.email = data.email;
        this.password = data.password;
        this.avatar = data.avatar;
        this.data_registrazione = data.data_registrazione;
        this.reset_token = data.reset_token;
        this.reset_token_expires = data.reset_token_expires;
        this.tipo = 'admin';
    }

    static async findById(id) {
        try {
            const row = await db.get('SELECT * FROM admin WHERE id = ?', [id]);
            if (!row) return null;
            return new Admin(row);
        } catch (err) {
            console.error('Errore in Admin.findById:', err);
            throw err;
        }
    }

    static async findByEmail(email) {
        try {
            const row = await db.get('SELECT * FROM admin WHERE email = ?', [email]);
            if (!row) return null;
            return new Admin(row);
        } catch (err) {
            console.error('Errore in Admin.findByEmail:', err);
            throw err;
        }
    }

    static async findByResetToken(token) {
        try {
            const row = await db.get('SELECT * FROM admin WHERE reset_token = ?', [token]);
            if (!row) return null;
            return new Admin(row);
        } catch (err) {
            console.error('Errore in Admin.findByResetToken:', err);
            throw err;
        }
    }

    static async getAll() {
        try {
            const rows = await db.query('SELECT * FROM admin ORDER BY nome');
            return rows.map(row => new Admin(row));
        } catch (err) {
            console.error('Errore in Admin.getAll:', err);
            throw err;
        }
    }

    static async create(data) {
        try {
            const result = await db.run(
                `INSERT INTO admin (
                    nome, email, password, data_registrazione, tipo
                ) VALUES (?, ?, ?, ?, ?)`,
                [
                    data.nome,
                    data.email,
                    data.password,
                    data.data_registrazione || new Date().toISOString(),
                    'admin'
                ]
            );
            
            const row = await db.get('SELECT * FROM admin WHERE id = ?', [result.id]);
            return new Admin(row);
        } catch (err) {
            console.error('Errore in Admin.create:', err);
            throw err;
        }
    }

    async update() {
        try {
            await db.run(
                `UPDATE admin SET 
                    nome = ?, email = ?, avatar = ?
                WHERE id = ?`,
                [
                    this.nome,
                    this.email,
                    this.avatar,
                    this.id
                ]
            );
            return true;
        } catch (err) {
            console.error('Errore in Admin.update:', err);
            throw err;
        }
    }

    static async updatePassword(id, password) {
        try {
            await db.run(
                'UPDATE admin SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
                [password, id]
            );
            return true;
        } catch (err) {
            console.error('Errore in Admin.updatePassword:', err);
            throw err;
        }
    }

    static async updateResetToken(id, token, expires) {
        try {
            await db.run(
                'UPDATE admin SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
                [token, expires, id]
            );
            return true;
        } catch (err) {
            console.error('Errore in Admin.updateResetToken:', err);
            throw err;
        }
    }

    static async delete(id) {
        try {
            // Non permettere l'eliminazione dell'admin con ID 1 (admin di default)
            if (id === 1) {
                throw new Error('Non è possibile eliminare l\'admin di default');
            }
            
            await db.run('DELETE FROM admin WHERE id = ?', [id]);
            return true;
        } catch (err) {
            console.error('Errore in Admin.delete:', err);
            throw err;
        }
    }

    // Metodi specifici dell'admin

    static async getStatistiche() {
        try {
            // Conteggio clienti
            const totaleClienti = await db.get('SELECT COUNT(*) as count FROM clienti');
            
            // Conteggio clienti ultimi 30 giorni
            const clientiRecenti = await db.get(
                'SELECT COUNT(*) as count FROM clienti WHERE data_registrazione >= date("now", "-30 day")'
            );
            
            // Calcola crescita percentuale clienti
            const crescitaClienti = totaleClienti.count > 0 
                ? Math.round((clientiRecenti.count / totaleClienti.count) * 100) 
                : 0;
            
            // Conteggio meccanici
            const totaleMeccanici = await db.get('SELECT COUNT(*) as count FROM meccanici');
            
            // Conteggio meccanici ultimi 30 giorni
            const meccaniciRecenti = await db.get(
                'SELECT COUNT(*) as count FROM meccanici WHERE data_registrazione >= date("now", "-30 day")'
            );
            
            // Calcola crescita percentuale meccanici
            const crescitaMeccanici = totaleMeccanici.count > 0 
                ? Math.round((meccaniciRecenti.count / totaleMeccanici.count) * 100) 
                : 0;
            
            // Conteggio riparazioni
            const totaleRiparazioni = await db.get('SELECT COUNT(*) as count FROM riparazioni');
            
            // Conteggio riparazioni ultimi 30 giorni
            const riparazioniRecenti = await db.get(
                'SELECT COUNT(*) as count FROM riparazioni WHERE data_richiesta >= date("now", "-30 day")'
            );
            
            // Calcola crescita percentuale riparazioni
            const crescitaRiparazioni = totaleRiparazioni.count > 0 
                ? Math.round((riparazioniRecenti.count / totaleRiparazioni.count) * 100) 
                : 0;
            
            // Conteggio recensioni
            const totaleRecensioni = await db.get('SELECT COUNT(*) as count FROM recensioni');
            
            // Conteggio recensioni ultimi 30 giorni
            const recensioniRecenti = await db.get(
                'SELECT COUNT(*) as count FROM recensioni WHERE data_recensione >= date("now", "-30 day")'
            );
            
            // Calcola crescita percentuale recensioni
            const crescitaRecensioni = totaleRecensioni.count > 0 
                ? Math.round((recensioniRecenti.count / totaleRecensioni.count) * 100) 
                : 0;
            
            return {
                totale_clienti: totaleClienti.count,
                clienti_recenti: clientiRecenti.count,
                crescita_clienti: crescitaClienti,
                
                totale_meccanici: totaleMeccanici.count,
                meccanici_recenti: meccaniciRecenti.count,
                crescita_meccanici: crescitaMeccanici,
                
                totale_riparazioni: totaleRiparazioni.count,
                riparazioni_recenti: riparazioniRecenti.count,
                crescita_riparazioni: crescitaRiparazioni,
                
                totale_recensioni: totaleRecensioni.count,
                recensioni_recenti: recensioniRecenti.count,
                crescita_recensioni: crescitaRecensioni
            };
        } catch (err) {
            console.error('Errore in Admin.getStatistiche:', err);
            throw err;
        }
    }

    static async getRiparazioniPerStato() {
        try {
            const stati = ['richiesta', 'preventivo', 'accettata', 'in_corso', 'completata', 'rifiutata'];
            const result = {};
            
            for (const stato of stati) {
                const row = await db.get(
                    'SELECT COUNT(*) as count FROM riparazioni WHERE stato = ?',
                    [stato]
                );
                result[stato] = row.count;
            }
            
            return result;
        } catch (err) {
            console.error('Errore in Admin.getRiparazioniPerStato:', err);
            throw err;
        }
    }

    static async getAttivitaMensile() {
        try {
            // Ottiene il numero di nuovi clienti, meccanici e riparazioni per ogni mese degli ultimi 12 mesi
            const mesi = [];
            const oggi = new Date();
            
            for (let i = 11; i >= 0; i--) {
                const meseCorrente = new Date(oggi.getFullYear(), oggi.getMonth() - i, 1);
                const meseFine = new Date(oggi.getFullYear(), oggi.getMonth() - i + 1, 0);
                
                const inizio = meseCorrente.toISOString().split('T')[0];
                const fine = meseFine.toISOString().split('T')[0];
                
                const clienti = await db.get(
                    'SELECT COUNT(*) as count FROM clienti WHERE data_registrazione BETWEEN ? AND ?',
                    [inizio, fine]
                );
                
                const meccanici = await db.get(
                    'SELECT COUNT(*) as count FROM meccanici WHERE data_registrazione BETWEEN ? AND ?',
                    [inizio, fine]
                );
                
                const riparazioni = await db.get(
                    'SELECT COUNT(*) as count FROM riparazioni WHERE data_richiesta BETWEEN ? AND ?',
                    [inizio, fine]
                );
                
                const opzioni = { month: 'short' };
                const nomeMese = meseCorrente.toLocaleDateString('it-IT', opzioni);
                
                mesi.push({
                    mese: nomeMese,
                    clienti: clienti.count,
                    meccanici: meccanici.count,
                    riparazioni: riparazioni.count
                });
            }
            
            return mesi;
        } catch (err) {
            console.error('Errore in Admin.getAttivitaMensile:', err);
            throw err;
        }
    }

    static async getMeccaniciRecenti(limit = 5) {
        try {
            const rows = await db.query(
                'SELECT * FROM meccanici ORDER BY data_registrazione DESC LIMIT ?',
                [limit]
            );
            return rows.map(row => new Meccanico(row));
        } catch (err) {
            console.error('Errore in Admin.getMeccaniciRecenti:', err);
            throw err;
        }
    }

    static async getRiparazioniRecenti(limit = 5) {
        try {
            const rows = await db.query(
                `SELECT r.*, 
                    c.nome as nome_cliente, c.cognome as cognome_cliente, c.avatar as avatar_cliente,
                    m.nome as nome_meccanico, m.cognome as cognome_meccanico, m.avatar as avatar_meccanico,
                    v.marca, v.modello
                 FROM riparazioni r
                 JOIN clienti c ON r.id_cliente = c.id
                 JOIN meccanici m ON r.id_meccanico = m.id
                 LEFT JOIN veicoli v ON r.id_veicolo = v.id
                 ORDER BY r.data_richiesta DESC
                 LIMIT ?`,
                [limit]
            );
            return rows;
        } catch (err) {
            console.error('Errore in Admin.getRiparazioniRecenti:', err);
            throw err;
        }
    }

    static async verificaMeccanico(id_meccanico, verificato = true) {
        try {
            await db.run(
                'UPDATE meccanici SET verificato = ? WHERE id = ?',
                [verificato ? 1 : 0, id_meccanico]
            );
            return true;
        } catch (err) {
            console.error('Errore in Admin.verificaMeccanico:', err);
            throw err;
        }
    }
}

module.exports = { Cliente, Meccanico, Admin };