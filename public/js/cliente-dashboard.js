"use strict";

// Funzioni specifiche per la dashboard cliente
document.addEventListener('DOMContentLoaded', () => {
    // Controlla autenticazione
    checkAuth();
    
    // Carica i dati della dashboard
    loadDashboardData();
});

// Funzione per verificare l'autenticazione
async function checkAuth() {
    try {
        const response = await fetch('/auth/check');
        const data = await response.json();
        
        if (!data.isAuthenticated) {
            // Reindirizza al login se non autenticato
            window.location.href = '/';
            return;
        }
        
        if (data.user.tipo !== 'cliente') {
            // Reindirizza alla dashboard corretta se non è un cliente
            window.location.href = `/${data.user.tipo}/dashboard`;
            return;
        }
        
        // Aggiorna l'interfaccia utente con i dati dell'utente
        updateUserInfo(data.user);
    } catch (error) {
        console.error('Errore durante il controllo dell\'autenticazione:', error);
        showErrorAlert('Errore di connessione al server. Riprova più tardi.');
    }
}

// Funzione per aggiornare le informazioni dell'utente nell'interfaccia
function updateUserInfo(user) {
    const userNameElements = document.querySelectorAll('#userName');
    userNameElements.forEach(el => {
        el.textContent = `${user.nome} ${user.cognome}`;
    });
    
    const userAvatarElements = document.querySelectorAll('#userAvatar');
    userAvatarElements.forEach(el => {
        el.src = user.avatar || '../media/img/default_avatar.png';
        el.alt = `${user.nome} ${user.cognome}`;
    });
}

// Funzione per caricare i dati della dashboard
async function loadDashboardData() {
    try {
        // Inizia il caricamento parallelo di tutti i dati necessari
        const [riparazioniResponse, veicoliResponse, recensioniResponse] = await Promise.all([
            fetch('/api/riparazioni?limit=5'),
            fetch('/api/veicoli'),
            fetch('/api/meccanici/-/recensioni')
        ]);
        
        // Processa le risposte
        const riparazioni = await riparazioniResponse.json();
        const veicoli = await veicoliResponse.json();
        const recensioni = await recensioniResponse.json();
        
        // Aggiorna le statistiche
        updateStats(riparazioni, veicoli, recensioni);
        
        // Mostra le riparazioni recenti
        displayRecentRiparazioni(riparazioni);
        
        // Mostra i veicoli
        displayVeicoli(veicoli);
    } catch (error) {
        console.error('Errore durante il caricamento dei dati della dashboard:', error);
        showErrorAlert('Errore durante il caricamento dei dati. Riprova più tardi.');
    }
}

// Funzione per aggiornare le statistiche
function updateStats(riparazioni, veicoli, recensioni) {
    // Aggiorna il conteggio delle riparazioni totali
    document.getElementById('totalRiparazioni').textContent = riparazioni.length;
    
    // Aggiorna il conteggio dei veicoli
    document.getElementById('totalVeicoli').textContent = veicoli.length;
    
    // Conta le riparazioni in corso
    const inCorso = riparazioni.filter(r => 
        r.stato === 'in_corso' || r.stato === 'accettata' || r.stato === 'preventivo').length;
    document.getElementById('inCorsoRiparazioni').textContent = inCorso;
    
    // Aggiorna il conteggio delle recensioni
    document.getElementById('totalRecensioni').textContent = recensioni.length;
}

