"use strict";

// Funzioni per la ricerca globale

document.addEventListener('DOMContentLoaded', () => {
    // Inizializza la ricerca nella home page
    initGlobalSearch();
    
    // Gestisce i risultati di ricerca se siamo nella pagina search-results.html
    if (window.location.pathname.includes('search-results.html')) {
        handleSearchResults();
    }
});

/**
 * Inizializza la funzionalità di ricerca globale
 */
function initGlobalSearch() {
    const searchButton = document.querySelector('.search-button');
    const searchInput = document.querySelector('.search-input');
    
    if (searchButton && searchInput) {
        searchButton.addEventListener('click', () => {
            performSearch(searchInput);
        });
        
        // Permetti anche di premere Enter per cercare
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch(searchInput);
            }
        });
    }
}

/**
 * Esegue la ricerca e reindirizza alla pagina dei risultati
 * @param {HTMLInputElement} searchInput - L'elemento input della ricerca
 */
function performSearch(searchInput) {
    const searchTerm = searchInput.value.trim();
    if (searchTerm) {
        // Reindirizza alla pagina di ricerca con il termine di ricerca
        window.location.href = `/search-results.html?q=${encodeURIComponent(searchTerm)}`;
    }
}

/**
 * Gestisce i risultati della ricerca nella pagina dei risultati
 */
function handleSearchResults() {
    // Ottieni il termine di ricerca dall'URL
    const urlParams = new URLSearchParams(window.location.search);
    const searchTerm = urlParams.get('q');
    
    // Imposta il termine di ricerca nell'input della pagina dei risultati
    const searchInput = document.getElementById('searchResultsInput');
    if (searchInput && searchTerm) {
        searchInput.value = searchTerm;
    }
    
    // Mostra il termine di ricerca nel titolo
    const searchQueryDisplay = document.getElementById('searchQueryDisplay');
    if (searchQueryDisplay && searchTerm) {
        searchQueryDisplay.textContent = searchTerm;
    }
    
    if (searchTerm) {
        // Carica i risultati della ricerca per meccanici e servizi
        loadSearchResults(searchTerm);
    }
}

/**
 * Carica i risultati della ricerca
 * @param {string} searchTerm - Il termine di ricerca
 */
async function loadSearchResults(searchTerm) {
    try {
        // Mostra il loader
        showLoading(true);
        
        // Carica in parallelo i meccanici e i servizi
        await Promise.all([
            searchMeccanici(searchTerm),
            searchServizi(searchTerm)
        ]);
        
        // Nasconde il loader
        showLoading(false);
        
        // Verifica se ci sono risultati complessivi
        checkNoResults();
    } catch (error) {
        console.error('Errore durante la ricerca:', error);
        showErrorMessage('Si è verificato un errore durante la ricerca. Riprova più tardi.');
        showLoading(false);
    }
}

/**
 * Cerca meccanici in base al termine di ricerca
 * @param {string} searchTerm - Il termine di ricerca
 */
async function searchMeccanici(searchTerm) {
    try {
        // In un'implementazione reale, questa sarebbe una chiamata API
        // Per ora, simuliamo una risposta con dati di esempio
        await simulateApiCall();
        
        // Meccanici di esempio (in un'app reale verrebbero dal server)
        const meccaniciEsempio = [
            {
                id: 1,
                nome: "Mario Rossi",
                nome_officina: "Officina Rossi",
                specializzazione: "Meccanica Generale",
                valutazione: 4.8,
                numero_recensioni: 24,
                verificato: true,
                telefono: "339 4567890",
                citta: "Milano",
                indirizzo: "Via Roma 123",
                avatar: "media/img/default_mechanic.png"
            },
            {
                id: 2,
                nome: "Giuseppe Verdi",
                nome_officina: "Autofficina Verdi",
                specializzazione: "Elettronica",
                valutazione: 4.5,
                numero_recensioni: 18,
                verificato: true,
                telefono: "338 1234567",
                citta: "Roma",
                indirizzo: "Via Torino 45",
                avatar: "media/img/default_mechanic.png"
            },
            {
                id: 3,
                nome: "Luigi Bianchi",
                nome_officina: "Gomme & Tagliandi",
                specializzazione: "Cambio Gomme",
                valutazione: 4.2,
                numero_recensioni: 15,
                verificato: false,
                telefono: "340 9876543",
                citta: "Torino",
                indirizzo: "Corso Vittorio 78",
                avatar: "media/img/default_mechanic.png"
            }
        ];
        
        // Filtra i meccanici in base al termine di ricerca
        const meccanici = meccaniciEsempio.filter(mec => {
            const searchTermLower = searchTerm.toLowerCase();
            return mec.nome.toLowerCase().includes(searchTermLower) || 
                   (mec.nome_officina && mec.nome_officina.toLowerCase().includes(searchTermLower)) ||
                   mec.specializzazione.toLowerCase().includes(searchTermLower) ||
                   mec.citta.toLowerCase().includes(searchTermLower);
        });
        
        // Visualizza i risultati
        displayMeccaniciResults(meccanici);
    } catch (error) {
        console.error('Errore durante la ricerca dei meccanici:', error);
        throw error;
    }
}

