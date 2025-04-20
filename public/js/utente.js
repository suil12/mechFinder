"use strict";

// Classe base per tutti gli utenti
class Utente {
    constructor(id, nome, cognome, email, telefono = null) {
        this.id = id;
        this.nome = nome;
        this.cognome = cognome;
        this.email = email;
        this.telefono = telefono;
        this.nome_completo = `${nome} ${cognome}`;
    }

    /**
     * Ottiene i dati dell'utente dal server
     * @returns {Promise<Object>} Dati dell'utente
     */
    async getDati() {
        try {
            const response = await fetch(`/api/utente/${this.id}`);
            if (!response.ok) {
                throw new Error('Errore nel recupero dei dati dell\'utente');
            }
            return await response.json();
        } catch (error) {
            console.error('Errore in Utente.getDati:', error);
            throw error;
        }
    }

    /**
     * Aggiorna i dati dell'utente
     * @param {Object} dati - Nuovi dati dell'utente
     * @returns {Promise<Object>} Risposta del server
     */
    async aggiornaDati(dati) {
        try {
            const response = await fetch(`/api/utente/${this.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dati)
            });
            
            if (!response.ok) {
                throw new Error('Errore nell\'aggiornamento dei dati dell\'utente');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Errore in Utente.aggiornaDati:', error);
            throw error;
        }
    }

    /**
     * Carica un avatar per l'utente
     * @param {File} file - File dell'avatar
     * @returns {Promise<Object>} Risposta del server
     */
    async caricaAvatar(file) {
        try {
            const formData = new FormData();
            formData.append('avatar', file);
            
            const response = await fetch(`/api/utente/${this.id}/avatar`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error('Errore nel caricamento dell\'avatar');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Errore in Utente.caricaAvatar:', error);
            throw error;
        }
    }
}

/**
 * Classe Cliente che estende Utente
 */
class Cliente extends Utente {
    constructor(id, nome, cognome, email, telefono = null, indirizzo = null, citta = null, cap = null, avatar = null) {
        super(id, nome, cognome, email, telefono);
        this.indirizzo = indirizzo;
        this.citta = citta;
        this.cap = cap;
        this.avatar = avatar;
        this.tipo = 'cliente';
    }

    /**
     * Ottiene un cliente dall'ID
     * @param {number} id - ID del cliente
     * @returns {Promise<Cliente>} Cliente trovato
     */
    static async getById(id) {
        try {
            const response = await fetch(`/api/clienti/${id}`);
            if (!response.ok) {
                throw new Error('Cliente non trovato');
            }
            
            const data = await response.json();
            return new Cliente(
                data.id,
                data.nome,
                data.cognome,
                data.email,
                data.telefono,
                data.indirizzo,
                data.citta,
                data.cap,
                data.avatar
            );
        } catch (error) {
            console.error('Errore in Cliente.getById:', error);
            throw error;
        }
    }

    /**
     * Ottiene il cliente attualmente autenticato
     * @returns {Promise<Cliente|null>} Cliente autenticato o null
     */
    static async getAutenticato() {
        try {
            const response = await fetch('/auth/check');
            const data = await response.json();
            
            if (!data.isAuthenticated || data.user.tipo !== 'cliente') {
                return null;
            }
            
            return new Cliente(
                data.user.id,
                data.user.nome,
                data.user.cognome,
                data.user.email,
                data.user.telefono,
                data.user.indirizzo,
                data.user.citta,
                data.user.cap,
                data.user.avatar
            );
        } catch (error) {
            console.error('Errore in Cliente.getAutenticato:', error);
            return null;
        }
    }

    /**
     * Ottiene i veicoli del cliente
     * @returns {Promise<Array>} Lista dei veicoli
     */
    async getVeicoli() {
        try {
            const response = await fetch('/api/veicoli');
            if (!response.ok) {
                throw new Error('Errore nel recupero dei veicoli');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Errore in Cliente.getVeicoli:', error);
            throw error;
        }
    }

    /**
     * Aggiunge un nuovo veicolo
     * @param {Object} dati - Dati del veicolo
     * @returns {Promise<Object>} Veicolo creato
     */
    async aggiungiVeicolo(dati) {
        try {
            const response = await fetch('/api/veicoli', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dati)
            });
            
            if (!response.ok) {
                throw new Error('Errore nell\'aggiunta del veicolo');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Errore in Cliente.aggiungiVeicolo:', error);
            throw error;
        }
    }

    /**
     * Elimina un veicolo
     * @param {number} id - ID del veicolo
     * @returns {Promise<Object>} Risposta del server
     */
    async eliminaVeicolo(id) {
        try {
            const response = await fetch(`/api/veicoli/${id}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error('Errore nell\'eliminazione del veicolo');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Errore in Cliente.eliminaVeicolo:', error);
            throw error;
        }
    }

    /**
     * Ottiene le riparazioni del cliente
     * @param {string} stato - Filtro per stato (opzionale)
     * @returns {Promise<Array>} Lista delle riparazioni
     */
    async getRiparazioni(stato = null) {
        try {
            let url = '/api/riparazioni';
            if (stato) {
                url += `?stato=${stato}`;
            }
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Errore nel recupero delle riparazioni');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Errore in Cliente.getRiparazioni:', error);
            throw error;
        }
    }

