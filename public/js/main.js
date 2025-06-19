"use strict";

// Controlla lo stato dell'autenticazione all'avvio
document.addEventListener('DOMContentLoaded', () => {
    // Controlla se l'utente è autenticato
    checkAuthStatus();
    
    // Inizializza la ricerca
    initSearch();
    
    // Carica i meccanici in primo piano
    if (document.getElementById('slider')) {
        loadFeaturedMechanics();
    }
    
    // Carica le recensioni in evidenza
    if (document.querySelector('.reviews')) {
        loadFeaturedReviews();
    }
    
    // Imposta l'anno corrente nel footer
    const yearElement = document.getElementById('currentYear');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
    
    // Event listener per il link di registrazione
    const registerLink = document.getElementById('registerLink');
    if (registerLink) {
        registerLink.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Chiudi il modal di login
            const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
            if (loginModal) {
                loginModal.hide();
            }
            
            // Apri il modal di registrazione
            setTimeout(() => {
                const registerModal = new bootstrap.Modal(document.getElementById('registerModal'));
                registerModal.show();
            }, 500);
        });
    }
    
    // Gestione delle validazioni client-side dei form di registrazione
    setupFormValidations();
});

// Funzione per controllare lo stato dell'autenticazione
async function checkAuthStatus() {
    try {
        const response = await fetch('/auth/check');
        const data = await response.json();
        
        if (data.isAuthenticated) {
            // Aggiorna l'interfaccia per un utente autenticato
            updateUIForAuthenticatedUser(data.user);
        } else {
            // Aggiorna l'interfaccia per un utente non autenticato
            updateUIForGuestUser();
        }
    } catch (error) {
        console.error('Errore nel controllo dello stato di autenticazione:', error);
    }
}

// Funzione per aggiornare l'interfaccia per un utente autenticato
function updateUIForAuthenticatedUser(user) {
    // Nascondi il pulsante di login e mostra il pulsante dashboard
    const loginButtons = document.querySelectorAll('.login-button');
    const dashboardBtn = document.getElementById('navDashboardBtn');
    
    if (loginButtons.length > 0) {
        loginButtons.forEach(btn => {
            // Se il pulsante ha l'ID navLoginBtn, nascondilo
            if (btn.id === 'navLoginBtn') {
                btn.classList.add('d-none');
            }
        });
    }
    
    if (dashboardBtn) {
        dashboardBtn.classList.remove('d-none');
        dashboardBtn.href = user.tipo === 'cliente' ? '/cliente/dashboard' : '/meccanico/dashboard';
        dashboardBtn.textContent = 'Dashboard';
    }
    
    // Aggiorna tutti gli altri elementi dell'interfaccia utente se necessario
    // Ad esempio, se ci sono pulsanti di login nella navbar mobile
    const mobileLoginBtn = document.querySelector('.offcanvas-body .login-button');
    if (mobileLoginBtn) {
        mobileLoginBtn.href = user.tipo === 'cliente' ? '/cliente/dashboard' : '/meccanico/dashboard';
        mobileLoginBtn.textContent = 'Dashboard';
        mobileLoginBtn.dataset.bsToggle = '';
        mobileLoginBtn.dataset.bsTarget = '';
    }
}

// Funzione per aggiornare l'interfaccia per un utente ospite
function updateUIForGuestUser() {
    // Mostra il pulsante di login e nascondi il pulsante dashboard
    const loginButtons = document.querySelectorAll('.login-button');
    const dashboardBtn = document.getElementById('navDashboardBtn');
    
    if (loginButtons.length > 0) {
        loginButtons.forEach(btn => {
            // Se il pulsante ha l'ID navLoginBtn, mostralo
            if (btn.id === 'navLoginBtn') {
                btn.classList.remove('d-none');
            }
        });
    }
    
    if (dashboardBtn) {
        dashboardBtn.classList.add('d-none');
    }
}

