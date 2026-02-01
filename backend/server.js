const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. MIDDLEWARES
app.use(cors());
app.use(bodyParser.json());

// 2. CONNEXION DB
const dbPath = path.join(__dirname, 'concert_tickets.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erreur de connexion à la DB:', err);
    } else {
        console.log('✓ Connecté à la base de données SQLite');
        initDatabase();
    }
});

// 3. INITIALISATION & AUTO-IMPORT
function initDatabase() {
    // Création Table Tickets
    db.run(`
        CREATE TABLE IF NOT EXISTS tickets (
            ticket_id INTEGER PRIMARY KEY,
            code TEXT UNIQUE NOT NULL,
            prefix TEXT NOT NULL,
            status TEXT DEFAULT 'valid',
            scanned BOOLEAN DEFAULT 0,
            exited BOOLEAN DEFAULT 0,
            scan_count INTEGER DEFAULT 0,
            first_scan_time TEXT,
            last_scan_time TEXT,
            exit_time TEXT,
            created_at TEXT NOT NULL
        )
    `, (err) => {
        if (!err) {
            console.log('✓ Table tickets vérifiée');
            // VERIFICATION SI VIDE POUR IMPORT
            db.get("SELECT COUNT(*) as count FROM tickets", (err, row) => {
                if (row && row.count === 0) {
                    autoImportTickets();
                }
            });
        }
    });

    // Création Table Scans
    db.run(`
        CREATE TABLE IF NOT EXISTS scans (
            scan_id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticket_code TEXT NOT NULL,
            action TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            scanner_id TEXT,
            status TEXT,
            duplicate BOOLEAN DEFAULT 0,
            FOREIGN KEY (ticket_code) REFERENCES tickets(code)
        )
    `);
}

// Fonction qui remplit la DB depuis le JSON
function autoImportTickets() {
    const jsonPath = path.join(__dirname, 'tickets_database.json');
    if (fs.existsSync(jsonPath)) {
        console.log("Base vide, importation depuis tickets_database.json...");
        const data = fs.readFileSync(jsonPath, 'utf8');
        const tickets = JSON.parse(data);
        
        const stmt = db.prepare(`
            INSERT OR IGNORE INTO tickets 
            (ticket_id, code, prefix, status, scanned, scan_count, first_scan_time, last_scan_time, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        tickets.forEach(t => {
            stmt.run([t.ticket_id, t.code, t.prefix, t.status, t.scanned ? 1:0, t.scan_count, t.first_scan_time, t.last_scan_time, t.created_at]);
        });
        stmt.finalize();
        console.log(`✓ ${tickets.length} tickets importés avec succès.`);
    }
}

// 4. ROUTES API
app.get('/api/tickets', (req, res) => {
    db.all('SELECT * FROM tickets', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/scan', (req, res) => {
    const { code, action, scanner_id } = req.body;
    const timestamp = new Date().toISOString();

    db.get('SELECT * FROM tickets WHERE code = ?', [code], (err, ticket) => {
        if (!ticket) return res.status(404).json({ success: false, error: 'Ticket inconnu' });
        
        // Logique simplifiée pour l'exemple
        const isDuplicate = (action === 'entry' && ticket.scanned && !ticket.exited);
        const status = isDuplicate ? 'duplicate' : 'success';

        db.run(`UPDATE tickets SET scanned = 1, last_scan_time = ?, scan_count = scan_count + 1 WHERE code = ?`, [timestamp, code]);
        db.run(`INSERT INTO scans (ticket_code, action, timestamp, status, duplicate) VALUES (?, ?, ?, ?, ?)`, 
               [code, action, timestamp, status, isDuplicate ? 1 : 0]);

        res.json({ success: !isDuplicate, ticket, duplicate: isDuplicate });
    });
});

app.get('/api/stats', (req, res) => {
    db.get(`SELECT 
        COUNT(*) as total, 
        SUM(CASE WHEN scanned = 1 THEN 1 ELSE 0 END) as scanned 
        FROM tickets`, (err, row) => {
        res.json(row);
    });
});

// 5. SERVIR LE FRONTEND
// Note: On utilise path.join pour que Render trouve les dossiers peu importe d'où on lance le script
app.use('/scanner', express.static(path.join(__dirname, '../scanner-app')));
app.use('/admin', express.static(path.join(__dirname, '../admin-dashboard')));

app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});