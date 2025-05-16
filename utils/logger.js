"use strict";

// Simple logger utility
const logger = {
    debug: (message, ...args) => {
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[DEBUG] ${message}`, ...args);
        }
    },
    
    info: (message, ...args) => {
        console.log(`[INFO] ${message}`, ...args);
    },
    
    warn: (message, ...args) => {
        console.warn(`[WARN] ${message}`, ...args);
    },
    
    error: (message, ...args) => {
        console.error(`[ERROR] ${message}`, ...args);
    }
};

module.exports = logger;