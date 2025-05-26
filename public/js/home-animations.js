// Gestione del preloader
window.addEventListener('load', function() {
    const preloader = document.querySelector('.preloader');
    if (preloader) {
        setTimeout(function() {
            preloader.classList.add('fade-out');
        }, 500); // Ritardo di mezzo secondo per mostrare il preloader
    }
});

// Gestisce il pulsante "torna su"
window.addEventListener('scroll', function() {
    const scrollToTopBtn = document.querySelector('.scroll-to-top');
    if (scrollToTopBtn) {
        if (window.scrollY > 300) {
            scrollToTopBtn.classList.add('visible');
        } else {
            scrollToTopBtn.classList.remove('visible');
        }
    }
});

document.addEventListener('DOMContentLoaded', function() {
    const scrollToTopBtn = document.querySelector('.scroll-to-top');
    if (scrollToTopBtn) {
        scrollToTopBtn.addEventListener('click', function() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    // Funzione per animare i contatori
function animateCounters() {
    const counters = document.querySelectorAll('.counter');
    const speed = 200; // Velocità dell'animazione (più basso = più veloce)
    
    counters.forEach(counter => {
        const target = +counter.getAttribute('data-target');
        const count = +counter.innerText;
        const increment = Math.ceil(target / speed);
        
        if (count < target) {
            counter.innerText = count + increment;
            setTimeout(() => animateCounters(), 1);
        } else {
            counter.innerText = target.toLocaleString('it-IT');
        }
    });
}

// Funzione per verificare se un elemento è visibile nella viewport
function isElementInViewport(el) {
    const rect = el.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

// Inizia l'animazione quando la sezione statistiche è visibile
function checkIfStatsVisible() {
    const statsSection = document.querySelector('.stats-section');
    if (statsSection && isElementInViewport(statsSection)) {
        // Resetta i contatori a zero prima di iniziare l'animazione
        document.querySelectorAll('.counter').forEach(counter => {
            counter.innerText = '0';
        });
        animateCounters();
        // Rimuovi lo scroll event listener dopo che l'animazione è stata attivata
        window.removeEventListener('scroll', checkIfStatsVisible);
    }
}

// Aggiungi event listener per lo scroll
window.addEventListener('scroll', checkIfStatsVisible);
// Controlla anche all'inizio, in caso la sezione sia già visibile
document.addEventListener('DOMContentLoaded', checkIfStatsVisible);

// Parallax effect per lo sfondo della hero section
window.addEventListener('scroll', function() {
    const heroSection = document.querySelector('.hero-section');
    if (heroSection) {
        const scrollPosition = window.scrollY;
        // Muovi lo sfondo a velocità diversa rispetto allo scroll
        heroSection.style.backgroundPositionY = scrollPosition * 0.5 + 'px';
    }
});

// Aggiunge un effetto di hover ai servizi e alle card dei meccanici
document.addEventListener('DOMContentLoaded', function() {
    // Crea effetto di rotazione 3D leggero sulle card dei servizi
    const serviceCards = document.querySelectorAll('.service-card-modern');
    
    serviceCards.forEach(card => {
        card.addEventListener('mousemove', function(e) {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left; // x position within the element
            const y = e.clientY - rect.top; // y position within the element
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const deltaX = (x - centerX) / centerX * 5; // Max rotation: 5deg
            const deltaY = (y - centerY) / centerY * 5;
            
            card.style.transform = `perspective(1000px) rotateX(${-deltaY}deg) rotateY(${deltaX}deg) scale3d(1.02, 1.02, 1.02)`;
        });
        
        card.addEventListener('mouseleave', function() {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
        });
    });
    
    // Crea effetto di highlight sulle card dei meccanici
    const mechanicCards = document.querySelectorAll('.mechanic-card-modern');
    const mechanicsSlider = document.querySelector('.mechanics-slider');
    
    mechanicCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            mechanicCards.forEach(c => c.classList.add('faded'));
            card.classList.remove('faded');
            card.classList.add('highlighted');
        });
        
        card.addEventListener('mouseleave', function() {
            mechanicCards.forEach(c => {
                c.classList.remove('faded');
                c.classList.remove('highlighted');
            });
        });
    });
    
    // Smooth scroll per i link interni
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 100,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Auto-scroll per il carousel dei meccanici
    let scrollInterval;
    let scrollDirection = 1; // 1 per destra, -1 per sinistra
    
    if (mechanicsSlider && mechanicsSlider.scrollWidth > mechanicsSlider.clientWidth) {
        // Inizia lo scroll automatico quando il mouse non è sopra il carousel
        mechanicsSlider.addEventListener('mouseenter', () => {
            clearInterval(scrollInterval);
        });
        
        mechanicsSlider.addEventListener('mouseleave', () => {
            startAutoScroll();
        });
        
        // Avvia lo scroll automatico
        function startAutoScroll() {
            scrollInterval = setInterval(() => {
                mechanicsSlider.scrollBy({
                    left: 1 * scrollDirection,
                    behavior: 'auto'
                });
                
                // Cambia direzione quando raggiunge un estremo
                if (mechanicsSlider.scrollLeft <= 0) {
                    scrollDirection = 1;
                } else if (mechanicsSlider.scrollLeft + mechanicsSlider.clientWidth >= mechanicsSlider.scrollWidth - 5) {
                    scrollDirection = -1;
                }
            }, 20);
        }
        
        startAutoScroll();
    }
    
    // Aggiunge la funzionalità di scorrimento al carousel delle testimonianze
    const testimonialsCarousel = document.querySelector('.testimonials-carousel');
    const prevTestimonialBtn = document.querySelector('.prev-testimonial');
    const nextTestimonialBtn = document.querySelector('.next-testimonial');
    
    if (testimonialsCarousel && prevTestimonialBtn && nextTestimonialBtn) {
        const testimonialCard = document.querySelector('.testimonial-card');
        const cardWidth = testimonialCard ? testimonialCard.offsetWidth + 24 : 374; // 350px + 24px di gap
        
        prevTestimonialBtn.addEventListener('click', () => {
            testimonialsCarousel.scrollBy({
                left: -cardWidth,
                behavior: 'smooth'
            });
        });
        
        nextTestimonialBtn.addEventListener('click', () => {
            testimonialsCarousel.scrollBy({
                left: cardWidth,
                behavior: 'smooth'
            });
        });
    }
});
