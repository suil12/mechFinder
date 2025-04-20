"use strict";

// Funzioni per gestire i meccanici

/**
 * Carica i meccanici dal server con filtri opzionali
 * @param {Object} filtri - Filtri di ricerca
 * @returns {Promise<Array>} Lista dei meccanici
 */
async function loadMeccanici(filtri = {}) {
    try {
        // Costruisci l'URL con i parametri di query
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(filtri)) {
            if (value !== null && value !== undefined && value !== '') {
                params.append(key, value);
            }
        }
        
        const url = `/api/meccanici?${params.toString()}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('Errore nel caricamento dei meccanici');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Errore in loadMeccanici:', error);
        throw error;
    }
}

/**
 * Mostra i meccanici in un container
 * @param {Array} meccanici - Lista dei meccanici
 * @param {HTMLElement} container - Container dove mostrare i meccanici
 * @param {string} layout - Layout da utilizzare ('grid', 'list', 'card')
 */
function displayMeccanici(meccanici, container, layout = 'grid') {
    if (!container) return;
    
    // Se non ci sono meccanici, mostra un messaggio
    if (meccanici.length === 0) {
        container.innerHTML = `
            <div class="col-12">
                <div class="no-results">
                    <i class="fas fa-search fa-3x text-muted mb-3"></i>
                    <h3>Nessun meccanico trovato</h3>
                    <p class="text-muted">Prova a modificare i filtri di ricerca o a cercare in un'altra zona.</p>
                    <button class="btn btn-primary mt-3" id="resetFilterBtnEmpty">
                        Reimposta filtri
                    </button>
                </div>
            </div>
        `;
        
        // Aggiungi event listener al pulsante di reset
        const resetBtn = container.querySelector('#resetFilterBtnEmpty');
        if (resetBtn) {
            resetBtn.addEventListener('click', resetFilters);
        }
        
        return;
    }
    
    // Scegli il layout appropriato
    switch (layout) {
        case 'list':
            displayMeccaniciList(meccanici, container);
            break;
        case 'card':
            displayMeccaniciCards(meccanici, container);
            break;
        case 'grid':
        default:
            displayMeccaniciGrid(meccanici, container);
            break;
    }
}

/**
 * Mostra i meccanici in layout griglia
 * @param {Array} meccanici - Lista dei meccanici
 * @param {HTMLElement} container - Container dove mostrare i meccanici
 */
function displayMeccaniciGrid(meccanici, container) {
    container.innerHTML = meccanici.map(mec => `
        <div class="col-md-6 col-lg-4 meccanico-card">
            <div class="card">
                <div class="card-header position-relative">
                    ${mec.verificato ? `
                        <div class="verificato-badge">
                            <i class="fas fa-check-circle"></i>
                            <span>Verificato</span>
                        </div>
                    ` : ''}
                    <img src="${mec.avatar || 'media/img/default_mechanic.png'}" alt="${mec.nome}" class="meccanico-avatar">
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
}

/**
 * Mostra i meccanici in layout lista
 * @param {Array} meccanici - Lista dei meccanici
 * @param {HTMLElement} container - Container dove mostrare i meccanici
 */
function displayMeccaniciList(meccanici, container) {
    container.innerHTML = `
        <div class="table-responsive">
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>Meccanico</th>
                        <th>Specializzazione</th>
                        <th>Valutazione</th>
                        <th>Città</th>
                        <th>Azioni</th>
                    </tr>
                </thead>
                <tbody>
                    ${meccanici.map(mec => `
                        <tr>
                            <td>
                                <div class="d-flex align-items-center">
                                    <img src="${mec.avatar || 'media/img/default_mechanic.png'}" alt="${mec.nome}" class="rounded-circle me-2" width="40" height="40">
                                    <div>
                                        <div class="fw-bold">${mec.nome}</div>
                                        <small class="text-muted">${mec.nome_officina || ''}</small>
                                    </div>
                                </div>
                            </td>
                            <td>${mec.specializzazione}</td>
                            <td>
                                <div class="d-flex align-items-center">
                                    <div class="me-2" style="color: var(--accent-orange);">
                                        ${'★'.repeat(Math.floor(mec.valutazione))}${'☆'.repeat(5 - Math.floor(mec.valutazione))}
                                    </div>
                                    <span>${mec.valutazione.toFixed(1)}</span>
                                </div>
                            </td>
                            <td>${mec.citta || 'N/A'}</td>
                            <td>
                                <a href="meccanico-profilo.html?id=${mec.id}" class="btn btn-sm btn-primary">
                                    Dettagli
                                </a>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

/**
 * Mostra i meccanici in layout card (per slider)
 * @param {Array} meccanici - Lista dei meccanici
 * @param {HTMLElement} container - Container dove mostrare i meccanici
 */
function displayMeccaniciCards(meccanici, container) {
    container.innerHTML = meccanici.map(mec => `
        <div class="mechanic-card" data-id="${mec.id}">
            <img src="${mec.avatar || 'media/img/default_mechanic.png'}" alt="${mec.nome}">
            <h3>${mec.nome_officina || `${mec.nome}`}</h3>
            <p>${mec.specializzazione}</p>
            <div class="rating">
                ${'★'.repeat(Math.floor(mec.valutazione))}${'☆'.repeat(5 - Math.floor(mec.valutazione))}
                <span class="rating-text">${mec.valutazione.toFixed(1)}</span>
            </div>
            <a href="meccanico-profilo.html?id=${mec.id}" class="btn-contact">Visualizza profilo</a>
        </div>
    `).join('');
}

/**
 * Funzione per resettare i filtri di ricerca
 */
function resetFilters() {
    // Implementazione specifica per la pagina
    const searchInput = document.getElementById('searchInput');
    const filterSpecializzazione = document.getElementById('filterSpecializzazione');
    const filterCitta = document.getElementById('filterCitta');
    const filterVerificato = document.getElementById('filterVerificato');
    const filterOrdina = document.getElementById('filterOrdina');
    
    if (searchInput) searchInput.value = '';
    if (filterSpecializzazione) filterSpecializzazione.value = '';
    if (filterCitta) filterCitta.value = '';
    if (filterVerificato) filterVerificato.checked = false;
    if (filterOrdina) filterOrdina.value = 'valutazione';
    
    // Ricarica i meccanici (da implementare nella pagina specifica)
    if (typeof handleSearch === 'function') {
        handleSearch();
    }
}

// Esporta le funzioni
window.loadMeccanici = loadMeccanici;
window.displayMeccanici = displayMeccanici;
window.resetFilters = resetFilters;