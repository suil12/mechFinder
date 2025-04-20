"use strict";

// Funzionalità comuni per tutte le dashboard
document.addEventListener('DOMContentLoaded', () => {
    // Inizializza il toggle della sidebar
    initSidebarToggle();
    
    // Inizializza i pulsanti di logout
    initLogoutButtons();
    
    // Aggiunge la classe active al link della pagina corrente
    highlightCurrentPage();
});

// Funzione per inizializzare il toggle della sidebar
function initSidebarToggle() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.dashboard-sidebar');
    
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            // Per schermi piccoli
            if (window.innerWidth < 992) {
                sidebar.classList.toggle('show');
                return;
            }
            
            // Per schermi grandi
            sidebar.classList.toggle('sidebar-collapsed');
            
            // Salva la preferenza dell'utente
            const isCollapsed = sidebar.classList.contains('sidebar-collapsed');
            localStorage.setItem('sidebar-collapsed', isCollapsed);
        });
        
        // Ripristina lo stato della sidebar dalle preferenze
        const isCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';
        if (isCollapsed) {
            sidebar.classList.add('sidebar-collapsed');
        }
        
        // Chiudi la sidebar al click esterno su schermi piccoli
        document.addEventListener('click', (e) => {
            if (window.innerWidth < 992 && 
                !sidebar.contains(e.target) && 
                !sidebarToggle.contains(e.target) && 
                sidebar.classList.contains('show')) {
                sidebar.classList.remove('show');
            }
        });
    }
}

// Funzione per inizializzare i pulsanti di logout
function initLogoutButtons() {
    const logoutButtons = document.querySelectorAll('#logoutBtn, #logoutBtnHeader');
    
    logoutButtons.forEach(btn => {
        btn.addEventListener('click', logout);
    });
}

// Funzione per il logout
async function logout(e) {
    e.preventDefault();
    
    try {
        const response = await fetch('/auth/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Reindirizza alla home page
            window.location.href = '/';
        } else {
            alert('Errore durante il logout. Riprova.');
        }
    } catch (error) {
        console.error('Errore durante il logout:', error);
        alert('Errore durante il logout. Riprova.');
    }
}

// Funzione per evidenziare il link della pagina corrente
function highlightCurrentPage() {
    const currentPath = window.location.pathname;
    
    // Ottieni tutti i link nella sidebar
    const sidebarLinks = document.querySelectorAll('.sidebar-nav a');
    
    sidebarLinks.forEach(link => {
        const linkPath = link.getAttribute('href');
        
        // Rimuovi prima tutte le classi active
        link.classList.remove('active');
        
        // Aggiungi la classe active se il percorso corrisponde
        if (currentPath === linkPath || 
            (linkPath !== '/' && currentPath.startsWith(linkPath))) {
            link.classList.add('active');
        }
    });
}

// Funzione per mostrare un messaggio di successo
function showToast(message, type = 'success') {
    // Crea un elemento toast
    const toastEl = document.createElement('div');
    toastEl.className = `toast align-items-center text-white bg-${type} border-0`;
    toastEl.setAttribute('role', 'alert');
    toastEl.setAttribute('aria-live', 'assertive');
    toastEl.setAttribute('aria-atomic', 'true');
    
    // Imposta la struttura interna
    toastEl.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    
    // Crea un container per i toast se non esiste
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(toastContainer);
    }
    
    // Aggiungi il toast al container
    toastContainer.appendChild(toastEl);
    
    // Inizializza il toast con Bootstrap
    const toast = new bootstrap.Toast(toastEl, {
        autohide: true,
        delay: 3000
    });
    
    // Mostra il toast
    toast.show();
    
    // Rimuovi il toast dal DOM dopo che è stato nascosto
    toastEl.addEventListener('hidden.bs.toast', () => {
        toastEl.remove();
    });
}

// Funzione helper per formattare la data
function formatDate(dateString, options = {}) {
    const defaultOptions = { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
    };
    
    const mergedOptions = { ...defaultOptions, ...options };
    
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', mergedOptions);
}

// Funzione helper per formattare l'orario
function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('it-IT', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

// Funzione helper per formattare il prezzo
function formatPrice(price) {
    return new Intl.NumberFormat('it-IT', { 
        style: 'currency', 
        currency: 'EUR' 
    }).format(price);
}

// Funzione helper per validare un form
function validateForm(form) {
    // Verifica se il form è valido secondo la validazione HTML5
    if (!form.checkValidity()) {
        // Attiva la validazione tramite Bootstrap
        form.classList.add('was-validated');
        return false;
    }
    return true;
}

// Funzione helper per convertire un form in oggetto JSON
function formToJSON(form) {
    const formData = new FormData(form);
    const data = {};
    
    formData.forEach((value, key) => {
        // Gestisci i campi array (che terminano con [])
        if (key.endsWith('[]')) {
            const k = key.slice(0, -2);
            data[k] = data[k] || [];
            data[k].push(value);
        } else {
            data[key] = value;
        }
    });
    
    return data;
}

// Funzione helper per aggiornare un form con dati JSON
function updateFormWithJSON(form, data) {
    Object.keys(data).forEach(key => {
        const input = form.elements[key];
        if (input) {
            if (input.type === 'checkbox') {
                input.checked = !!data[key];
            } else if (input.type === 'radio') {
                const radio = form.querySelector(`input[name="${key}"][value="${data[key]}"]`);
                if (radio) radio.checked = true;
            } else {
                input.value = data[key] || '';
            }
        }
    });
}

// Funzione helper per gestire gli errori di risposta
async function handleResponseError(response) {
    if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const error = await response.json();
            throw new Error(error.message || 'Si è verificato un errore');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
}

// Funzione helper per effettuare richieste API
async function fetchAPI(url, options = {}) {
    try {
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        const mergedOptions = { ...defaultOptions, ...options };
        
        // Se è presente un body e non è FormData, lo converte in JSON
        if (mergedOptions.body && !(mergedOptions.body instanceof FormData)) {
            mergedOptions.body = JSON.stringify(mergedOptions.body);
        }
        
        // Se è FormData, rimuove il Content-Type per consentire al browser di impostarlo correttamente
        if (mergedOptions.body instanceof FormData) {
            delete mergedOptions.headers['Content-Type'];
        }
        
        const response = await fetch(url, mergedOptions);
        await handleResponseError(response);
        
        // Se la risposta è vuota, restituisci un oggetto vuoto
        if (response.status === 204) {
            return {};
        }
        
        return await response.json();
    } catch (error) {
        console.error(`Error in API call to ${url}:`, error);
        throw error;
    }
}