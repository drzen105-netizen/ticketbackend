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
                    console.log('⚠ Base vide, tentative d\'import automatique...');
                    autoImportTickets();
                } else {
                    console.log(`✓ ${row.count} tickets déjà en base`);
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
    `, (err) => {
        if (!err) {
            console.log('✓ Table scans vérifiée');
        }
    });
}

// Fonction qui remplit la DB depuis le JSON
function autoImportTickets() {
    const jsonPath = path.join(__dirname, 'tickets_database.json');
    console.log('Recherche du fichier JSON à:', jsonPath);
    
    if (fs.existsSync(jsonPath)) {
        try {
            console.log("📥 Importation depuis tickets_database.json...");
            const data = fs.readFileSync(jsonPath, 'utf8');
            const tickets = JSON.parse(data);
            
            const stmt = db.prepare(`
                INSERT OR IGNORE INTO tickets 
                (ticket_id, code, prefix, status, scanned, scan_count, first_scan_time, last_scan_time, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            let imported = 0;
            tickets.forEach(t => {
                stmt.run([
                    t.ticket_id, 
                    t.code, 
                    t.prefix, 
                    t.status, 
                    t.scanned ? 1 : 0, 
                    t.scan_count, 
                    t.first_scan_time, 
                    t.last_scan_time, 
                    t.created_at
                ], (err) => {
                    if (!err) imported++;
                });
            });
            
            stmt.finalize(() => {
                console.log(`✓ ${imported}/${tickets.length} tickets importés avec succès.`);
            });
        } catch (err) {
            console.error('❌ Erreur lors de l\'import:', err.message);
        }
    } else {
        console.error('❌ Fichier tickets_database.json non trouvé à:', jsonPath);
        console.log('💡 Assurez-vous que le fichier est dans le même dossier que server.js');
    }
}

// 4. ROUTES API

// GET tous les tickets
app.get('/api/tickets', (req, res) => {
    const { status, prefix, scanned } = req.query;
    let query = 'SELECT * FROM tickets WHERE 1=1';
    const params = [];
    
    if (status) {
        query += ' AND status = ?';
        params.push(status);
    }
    if (prefix) {
        query += ' AND prefix = ?';
        params.push(prefix);
    }
    if (scanned !== undefined) {
        query += ' AND scanned = ?';
        params.push(scanned === 'true' ? 1 : 0);
    }
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Erreur GET tickets:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// GET un ticket spécifique
app.get('/api/tickets/:code', (req, res) => {
    const { code } = req.params;
    
    db.get('SELECT * FROM tickets WHERE code = ?', [code], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: 'Ticket non trouvé' });
        }
        res.json(row);
    });
});

