/**
 * auth.js - Gestione dei form di autenticazione
 * Questo file gestisce la validazione client-side dei form di login e registrazione.
 */

document.addEventListener('DOMContentLoaded', function() {
    // Modals di autenticazione
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    const registerMeccanicoModal = document.getElementById('registerMeccanicoModal');
    
    // Form di login
    const loginForm = document.getElementById('loginForm');
    const loginMeccanicoForm = document.getElementById('loginMeccanicoForm');
    
    // Form di registrazione
    const registerForm = document.getElementById('registerForm');
    const registerMeccanicoForm = document.getElementById('registerMeccanicoForm');
    
    // Link tra modali
    const registerLink = document.getElementById('registerLink');
    
    // Messaggio di flash
    const flashError = document.querySelector('.flash-error');
    const flashSuccess = document.querySelector('.flash-success');
    
    // Se c'è un messaggio flash, mostralo per 5 secondi
    if (flashError || flashSuccess) {
        setTimeout(() => {
            if (flashError) flashError.style.display = 'none';
            if (flashSuccess) flashSuccess.style.display = 'none';
        }, 5000);
    }
    
    // Gestione della registrazione cliente
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
    
    // Gestione della registrazione meccanico
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
    
    // Gestione link per passare tra modali
    if (registerLink) {
        registerLink.addEventListener('click', function() {
            // Chiudi il modal di login
            const loginModalInstance = bootstrap.Modal.getInstance(loginModal);
            loginModalInstance.hide();
            
            // Apri il modal di registrazione cliente
            setTimeout(() => {
                const registerModalInstance = new bootstrap.Modal(registerModal);
                registerModalInstance.show();
            }, 500);
        });
    }
    
    // Gestione degli errori di validazione del form (lato server)
    function showValidationErrors(modal, errors) {
        const form = modal.querySelector('form');
        
        // Rimuovi eventuali messaggi di errore precedenti
        const oldErrorDivs = form.querySelectorAll('.is-invalid');
        oldErrorDivs.forEach(div => div.classList.remove('is-invalid'));
        
        const oldFeedbacks = form.querySelectorAll('.invalid-feedback');
        oldFeedbacks.forEach(feedback => feedback.remove());
        
        // Aggiungi i nuovi messaggi di errore
        errors.forEach(error => {
            const fieldName = error.param;
            const message = error.msg;
            
            const field = form.querySelector(`[name="${fieldName}"]`);
            if (field) {
                field.classList.add('is-invalid');
                
                const feedback = document.createElement('div');
                feedback.className = 'invalid-feedback';
                feedback.textContent = message;
                
                field.parentNode.appendChild(feedback);
            }
        });
    }
    
    // Verifica se ci sono errori da mostrare nei modali
    function checkForModalErrors() {
        // Verifica se l'URL contiene parametri di query
        const urlParams = new URLSearchParams(window.location.search);
        
        // Errori nel modal di login
        if (urlParams.has('loginError')) {
            const loginModalInstance = new bootstrap.Modal(loginModal);
            loginModalInstance.show();
            
            if (urlParams.has('userType') && urlParams.get('userType') === 'meccanico') {
                // Attiva il tab del meccanico
                const meccanicoTab = document.getElementById('meccanico-tab');
                const meccanicoTabInstance = new bootstrap.Tab(meccanicoTab);
                meccanicoTabInstance.show();
            }
        }
        
        // Errori nel modal di registrazione cliente
        if (urlParams.has('registerError')) {
            const registerModalInstance = new bootstrap.Modal(registerModal);
            registerModalInstance.show();
            
            if (urlParams.has('errors')) {
                try {
                    const errors = JSON.parse(decodeURIComponent(urlParams.get('errors')));
                    showValidationErrors(registerModal, errors);
                } catch (e) {
                    console.error('Errore nel parsing degli errori:', e);
                }
            }
        }
        
        // Errori nel modal di registrazione meccanico
        if (urlParams.has('registerMeccanicoError')) {
            const registerMeccanicoModalInstance = new bootstrap.Modal(registerMeccanicoModal);
            registerMeccanicoModalInstance.show();
            
            if (urlParams.has('errors')) {
                try {
                    const errors = JSON.parse(decodeURIComponent(urlParams.get('errors')));
                    showValidationErrors(registerMeccanicoModal, errors);
                } catch (e) {
                    console.error('Errore nel parsing degli errori:', e);
                }
            }
        }
    }
    
    // Esegui la verifica degli errori al caricamento della pagina
    checkForModalErrors();
    
    // Funzione per mostrare il modale appropriato se c'è un messaggio flash
    function showModalForFlash() {
        const flashMessage = document.querySelector('.flash-message');
        if (!flashMessage) return;
        
        const messageType = flashMessage.dataset.type;
        const messageContext = flashMessage.dataset.context;
        
        if (messageContext === 'login') {
            const loginModalInstance = new bootstrap.Modal(loginModal);
            loginModalInstance.show();
            
            if (messageType === 'meccanico') {
                // Attiva il tab del meccanico
                const meccanicoTab = document.getElementById('meccanico-tab');
                const meccanicoTabInstance = new bootstrap.Tab(meccanicoTab);
                meccanicoTabInstance.show();
            }
        } else if (messageContext === 'register-cliente') {
            const registerModalInstance = new bootstrap.Modal(registerModal);
            registerModalInstance.show();
        } else if (messageContext === 'register-meccanico') {
            const registerMeccanicoModalInstance = new bootstrap.Modal(registerMeccanicoModal);
            registerMeccanicoModalInstance.show();
        }
    }
    
    // Esegui la verifica dei messaggi flash al caricamento della pagina
    showModalForFlash();
});