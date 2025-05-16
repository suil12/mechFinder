/**
 * profile.js - Gestione del profilo cliente
 * Questo file gestisce tutte le funzionalità della pagina del profilo cliente,
 * inclusa la modifica del profilo, il caricamento dell'immagine e la gestione delle tab.
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
        fetch('/cliente/profilo/avatar', {
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
    const activeTabId = localStorage.getItem('activeProfileTab');
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
        localStorage.setItem('activeProfileTab', targetId);
      });
    });
  
    // ------- Gestione delle recensioni -------
    // Sistema di rating stelle per le recensioni
    const ratingStars = document.querySelectorAll('.rating-stars input');
    ratingStars.forEach(star => {
      star.addEventListener('change', function() {
        const starId = this.id;
        const rating = parseInt(this.value);
        const starsContainer = this.closest('.rating-stars');
        
        // Aggiorna visivamente le stelle
        starsContainer.querySelectorAll('label i').forEach((icon, index) => {
          if (index < rating) {
            icon.classList.add('text-warning');
          } else {
            icon.classList.remove('text-warning');
          }
        });
      });
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
        
        window.location.href = '/cliente/riparazioni?' + searchParams.toString();
        event.preventDefault();
      });
      
      // Reset dei filtri
      repairsFilterForm.querySelector('button[type="reset"]').addEventListener('click', function() {
        window.location.href = '/cliente/riparazioni';
      });
    }
  
    // ------- Gestione veicoli -------
    // Conferma eliminazione veicolo
    const deleteVehicleBtns = document.querySelectorAll('[data-bs-target^="#deleteVehicleModal"]');
    deleteVehicleBtns.forEach(btn => {
      btn.addEventListener('click', function() {
        // Il modal viene gestito da Bootstrap
        // Aggiungiamo solo conferma aggiuntiva
        const modalId = this.getAttribute('data-bs-target');
        const modal = document.querySelector(modalId);
        
        if (modal) {
          const confirmBtn = modal.querySelector('.btn-danger');
          confirmBtn.addEventListener('click', function() {
            // Mostra un loader sul pulsante
            this.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Eliminazione...';
            this.disabled = true;
          });
        }
      });
    });
  });