// POST scanner un ticket
app.post('/api/scan', (req, res) => {
    const { code, action, scanner_id } = req.body;
    const timestamp = new Date().toISOString();

    console.log(`📱 Scan reçu: ${code} (${action})`);

    db.get('SELECT * FROM tickets WHERE code = ?', [code], (err, ticket) => {
        if (err) {
            console.error('Erreur DB:', err);
            return res.status(500).json({ error: err.message });
        }
        
        if (!ticket) {
            console.log(`❌ Ticket inconnu: ${code}`);
            // Enregistrer le scan invalide
            db.run(`
                INSERT INTO scans (ticket_code, action, timestamp, scanner_id, status, duplicate)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [code, action, timestamp, scanner_id, 'invalid', 0]);
            
            return res.status(404).json({ 
                success: false, 
                error: 'Ticket inconnu',
                code 
            });
        }
        
        if (ticket.status !== 'valid') {
            console.log(`❌ Ticket invalide: ${code}`);
            db.run(`
                INSERT INTO scans (ticket_code, action, timestamp, scanner_id, status, duplicate)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [code, action, timestamp, scanner_id, 'cancelled', 0]);
            
            return res.status(400).json({
                success: false,
                error: 'Ticket invalide ou annulé',
                ticket
            });
        }
        
        // Vérification de duplication pour l'entrée
        if (action === 'entry') {
            const isDuplicate = (ticket.scanned && !ticket.exited);
            
            if (isDuplicate) {
                console.log(`⚠️ Duplication détectée: ${code}`);
                db.run(`
                    INSERT INTO scans (ticket_code, action, timestamp, scanner_id, status, duplicate)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [code, action, timestamp, scanner_id, 'duplicate', 1]);
                
                db.run(`
                    UPDATE tickets SET scan_count = scan_count + 1, last_scan_time = ?
                    WHERE code = ?
                `, [timestamp, code]);
                
                return res.json({
                    success: false,
                    warning: 'Duplication détectée',
                    ticket,
                    duplicate: true
                });
            }
            
            // Enregistrer l'entrée
            db.run(`
                UPDATE tickets 
                SET scanned = 1, 
                    exited = 0,
                    first_scan_time = COALESCE(first_scan_time, ?),
                    last_scan_time = ?,
                    scan_count = scan_count + 1
                WHERE code = ?
            `, [timestamp, timestamp, code], (err) => {
                if (err) {
                    console.error('Erreur UPDATE:', err);
                    return res.status(500).json({ error: err.message });
                }
                
                db.run(`
                    INSERT INTO scans (ticket_code, action, timestamp, scanner_id, status, duplicate)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [code, action, timestamp, scanner_id, 'success', 0]);
                
                console.log(`✓ Entrée autorisée: ${code}`);
                res.json({
                    success: true,
                    message: 'Entrée autorisée',
                    action: 'entry',
                    timestamp
                });
            });
            
        } else if (action === 'exit') {
            // Vérifier si le ticket a été scanné à l'entrée
            if (!ticket.scanned || ticket.exited) {
                console.log(`❌ Sortie impossible: ${code}`);
                db.run(`
                    INSERT INTO scans (ticket_code, action, timestamp, scanner_id, status, duplicate)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [code, action, timestamp, scanner_id, 'error', 0]);
                
                return res.status(400).json({
                    success: false,
                    error: 'Ticket non scanné à l\'entrée ou déjà sorti',
                    ticket
                });
            }
            
            // Enregistrer la sortie
            db.run(`
                UPDATE tickets 
                SET exited = 1,
                    exit_time = ?
                WHERE code = ?
            `, [timestamp, code], (err) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                
                db.run(`
                    INSERT INTO scans (ticket_code, action, timestamp, scanner_id, status, duplicate)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [code, action, timestamp, scanner_id, 'success', 0]);
                
                console.log(`✓ Sortie enregistrée: ${code}`);
                res.json({
                    success: true,
                    message: 'Sortie enregistrée',
                    action: 'exit',
                    timestamp
                });
            });
        }
    });
});

