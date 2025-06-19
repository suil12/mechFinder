"use strict";

const db = require('../database/db');

// ckasse che mi rappresenta il mio chatbot
class Chatbot {
    constructor() {
        // il mio file con le risposte predefinite per domande frequenti, per aggiungere, seguire il modello "keyword": "response"
        this.faqs = {
            'servizi': 'Offriamo una vasta gamma di servizi di riparazione auto, inclusi: meccanica generale, elettronica, cambio gomme, tagliandi, carrozzeria e revisioni. Puoi vedere tutti i servizi su /servizi.',
            'meccanici': 'Puoi trovare tutti i meccanici disponibili nella pagina /meccanici. Puoi cercare per specializzazione o località.',
            'prenotazione': 'Per prenotare una riparazione, devi prima registrarti come cliente. Poi, puoi selezionare un meccanico e richiedere un preventivo.',
            'orari': 'Gli orari di apertura variano in base al meccanico. Puoi controllare gli orari di ogni meccanico nella loro pagina profilo.',
            'prezzi': 'I prezzi variano in base al tipo di servizio e al meccanico. Puoi richiedere un preventivo gratuito per qualsiasi riparazione.',
            'pagamento': 'Accettiamo pagamenti in contanti, carte di credito e bonifici bancari. I dettagli variano in base al meccanico.',
            'registrazione': 'Puoi registrarti come cliente o come meccanico. Clicca sul pulsante "Accedi" in alto a destra e poi su "Registrati".',
            'contatti': 'Puoi contattarci tramite il modulo nella pagina /contatti o chiamando il numero +39 01 2345 6789.',
            'default': 'Mi dispiace, non ho capito la tua domanda. Puoi provare a riformularla o contattare il supporto clienti.'
        };
    }

    // qui come processo un messaggio
    async processMessage(message, userData = null) {
        message = message.toLowerCase().trim();
        
        // dopo il trim cerca nelle response per keyword la risposta opportuna
        for (const [keyword, response] of Object.entries(this.faqs)) {
            if (message.includes(keyword)) {
                return response;
            }
        }
        
        // specifici per utenti loggati
        if (userData) {
            // cliente chiede sue riparazioni
            if (userData.tipo === 'cliente' && 
                (message.includes('mie riparazioni') || message.includes('miei veicoli'))) {
                return `Puoi visualizzare le tue riparazioni nella tua dashboard personale: <a href="/cliente/riparazioni">Le mie riparazioni</a>`;
            }
            
            // Se l'utente è un meccanico 
            if (userData.tipo === 'meccanico' && 
                (message.includes('richieste') || message.includes('lavori'))) {
                return `Puoi visualizzare le richieste di riparazione nella tua dashboard: <a href="/meccanico/riparazioni">Riparazioni</a>`;
            }
        }
        
        // Risposta un meccanico specifico
        if (message.includes('meccanico') && message.match(/[a-z]+ [a-z]+/i)) {
            const possibleName = message.match(/[a-z]+ [a-z]+/i)[0];
            try {
                // Cerca se esiste un meccanico con questo nome
                const meccanico = await this.cercaMeccanico(possibleName);
                if (meccanico) {
                    return `Ho trovato il meccanico ${meccanico.nome} ${meccanico.cognome}. Puoi visualizzare il suo profilo <a href="/meccanici/${meccanico.id}">qui</a>.`;
                }
            } catch (err) {
                console.error('Errore nella ricerca meccanico:', err);
            }
        }
        

        const servizi = ['tagliando', 'gomme', 'freni', 'motore', 'elettronica', 'carrozzeria'];
        for (const servizio of servizi) {
            if (message.includes(servizio)) {
                return `Offriamo servizi di ${servizio}. Puoi trovare maggiori dettagli nella pagina <a href="/servizi">servizi</a> o cercare un meccanico specializzato <a href="/meccanici">qui</a>.`;
            }
        }
        
        // Risposta default se non ho corrispondenze
        return this.faqs.default;
    }
    
// cerca un meccanico in db per nome 
    async cercaMeccanico(name) {
        try {
            const [firstName, lastName] = name.split(' ');
            let query = `SELECT * FROM meccanici WHERE 
                         (nome LIKE ? AND cognome LIKE ?) OR
                         nome_officina LIKE ? LIMIT 1`;
            
            const meccanico = await db.get(query, 
                [`%${firstName}%`, `%${lastName || ''}%`, `%${name}%`]);
            
            return meccanico;
        } catch (err) {
            console.error('Errore nella ricerca del meccanico:', err);
            return null;
        }
    }
    
//inserisce una convo in db
    async saveConversation(userId, userType, message, response) {
        try {
            await db.run(
                `INSERT INTO chatbot_conversazioni 
                (user_id, user_type, messaggio, risposta, timestamp)
                VALUES (?, ?, ?, ?, ?)`,
                [userId, userType, message, response, new Date()]
            );
        } catch (err) {
            console.error('Errore nel salvare la conversazione:', err);
        }
    }
}

module.exports = new Chatbot();