/**
 * Cerca servizi in base al termine di ricerca
 * @param {string} searchTerm - Il termine di ricerca
 */
async function searchServizi(searchTerm) {
    try {
        // In un'implementazione reale, questa sarebbe una chiamata API
        // Per ora, simuliamo una risposta con dati di esempio
        await simulateApiCall();
        
        // Servizi di esempio (in un'app reale verrebbero dal server)
        const serviziEsempio = [
            {
                id: 1,
                nome: "Elettronica",
                descrizione: "Diagnostica computerizzata, riparazione centraline elettroniche, sistemi di navigazione, impianti audio e video, sistemi di sicurezza.",
                immagine: "media/img/elettronica.jpg",
                icona: "fa-microchip"
            },
            {
                id: 2,
                nome: "Meccanica Generale",
                descrizione: "Riparazioni motore, freni, sospensioni, trasmissione, frizione, sistemi di raffreddamento, sistemi di alimentazione.",
                immagine: "media/img/meccanicagen.webp",
                icona: "fa-cogs"
            },
            {
                id: 3,
                nome: "Revisioni",
                descrizione: "Controlli e revisioni periodiche obbligatorie, pre-revisione, controllo emissioni, test di sicurezza, collaudi.",
                immagine: "media/img/revisioni.jpg",
                icona: "fa-clipboard-check"
            },
            {
                id: 4,
                nome: "Tagliandi",
                descrizione: "Manutenzione ordinaria secondo le specifiche del costruttore, cambio olio e filtri, controlli generali e tagliandi programmati.",
                immagine: "media/img/meccanico3.png",
                icona: "fa-oil-can"
            },
            {
                id: 5,
                nome: "Cambio Gomme",
                descrizione: "Sostituzione pneumatici, equilibratura, convergenza, riparazione forature, montaggio e smontaggio gomme estive e invernali.",
                immagine: "media/img/gomme.jpeg",
                icona: "fa-tire"
            },
            {
                id: 6,
                nome: "Carrozzeria",
                descrizione: "Riparazione danni alla carrozzeria, verniciatura, lucidatura, trattamenti protettivi, riparazione parabrezza, restauro auto d'epoca.",
                immagine: "media/img/carrozzeria.jpg",
                icona: "fa-spray-can"
            }
        ];
        
        // Filtra i servizi in base al termine di ricerca
        const servizi = serviziEsempio.filter(servizio => {
            const searchTermLower = searchTerm.toLowerCase();
            return servizio.nome.toLowerCase().includes(searchTermLower) || 
                   servizio.descrizione.toLowerCase().includes(searchTermLower);
        });
        
        // Visualizza i risultati
        displayServiziResults(servizi);
    } catch (error) {
        console.error('Errore durante la ricerca dei servizi:', error);
        throw error;
    }
}

/**
 * Visualizza i risultati della ricerca dei meccanici
 * @param {Array} meccanici - Lista dei meccanici trovati
 */
