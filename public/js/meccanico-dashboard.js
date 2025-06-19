/**
 * meccanico-dashboard.js - Gestione dashboard meccanico
 * Funzioni JavaScript per i modal e le interazioni della dashboard meccanico
 */

document.addEventListener('DOMContentLoaded', function() {
    
    // Inizializza gli event listener per i form dei modal
    initializeModalForms();
    
    // Gestione sidebar toggle
    const sidebarToggle = document.getElementById('sidebarToggle');
    const dashboardContainer = document.querySelector('.dashboard-container');
    
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            dashboardContainer.classList.toggle('sidebar-collapsed');
        });
    }

    // Mostra/nascondi campi per completamento
    const statoSelect = document.querySelector('#modalAggiornaStato select[name="stato"]');
    if (statoSelect) {
        statoSelect.addEventListener('change', function() {
            const campiCompletamento = document.getElementById('campiCompletamento');
            if (this.value === 'completata') {
                campiCompletamento.style.display = 'block';
            } else {
                campiCompletamento.style.display = 'none';
            }
        });
    }

    // Calcolo totale preventivo
    initializePreventivocalculator();
});

// Inizializza gli event listener per i form dei modal
function initializeModalForms() {
    // Form submit preventivo
    const formNuovoPreventivo = document.getElementById('formNuovoPreventivo');
    if (formNuovoPreventivo) {
        formNuovoPreventivo.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            
            fetch('/meccanico/nuovo-preventivo', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    bootstrap.Modal.getInstance(document.getElementById('modalNuovoPreventivo')).hide();
                    location.reload();
                } else {
                    alert(data.message);
                }
            })
            .catch(error => console.error('Errore:', error));
        });
    }

    // Form submit aggiorna stato
    const formAggiornaStato = document.getElementById('formAggiornaStato');
    if (formAggiornaStato) {
        formAggiornaStato.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            
            fetch('/meccanico/aggiorna-stato', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    bootstrap.Modal.getInstance(document.getElementById('modalAggiornaStato')).hide();
                    location.reload();
                } else {
                    alert(data.message);
                }
            })
            .catch(error => console.error('Errore:', error));
        });
    }

    // Form submit completa riparazione
    const formCompletaRiparazione = document.getElementById('formCompletaRiparazione');
    if (formCompletaRiparazione) {
        formCompletaRiparazione.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            const id = formData.get('id_riparazione');
            
            fetch(`/meccanico/riparazione/${id}/completa`, {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    bootstrap.Modal.getInstance(document.getElementById('modalCompletaRiparazione')).hide();
                    alert('Riparazione completata! PDF generato e notifica inviata al cliente.');
                    
                    // Offri il download del PDF
                    if (data.pdf_url) {
                        if (confirm('Vuoi scaricare il PDF della riparazione?')) {
                            window.open(data.pdf_url, '_blank');
                        }
                    }
                    
                    location.reload();
                } else {
                    alert(data.message);
                }
            })
            .catch(error => {
                console.error('Errore:', error);
                alert('Errore nel completamento della riparazione');
            });
        });
    }

    // Form submit accetta richiesta
    const formAccettaRichiesta = document.getElementById('accettaRichiestaForm');
    if (formAccettaRichiesta) {
        formAccettaRichiesta.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            const id = formData.get('riparazione_id');
            
            fetch(`/meccanico/accetta-richiesta`, {
                method: 'POST',
                body: formData
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    bootstrap.Modal.getInstance(document.getElementById('accettaRichiestaModal')).hide();
                    alert('Richiesta accettata! Il cliente riceverà una notifica con il costo proposto.');
                    location.reload();
                } else {
                    alert(data.message || 'Errore sconosciuto');
                }
            })
            .catch(error => {
                console.error('Errore dettagliato:', error);
                alert('Errore nell\'accettazione della richiesta: ' + error.message);
            });
        });
    }
}

// Inizializza il calcolatore del preventivo
function initializePreventivocalculator() {
    const costoManodopera = document.querySelector('#modalNuovoPreventivo input[name="costo_manodopera"]');
    const costoRicambi = document.querySelector('#modalNuovoPreventivo input[name="costo_ricambi"]');
    const totale = document.getElementById('totalePreventivo');

    if (costoManodopera && costoRicambi && totale) {
        function calcolaTotale() {
            const manodopera = parseFloat(costoManodopera.value) || 0;
            const ricambi = parseFloat(costoRicambi.value) || 0;
            totale.textContent = (manodopera + ricambi).toFixed(2);
        }

        costoManodopera.addEventListener('input', calcolaTotale);
        costoRicambi.addEventListener('input', calcolaTotale);
    }
}