// Funzione per mostrare le riparazioni recenti
function displayRecentRiparazioni(riparazioni) {
    const container = document.getElementById('recentRiparazioni');
    
    if (riparazioni.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4">
                    <p class="mb-0">Non hai ancora richiesto riparazioni.</p>
                    <a href="/cliente/nuova-riparazione" class="btn btn-sm btn-primary mt-2">
                        <i class="fas fa-plus-circle me-1"></i> Nuova riparazione
                    </a>
                </td>
            </tr>
        `;
        return;
    }
    
    // Limita a massimo 5 riparazioni
    const recentRiparazioni = riparazioni.slice(0, 5);
    
    const html = recentRiparazioni.map(riparazione => {
        // Formatta la data
        const data = new Date(riparazione.data_richiesta);
        const dataFormattata = data.toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        
        // Determina la classe per il badge dello stato
        const badgeClass = getBadgeClassForStatus(riparazione.stato);
        
        // Determina le azioni disponibili in base allo stato
        const actions = getActionsForStatus(riparazione);
        
        return `
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        <img src="${riparazione.avatar_meccanico || '../media/img/default_mechanic.png'}" alt="${riparazione.nome_meccanico}" 
                             class="rounded-circle me-2" width="32" height="32">
                        <div>
                            <div class="fw-bold">${riparazione.nome_meccanico} ${riparazione.cognome_meccanico}</div>
                            <small class="text-muted">${riparazione.nome_officina || riparazione.specializzazione}</small>
                        </div>
                    </div>
                </td>
                <td>
                    <div class="text-truncate" style="max-width: 150px;" title="${riparazione.descrizione}">
                        ${riparazione.descrizione}
                    </div>
                </td>
                <td>
                    ${riparazione.marca && riparazione.modello ? 
                        `${riparazione.marca} ${riparazione.modello}` : 
                        '<span class="text-muted">Non specificato</span>'}
                </td>
                <td>${dataFormattata}</td>
                <td>
                    <span class="badge ${badgeClass}">${translateStatus(riparazione.stato)}</span>
                </td>
                <td>
                    <div class="d-flex gap-1">
                        <a href="/cliente/riparazioni/${riparazione.id}" class="btn btn-sm btn-outline-primary">
                            <i class="fas fa-eye"></i>
                        </a>
                        ${actions}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    container.innerHTML = html;
    
    // Aggiungi event listeners alle azioni
    addActionEventListeners();
}

// Funzione per mostrare i veicoli
function displayVeicoli(veicoli) {
    const container = document.getElementById('recentVeicoli');
    
    if (veicoli.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-4">
                <p>Non hai ancora registrato veicoli.</p>
                <a href="/cliente/veicoli#aggiungi" class="btn btn-primary mt-2">
                    <i class="fas fa-plus-circle me-1"></i> Aggiungi veicolo
                </a>
            </div>
        `;
        return;
    }
    
    // Limita a massimo 4 veicoli
    const recentVeicoli = veicoli.slice(0, 4);
    
    const html = recentVeicoli.map(veicolo => {
        // Seleziona l'icona appropriata per il tipo di veicolo
        let veicoloIcon = 'fa-car';
        if (veicolo.tipo === 'moto') veicoloIcon = 'fa-motorcycle';
        else if (veicolo.tipo === 'camion') veicoloIcon = 'fa-truck';
        else if (veicolo.tipo === 'furgone') veicoloIcon = 'fa-shuttle-van';
        
        return `
            <div class="col-md-6 col-lg-3">
                <div class="card h-100">
                    <div class="card-body">
                        <div class="d-flex align-items-center mb-3">
                            <div class="avatar-lg bg-light text-primary rounded me-3">
                                <i class="fas ${veicoloIcon}"></i>
                            </div>
                            <div>
                                <h5 class="card-title mb-0">${veicolo.marca} ${veicolo.modello}</h5>
                                <span class="text-muted">${veicolo.anno || ''}</span>
                            </div>
                        </div>
                        <ul class="list-unstyled mb-0">
                            <li class="d-flex justify-content-between mb-2">
                                <span class="text-muted">Targa:</span>
                                <span class="fw-medium">${veicolo.targa || 'Non specificata'}</span>
                            </li>
                            <li class="d-flex justify-content-between">
                                <span class="text-muted">Tipo:</span>
                                <span class="fw-medium">${capitalizeFirstLetter(veicolo.tipo || 'Auto')}</span>
                            </li>
                        </ul>
                    </div>
                    <div class="card-footer bg-white border-top-0">
                        <div class="d-flex justify-content-between">
                            <a href="/cliente/veicoli#edit-${veicolo.id}" class="btn btn-sm btn-outline-primary">
                                <i class="fas fa-edit me-1"></i> Modifica
                            </a>
                            <a href="/cliente/nuova-riparazione?veicolo=${veicolo.id}" class="btn btn-sm btn-outline-success">
                                <i class="fas fa-wrench me-1"></i> Riparazione
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = html;
}

// Funzione per ottenere la classe del badge in base allo stato
function getBadgeClassForStatus(stato) {
    switch (stato) {
        case 'richiesta': return 'badge-richiesta';
        case 'preventivo': return 'badge-preventivo';
        case 'accettata': return 'badge-accettata';
        case 'in_corso': return 'badge-in_corso';
        case 'completata': return 'badge-completata';
        case 'rifiutata': return 'badge-rifiutata';
        default: return 'bg-secondary';
    }
}

// Funzione per tradurre lo stato
function translateStatus(stato) {
    switch (stato) {
        case 'richiesta': return 'Richiesta';
        case 'preventivo': return 'Preventivo';
        case 'accettata': return 'Accettata';
        case 'in_corso': return 'In corso';
        case 'completata': return 'Completata';
        case 'rifiutata': return 'Rifiutata';
        default: return stato;
    }
}

// Funzione per ottenere le azioni in base allo stato
function getActionsForStatus(riparazione) {
    switch (riparazione.stato) {
        case 'preventivo':
            return `
                <button class="btn btn-sm btn-outline-success accept-preventivo" data-id="${riparazione.id}">
                    <i class="fas fa-check"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger reject-preventivo" data-id="${riparazione.id}">
                    <i class="fas fa-times"></i>
                </button>
            `;
        case 'completata':
            // Verifica se è già stata lasciata una recensione
            if (!riparazione.recensione_id) {
                return `
                    <button class="btn btn-sm btn-outline-warning leave-review" data-id="${riparazione.id_meccanico}" data-riparazione="${riparazione.id}">
                        <i class="fas fa-star"></i>
                    </button>
                `;
            }
            return '';
        default:
            return '';
    }
}

// Funzione per aggiungere event listeners alle azioni
function addActionEventListeners() {
    // Accetta preventivo
    document.querySelectorAll('.accept-preventivo').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.dataset.id;
            try {
                const response = await fetch(`/api/riparazioni/${id}/stato`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ stato: 'accettata' })
                });
                
                if (response.ok) {
                    showSuccessAlert('Preventivo accettato con successo');
                    // Ricarica i dati della dashboard
                    loadDashboardData();
                } else {
                    const error = await response.json();
                    showErrorAlert(error.message || 'Errore durante l\'accettazione del preventivo');
                }
            } catch (error) {
                console.error('Errore durante l\'accettazione del preventivo:', error);
                showErrorAlert('Errore di connessione al server');
            }
        });
    });
    
    // Rifiuta preventivo
    document.querySelectorAll('.reject-preventivo').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.dataset.id;
            try {
                const response = await fetch(`/api/riparazioni/${id}/stato`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ stato: 'rifiutata' })
                });
                
                if (response.ok) {
                    showSuccessAlert('Preventivo rifiutato');
                    // Ricarica i dati della dashboard
                    loadDashboardData();
                } else {
                    const error = await response.json();
                    showErrorAlert(error.message || 'Errore durante il rifiuto del preventivo');
                }
            } catch (error) {
                console.error('Errore durante il rifiuto del preventivo:', error);
                showErrorAlert('Errore di connessione al server');
            }
        });
    });
    
    // Lascia recensione
    document.querySelectorAll('.leave-review').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const meccanicoId = e.currentTarget.dataset.id;
            const riparazioneId = e.currentTarget.dataset.riparazione;
            window.location.href = `/cliente/recensioni?meccanico=${meccanicoId}&riparazione=${riparazioneId}`;
        });
    });
}

// Funzione per mostrare un avviso di successo
function showSuccessAlert(message) {
    // Implementa qui la logica per mostrare un avviso di successo
    alert(message);
}

// Funzione per mostrare un avviso di errore
function showErrorAlert(message) {
    // Implementa qui la logica per mostrare un avviso di errore
    alert(`Errore: ${message}`);
}

// Funzione per rendere maiuscola la prima lettera
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}