// Configurazione delle validazioni client-side dei form
function setupFormValidations() {
    // Validazione client-side per il form di registrazione cliente
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            const password = document.getElementById('regPassword').value;
            const confirmPassword = document.getElementById('regConfirmPassword').value;
            
            if (password !== confirmPassword) {
                e.preventDefault();
                alert('Le password non coincidono');
                return false;
            }
            
            if (password.length < 6) {
                e.preventDefault();
                alert('La password deve essere di almeno 6 caratteri');
                return false;
            }
            
            const termini = document.getElementById('regTermini').checked;
            if (!termini) {
                e.preventDefault();
                alert('Devi accettare i termini e condizioni');
                return false;
            }
        });
    }
    
    // Validazione client-side per il form di registrazione meccanico
    const registerMeccanicoForm = document.getElementById('registerMeccanicoForm');
    if (registerMeccanicoForm) {
        registerMeccanicoForm.addEventListener('submit', function(e) {
            const password = document.getElementById('regMecPassword').value;
            const confirmPassword = document.getElementById('regMecConfirmPassword').value;
            
            if (password !== confirmPassword) {
                e.preventDefault();
                alert('Le password non coincidono');
                return false;
            }
            
            if (password.length < 6) {
                e.preventDefault();
                alert('La password deve essere di almeno 6 caratteri');
                return false;
            }
            
            const termini = document.getElementById('regMecTermini').checked;
            if (!termini) {
                e.preventDefault();
                alert('Devi accettare i termini e condizioni');
                return false;
            }
            
            // Validazione campi specifici per meccanico
            const officina = document.getElementById('regMecOfficina').value.trim();
            if (!officina) {
                e.preventDefault();
                alert('Il nome dell\'officina è obbligatorio');
                return false;
            }
            
            const specializzazione = document.getElementById('regMecSpecializzazione').value;
            if (!specializzazione) {
                e.preventDefault();
                alert('La specializzazione è obbligatoria');
                return false;
            }
            
            const telefono = document.getElementById('regMecTelefono').value.trim();
            if (!telefono) {
                e.preventDefault();
                alert('Il telefono è obbligatorio');
                return false;
            }
            
            const citta = document.getElementById('regMecCitta').value.trim();
            if (!citta) {
                e.preventDefault();
                alert('La città è obbligatoria');
                return false;
            }
        });
    }
}

