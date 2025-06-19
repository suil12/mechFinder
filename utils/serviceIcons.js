function getServiceIcon(serviceName) {
    //pre le icon usiamo font awesome
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
