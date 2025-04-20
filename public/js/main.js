"use strict";

// Controlla lo stato dell'autenticazione all'avvio
document.addEventListener('DOMContentLoaded', () => {
    // Controlla se l'utente è autenticato
    checkAuthStatus();
    
    // Inizializza gli event listeners
    initLoginRegisterEvents();
    
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

// Funzione per il logout
async function logout() {
    try {
        const response = await fetch('/auth/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Ricarica la pagina per aggiornare l'interfaccia
            window.location.href = '/';
        } else {
            alert('Errore durante il logout. Riprova.');
        }
    } catch (error) {
        console.error('Errore durante il logout:', error);
        alert('Errore durante il logout. Riprova.');
    }
}

// Inizializza gli eventi per login e registrazione
function initLoginRegisterEvents() {
    // Event listener per il form di login per cliente
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            try {
                const response = await fetch('/auth/login/cliente', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    // Chiudi il modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
                    if (modal) {
                        modal.hide();
                    }
                    
                    // Reindirizza alla dashboard
                    window.location.href = '/cliente/dashboard';
                } else {
                    // Mostra errore
                    alert(data.message || 'Errore durante il login');
                }
            } catch (error) {
                console.error('Errore durante il login:', error);
                alert('Errore durante il login. Riprova.');
            }
        });
    }
    
    // Event listener per il form di login per meccanico
    const loginMeccanicoForm = document.getElementById('loginMeccanicoForm');
    if (loginMeccanicoForm) {
        loginMeccanicoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('emailMeccanico').value;
            const password = document.getElementById('passwordMeccanico').value;
            
            try {
                const response = await fetch('/auth/login/meccanico', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    // Chiudi il modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
                    if (modal) {
                        modal.hide();
                    }
                    
                    // Reindirizza alla dashboard
                    window.location.href = '/meccanico/dashboard';
                } else {
                    // Mostra errore
                    alert(data.message || 'Errore durante il login');
                }
            } catch (error) {
                console.error('Errore durante il login:', error);
                alert('Errore durante il login. Riprova.');
            }
        });
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
            const registerModal = new bootstrap.Modal(document.getElementById('registerModal'));
            registerModal.show();
        });
    }
    
    // Event listener per il form di registrazione
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Ottieni i dati del form
            const formData = {
                nome: document.getElementById('regName').value.split(' ')[0],
                cognome: document.getElementById('regName').value.split(' ').slice(1).join(' '),
                email: document.getElementById('regEmail').value,
                password: document.getElementById('regPassword').value,
                conferma_password: document.getElementById('regConfirmPassword').value,
                telefono: document.getElementById('regTelefono')?.value || null,
                citta: document.getElementById('regCitta')?.value || null
            };
            
            try {
                const response = await fetch('/auth/register/cliente', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });
                
                const data = await response.json();
                
                if (data.success) {
                    // Chiudi il modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById('registerModal'));
                    if (modal) {
                        modal.hide();
                    }
                    
                    // Reindirizza alla dashboard
                    window.location.href = '/cliente/dashboard';
                } else {
                    // Mostra errore
                    const errorMessage = data.errors 
                        ? data.errors.map(err => err.msg).join('\n') 
                        : (data.message || 'Errore durante la registrazione');
                    
                    alert(errorMessage);
                }
            } catch (error) {
                console.error('Errore durante la registrazione:', error);
                alert('Errore durante la registrazione. Riprova.');
            }
        });
    }
    
    // Event listener per il form di registrazione meccanico
    const registerMeccanicoForm = document.getElementById('registerMeccanicoForm');
    if (registerMeccanicoForm) {
        registerMeccanicoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Ottieni i dati del form
            const formData = {
                nome: document.getElementById('regMecName').value.split(' ')[0],
                cognome: document.getElementById('regMecName').value.split(' ').slice(1).join(' '),
                email: document.getElementById('regMecEmail').value,
                password: document.getElementById('regMecPassword').value,
                conferma_password: document.getElementById('regMecConfirmPassword').value,
                specializzazione: document.getElementById('regMecSpecializzazione').value,
                nome_officina: document.getElementById('regMecOfficina').value || null,
                telefono: document.getElementById('regMecTelefono').value,
                citta: document.getElementById('regMecCitta').value,
                descrizione: document.getElementById('regMecDescrizione')?.value || null
            };
            
            try {
                const response = await fetch('/auth/register/meccanico', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });
                
                const data = await response.json();
                
                if (data.success) {
                    // Chiudi il modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById('registerMeccanicoModal'));
                    if (modal) {
                        modal.hide();
                    }
                    
                    // Reindirizza alla dashboard
                    window.location.href = '/meccanico/dashboard';
                } else {
                    // Mostra errore
                    const errorMessage = data.errors 
                        ? data.errors.map(err => err.msg).join('\n') 
                        : (data.message || 'Errore durante la registrazione');
                    
                    alert(errorMessage);
                }
            } catch (error) {
                console.error('Errore durante la registrazione:', error);
                alert('Errore durante la registrazione. Riprova.');
            }
        });
    }
}

