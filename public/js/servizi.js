document.addEventListener('DOMContentLoaded', function() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.15
    });
    
    document.querySelectorAll('.service-section').forEach(el => {
        observer.observe(el);
    });
    
    window.addEventListener('scroll', function() {
        const header = document.querySelector('.services-header-block');
        if (header) {
            const scrollPosition = window.scrollY;
            header.style.backgroundPositionY = scrollPosition * 0.2 + 'px';
        }
    });
    
    // Smooth scroll per gli anchor links
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
    
    // Evidenzia il servizio corrente nella navigazione
    highlightCurrentService();
    
    function highlightCurrentService() {
        const serviceLinks = document.querySelectorAll('.service-nav-link');
        const sections = document.querySelectorAll('.service-section');
        
        if (serviceLinks.length === 0 || sections.length === 0) return;
        
        window.addEventListener('scroll', () => {
            let current = '';
            
            sections.forEach(section => {
                const sectionTop = section.offsetTop - 150;
                const sectionHeight = section.offsetHeight;
                
                if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
                    current = section.getAttribute('id');
                }
            });
            
            serviceLinks.forEach(link => {
                link.classList.remove('active');
                const href = link.getAttribute('href').substring(1); // Remove #
                
                if (href === current) {
                    link.classList.add('active');
                }
            });
        });
    }
    
    // Effetti hover sulle card (semplificati)
    document.querySelectorAll('.service-card').forEach(card => {
        // Rimossi gli effetti di trasformazione per una maggiore semplicità
    });
});