    /**
     * Crea una nuova richiesta di riparazione
     * @param {Object} dati - Dati della riparazione
     * @returns {Promise<Object>} Riparazione creata
     */
    async creaRiparazione(dati) {
        try {
            const response = await fetch('/api/riparazioni', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dati)
            });
            
            if (!response.ok) {
                throw new Error('Errore nella creazione della riparazione');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Errore in Cliente.creaRiparazione:', error);
            throw error;
        }
    }

    /**
     * Lascia una recensione per un meccanico
     * @param {Object} dati - Dati della recensione
     * @returns {Promise<Object>} Recensione creata
     */
    async lasciaRecensione(dati) {
        try {
            const response = await fetch(`/api/meccanici/${dati.id_meccanico}/recensioni`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dati)
            });
            
            if (!response.ok) {
                throw new Error('Errore nella creazione della recensione');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Errore in Cliente.lasciaRecensione:', error);
            throw error;
        }
    }

    /**
     * Ottiene le recensioni del cliente
     * @returns {Promise<Array>} Lista delle recensioni
     */
    async getRecensioni() {
        try {
            const response = await fetch('/api/recensioni');
            if (!response.ok) {
                throw new Error('Errore nel recupero delle recensioni');
            }
            
            return await response.json();
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
                valutazione = 0, numero_recensioni = 0, avatar = null) {
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
        this.avatar = avatar;
        this.tipo = 'meccanico';
    }

    /**
     * Ottiene un meccanico dall'ID
     * @param {number} id - ID del meccanico
     * @returns {Promise<Meccanico>} Meccanico trovato
     */
    static async getById(id) {
        try {
            const response = await fetch(`/api/meccanici/${id}`);
            if (!response.ok) {
                throw new Error('Meccanico non trovato');
            }
            
            const data = await response.json();
            return new Meccanico(
                data.id,
                data.nome,
                data.cognome,
                data.email,
                data.specializzazione,
                data.telefono,
                data.nome_officina,
                data.indirizzo,
                data.citta,
                data.cap,
                data.latitudine,
                data.longitudine,
                data.descrizione,
                data.valutazione,
                data.numero_recensioni,
                data.avatar
            );
        } catch (error) {
            console.error('Errore in Meccanico.getById:', error);
            throw error;
        }
    }

    /**
     * Ottiene il meccanico attualmente autenticato
     * @returns {Promise<Meccanico|null>} Meccanico autenticato o null
     */
    static async getAutenticato() {
        try {
            const response = await fetch('/auth/check');
            const data = await response.json();
            
            if (!data.isAuthenticated || data.user.tipo !== 'meccanico') {
                return null;
            }
            
            return new Meccanico(
                data.user.id,
                data.user.nome,
                data.user.cognome,
                data.user.email,
                data.user.specializzazione,
                data.user.telefono,
                data.user.nome_officina,
                data.user.indirizzo,
                data.user.citta,
                data.user.cap,
                data.user.latitudine,
                data.user.longitudine,
                data.user.descrizione,
                data.user.valutazione,
                data.user.numero_recensioni,
                data.user.avatar
            );
        } catch (error) {
            console.error('Errore in Meccanico.getAutenticato:', error);
            return null;
        }
    }

    /**
     * Cerca meccanici con vari filtri
     * @param {Object} filtri - Filtri di ricerca
     * @returns {Promise<Array<Meccanico>>} Lista di meccanici trovati
     */
    static async cerca(filtri = {}) {
        try {
            // Costruisci l'URL con i parametri di query
            const params = new URLSearchParams();
            for (const [key, value] of Object.entries(filtri)) {
                if (value !== null && value !== undefined) {
                    params.append(key, value);
                }
            }
            
            const url = `/api/meccanici?${params.toString()}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error('Errore nella ricerca dei meccanici');
            }
            
            const data = await response.json();
            
            // Converte i risultati in oggetti Meccanico
            return data.map(item => new Meccanico(
                item.id,
                item.nome,
                item.cognome,
                item.email,
                item.specializzazione,
                item.telefono,
                item.nome_officina,
                item.indirizzo,
                item.citta,
                item.cap,
                item.latitudine,
                item.longitudine,
                item.descrizione,
                item.valutazione,
                item.numero_recensioni,
                item.avatar
            ));
        } catch (error) {
            console.error('Errore in Meccanico.cerca:', error);
            throw error;
        }
    }

    /**
     * Ottiene le riparazioni del meccanico
     * @param {string} stato - Filtro per stato (opzionale)
     * @returns {Promise<Array>} Lista delle riparazioni
     */
    async getRiparazioni(stato = null) {
        try {
            let url = '/api/riparazioni';
            if (stato) {
                url += `?stato=${stato}`;
            }
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Errore nel recupero delle riparazioni');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Errore in Meccanico.getRiparazioni:', error);
            throw error;
        }
    }

    /**
     * Crea un preventivo per una riparazione
     * @param {Object} dati - Dati del preventivo
     * @returns {Promise<Object>} Preventivo creato
     */
    async creaPreventivo(dati) {
        try {
            const response = await fetch(`/api/riparazioni/${dati.id_riparazione}/preventivi`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dati)
            });
            
            if (!response.ok) {
                throw new Error('Errore nella creazione del preventivo');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Errore in Meccanico.creaPreventivo:', error);
            throw error;
        }
    }

    /**
     * Emette una ricevuta per una riparazione
     * @param {Object} dati - Dati della ricevuta
     * @returns {Promise<Object>} Ricevuta creata
     */
    async emettiRicevuta(dati) {
        try {
            const response = await fetch(`/api/riparazioni/${dati.id_riparazione}/ricevuta`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dati)
            });
            
            if (!response.ok) {
                throw new Error('Errore nell\'emissione della ricevuta');
            }
            
            return await response.json();
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
     * @returns {Promise<Object>} Risposta del server
     */
    async aggiornaStatoRiparazione(idRiparazione, nuovoStato, note = null) {
        try {
            const response = await fetch(`/api/riparazioni/${idRiparazione}/stato`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ stato: nuovoStato, note })
            });
            
            if (!response.ok) {
                throw new Error('Errore nell\'aggiornamento dello stato della riparazione');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Errore in Meccanico.aggiornaStatoRiparazione:', error);
            throw error;
        }
    }

    /**
     * Ottiene le recensioni del meccanico
     * @returns {Promise<Array>} Lista delle recensioni
     */
    async getRecensioni() {
        try {
            const response = await fetch(`/api/meccanici/${this.id}/recensioni`);
            if (!response.ok) {
                throw new Error('Errore nel recupero delle recensioni');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Errore in Meccanico.getRecensioni:', error);
            throw error;
        }
    }

    /**
     * Ottiene i servizi offerti dal meccanico
     * @returns {Promise<Array>} Lista dei servizi
     */
    async getServizi() {
        try {
            const response = await fetch(`/api/meccanici/${this.id}/servizi`);
            if (!response.ok) {
                throw new Error('Errore nel recupero dei servizi');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Errore in Meccanico.getServizi:', error);
            throw error;
        }
    }

    /**
     * Aggiorna i servizi offerti
     * @param {Object} dati - Dati dei servizi
     * @returns {Promise<Object>} Risposta del server
     */
    async aggiornaServizi(dati) {
        try {
            const response = await fetch('/meccanico/aggiorna-servizi', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dati)
            });
            
            if (!response.ok) {
                throw new Error('Errore nell\'aggiornamento dei servizi');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Errore in Meccanico.aggiornaServizi:', error);
            throw error;
        }
    }
}