// Inizializza la ricerca
function initSearch() {
    const searchButton = document.querySelector('.search-button');
    const searchInput = document.querySelector('.search-input');
    
    if (searchButton && searchInput) {
        searchButton.addEventListener('click', () => {
            const searchTerm = searchInput.value.trim();
            if (searchTerm) {
                // Reindirizza alla pagina di ricerca con il termine di ricerca
                window.location.href = `/meccanici.html?q=${encodeURIComponent(searchTerm)}`;
            }
        });
        
        // Permetti anche di premere Enter per cercare
        searchInput.addEventListener('keypress', (e) => {
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
        const meccanici = await response.json();
        
        if (meccanici.length === 0) {
            sliderContainer.innerHTML = '<p class="text-center">Nessun meccanico disponibile al momento.</p>';
            return;
        }
        
        // Usa meccanici di esempio per ora
        const meccaniciEsempio = [
            {
                id: 1,
                nome: "Mario",
                cognome: "Rossi",
                nome_officina: "Officina Rossi",
                specializzazione: "Meccanica Generale",
                valutazione: 4.8,
                numero_recensioni: 24,
                avatar: "media/img/default_mechanic.png"
            },
            {
                id: 2,
                nome: "Giuseppe",
                cognome: "Verdi",
                nome_officina: "Autofficina Verdi",
                specializzazione: "Elettronica",
                valutazione: 4.5,
                numero_recensioni: 18,
                avatar: "media/img/default_mechanic.png"
            },
            {
                id: 3,
                nome: "Luigi",
                cognome: "Bianchi",
                nome_officina: "Gomme & Tagliandi",
                specializzazione: "Cambio Gomme",
                valutazione: 4.2,
                numero_recensioni: 15,
                avatar: "media/img/default_mechanic.png"
            },
            {
                id: 4,
                nome: "Antonio",
                cognome: "Ferrari",
                nome_officina: "Carrozzeria Ferrari",
                specializzazione: "Carrozzeria",
                valutazione: 4.9,
                numero_recensioni: 32,
                avatar: "media/img/default_mechanic.png"
            },
            {
                id: 5,
                nome: "Francesco",
                cognome: "Esposito",
                nome_officina: "Revisioni Express",
                specializzazione: "Revisioni",
                valutazione: 4.4,
                numero_recensioni: 21,
                avatar: "media/img/default_mechanic.png"
            }
        ];
        
        // Crea le card dei meccanici
        const html = meccaniciEsempio.map(mec => `
            <div class="mechanic-card" data-id="${mec.id}">
                <img src="${mec.avatar}" alt="${mec.nome} ${mec.cognome}">
                <h3>${mec.nome_officina || `${mec.nome} ${mec.cognome}`}</h3>
                <p>${mec.specializzazione}</p>
                <div class="rating">
                    ${'★'.repeat(Math.floor(mec.valutazione))}${'☆'.repeat(5 - Math.floor(mec.valutazione))}
                    <span class="rating-text">${mec.valutazione.toFixed(1)}</span>
                </div>
                <a href="meccanico-profilo.html?id=${mec.id}" class="btn-contact">Visualizza profilo</a>
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
    
    // Per questo esempio, generiamo recensioni fittizie
    // In un'implementazione reale, dovresti caricarle dal server
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