// Mostra dettagli richiesta
function mostraDettagliRichiesta(id) {
    fetch(`/meccanico/richiesta/${id}/dettagli`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const richiesta = data.richiesta;
                document.getElementById('dettagliRichiestaContent').innerHTML = `
                    <div class="row">
                        <div class="col-md-6">
                            <h6>Informazioni Cliente</h6>
                            <p><strong>Nome:</strong> ${richiesta.nome_cliente} ${richiesta.cognome_cliente}</p>
                            <p><strong>Email:</strong> ${richiesta.email_cliente}</p>
                            <p><strong>Telefono:</strong> ${richiesta.telefono_cliente || 'Non fornito'}</p>
                        </div>
                        <div class="col-md-6">
                            <h6>Informazioni Veicolo</h6>
                            <p><strong>Marca:</strong> ${richiesta.marca || 'Non specificata'}</p>
                            <p><strong>Modello:</strong> ${richiesta.modello || 'Non specificato'}</p>
                            <p><strong>Anno:</strong> ${richiesta.anno || 'Non specificato'}</p>
                            <p><strong>Targa:</strong> ${richiesta.targa || 'Non specificata'}</p>
                        </div>
                    </div>
                    <hr>
                    <h6>Dettagli Richiesta</h6>
                    <p><strong>Tipo riparazione:</strong> ${richiesta.tipo_riparazione || 'Non specificato'}</p>
                    <p><strong>Descrizione:</strong> ${richiesta.descrizione || 'Nessuna descrizione fornita'}</p>
                    <p><strong>Data richiesta:</strong> ${new Date(richiesta.data_richiesta).toLocaleString()}</p>
                `;
                new bootstrap.Modal(document.getElementById('modalDettagliRichiesta')).show();
            }
        })
        .catch(error => console.error('Errore:', error));
}

// Accetta richiesta
function accettaRichiesta(id) {
    // Nuovo flusso: apri modal per proporre costo
    document.getElementById('richiesta_id').value = id;
    new bootstrap.Modal(document.getElementById('accettaRichiestaModal')).show();
}

// Rifiuta richiesta
function rifiutaRichiesta(id) {
    if (confirm('Sei sicuro di voler rifiutare questa richiesta?')) {
        fetch(`/meccanico/richiesta/${id}/rifiuta`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                location.reload();
            } else {
                alert(data.message);
            }
        })
        .catch(error => console.error('Errore:', error));
    }
}

// Apri modal nuovo preventivo
function apriModalNuovoPreventivo() {
    // Carica le richieste disponibili
    fetch('/meccanico/richieste-lista')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const select = document.querySelector('#modalNuovoPreventivo select[name="id_riparazione"]');
                select.innerHTML = '<option value="">Seleziona una richiesta</option>';
                data.richieste.forEach(richiesta => {
                    select.innerHTML += `<option value="${richiesta.id}">
                        ${richiesta.nome_cliente} ${richiesta.cognome_cliente} - ${richiesta.marca || 'N/A'} ${richiesta.modello || 'N/A'}
                    </option>`;
                });
            }
        });
    new bootstrap.Modal(document.getElementById('modalNuovoPreventivo')).show();
}

// Mostra dettagli lavorazione
function mostraDettagliLavorazione(id) {
    fetch(`/meccanico/riparazione/${id}/dettagli`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const riparazione = data.riparazione;
                const actionsHtml = getActionsForRiparazione(riparazione);
                
                document.getElementById('dettagliRichiestaContent').innerHTML = `
                    <div class="row">
                        <div class="col-md-6">
                            <h6>Cliente</h6>
                            <p><strong>Nome:</strong> ${riparazione.nome_cliente} ${riparazione.cognome_cliente}</p>
                            <p><strong>Email:</strong> ${riparazione.email_cliente}</p>
                            <p><strong>Telefono:</strong> ${riparazione.telefono_cliente || 'Non fornito'}</p>
                        </div>
                        <div class="col-md-6">
                            <h6>Veicolo</h6>
                            <p><strong>Marca:</strong> ${riparazione.marca || 'N/A'}</p>
                            <p><strong>Modello:</strong> ${riparazione.modello || 'N/A'}</p>
                            <p><strong>Anno:</strong> ${riparazione.anno || 'N/A'}</p>
                            <p><strong>Targa:</strong> ${riparazione.targa || 'N/A'}</p>
                        </div>
                    </div>
                    <hr>
                    <h6>Dettagli Riparazione</h6>
                    <p><strong>Tipo:</strong> ${riparazione.tipo_riparazione || 'Non specificato'}</p>
                    <p><strong>Descrizione:</strong> ${riparazione.descrizione || 'Nessuna descrizione fornita'}</p>
                    <p><strong>Stato:</strong> <span class="badge bg-info">${riparazione.stato}</span></p>
                    <p><strong>Data richiesta:</strong> ${new Date(riparazione.data_richiesta).toLocaleString()}</p>
                    ${riparazione.costo ? `<p><strong>Costo:</strong> €${parseFloat(riparazione.costo).toFixed(2)}</p>` : ''}
                    <div class="mt-3">
                        ${actionsHtml}
                    </div>
                `;
                new bootstrap.Modal(document.getElementById('modalDettagliRichiesta')).show();
            }
        })
        .catch(error => console.error('Errore:', error));
}

