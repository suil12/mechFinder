-- Crea la tabella per salvare le conversazioni del chatbot
CREATE TABLE IF NOT EXISTS chatbot_conversazioni (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    user_type TEXT NOT NULL, -- 'guest', 'cliente', 'meccanico', 'admin'
    messaggio TEXT NOT NULL,
    risposta TEXT NOT NULL,
    timestamp DATETIME NOT NULL,
    feedback INTEGER -- 1 = utile, 0 = non utile (opzionale, implementabile in futuro)
);