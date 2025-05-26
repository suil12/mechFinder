// Funzione helper per ottenere l'icona FontAwesome in base al nome del servizio
function getServiceIcon(serviceName) {
    // Tutte le icone utilizzano classi FontAwesome 6 standard
    const serviceIcons = {
        'Meccanica': 'fas fa-cogs',
        'Elettronica': 'fas fa-bolt',
        'Gomme': 'fas fa-circle-notch',
        'Carrozzeria': 'fas fa-car',
        'Tagliandi': 'fas fa-clipboard-check',
        'Revisioni': 'fas fa-search',
        'Climatizzazione': 'fas fa-snowflake',
        'Diagnosi': 'fas fa-laptop-medical',
        'Freni': 'fas fa-stop', 
        'Cambio Olio': 'fas fa-tint'
    };
    
    // Restituisce l'icona corrispondente o un'icona predefinita
    return serviceIcons[serviceName] || 'fas fa-tools';
}

module.exports = {
    getServiceIcon
};