// Ottieni azioni per riparazione
function getActionsForRiparazione(riparazione) {
    let actions = '';
    
    switch (riparazione.stato) {
        case 'accettata':
            actions = `
                <button class="btn btn-warning me-2" onclick="aggiornaStato('${riparazione.id}')">
                    <i class="fas fa-play"></i> Inizia Lavoro
                </button>
            `;
            break;
        case 'in_corso':
            actions = `
                <button class="btn btn-success me-2" onclick="completaRiparazione('${riparazione.id}')">
                    <i class="fas fa-check"></i> Completa
                </button>
                <button class="btn btn-info me-2" onclick="aggiornaStato('${riparazione.id}')">
                    <i class="fas fa-edit"></i> Aggiorna Stato
                </button>
            `;
            break;
        case 'completata':
            actions = `
                <button class="btn btn-outline-primary" onclick="scaricaPDF('${riparazione.id}')">
                    <i class="fas fa-download"></i> Scarica PDF
                </button>
            `;
            break;
    }
    
    return actions;
}

// Aggiorna stato
function aggiornaStato(id) {
    document.getElementById('idRiparazioneStato').value = id;
    new bootstrap.Modal(document.getElementById('modalAggiornaStato')).show();
}

// Completa riparazione
function completaRiparazione(id) {
    document.getElementById('idRiparazioneCompleta').value = id;
    new bootstrap.Modal(document.getElementById('modalCompletaRiparazione')).show();
}

// Mostra recensioni
function mostraRecensioni() {
    fetch('/meccanico/recensioni')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const recensioni = data.recensioni;
                
                let recensioniHtml = '';
                if (recensioni && recensioni.length > 0) {
                    recensioniHtml = recensioni.map(r => {
                        return `
                            <div class="border-bottom pb-3 mb-3">
                                <div class="d-flex align-items-center mb-2">
                                    <img src="${r.avatar_cliente || '/media/img/default_avatar.png'}" 
                                         alt="${r.nome_cliente}" 
                                         class="rounded-circle me-3" 
                                         style="width: 40px; height: 40px; object-fit: cover;">
                                    <div>
                                        <h6 class="mb-0">${r.nome_cliente} ${r.cognome_cliente}</h6>
                                        <div class="text-warning">
                                            ${'★'.repeat(r.valutazione)}${'☆'.repeat(5-r.valutazione)}
                                        </div>
                                        <small class="text-muted">${new Date(r.data_recensione).toLocaleDateString()}</small>
                                    </div>
                                </div>
                                <p class="mb-1">${r.commento || 'Nessun commento'}</p>
                                <small class="text-muted">Riparazione: ${r.descrizione_riparazione}</small>
                            </div>
                        `;
                    }).join('');
                } else {
                    recensioniHtml = '<div class="text-center py-4"><p class="text-muted">Nessuna recensione ancora</p></div>';
                }
                
                document.getElementById('recensioniContent').innerHTML = recensioniHtml;
                new bootstrap.Modal(document.getElementById('modalRecensioni')).show();
            }
        })
        .catch(error => console.error('Errore:', error));
}

