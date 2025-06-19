"use strict";
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    initSearch();
    
    if (document.getElementById('slider')) {
        loadFeaturedMechanics();
    }
    
    if (document.querySelector('.reviews')) {
        loadFeaturedReviews();
    }
    
    const yearElement = document.getElementById('currentYear');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
    
    const registerLink = document.getElementById('registerLink');
    if (registerLink) {
        registerLink.addEventListener('click', (e) => {
            e.preventDefault();
            
            const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
            if (loginModal) {
                loginModal.hide();
            }
            
            setTimeout(() => {
                const registerModal = new bootstrap.Modal(document.getElementById('registerModal'));
                registerModal.show();
            }, 500);
        });
    }
});

async function checkAuthStatus() {
    try {
        const response = await fetch('/auth/check');
        const data = await response.json();
        
        if (data.isAuthenticated) {
            updateUIForAuthenticatedUser(data.user);
        } else {
            updateUIForGuestUser();
        }
    } catch (error) {
        console.error('Errore nel controllo dello stato di autenticazione:', error);
    }
}

function updateUIForAuthenticatedUser(user) {
    const loginButtons = document.querySelectorAll('.login-button');
    const dashboardBtn = document.getElementById('navDashboardBtn');
    
    if (loginButtons.length > 0) {
        loginButtons.forEach(btn => {
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
    
    const mobileLoginBtn = document.querySelector('.offcanvas-body .login-button');
    if (mobileLoginBtn) {
        mobileLoginBtn.href = user.tipo === 'cliente' ? '/cliente/dashboard' : '/meccanico/dashboard';
        mobileLoginBtn.textContent = 'Dashboard';
        mobileLoginBtn.dataset.bsToggle = '';
        mobileLoginBtn.dataset.bsTarget = '';
    }
}

function updateUIForGuestUser() {
    const loginButtons = document.querySelectorAll('.login-button');
    const dashboardBtn = document.getElementById('navDashboardBtn');
    
    if (loginButtons.length > 0) {
        loginButtons.forEach(btn => {
            if (btn.id === 'navLoginBtn') {
                btn.classList.remove('d-none');
            }
        });
    }
    
    if (dashboardBtn) {
        dashboardBtn.classList.add('d-none');
    }
}

function initSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchForm = document.getElementById('searchForm');
    const searchSuggestions = document.getElementById('searchSuggestions');
    const searchType = document.getElementById('searchType');
    const searchTags = document.querySelectorAll('.search-tag');
    
    let suggestionTimeout;
    let currentSuggestionIndex = -1;
    
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
                
                if (searchForm) {
                    searchForm.submit();
                }
            });
        });
    }
    
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
        
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !searchSuggestions.contains(e.target)) {
                hideSuggestions();
            }
        });
        }
    
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

async function loadFeaturedMechanics() {
    const sliderContainer = document.getElementById('slider');
    
    if (!sliderContainer) return;
    
    try {
        const response = await fetch('/api/meccanici?limit=5&ordina=valutazione');
        const data = await response.json();
        
        if (!data.data || !data.data.meccanici || data.data.meccanici.length === 0) {
            sliderContainer.innerHTML = '<p class="text-center">Nessun meccanico disponibile al momento.</p>';
            return;
        }
        
        const meccanici = data.data.meccanici;
        
        const html = meccanici.map(mec => `
            <div class="mechanic-card" data-id="${mec.id}">
                <img src="${mec.avatar || '/media/img/default_mechanic.png'}" alt="${mec.nome} ${mec.cognome}">
                <h3>${mec.nome_officina || `${mec.nome} ${mec.cognome}`}</h3>
                <p>${mec.specializzazione}</p>
                <div class="rating">
                    ${'★'.repeat(Math.floor(mec.valutazione || 0))}${'☆'.repeat(5 - Math.floor(mec.valutazione || 0))}
                    <span class="rating-text">${(mec.valutazione || 0).toFixed(1)}</span>
                </div>
            </div>
        `).join('');
        
        sliderContainer.innerHTML = html;
    } catch (error) {
        console.error('Errore durante il caricamento dei meccanici:', error);
        sliderContainer.innerHTML = '<p class="text-center text-danger">Errore durante il caricamento dei meccanici.</p>';
    }
}

async function loadFeaturedReviews() {
    const reviewsContainer = document.querySelector('.reviews');
    
    if (!reviewsContainer) return;
    
    try {
        const response = await fetch('/api/recensioni/featured');
        const data = await response.json();
        
        if (!data.success || !data.data || data.data.length === 0) {
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