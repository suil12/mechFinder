/**
 * admin.js - Gestione della dashboard admin
 * Questo file gestisce le funzionalità della dashboard amministrativa,
 * inclusi grafici, tabelle e le interazioni di UI.
 */

document.addEventListener('DOMContentLoaded', function() {
    // ------- Toggle della sidebar -------
    const sidebarToggle = document.getElementById('sidebarToggle');
    const adminContainer = document.querySelector('.admin-container');
    
    if (sidebarToggle && adminContainer) {
      // Ripristina lo stato della sidebar dal localStorage
      const sidebarState = localStorage.getItem('adminSidebarState');
      if (sidebarState === 'collapsed') {
        adminContainer.classList.add('sidebar-collapsed');
      }
      
      sidebarToggle.addEventListener('click', function() {
        adminContainer.classList.toggle('sidebar-collapsed');
        
        // Salva lo stato della sidebar
        if (adminContainer.classList.contains('sidebar-collapsed')) {
          localStorage.setItem('adminSidebarState', 'collapsed');
        } else {
          localStorage.setItem('adminSidebarState', 'expanded');
        }
      });
    }
    
    // Per dispositivi mobili, aggiungi overlay e gestisci l'apertura/chiusura
    if (window.innerWidth < 768) {
      // Crea overlay se non esiste
      let overlay = document.querySelector('.sidebar-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay);
        
        // Chiudi la sidebar quando si clicca sull'overlay
        overlay.addEventListener('click', function() {
          adminContainer.classList.remove('sidebar-open');
        });
      }
      
      // Apri la sidebar su mobile
      sidebarToggle.addEventListener('click', function() {
        adminContainer.classList.toggle('sidebar-open');
      });
    }
  
    // ------- Grafici -------
    // Grafico delle attività
    const activityChartCanvas = document.getElementById('activityChart');
    const activityPeriod = document.getElementById('activityPeriod');
    let activityChart; // Variabile globale per poter aggiornare il grafico
    
    if (activityChartCanvas) {
      // Funzione per caricare i dati del grafico
      function loadActivityData(period = 'month') {
        fetch(`/admin/api/stats/activity?period=${period}`, {
          credentials: 'same-origin'
        })
        .then(response => {
          if (!response.ok) {
            throw new Error('Errore nel caricamento dei dati');
          }
          return response.json();
        })
        .then(data => {
          if (data.success) {
            updateActivityChart(data.data);
          } else {
            console.error('Errore nei dati:', data.message);
          }
        })
        .catch(error => {
          console.error('Error:', error);
        });
      }
      
      // Funzione per aggiornare il grafico
      function updateActivityChart(data) {
        const ctx = activityChartCanvas.getContext('2d');
        
        // Distruggi il grafico esistente se presente
        if (activityChart) {
          activityChart.destroy();
        }
        
        // Crea il nuovo grafico
        activityChart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: data.labels,
            datasets: [
              {
                label: 'Nuovi clienti',
                data: data.clienti,
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                tension: 0.4,
                fill: true
              },
              {
                label: 'Nuovi meccanici',
                data: data.meccanici,
                borderColor: '#f59e0b',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                tension: 0.4,
                fill: true
              },
              {
                label: 'Riparazioni',
                data: data.riparazioni,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.4,
                fill: true
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'top',
              },
              tooltip: {
                mode: 'index',
                intersect: false
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  precision: 0
                }
              }
            }
          }
        });
      }
      
      // Carica i dati iniziali
      loadActivityData(activityPeriod ? activityPeriod.value : 'month');
      
      // Aggiorna i dati quando il periodo cambia
      if (activityPeriod) {
        activityPeriod.addEventListener('change', function() {
          loadActivityData(this.value);
        });
      }
      
      // Pulsante di refresh
      const refreshActivity = document.getElementById('refreshActivity');
      if (refreshActivity) {
        refreshActivity.addEventListener('click', function() {
          loadActivityData(activityPeriod ? activityPeriod.value : 'month');
        });
      }
    }
    
    // Grafico distribuzione riparazioni
    const repairsDistributionChartCanvas = document.getElementById('repairsDistributionChart');
    let repairsDistributionChart; // Variabile globale per poter aggiornare il grafico
    
    if (repairsDistributionChartCanvas) {
      // Funzione per caricare i dati del grafico
      function loadRepairsDistributionData() {
        fetch('/admin/api/stats/repairs-distribution', {
          credentials: 'same-origin'
        })
        .then(response => {
          if (!response.ok) {
            throw new Error('Errore nel caricamento dei dati');
          }
          return response.json();
        })
        .then(data => {
          if (data.success) {
            updateRepairsDistributionChart(data.data);
          } else {
            console.error('Errore nei dati:', data.message);
          }
        })
        .catch(error => {
          console.error('Error:', error);
        });
      }
      
      // Funzione per aggiornare il grafico
      function updateRepairsDistributionChart(data) {
        const ctx = repairsDistributionChartCanvas.getContext('2d');
        
        // Distruggi il grafico esistente se presente
        if (repairsDistributionChart) {
          repairsDistributionChart.destroy();
        }
        
        // Crea il nuovo grafico
        repairsDistributionChart = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: ['In attesa', 'In lavorazione', 'Completate', 'Annullate'],
            datasets: [
              {
                data: [
                  data.in_attesa || 0,
                  data.in_lavorazione || 0,
                  data.completate || 0,
                  data.annullate || 0
                ],
                backgroundColor: [
                  '#f59e0b', // In attesa (arancione)
                  '#2563eb', // In lavorazione (blu)
                  '#10b981', // Completate (verde)
                  '#ef4444'  // Annullate (rosso)
                ],
                borderWidth: 1
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom'
              },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    const label = context.label || '';
                    const value = context.raw || 0;
                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                    const percentage = Math.round((value / total) * 100);
                    return `${label}: ${value} (${percentage}%)`;
                  }
                }
              }
            }
          }
        });
      }
      
      // Carica i dati iniziali
      loadRepairsDistributionData();
      
      // Pulsante di refresh
      const refreshRepairsDistribution = document.getElementById('refreshRepairsDistribution');
      if (refreshRepairsDistribution) {
        refreshRepairsDistribution.addEventListener('click', function() {
          loadRepairsDistributionData();
        });
      }
    }
  
    // ------- Gestione notifiche -------
    // Segna come letta una notifica quando viene cliccata
    const notificationItems = document.querySelectorAll('.notification-item');
    notificationItems.forEach(item => {
      if (item.classList.contains('unread')) {
        item.addEventListener('click', function() {
          const notificaId = this.getAttribute('data-id');
          
          if (notificaId) {
            fetch(`/admin/notifiche/${notificaId}/letta`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
              },
              credentials: 'same-origin'
            })
            .then(response => {
              if (!response.ok) {
                throw new Error('Errore nell\'aggiornamento della notifica');
              }
              
              // Non è necessario attendere la risposta per procedere con il redirect
            })
            .catch(error => {
              console.error('Error:', error);
            });
          }
        });
      }
    });
  
    // ------- Gestione tabelle e azioni -------
    // Conferma eliminazione per meccanico, cliente, ecc.
    const deleteForms = document.querySelectorAll('[data-confirm]');
    deleteForms.forEach(form => {
      form.addEventListener('submit', function(event) {
        const message = this.getAttribute('data-confirm') || 'Sei sicuro di voler procedere?';
        
        if (!confirm(message)) {
          event.preventDefault();
          return false;
        }
      });
    });
  
    // Gestione dei filtri nelle tabelle
    const tableFilterForms = document.querySelectorAll('.table-filters form');
    tableFilterForms.forEach(form => {
      form.addEventListener('submit', function(event) {
        // Rimuovi i parametri vuoti dalla query
        const formData = new FormData(this);
        const searchParams = new URLSearchParams();
        
        for (const [key, value] of formData.entries()) {
          if (value) {
            searchParams.append(key, value);
          }
        }
        
        // Costruisci l'URL con i parametri di filtro
        const baseUrl = window.location.pathname;
        window.location.href = baseUrl + '?' + searchParams.toString();
        
        event.preventDefault();
      });
      
      // Reset dei filtri
      const resetBtn = form.querySelector('button[type="reset"]');
      if (resetBtn) {
        resetBtn.addEventListener('click', function() {
          window.location.href = window.location.pathname;
        });
      }
    });
  });