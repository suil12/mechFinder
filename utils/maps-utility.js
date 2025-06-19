// maps-utils.js - Utility functions for Google Maps integration
const apiKey = process.env.API_MAPS;1
/**
 * Initialize the Google Maps API script dynamically
 * @param {string} apiKey - Your Google Maps API key
 * @param {Array} libraries - Array of libraries to load
 * @param {Function} callback - Function to call when Maps is loaded
 */
function loadGoogleMapsApi(apiKey, libraries = ['places'], callback = null) {
    // Check if API is already loaded
    if (window.google && window.google.maps) {
        if (callback) callback();
        return;
    }

    // Create callback function in global scope
    window.initGoogleMaps = function() {
        if (callback) callback();
    };

    // Build libraries string
    const librariesStr = libraries.join(',');

    // Create script element
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initGoogleMaps&libraries=${librariesStr}&v=weekly`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
}

/**
 * Initialize place autocomplete for address fields
 * @param {string} fieldId - The ID of the input field to attach autocomplete to
 * @param {Function} callback - Function to call when a place is selected
 * @param {Array} countries - Array of country codes to restrict results to
 */
function initPlaceAutocomplete(fieldId, callback, countries = ['it']) {
    const field = document.getElementById(fieldId);
    if (!field) return null;

    const autocomplete = new google.maps.places.Autocomplete(field, {
        componentRestrictions: { country: countries },
        fields: ['address_components', 'geometry', 'name', 'formatted_address'],
        types: ['address']
    });

    field.addEventListener('focus', () => {
        // Prevent form submission when Enter is pressed in the field
        field.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') e.preventDefault();
        });
    });

    // When a place is selected, call the callback
    if (callback) {
        autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            callback(place);
        });
    }

    return autocomplete;
}

/**
 * Extract address components from a Google Place result
 * @param {Object} place - Google Place object
 * @return {Object} Extracted address components
 */
function extractAddressComponents(place) {
    if (!place || !place.address_components) return {};

    const addressData = {
        street_number: '',
        route: '',
        locality: '',
        administrative_area_level_1: '',
        country: '',
        postal_code: '',
        formatted_address: place.formatted_address || '',
        latitude: place.geometry?.location?.lat() || null,
        longitude: place.geometry?.location?.lng() || null
    };

    // Extract each component
    for (const component of place.address_components) {
        const type = component.types[0];
        
        if (addressData.hasOwnProperty(type)) {
            addressData[type] = component.long_name;
        }
    }

    // Combine street_number and route for full street address
    addressData.indirizzo = `${addressData.street_number} ${addressData.route}`.trim();
    
    return addressData;
}

/**
 * Get user's current location
 * @return {Promise} Promise that resolves with the position or rejects with an error
 */
function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("Il tuo browser non supporta la geolocalizzazione."));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            position => {
                const coords = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                resolve(coords);
            },
            error => {
                let errorMessage;
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = "L'accesso alla posizione è stato negato dall'utente.";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = "Le informazioni sulla posizione non sono disponibili.";
                        break;
                    case error.TIMEOUT:
                        errorMessage = "La richiesta di posizione è scaduta.";
                        break;
                    default:
                        errorMessage = "Si è verificato un errore sconosciuto.";
                }
                reject(new Error(errorMessage));
            },
            { 
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    });
}

/**
 * Convert address to coordinates using Google Geocoding API
 * @param {string} address - Address to geocode
 * @return {Promise} Promise that resolves with coordinates or rejects with an error
 */
function geocodeAddress(address) {
    return new Promise((resolve, reject) => {
        if (!window.google || !window.google.maps) {
            reject(new Error("Google Maps API non è caricata."));
            return;
        }

        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ address: address }, (results, status) => {
            if (status === 'OK' && results[0]) {
                const location = results[0].geometry.location;
                resolve({
                    lat: location.lat(),
                    lng: location.lng(),
                    formattedAddress: results[0].formatted_address
                });
            } else {
                reject(new Error(`Geocodifica fallita per il seguente motivo: ${status}`));
            }
        });
    });
}

/**
 * Creates and initializes a map
 * @param {string} mapElementId - The ID of the element to contain the map
 * @param {Object} options - Map options (center, zoom, etc.)
 * @return {Object} Google Map object
 */
function createMap(mapElementId, options = {}) {
    const defaultOptions = {
        center: { lat: 41.9028, lng: 12.4964 }, // Default to Rome, Italy
        zoom: 6,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        mapTypeControl: true,
        zoomControl: true,
        streetViewControl: false
    };

    const mapOptions = {...defaultOptions, ...options};
    return new google.maps.Map(document.getElementById(mapElementId), mapOptions);
}

// Export all functions
export {
    loadGoogleMapsApi,
    initPlaceAutocomplete,
    extractAddressComponents,
    getCurrentLocation,
    geocodeAddress,
    createMap
};