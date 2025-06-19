// JavaScript per la pagina Meccanici
document.addEventListener('DOMContentLoaded', function() {
    
    // Inizializza le animazioni
    initializeAnimations();
    
    // Gestisce i filtri
    setupFilters();
    
    // Gestisce il loading delle card
    setupCardInteractions();
    
    // Smooth scroll
    setupSmoothScroll();
});

function initializeAnimations() {
    // Intersection Observer per animazioni al scroll
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    // Osserva le card dei meccanici
    document.querySelectorAll('.mechanic-card').forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'all 0.6s ease';
        observer.observe(card);
    });
}

function setupFilters() {
    const filterForm = document.querySelector('.filter-sidebar form');
    const resetBtn = document.querySelector('.btn-reset');
    
    if (!filterForm) return;
    
    // Auto-submit dei filtri quando cambia la selezione
    const selects = filterForm.querySelectorAll('select');
    selects.forEach(select => {
        select.addEventListener('change', function() {
            // Aggiungi un piccolo delay per migliorare l'UX
            setTimeout(() => {
                filterForm.submit();
            }, 300);
        });
    });
    
    // Gestisce il reset dei filtri
    if (resetBtn) {
        resetBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Resetta tutti i campi
            filterForm.querySelectorAll('input, select').forEach(field => {
                if (field.type === 'text') {
                    field.value = '';
                } else if (field.type === 'select-one') {
                    field.selectedIndex = 0;
                }
            });
            
            // Aggiungi animazione di feedback
            this.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Resetting...';
            
            setTimeout(() => {
                filterForm.submit();
            }, 500);
        });
    }
    
    // Mostra un indicatore di caricamento durante la ricerca
    filterForm.addEventListener('submit', function() {
        const submitBtn = this.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Caricamento...';
            submitBtn.disabled = true;
        }
        
        // Aggiungi effetto di loading alle card esistenti
        document.querySelectorAll('.mechanic-card').forEach(card => {
            card.style.opacity = '0.5';
            card.style.transform = 'scale(0.95)';
        });
    });
}

function setupCardInteractions() {
    const mechanicCards = document.querySelectorAll('.mechanic-card');
    
    mechanicCards.forEach(card => {
        // Effetto hover migliorato
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
        
        // Click tracking per analytics (se necessario)
        const profileBtn = card.querySelector('.btn-profile');
        const quoteBtn = card.querySelector('.btn-quote');
        
        if (profileBtn) {
            profileBtn.addEventListener('click', function(e) {
                // Aggiungi animazione di click
                this.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    this.style.transform = 'scale(1)';
                }, 150);
            });
        }
        
        if (quoteBtn) {
            quoteBtn.addEventListener('click', function(e) {
                // Aggiungi animazione di click
                this.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    this.style.transform = 'scale(1)';
                }, 150);
            });
        }
    });
}

function setupSmoothScroll() {
    // Smooth scroll per eventuali link interni
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Funzione per aggiornare i risultati via AJAX (opzionale per future implementazioni)
function updateResults(filters) {
    // Implementazione futura per caricamento dinamico dei risultati
    // senza refresh della pagina
}

// Gestisce il responsive behavior
function handleResponsive() {
    const sidebar = document.querySelector('.filter-sidebar');
    const toggleBtn = document.getElementById('filter-toggle');
    
    if (window.innerWidth <= 992) {
        // Su mobile, trasforma la sidebar in un collapsible
        if (sidebar && !document.getElementById('filters-collapse')) {
            const collapseDiv = document.createElement('div');
            collapseDiv.className = 'collapse';
            collapseDiv.id = 'filters-collapse';
            
            // Sposta il contenuto della sidebar nel collapse
            const filterCard = sidebar.querySelector('.filter-card');
            if (filterCard) {
                collapseDiv.appendChild(filterCard);
                sidebar.appendChild(collapseDiv);
            }
        }
    }
}

// Event listeners per responsive
window.addEventListener('resize', handleResponsive);
handleResponsive(); // Esegui al caricamento

// Preload delle immagini per migliorare le performance
function preloadImages() {
    const images = document.querySelectorAll('.mechanic-avatar[data-src]');
    
    images.forEach(img => {
        const imageLoader = new Image();
        imageLoader.onload = function() {
            img.src = this.src;
            img.removeAttribute('data-src');
            img.classList.add('loaded');
        };
        imageLoader.src = img.getAttribute('data-src');
    });
}

// Inizializza il preload delle immagini
preloadImages();