// Inizializza la ricerca avanzata
function initSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchForm = document.getElementById('searchForm');
    const searchSuggestions = document.getElementById('searchSuggestions');
    const searchType = document.getElementById('searchType');
    const searchTags = document.querySelectorAll('.search-tag');
    
    let suggestionTimeout;
    let currentSuggestionIndex = -1;
    
    // Gestione tag clickabili
    if (searchTags.length > 0) {
        searchTags.forEach(tag => {
            tag.addEventListener('click', () => {
                const searchTerm = tag.dataset.search;
                const searchTypeValue = tag.dataset.type;
                
                if (searchInput) {
                    searchInput.value = searchTerm;
                }
                if (searchType) {
                    searchType.value = searchTypeValue;
                }
                
                // Submetti il form
                if (searchForm) {
                    searchForm.submit();
                }
            });
        });
    }
    
    // Autocompletamento
    if (searchInput && searchSuggestions) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            
            clearTimeout(suggestionTimeout);
            
            if (query.length < 2) {
                hideSuggestions();
                return;
            }
            
            suggestionTimeout = setTimeout(() => {
                fetchSuggestions(query);
            }, 300);
        });
        
        // Gestione navigazione con tastiera
        searchInput.addEventListener('keydown', (e) => {
            const suggestions = searchSuggestions.querySelectorAll('.suggestion-item');
            
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                currentSuggestionIndex = Math.min(currentSuggestionIndex + 1, suggestions.length - 1);
                updateSuggestionHighlight();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                currentSuggestionIndex = Math.max(currentSuggestionIndex - 1, -1);
                updateSuggestionHighlight();
            } else if (e.key === 'Enter' && currentSuggestionIndex >= 0) {
                e.preventDefault();
                suggestions[currentSuggestionIndex].click();
            } else if (e.key === 'Escape') {
                hideSuggestions();
            }
        });
        
        // Nasconde suggerimenti quando si clicca fuori
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !searchSuggestions.contains(e.target)) {
                hideSuggestions();
            }
        });
    }
    
    // Gestione form submission
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            const query = searchInput ? searchInput.value.trim() : '';
            if (!query) {
                e.preventDefault();
                return;
            }
            hideSuggestions();
        });
    }
    
    // Funzioni di supporto
    async function fetchSuggestions(query) {
        try {
            const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query)}`);
            const data = await response.json();
            
            if (data.suggestions && data.suggestions.length > 0) {
                showSuggestions(data.suggestions);
            } else {
                hideSuggestions();
            }
        } catch (error) {
            console.error('Errore nel recupero suggerimenti:', error);
            hideSuggestions();
        }
    }
    
    function showSuggestions(suggestions) {
        let html = '';
        
        suggestions.forEach((suggestion, index) => {
            html += `
                <div class="suggestion-item" data-index="${index}" data-text="${suggestion.text}" data-type="${suggestion.type}">
                    <i class="${suggestion.icon} suggestion-icon"></i>
                    <div class="suggestion-text">
                        <div>${suggestion.text}</div>
                        ${suggestion.location ? `<small class="text-muted">${suggestion.location}</small>` : ''}
                        ${suggestion.description ? `<small class="text-muted">${suggestion.description}</small>` : ''}
                    </div>
                    <span class="suggestion-category">${suggestion.category}</span>
                </div>
            `;
        });
        
        searchSuggestions.innerHTML = html;
        searchSuggestions.classList.add('show');
        currentSuggestionIndex = -1;
        
        // Aggiungi event listeners ai suggerimenti
        const suggestionItems = searchSuggestions.querySelectorAll('.suggestion-item');
        suggestionItems.forEach(item => {
            item.addEventListener('click', () => {
                const text = item.dataset.text;
                const type = item.dataset.type;
                
                searchInput.value = text;
                if (searchType) {
                    searchType.value = type;
                }
                
                hideSuggestions();
                searchForm.submit();
            });
        });
    }
    
    function hideSuggestions() {
        searchSuggestions.classList.remove('show');
        currentSuggestionIndex = -1;
    }
    
    function updateSuggestionHighlight() {
        const suggestions = searchSuggestions.querySelectorAll('.suggestion-item');
        
        suggestions.forEach((item, index) => {
            if (index === currentSuggestionIndex) {
                item.style.backgroundColor = 'var(--gray-light)';
            } else {
                item.style.backgroundColor = '';
            }
        });
    }
    
    // Fallback per ricerca semplice (compatibilità)
    const searchButton = document.querySelector('.search-button');
    const searchInputFallback = document.querySelector('.search-input');
    
    if (searchButton && searchInputFallback) {
        searchButton.addEventListener('click', () => {
            const searchTerm = searchInputFallback.value.trim();
            if (searchTerm) {
                window.location.href = `/search?q=${encodeURIComponent(searchTerm)}`;
            }
        });
        
        searchInputFallback.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchButton.click();
            }
        });
    }
}

// Carica i meccanici in primo piano
async function loadFeaturedMechanics() {
    const sliderContainer = document.getElementById('slider');
    
    if (!sliderContainer) return;
    
    try {
        // Ottieni i migliori meccanici
        const response = await fetch('/api/meccanici?limit=5&ordina=valutazione');
        const data = await response.json();
        
        // Verifica se i dati sono presenti e nella struttura corretta
        if (!data.data || !data.data.meccanici || data.data.meccanici.length === 0) {
            sliderContainer.innerHTML = '<p class="text-center">Nessun meccanico disponibile al momento.</p>';
            return;
        }
        
        const meccanici = data.data.meccanici;
        
        // Crea le card dei meccanici
        const html = meccanici.map(mec => `
            <div class="mechanic-card" data-id="${mec.id}">
                <img src="${mec.avatar || '/media/img/default_mechanic.png'}" alt="${mec.nome} ${mec.cognome}">
                <h3>${mec.nome_officina || `${mec.nome} ${mec.cognome}`}</h3>
                <p>${mec.specializzazione}</p>
                <div class="rating">
                    ${'★'.repeat(Math.floor(mec.valutazione || 0))}${'☆'.repeat(5 - Math.floor(mec.valutazione || 0))}
                    <span class="rating-text">${(mec.valutazione || 0).toFixed(1)}</span>
                </div>
                <a href="/meccanici/${mec.id}" class="btn-contact">Visualizza profilo</a>
            </div>
        `).join('');
        
        sliderContainer.innerHTML = html;
    } catch (error) {
        console.error('Errore durante il caricamento dei meccanici:', error);
        sliderContainer.innerHTML = '<p class="text-center text-danger">Errore durante il caricamento dei meccanici.</p>';
    }
}

// Carica le recensioni in evidenza
async function loadFeaturedReviews() {
    const reviewsContainer = document.querySelector('.reviews');
    
    if (!reviewsContainer) return;
    
    try {
        // Ottieni le recensioni dal server
        const response = await fetch('/api/recensioni/featured');
        const data = await response.json();
        
        if (!data.success || !data.data || data.data.length === 0) {
            // Se non ci sono dati, usa recensioni di esempio
            const recensioniEsempio = [
                {
                    id: 1,
                    nome_cliente: 'Marco R.',
                    testo: 'Servizio eccellente! Il meccanico ha risolto il problema alla mia auto in tempi record.',
                    valutazione: 5
                },
                {
                    id: 2,
                    nome_cliente: 'Laura B.',
                    testo: 'Molto professionale e prezzi onesti. Consigliato!',
                    valutazione: 4
                },
                {
                    id: 3,
                    nome_cliente: 'Giovanni M.',
                    testo: 'Ho trovato facilmente un meccanico specializzato per la mia auto. Ottimo servizio.',
                    valutazione: 5
                }
            ];
            
            const html = recensioniEsempio.map(recensione => `
                <div class="review-card">
                    <div class="review-rating">
                        ${'★'.repeat(recensione.valutazione)}${'☆'.repeat(5 - recensione.valutazione)}
                    </div>
                    <p class="review-text">"${recensione.testo}"</p>
                    <small class="review-author">- ${recensione.nome_cliente}</small>
                </div>
            `).join('');
            
            reviewsContainer.innerHTML = html;
            return;
        }
        
        // Usa le recensioni dal server
        const recensioni = data.data;
        const html = recensioni.map(recensione => `
            <div class="review-card">
                <div class="review-rating">
                    ${'★'.repeat(Math.floor(recensione.valutazione || 0))}${'☆'.repeat(5 - Math.floor(recensione.valutazione || 0))}
                </div>
                <p class="review-text">"${recensione.commento || recensione.testo}"</p>
                <small class="review-author">- ${recensione.nome_cliente}</small>
            </div>
        `).join('');
        
        reviewsContainer.innerHTML = html;
    } catch (error) {
        console.error('Errore durante il caricamento delle recensioni:', error);
        
        // In caso di errore, mostra recensioni di esempio
        const recensioniEsempio = [
            {
                id: 1,
                nome_cliente: 'Marco R.',
                testo: 'Servizio eccellente! Il meccanico ha risolto il problema alla mia auto in tempi record.',
                valutazione: 5
            },
            {
                id: 2,
                nome_cliente: 'Laura B.',
                testo: 'Molto professionale e prezzi onesti. Consigliato!',
                valutazione: 4
            },
            {
                id: 3,
                nome_cliente: 'Giovanni M.',
                testo: 'Ho trovato facilmente un meccanico specializzato per la mia auto. Ottimo servizio.',
                valutazione: 5
            }
        ];
        
        const html = recensioniEsempio.map(recensione => `
            <div class="review-card">
                <div class="review-rating">
                    ${'★'.repeat(recensione.valutazione)}${'☆'.repeat(5 - recensione.valutazione)}
                </div>
                <p class="review-text">"${recensione.testo}"</p>
                <small class="review-author">- ${recensione.nome_cliente}</small>
            </div>
        `).join('');
        
        reviewsContainer.innerHTML = html;
    }
}