// Mostra tutte le riparazioni
function mostraTutteRiparazioni(filtroStato = '') {
    const url = filtroStato ? `/meccanico/tutte-riparazioni?stato=${filtroStato}` : '/meccanico/tutte-riparazioni';
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const riparazioni = data.riparazioni;
                let html = '<div class="table-responsive">';
                html += '<table class="table table-striped">';
                html += `
                    <thead>
                        <tr>
                            <th>Cliente</th>
                            <th>Veicolo</th>
                            <th>Tipo</th>
                            <th>Stato</th>
                            <th>Data</th>
                            <th>Costo</th>
                            <th>Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                `;
                
                riparazioni.forEach(r => {
                    let azioni = '';
                    switch(r.stato) {
                        case 'completata':
                            azioni = `<button class="btn btn-sm btn-outline-success" onclick="scaricaPDF('${r.id}')" title="Scarica PDF">
                                <i class="fas fa-download"></i>
                            </button>`;
                            break;
                        case 'in_corso':
                            azioni = `<button class="btn btn-sm btn-outline-primary" onclick="completaRiparazione('${r.id}')" title="Completa">
                                <i class="fas fa-check"></i>
                            </button>`;
                            break;
                        case 'accettata':
                            azioni = `<button class="btn btn-sm btn-outline-warning" onclick="aggiornaStato('${r.id}')" title="Inizia Lavoro">
                                <i class="fas fa-play"></i>
                            </button>`;
                            break;
                    }
                    
                    html += `
                        <tr>
                            <td>${r.nome_cliente} ${r.cognome_cliente}</td>
                            <td>${r.marca || 'N/A'} ${r.modello || 'N/A'}</td>
                            <td>${r.tipo_riparazione || 'Generale'}</td>
                            <td><span class="badge bg-info">${r.stato}</span></td>
                            <td>${new Date(r.data_richiesta).toLocaleDateString()}</td>
                            <td>${r.costo ? '€' + parseFloat(r.costo).toFixed(2) : 'N/A'}</td>
                            <td>
                                <button class="btn btn-sm btn-outline-primary me-1" onclick="mostraDettagliLavorazione('${r.id}')" title="Dettagli">
                                    <i class="fas fa-eye"></i>
                                </button>
                                ${azioni}
                            </td>
                        </tr>
                    `;
                });
                
                html += '</tbody></table></div>';
                document.getElementById('tutteRiparazioniContent').innerHTML = html;
                new bootstrap.Modal(document.getElementById('modalTutteRiparazioni')).show();
            }
        })
        .catch(error => console.error('Errore:', error));
}

// Filtra riparazioni
function filtraRiparazioni() {
    const filtro = document.getElementById('filtroStatoRiparazioni').value;
    bootstrap.Modal.getInstance(document.getElementById('modalTutteRiparazioni')).hide();
    setTimeout(() => mostraTutteRiparazioni(filtro), 300);
}

// Scarica PDF
function scaricaPDF(id) {
    window.open(`/meccanico/download-pdf/${id}`, '_blank');
}

// Mostra statistiche
function mostraStatistiche() {
    fetch('/meccanico/statistiche')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const stats = data.statistiche;
                document.getElementById('statisticheContent').innerHTML = `
                    <div class="row">
                        <div class="col-md-6">
                            <h6>Riparazioni</h6>
                            <p>Totali: ${stats.totaleRiparazioni}</p>
                            <p>Questo mese: ${stats.riparazioniMese}</p>
                            <p>Media mensile: ${stats.mediaRiparazioniMese}</p>
                        </div>
                        <div class="col-md-6">
                            <h6>Guadagni</h6>
                            <p>Totale: €${stats.guadagnoTotale.toFixed(2)}</p>
                            <p>Questo mese: €${stats.guadagnoMese.toFixed(2)}</p>
                            <p>Media mensile: €${stats.mediaGuadagnoMese.toFixed(2)}</p>
                        </div>
                    </div>
                    <hr>
                    <h6>Valutazioni</h6>
                    <p>Media: ${stats.valutazioneMedia}/5</p>
                    <p>Numero recensioni: ${stats.numeroRecensioni}</p>
                `;
                new bootstrap.Modal(document.getElementById('modalStatistiche')).show();
            }
        })
        .catch(error => console.error('Errore:', error));
}

// Mostra richieste pendenti
function mostraRichiestePendenti() {
    // Mostra tutte le riparazioni filtrate per stato in_attesa
    mostraTutteRiparazioni('in_attesa');
}

// Mostra lavorazioni attive
function mostraLavorazioniAttive() {
    // Mostra tutte le riparazioni filtrate per stati attivi
    mostraTutteRiparazioni('in_corso,accettata');
}

// Mostra riparazioni completate
function mostraRiparazioniCompletate() {
    mostraTutteRiparazioni('completata');
}
