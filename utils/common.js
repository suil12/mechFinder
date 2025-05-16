"use strict";

/**
 * Common utility functions shared across the application
 */

// Format a date to a localized string
const formatDate = (dateString, options = {}) => {
    const defaultOptions = { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
    };
    
    const mergedOptions = { ...defaultOptions, ...options };
    
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', mergedOptions);
};

// Format a time to a localized string
const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('it-IT', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
};

// Format a price to a localized currency string
const formatPrice = (price) => {
    return new Intl.NumberFormat('it-IT', { 
        style: 'currency', 
        currency: 'EUR' 
    }).format(price);
};

// Capitalize the first letter of a string
const capitalizeFirstLetter = (string) => {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
};

// Create a badge class for repair status
const getStatusBadgeClass = (status) => {
    const statusMap = {
        'richiesta': 'badge-richiesta',
        'preventivo': 'badge-preventivo',
        'accettata': 'badge-accettata',
        'in_corso': 'badge-in_corso',
        'completata': 'badge-completata',
        'rifiutata': 'badge-rifiutata'
    };
    
    return statusMap[status] || 'bg-secondary';
};

// Translate status to user-friendly text
const translateStatus = (status) => {
    const translations = {
        'richiesta': 'Richiesta',
        'preventivo': 'Preventivo',
        'accettata': 'Accettata',
        'in_corso': 'In corso',
        'completata': 'Completata',
        'rifiutata': 'Rifiutata'
    };
    
    return translations[status] || status;
};

module.exports = {
    formatDate,
    formatTime,
    formatPrice,
    capitalizeFirstLetter,
    getStatusBadgeClass,
    translateStatus
};