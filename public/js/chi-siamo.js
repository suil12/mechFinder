// Chi Siamo - JavaScript modernizzato con animazioni semplici
document.addEventListener('DOMContentLoaded', function() {
    
    // Inizializzazione delle funzionalità
    initScrollAnimations();
    initSmoothScrolling();
    initTeamImages();
    initTimelineAnimation();
    
    /**
     * Gestisce le animazioni di scroll semplici
     */
    function initScrollAnimations() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        
        const observer = new IntersectionObserver(function(entries) {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, observerOptions);
        
        // Elementi da animare
        const animatedElements = document.querySelectorAll('.value-card, .team-card, .timeline-item, .about-content, .about-image');
        animatedElements.forEach(el => {
            el.classList.add('fade-in-element');
            observer.observe(el);
        });
    }
    
    /**
     * Scroll fluido per i link interni
     */
    function initSmoothScrolling() {
        const internalLinks = document.querySelectorAll('a[href^="#"]');
        
        internalLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                if (href === '#') return;
                
                const target = document.querySelector(href);
                if (target) {
                    e.preventDefault();
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }
    
    /**
     * Gestione delle immagini del team con fallback
     */
    function initTeamImages() {
        const teamImages = document.querySelectorAll('.team-image img');
        
        teamImages.forEach(img => {
            img.addEventListener('error', function() {
                this.src = '/media/img/default_mechanic.png';
                this.alt = 'Membro del team MechFinder';
            });
            
            img.addEventListener('load', function() {
                this.style.opacity = '1';
            });
        });
    }
    
    /**
     * Animazione della timeline responsive
     */
    function initTimelineAnimation() {
        const timelineItems = document.querySelectorAll('.timeline-item');
        
        if (timelineItems.length === 0) return;
        
        const timelineObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, {
            threshold: 0.2
        });
        
        timelineItems.forEach((item, index) => {
            // Imposta stato iniziale
            item.style.opacity = '0';
            item.style.transform = 'translateY(30px)';
            item.style.transition = `opacity 0.6s ease ${index * 0.1}s, transform 0.6s ease ${index * 0.1}s`;
            
            timelineObserver.observe(item);
        });
    }
    
    /**
     * Gestione responsive per la timeline
     */
    function handleTimelineResponsive() {
        const timeline = document.querySelector('.timeline');
        if (!timeline) return;
        
        function checkMobile() {
            if (window.innerWidth <= 768) {
                timeline.classList.add('timeline-mobile');
            } else {
                timeline.classList.remove('timeline-mobile');
            }
        }
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
    }
    
    // Inizializza timeline responsive
    handleTimelineResponsive();
    
    /**
     * Animazione per le card dei valori
     */
    function initValueCards() {
        const valueCards = document.querySelectorAll('.value-card');
        
        valueCards.forEach(card => {
            card.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-5px)';
            });
            
            card.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0)';
            });
        });
    }
    
    // Inizializza animazioni delle card
    initValueCards();
    
    /**
     * Prevenzione errori per elementi mancanti
     */
    function preventErrors() {
        // Gestione errori per modali mancanti
        const modalTriggers = document.querySelectorAll('[data-bs-toggle="modal"]');
        modalTriggers.forEach(trigger => {
            trigger.addEventListener('click', function(e) {
                const targetModal = this.getAttribute('data-bs-target');
                if (targetModal && !document.querySelector(targetModal)) {
                    e.preventDefault();
                    console.warn('Modal non trovato:', targetModal);
                }
            });
        });
        
        // Gestione errori per link social
        const socialLinks = document.querySelectorAll('.social-link');
        socialLinks.forEach(link => {
            if (link.getAttribute('href') === '#') {
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    console.log('Link social placeholder');
                });
            }
        });
    }
    
    // Inizializza prevenzione errori
    preventErrors();
    
    console.log('Chi Siamo page initialized successfully');
});