// GET historique des scans
app.get('/api/scans', (req, res) => {
    const { limit = 100, duplicate, status } = req.query;
    let query = 'SELECT * FROM scans WHERE 1=1';
    const params = [];
    
    if (duplicate !== undefined) {
        query += ' AND duplicate = ?';
        params.push(duplicate === 'true' ? 1 : 0);
    }
    if (status) {
        query += ' AND status = ?';
        params.push(status);
    }
    
    query += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(parseInt(limit));
    
    db.all(query, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// GET statistiques
app.get('/api/stats', (req, res) => {
    const stats = {};
    
    // Total de tickets
    db.get('SELECT COUNT(*) as total FROM tickets', (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        stats.total = row.total;
        
        // Tickets scannés
        db.get('SELECT COUNT(*) as scanned FROM tickets WHERE scanned = 1', (err, row) => {
            stats.scanned = row.scanned;
            
            // Duplicatas
            db.get('SELECT COUNT(*) as duplicates FROM tickets WHERE scan_count > 1', (err, row) => {
                stats.duplicates = row.duplicates;
                
                // Présents actuellement
                db.get('SELECT COUNT(*) as inside FROM tickets WHERE scanned = 1 AND exited = 0', (err, row) => {
                    stats.currently_inside = row.inside;
                    
                    // Total des scans
                    db.get('SELECT COUNT(*) as total_scans FROM scans', (err, row) => {
                        stats.total_scans = row.total_scans;
                        
                        res.json(stats);
                    });
                });
            });
        });
    });
});

// POST import manuel des tickets
app.post('/api/import-tickets', (req, res) => {
    autoImportTickets();
    res.json({ success: true, message: 'Import lancé' });
});

// GET export CSV
app.get('/api/export/csv', (req, res) => {
    db.all('SELECT * FROM tickets', (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Aucun ticket à exporter' });
        }
        
        const headers = Object.keys(rows[0]);
        const csv = [
            headers.join(','),
            ...rows.map(row => 
                headers.map(field => `"${row[field]}"`).join(',')
            )
        ].join('\n');
        
        res.header('Content-Type', 'text/csv');
        res.header('Content-Disposition', 'attachment; filename=tickets_export.csv');
        res.send(csv);
    });
});

// 5. SERVIR LE FRONTEND
// IMPORTANT: Ces chemins doivent correspondre à votre structure sur Render
// Si scanner-app et admin-dashboard sont au même niveau que backend/, utilisez:
const scannerPath = path.join(__dirname, 'scanner-app');
const adminPath = path.join(__dirname, 'admin-dashboard');

// Vérifier l'existence des dossiers
console.log('Vérification des chemins frontend:');
console.log('Scanner:', scannerPath, fs.existsSync(scannerPath) ? '✓' : '✗');
console.log('Admin:', adminPath, fs.existsSync(adminPath) ? '✓' : '✗');

// Si les dossiers sont au niveau parent (structure originale)
if (!fs.existsSync(scannerPath)) {
    const parentScanner = path.join(__dirname, '../scanner-app');
    const parentAdmin = path.join(__dirname, '../admin-dashboard');
    
    console.log('Essai chemins parents:');
    console.log('Scanner:', parentScanner, fs.existsSync(parentScanner) ? '✓' : '✗');
    console.log('Admin:', parentAdmin, fs.existsSync(parentAdmin) ? '✓' : '✗');
    
    if (fs.existsSync(parentScanner)) {
        app.use('/scanner', express.static(parentScanner));
        console.log('✓ Scanner servi depuis', parentScanner);
    }
    if (fs.existsSync(parentAdmin)) {
        app.use('/admin', express.static(parentAdmin));
        console.log('✓ Admin servi depuis', parentAdmin);
    }
} else {
    app.use('/scanner', express.static(scannerPath));
    app.use('/admin', express.static(adminPath));
    console.log('✓ Frontend servi depuis dossiers locaux');
}

// Route racine
app.get('/', (req, res) => {
    res.json({
        message: 'API Concert Tickets',
        version: '1.0.0',
        endpoints: {
            stats: '/api/stats',
            tickets: '/api/tickets',
            scan: '/api/scan',
            scans: '/api/scans',
            import: '/api/import-tickets',
            export: '/api/export/csv',
            scanner_app: '/scanner',
            admin_dashboard: '/admin'
        }
    });
});

// 6. DEMARRAGE
app.listen(PORT, () => {
    console.log('\n╔═══════════════════════════════════════╗');
    console.log('║   🎫 Concert Tickets API Server      ║');
    console.log('║                                       ║');
    console.log(`║   Server: http://localhost:${PORT.toString().padEnd(7)} ║`);
    console.log(`║   Scanner: /scanner                   ║`);
    console.log(`║   Admin: /admin                       ║`);
    console.log('╚═══════════════════════════════════════╝\n');
});

// Gestion des erreurs
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('\n✓ Base de données fermée');
        process.exit(0);
    });
});
