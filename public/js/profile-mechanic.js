/**
 * profile-mechanic.js - Gestione del profilo meccanico
 * Questo file gestisce le funzionalità specifiche della pagina del profilo meccanico,
 * inclusi orari di apertura, servizi offerti e gestione delle riparazioni.
 */

document.addEventListener('DOMContentLoaded', function() {
    // ------- Gestione della modifica del profilo -------
    const editProfileBtn = document.getElementById('editProfileBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const profileDataView = document.getElementById('profileDataView');
    const profileEditForm = document.getElementById('profileEditForm');
  
    if (editProfileBtn && cancelEditBtn && profileDataView && profileEditForm) {
      // Mostra il form di modifica
      editProfileBtn.addEventListener('click', function() {
        profileDataView.classList.add('d-none');
        profileEditForm.classList.remove('d-none');
      });
  
      // Nasconde il form di modifica
      cancelEditBtn.addEventListener('click', function() {
        profileDataView.classList.remove('d-none');
        profileEditForm.classList.add('d-none');
      });
  
      // Validazione form di modifica
      profileEditForm.addEventListener('submit', function(event) {
        const password = document.getElementById('password');
        const passwordConfirm = document.getElementById('password_confirm');
        
        if (password.value || passwordConfirm.value) {
          if (password.value !== passwordConfirm.value) {
            event.preventDefault();
            alert('Le password non coincidono');
            return false;
          }
          
          if (password.value.length < 6) {
            event.preventDefault();
            alert('La password deve essere di almeno 6 caratteri');
            return false;
          }
        }
      });
    }
  
    // ------- Gestione orari di apertura -------
    const editHoursBtn = document.getElementById('editHoursBtn');
    const cancelHoursBtn = document.getElementById('cancelHoursBtn');
    const hoursView = document.getElementById('hoursView');
    const hoursEditForm = document.getElementById('hoursEditForm');
  
    if (editHoursBtn && cancelHoursBtn && hoursView && hoursEditForm) {
      // Mostra il form di modifica degli orari
      editHoursBtn.addEventListener('click', function() {
        hoursView.classList.add('d-none');
        hoursEditForm.classList.remove('d-none');
      });
  
      // Nasconde il form di modifica degli orari
      cancelHoursBtn.addEventListener('click', function() {
        hoursView.classList.remove('d-none');
        hoursEditForm.classList.add('d-none');
      });
  
      // Gestione degli orari di apertura
      const dayClosedCheckboxes = document.querySelectorAll('.day-closed');
      dayClosedCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
          const dayHoursInputs = this.closest('.opening-day-edit').querySelector('.day-hours-inputs');
          
          if (this.checked) {
            dayHoursInputs.classList.add('d-none');
          } else {
            dayHoursInputs.classList.remove('d-none');
          }
        });
      });
    }
  
    // ------- Gestione del caricamento immagine profilo -------
    const avatarUpload = document.getElementById('avatarUpload');
    if (avatarUpload) {
      avatarUpload.addEventListener('change', function() {
        const file = this.files[0];
        
        if (!file) return;
        
        // Controlla dimensione file (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          alert('Il file è troppo grande. La dimensione massima è 5MB.');
          return;
        }
        
        // Controlla tipo file (solo immagini)
        if (!file.type.match('image.*')) {
          alert('Puoi caricare solo immagini.');
          return;
        }
        
        // Crea un FormData per l'upload
        const formData = new FormData();
        formData.append('avatar', file);
        
        // Upload dell'immagine tramite AJAX
        fetch('/meccanico/profilo/avatar', {
          method: 'POST',
          body: formData,
          credentials: 'same-origin'
        })
        .then(response => {
          if (!response.ok) {
            throw new Error('Errore nel caricamento dell\'immagine');
          }
          return response.json();
        })
        .then(data => {
          if (data.success) {
            // Aggiorna l'immagine del profilo senza ricaricare la pagina
            document.querySelectorAll('.profile-avatar img').forEach(img => {
              img.src = data.avatarUrl + '?t=' + new Date().getTime(); // Aggiungi timestamp per evitare la cache
            });
            
            alert('Immagine del profilo aggiornata con successo');
          } else {
            alert(data.message || 'Si è verificato un errore nel caricamento dell\'immagine');
          }
        })
        .catch(error => {
          console.error('Error:', error);
          alert('Si è verificato un errore nel caricamento dell\'immagine');
        });
      });
    }
  
    // ------- Gestione delle tab del profilo -------
    // Bootstrap gestisce già il cambio tab, aggiungiamo solo funzionalità aggiuntive
    
    // Mantiene la tab attiva dopo il ricaricamento della pagina
    const activeTabId = localStorage.getItem('activeMechanicProfileTab');
    if (activeTabId) {
      const activeTab = document.querySelector(`#profileTabs button[data-bs-target="${activeTabId}"]`);
      if (activeTab) {
        const tab = new bootstrap.Tab(activeTab);
        tab.show();
      }
    }
    
    // Salva la tab attiva quando l'utente cambia tab
    const tabEls = document.querySelectorAll('#profileTabs button[data-bs-toggle="tab"]');
    tabEls.forEach(tabEl => {
      tabEl.addEventListener('shown.bs.tab', function (event) {
        const targetId = event.target.getAttribute('data-bs-target');
        localStorage.setItem('activeMechanicProfileTab', targetId);
      });
    });
  
    // ------- Gestione servizi -------
    // Validazione form servizi
    const addServiceForm = document.querySelector('#addServiceModal form');
    if (addServiceForm) {
      addServiceForm.addEventListener('submit', function(event) {
        const prezzoBase = parseFloat(document.getElementById('prezzoBaseServizio').value);
        if (isNaN(prezzoBase) || prezzoBase < 0) {
          event.preventDefault();
          alert('Il prezzo base deve essere un numero positivo');
          return false;
        }
      });
    }
  
    // Funzione per attivare/disattivare un servizio
    window.toggleService = function(serviceId, state) {
      fetch(`/meccanico/servizi/${serviceId}/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
        },
        body: JSON.stringify({ attivo: state }),
        credentials: 'same-origin'
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Errore nella modifica dello stato del servizio');
        }
        return response.json();
      })
      .then(data => {
        if (data.success) {
          window.location.reload();
        } else {
          alert(data.message || 'Si è verificato un errore nella modifica dello stato del servizio');
        }
      })
      .catch(error => {
        console.error('Error:', error);
        alert('Si è verificato un errore nella modifica dello stato del servizio');
      });
    };
  
    // ------- Gestione riparazioni -------
    // Tab di stato riparazioni
    const repairsStateTabs = document.getElementById('repairs-state-tabs');
    if (repairsStateTabs) {
      // Mantiene la tab attiva dopo il ricaricamento della pagina
      const activeRepairTabId = localStorage.getItem('activeRepairStateTab');
      if (activeRepairTabId) {
        const activeTab = document.querySelector(`#repairs-state-tabs button[data-bs-target="${activeRepairTabId}"]`);
        if (activeTab) {
          const tab = new bootstrap.Tab(activeTab);
          tab.show();
        }
      }
      
      // Salva la tab attiva quando l'utente cambia tab
      const tabEls = document.querySelectorAll('#repairs-state-tabs button[data-bs-toggle="tab"]');
      tabEls.forEach(tabEl => {
        tabEl.addEventListener('shown.bs.tab', function (event) {
          const targetId = event.target.getAttribute('data-bs-target');
          localStorage.setItem('activeRepairStateTab', targetId);
        });
      });
    }
  
    // Gestione date nei form di accettazione riparazione
    const acceptRepairForms = document.querySelectorAll('[id^="acceptRepairModal"] form');
    acceptRepairForms.forEach(form => {
      // Imposta la data di stima completamento a 7 giorni dopo la data inizio
      const dataInizioInput = form.querySelector('[name="data_inizio"]');
      const stimaCompletamentoInput = form.querySelector('[name="stima_completamento"]');
      
      if (dataInizioInput && stimaCompletamentoInput) {
        // Imposta data minima a oggi
        const today = new Date().toISOString().split('T')[0];
        dataInizioInput.setAttribute('min', today);
        
        // Imposta stima completamento
        dataInizioInput.addEventListener('change', function() {
          const dataInizio = new Date(this.value);
          dataInizio.setDate(dataInizio.getDate() + 7); // 7 giorni dopo
          stimaCompletamentoInput.value = dataInizio.toISOString().split('T')[0];
          stimaCompletamentoInput.setAttribute('min', this.value); // Data minima = data inizio
        });
        
        // Trigger al caricamento
        if (dataInizioInput.value) {
          const dataInizio = new Date(dataInizioInput.value);
          dataInizio.setDate(dataInizio.getDate() + 7);
          stimaCompletamentoInput.value = dataInizio.toISOString().split('T')[0];
          stimaCompletamentoInput.setAttribute('min', dataInizioInput.value);
        }
      }
    });
  
    // ------- Filtri per le riparazioni -------
    const repairsFilterForm = document.getElementById('repairsFilterForm');
    if (repairsFilterForm) {
      repairsFilterForm.addEventListener('submit', function(event) {
        // Rimuovi i parametri vuoti dalla query
        const formData = new FormData(this);
        const searchParams = new URLSearchParams();
        
        for (const [key, value] of formData.entries()) {
          if (value) {
            searchParams.append(key, value);
          }
        }
        
        window.location.href = '/meccanico/riparazioni?' + searchParams.toString();
        event.preventDefault();
      });
      
      // Reset dei filtri
      repairsFilterForm.querySelector('button[type="reset"]').addEventListener('click', function() {
        window.location.href = '/meccanico/riparazioni';
      });
    }
  });