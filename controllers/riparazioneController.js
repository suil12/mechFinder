// Impostazioni di paginazione
const perPage = 10;
const offset = (filtri.page - 1) * perPage;

// Costruisci la query base
let query = `
    SELECT r.*, 
    c.nome as nome_cliente, c.cognome as cognome_cliente,
    (SELECT COUNT(*) FROM preventivi p WHERE p.id_riparazione = r.id) as n_preventivi
    FROM riparazioni r
    JOIN clienti c ON r.id_cliente = c.id
    WHERE 1=1
`;

const queryParams = [];

// Aggiungi i filtri alla query
if (filtri.stato) {
    query += ' AND r.stato = ?';
    queryParams.push(filtri.stato);
}

if (filtri.categoria) {
    query += ' AND r.categoria = ?';
    queryParams.push(filtri.categoria);
}

if (filtri.q) {
    query += ' AND (r.titolo LIKE ? OR r.descrizione LIKE ?)';
    queryParams.push(`%${filtri.q}%`, `%${filtri.q}%`);
}

// Se l'utente è un meccanico, verifica quali richieste ha già offerto un preventivo
if (req.user.tipo === 'meccanico') {
    query = `
        SELECT r.*, 
        c.nome as nome_cliente, c.cognome as cognome_cliente,
        (SELECT COUNT(*) FROM preventivi p WHERE p.id_riparazione = r.id) as n_preventivi,
        EXISTS(SELECT 1 FROM preventivi p WHERE p.id_riparazione = r.id AND p.id_meccanico = ?) as meccanico_ha_offerto
        FROM riparazioni r
        JOIN clienti c ON r.id_cliente = c.id
        WHERE 1=1
    `;
    queryParams.unshift(req.user.id); // Aggiungi l'ID del meccanico all'inizio dei parametri
}

// Aggiungi ordinamento
switch(filtri.ordina) {
    case 'urgenti':
        query += ' ORDER BY r.urgente DESC, r.data_creazione DESC';
        break;
    case 'budget':
        query += ' ORDER BY r.budget DESC, r.data_creazione DESC';
        break;
    case 'recenti':
    default:
        query += ' ORDER BY r.data_creazione DESC';
}

// Aggiungi paginazione
query += ' LIMIT ? OFFSET ?';
queryParams.push(perPage, offset);

// Esegui la query per ottenere le riparazioni
const riparazioni = await db.query(query, queryParams);

// Conta il totale delle riparazioni per la paginazione
let countQuery = `
    SELECT COUNT(*) as total 
    FROM riparazioni r
    WHERE 1=1
`;

const countParams = [];

if (filtri.stato) {
    countQuery += ' AND r.stato = ?';
    countParams.push(filtri.stato);
}

if (filtri.categoria) {
    countQuery += ' AND r.categoria = ?';
    countParams.push(filtri.categoria);
}

if (filtri.q) {
    countQuery += ' AND (r.titolo LIKE ? OR r.descrizione LIKE ?)';
    countParams.push(`%${filtri.q}%`, `%${filtri.q}%`);
}

const totalResult = await db.get(countQuery, countParams);
const totalRiparazioni = totalResult.total;

// Se l'utente è un cliente, recupera i suoi veicoli per il form di nuova richiesta
let veicoli = [];
if (req.user.tipo === 'cliente') {
    veicoli = await db.query('SELECT * FROM veicoli WHERE id_cliente = ?', [req.user.id]);
}

// Se l'utente è un meccanico, recupera le statistiche
let stats = {};
if (req.user.tipo === 'meccanico') {
    const richiesteGestite = await db.get(
        'SELECT COUNT(*) as count FROM preventivi WHERE id_meccanico = ?', 
        [req.user.id]
    );
    
    const preventiviAccettati = await db.get(
        'SELECT COUNT(*) as count FROM preventivi WHERE id_meccanico = ? AND stato = ?', 
        [req.user.id, 'accettato']
    );
    
    stats = {
        richiesteGestite: richiesteGestite.count,
        preventiviAccettati: preventiviAccettati.count
    };
}

// Renderizza la vista
res.render('riparazioni', {
    title: 'Bacheca Riparazioni - MechFinder',
    active: 'riparazioni',
    riparazioni: riparazioni,
    filtri: filtri,
    veicoli: veicoli,
    stats: stats,
    pagination: {
        currentPage: filtri.page,
        totalPages: Math.ceil(totalRiparazioni / perPage),
        totalItems: totalRiparazioni
    },
    formatDate: (date) => {
        const d = new Date(date);
        return d.toLocaleDateString('it-IT', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
});
} catch (err) {
console.error('Errore nella visualizzazione della bacheca delle riparazioni:', err);
req.flash('error', 'Si è verificato un errore nel caricamento della bacheca delle riparazioni.');
res.redirect('/');
}