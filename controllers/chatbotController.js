"use strict";

const chatbot = require('../models/chatbot');

// Controller per la gestione delle interazioni con il chatbot

exports.processMessage = async (req, res) => {
    try {
        const { message } = req.body;
        
        if (!message || message.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Il messaggio non può essere vuoto'
            });
        }
        
        // recupero dati utente se autenticato
        const userData = req.isAuthenticated() ? req.user : null;
        
        // elabora il messaggio con funzione da chatbot.js
        const response = await chatbot.processMessage(message, userData);
        
        // Salva la conversazione in db
        const userId = userData ? userData.id : null;
        const userType = userData ? userData.tipo : 'guest';
        await chatbot.saveConversation(userId, userType, message, response);
        
        // genera risposta
        res.json({
            success: true,
            response: response,
            timestamp: new Date()
        });
    } catch (err) {
        console.error('Errore nell\'elaborazione del messaggio del chatbot:', err);
        res.status(500).json({
            success: false,
            message: 'Si è verificato un errore nell\'elaborazione del messaggio'
        });
    }
};