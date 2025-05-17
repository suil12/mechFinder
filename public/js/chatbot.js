"use strict";

/**
 * chatbot.js - Gestione del chatbot lato client
 * Questo file gestisce l'interfaccia e le interazioni del chatbot lato frontend.
 */

document.addEventListener('DOMContentLoaded', function() {
    // Riferimenti DOM
    const chatbotButton = document.getElementById('chatbotButton');
    const chatbotContainer = document.getElementById('chatbotContainer');
    const chatbotMessages = document.getElementById('chatbotMessages');
    const chatbotForm = document.getElementById('chatbotForm');
    const chatbotInput = document.getElementById('chatbotInput');
    const chatbotCloseButton = document.getElementById('chatbotClose');
    
    // Se il chatbot non è stato inizializzato nella pagina, esci
    if (!chatbotButton || !chatbotContainer) return;
    
    // Verifica se il chatbot era già aperto (sessione precedente)
    const isChatbotOpen = localStorage.getItem('chatbotOpen') === 'true';
    if (isChatbotOpen) {
        chatbotContainer.classList.add('chatbot-open');
    }
    
    // Apri/chiudi il chatbot quando si clicca sul pulsante
    chatbotButton.addEventListener('click', function() {
        chatbotContainer.classList.toggle('chatbot-open');
        
        // Quando il chatbot viene aperto, aggiungi il messaggio di benvenuto se è vuoto
        if (chatbotContainer.classList.contains('chatbot-open')) {
            localStorage.setItem('chatbotOpen', 'true');
            
            if (chatbotMessages.childElementCount === 0) {
                addChatbotMessage('Ciao! Sono il chatbot di MechFinder. Come posso aiutarti oggi? Puoi chiedermi informazioni sui servizi, meccanici, prenotazioni e altro.');
            }
            
            // Focus sull'input
            chatbotInput.focus();
        } else {
            localStorage.setItem('chatbotOpen', 'false');
        }
    });
    
    // Chiudi il chatbot quando si clicca sul pulsante di chiusura
    chatbotCloseButton.addEventListener('click', function() {
        chatbotContainer.classList.remove('chatbot-open');
        localStorage.setItem('chatbotOpen', 'false');
    });
    
    // Gestisci l'invio di un messaggio
    chatbotForm.addEventListener('submit', function(event) {
        event.preventDefault();
        
        const userMessage = chatbotInput.value.trim();
        if (!userMessage) return;
        
        // Aggiungi il messaggio dell'utente alla chat
        addUserMessage(userMessage);
        
        // Pulisci l'input
        chatbotInput.value = '';
        
        // Mostra l'indicatore di digitazione
        showTypingIndicator();
        
        // Invia il messaggio al server e ottieni la risposta
        sendMessageToServer(userMessage)
            .then(response => {
                // Rimuovi l'indicatore di digitazione
                removeTypingIndicator();
                
                // Aggiungi la risposta del chatbot
                addChatbotMessage(response.response);
                
                // Scorri automaticamente in basso
                chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
            })
            .catch(error => {
                console.error('Errore nella comunicazione con il chatbot:', error);
                
                // Rimuovi l'indicatore di digitazione
                removeTypingIndicator();
                
                // Messaggio di errore
                addChatbotMessage('Mi dispiace, c\'è stato un problema nella comunicazione. Riprova più tardi.');
                
                // Scorri automaticamente in basso
                chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
            });
    });
    
    /**
     * Aggiunge un messaggio dell'utente alla chat
     * @param {string} message - Il messaggio da aggiungere
     */
    function addUserMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chatbot-message user-message';
        messageDiv.innerHTML = `
            <div class="message-content">
                <p>${escapeHTML(message)}</p>
                <span class="message-time">${getCurrentTime()}</span>
            </div>
        `;
        
        chatbotMessages.appendChild(messageDiv);
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    }
    
    /**
     * Aggiunge un messaggio del chatbot alla chat
     * @param {string} message - Il messaggio da aggiungere
     */
    function addChatbotMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chatbot-message bot-message';
        messageDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <p>${message}</p>
                <span class="message-time">${getCurrentTime()}</span>
            </div>
        `;
        
        chatbotMessages.appendChild(messageDiv);
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    }
    
    /**
     * Mostra l'indicatore di digitazione
     */
    function showTypingIndicator() {
        const indicatorDiv = document.createElement('div');
        indicatorDiv.className = 'chatbot-message bot-message typing-indicator';
        indicatorDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <div class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        
        indicatorDiv.id = 'typingIndicator';
        chatbotMessages.appendChild(indicatorDiv);
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    }
    
    /**
     * Rimuove l'indicatore di digitazione
     */
    function removeTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) {
            indicator.remove();
        }
    }
    
    /**
     * Invia un messaggio al server e ottiene la risposta
     * @param {string} message - Il messaggio da inviare
     * @returns {Promise<Object>} - La risposta del server
     */
    async function sendMessageToServer(message) {
        const response = await fetch('/api/chatbot/message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: message })
        });
        
        if (!response.ok) {
            throw new Error('Errore nella comunicazione con il server');
        }
        
        return await response.json();
    }
    
    /**
     * Ottiene l'ora corrente formattata
     * @returns {string} - L'ora corrente nel formato HH:MM
     */
    function getCurrentTime() {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }
    
    /**
     * Escape HTML per evitare XSS
     * @param {string} text - Il testo da sanificare
     * @returns {string} - Il testo sanificato
     */
    function escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
});