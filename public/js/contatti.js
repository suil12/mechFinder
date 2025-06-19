// JavaScript semplificato per la pagina Contatti
document.addEventListener('DOMContentLoaded', function() {
    console.log('Contatti page loaded');

    // Animazioni semplici per gli elementi
    const elements = document.querySelectorAll('.contact-card, .contact-info-item, .faq-item');
    
    elements.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        
        setTimeout(() => {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        }, index * 100);
    });

    // Gestione form contatti
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', handleFormSubmit);
    }

    // Gestione FAQ accordion
    const faqQuestions = document.querySelectorAll('.faq-question');
    faqQuestions.forEach(question => {
        question.addEventListener('click', toggleFAQ);
    });

    // Smooth scroll per link interni
    const smoothLinks = document.querySelectorAll('a[href^="#"]');
    smoothLinks.forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
});

function handleFormSubmit(e) {
    e.preventDefault();
    
    const nome = document.getElementById('nome');
    const email = document.getElementById('email');
    const messaggio = document.getElementById('messaggio');
    
    let isValid = true;
    
    // Reset errori precedenti
    document.querySelectorAll('.error-message').forEach(el => el.remove());
    
    // Validazione
    if (!nome.value.trim()) {
        showError(nome, 'Il nome è obbligatorio');
        isValid = false;
    }
    
    if (!email.value.trim()) {
        showError(email, 'L\'email è obbligatoria');
        isValid = false;
    } else if (!isValidEmail(email.value)) {
        showError(email, 'Inserisci un\'email valida');
        isValid = false;
    }
    
    if (!messaggio.value.trim()) {
        showError(messaggio, 'Il messaggio è obbligatorio');
        isValid = false;
    }
    
    if (isValid) {
        showSuccess('Messaggio inviato con successo!');
        document.getElementById('contactForm').reset();
    }
}

function showError(input, message) {
    const formGroup = input.closest('.form-group');
    formGroup.classList.add('error');
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    errorDiv.style.cssText = 'color: #e74c3c; font-size: 0.875rem; margin-top: 0.5rem;';
    formGroup.appendChild(errorDiv);
}

function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    successDiv.style.cssText = `
        background: #d4edda;
        color: #155724;
        padding: 1rem;
        border-radius: 5px;
        margin-top: 1rem;
        border: 1px solid #c3e6cb;
    `;
    
    document.getElementById('contactForm').appendChild(successDiv);
    
    setTimeout(() => {
        successDiv.remove();
    }, 5000);
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function toggleFAQ() {
    const faqItem = this.closest('.faq-item');
    const answer = faqItem.querySelector('.faq-answer');
    const icon = this.querySelector('.faq-icon');
    
    // Chiudi tutte le altre FAQ
    document.querySelectorAll('.faq-item').forEach(item => {
        if (item !== faqItem) {
            item.classList.remove('active');
            const otherAnswer = item.querySelector('.faq-answer');
            const otherIcon = item.querySelector('.faq-icon');
            if (otherAnswer) otherAnswer.style.display = 'none';
            if (otherIcon) otherIcon.textContent = '+';
        }
    });
    
    // Toggle FAQ corrente
    faqItem.classList.toggle('active');
    if (faqItem.classList.contains('active')) {
        answer.style.display = 'block';
        if (icon) icon.textContent = '-';
    } else {
        answer.style.display = 'none';
        if (icon) icon.textContent = '+';
    }
}