function displayMeccaniciResults(meccanici) {
    const container = document.getElementById('meccaniciResults');
    if (!container) return;
    
    // Aggiorna il contatore dei risultati
    const counter = document.getElementById('meccaniciCounter');
    if (counter) {
        counter.textContent = meccanici.length;
    }
    
    // Nascondi la sezione se non ci sono risultati
    const section = document.getElementById('meccaniciSection');
    if (section) {
        section.style.display = meccanici.length > 0 ? 'block' : 'none';
    }
    
    if (meccanici.length === 0) {
        return;
    }
    
    const html = meccanici.map(mec => `
        <div class="col-md-6 col-lg-4 meccanico-card">
            <div class="card">
                <div class="card-header position-relative">
                    ${mec.verificato ? `
                        <div class="verificato-badge">
                            <i class="fas fa-check-circle"></i>
                            <span>Verificato</span>
                        </div>
                    ` : ''}
                    <img src="${mec.avatar}" alt="${mec.nome}" class="meccanico-avatar">
                    <h3 class="card-title">${mec.nome}</h3>
                    <div class="meccanico-specializzazione">${mec.nome_officina || ''}</div>
                    <div class="meccanico-specializzazione">${mec.specializzazione}</div>
                    <div class="meccanico-rating">
                        ${'★'.repeat(Math.floor(mec.valutazione))}${'☆'.repeat(5 - Math.floor(mec.valutazione))}
                        <span class="rating-text">${mec.valutazione.toFixed(1)} (${mec.numero_recensioni} recensioni)</span>
                    </div>
                </div>
                <div class="card-body">
                    <div class="meccanico-info">
                        <div class="info-item">
                            <div class="info-icon">
                                <i class="fas fa-map-marker-alt"></i>
                            </div>
                            <div>${mec.indirizzo || ''}, ${mec.citta || ''}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-icon">
                                <i class="fas fa-phone-alt"></i>
                            </div>
                            <div>${mec.telefono || 'N/A'}</div>
                        </div>
                    </div>
                    <a href="meccanico-profilo.html?id=${mec.id}" class="btn btn-primary">
                        Visualizza profilo
                    </a>
                </div>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
}

/**
 * Visualizza i risultati della ricerca dei servizi
 * @param {Array} servizi - Lista dei servizi trovati
 */
function displayServiziResults(servizi) {
    const container = document.getElementById('serviziResults');
    if (!container) return;
    
    // Aggiorna il contatore dei risultati
    const counter = document.getElementById('serviziCounter');
    if (counter) {
        counter.textContent = servizi.length;
    }
    
    // Nascondi la sezione se non ci sono risultati
    const section = document.getElementById('serviziSection');
    if (section) {
        section.style.display = servizi.length > 0 ? 'block' : 'none';
    }
    
    if (servizi.length === 0) {
        return;
    }
    
    const html = servizi.map(servizio => `
        <div class="col-md-6 col-lg-4 servizio-box">
            <div class="card">
                <img src="${servizio.immagine}" class="card-img-top" alt="${servizio.nome}">
                <div class="card-body">
                    <h3 class="card-title">${servizio.nome}</h3>
                    <p class="card-text">${servizio.descrizione}</p>
                    <a href="meccanici.html?servizio=${encodeURIComponent(servizio.nome)}" class="btn btn-servizio">
                        Trova meccanico
                    </a>
                </div>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
}

/**
 * Verifica se non ci sono risultati e mostra un messaggio appropriato
 */
function checkNoResults() {
    const meccaniciSection = document.getElementById('meccaniciSection');
    const serviziSection = document.getElementById('serviziSection');
    const noResultsSection = document.getElementById('noResultsSection');
    
    if (!meccaniciSection || !serviziSection || !noResultsSection) return;
    
    const meccaniciVisible = meccaniciSection.style.display !== 'none';
    const serviziVisible = serviziSection.style.display !== 'none';
    
    if (!meccaniciVisible && !serviziVisible) {
        noResultsSection.style.display = 'block';
    } else {
        noResultsSection.style.display = 'none';
    }
}

/**
 * Mostra o nasconde l'indicatore di caricamento
 * @param {boolean} show - true per mostrare, false per nascondere
 */
function showLoading(show) {
    const loader = document.getElementById('searchLoader');
    if (!loader) return;
    
    loader.style.display = show ? 'block' : 'none';
}

/**
 * Mostra un messaggio di errore
 * @param {string} message - Il messaggio di errore da mostrare
 */
function showErrorMessage(message) {
    const errorSection = document.getElementById('errorSection');
    const errorMessage = document.getElementById('errorMessage');
    
    if (!errorSection || !errorMessage) return;
    
    errorMessage.textContent = message;
    errorSection.style.display = 'block';
}

/**
 * Simula una chiamata API con un ritardo
 * @param {number} delay - Il ritardo in millisecondi
 * @returns {Promise} Una promise che si risolve dopo il ritardo
 */
function simulateApiCall(delay = 500) {
    return new Promise(resolve => setTimeout(resolve, delay));
}