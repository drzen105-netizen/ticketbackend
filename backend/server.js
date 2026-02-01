// Backend API pour le système de tickets
// Installation: npm install express sqlite3 cors body-parser

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Base de données SQLite
const db = new sqlite3.Database('./concert_tickets.db', (err) => {
    if (err) {
        console.error('Erreur de connexion à la DB:', err);
    } else {
        console.log('✓ Connecté à la base de données SQLite');
        initDatabase();
    }
});

// Initialisation de la base de données
function initDatabase() {
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
        if (err) {
            console.error('Erreur création table tickets:', err);
        } else {
            console.log('✓ Table tickets créée/vérifiée');
        }
    });

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
        if (err) {
            console.error('Erreur création table scans:', err);
        } else {
            console.log('✓ Table scans créée/vérifiée');
        }
    });
}

// Dans initDatabase, après la création des tables :
db.get("SELECT COUNT(*) as count FROM tickets", (err, row) => {
    if (row && row.count === 0) {
        console.log("Base vide, lancement de l'importation automatique...");
        // Ici, tu appelles une fonction qui lit ton JSON et remplit la DB
    }
});

// Import des tickets depuis le JSON
app.post('/api/import-tickets', (req, res) => {
    const jsonPath = path.join(__dirname, 'tickets_database.json');
    
    fs.readFile(jsonPath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Erreur lecture fichier JSON' });
        }
        
        const tickets = JSON.parse(data);
        let imported = 0;
        let errors = 0;
        
        const stmt = db.prepare(`
            INSERT OR IGNORE INTO tickets 
            (ticket_id, code, prefix, status, scanned, scan_count, first_scan_time, last_scan_time, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        tickets.forEach(ticket => {
            stmt.run([
                ticket.ticket_id,
                ticket.code,
                ticket.prefix,
                ticket.status,
                ticket.scanned ? 1 : 0,
                ticket.scan_count,
                ticket.first_scan_time,
                ticket.last_scan_time,
                ticket.created_at
            ], (err) => {
                if (err) {
                    errors++;
                } else {
                    imported++;
                }
            });
        });
        
        stmt.finalize((err) => {
            if (err) {
                return res.status(500).json({ error: 'Erreur finalisation import' });
            }
            res.json({
                success: true,
                imported,
                errors,
                total: tickets.length
            });
        });
    });
});

// API: Récupérer tous les tickets
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
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// API: Récupérer un ticket par code
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

// API: Scanner un ticket
app.post('/api/scan', (req, res) => {
    const { code, action, scanner_id } = req.body;
    const timestamp = new Date().toISOString();
    
    // Vérifier l'existence du ticket
    db.get('SELECT * FROM tickets WHERE code = ?', [code], (err, ticket) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (!ticket) {
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
            if (ticket.scanned && !ticket.exited) {
                // Duplication détectée
                db.run(`
                    INSERT INTO scans (ticket_code, action, timestamp, scanner_id, status, duplicate)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [code, action, timestamp, scanner_id, 'duplicate', 1]);
                
                db.run(`
                    UPDATE tickets SET scan_count = scan_count + 1, last_scan_time = ?
                    WHERE code = ?
                `, [timestamp, code]);
                
                return res.status(200).json({
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
                    return res.status(500).json({ error: err.message });
                }
                
                db.run(`
                    INSERT INTO scans (ticket_code, action, timestamp, scanner_id, status, duplicate)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [code, action, timestamp, scanner_id, 'success', 0]);
                
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

// API: Historique des scans
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

// API: Statistiques
app.get('/api/stats', (req, res) => {
    const stats = {};
    
    // Total de tickets
    db.get('SELECT COUNT(*) as total FROM tickets', (err, row) => {
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
                        
                        // Scans par série
                        db.all(`
                            SELECT prefix, 
                                   COUNT(*) as total,
                                   SUM(CASE WHEN scanned = 1 THEN 1 ELSE 0 END) as scanned
                            FROM tickets 
                            GROUP BY prefix
                        `, (err, rows) => {
                            stats.by_series = rows;
                            res.json(stats);
                        });
                    });
                });
            });
        });
    });
});

// API: Mettre à jour un ticket
app.put('/api/tickets/:code', (req, res) => {
    const { code } = req.params;
    const { status } = req.body;
    
    db.run('UPDATE tickets SET status = ? WHERE code = ?', [status, code], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Ticket non trouvé' });
        }
        res.json({ success: true, changes: this.changes });
    });
});

// Export CSV
app.get('/api/export/csv', (req, res) => {
    db.all('SELECT * FROM tickets', (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
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

// Servir les fichiers statiques
app.use('/scanner', express.static(path.join(__dirname, '../scanner-app')));
app.use('/admin', express.static(path.join(__dirname, '../admin-dashboard')));

// Route par défaut
app.get('/', (req, res) => {
    res.json({
        message: 'API Concert Tickets',
        endpoints: {
            tickets: '/api/tickets',
            scan: '/api/scan',
            stats: '/api/stats',
            scans: '/api/scans',
            import: '/api/import-tickets',
            scanner_app: '/scanner',
            admin_dashboard: '/admin'
        }
    });
});

// Démarrage du serveur
app.listen(PORT, () => {
    console.log(`
    ╔═══════════════════════════════════════╗
    ║   🎫 Concert Tickets API Server      ║
    ║                                       ║
    ║   Server: http://localhost:${PORT}      ║
    ║   Scanner: http://localhost:${PORT}/scanner
    ║   Admin: http://localhost:${PORT}/admin  ║
    ╚═══════════════════════════════════════╝
    `);
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
