const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const path = require('path');
const cluster = require('cluster');
const os = require('os');

const numCPUs = os.cpus().length;

if (cluster.isMaster) {
    // Wątek główny (master) - tworzy wątki (workery)
    console.log(`Master ${process.pid} is running`);

    // Tworzymy jeden wątek na każdy rdzeń CPU
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    // W przypadku zakończenia działania wątku, tworzymy nowy
    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died`);
        console.log('Starting a new worker...');
        cluster.fork();
    });
} else {
    // Wątki (workery) - obsługują zapytania HTTP
    const app = express();
    const server_host = '127.0.0.1';
    const port = 5000;

    // Konfiguracja połączenia z bazą danych MySQL
    const db = mysql.createConnection({
        host: server_host, // IPv4
        user: 'monitoring_user',
        password: 'password',
        database: 'monitoring'
    });

    // Nawiązanie połączenia z bazą danych
    db.connect((err) => {
        if (err) {
            console.error('Error connecting to the database:', err);
            return;
        }
        console.log('Connected to MySQL database');

        // Tworzenie tabeli clients, jeśli nie istnieje
        db.query(`
            CREATE TABLE IF NOT EXISTS clients (
                id INT AUTO_INCREMENT PRIMARY KEY,
                client_name VARCHAR(255) NOT NULL,
                ip_address VARCHAR(45),
                mac_address VARCHAR(17),
                hostname VARCHAR(255),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) {
                console.error('Error creating clients table:', err);
            } else {
                console.log('Clients table ready');
            }
        });

        // Tworzenie tabeli metrics, jeśli nie istnieje
        db.query(`
            CREATE TABLE IF NOT EXISTS metrics (
                id INT AUTO_INCREMENT PRIMARY KEY,
                client_id INT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                cpu_usage FLOAT,
                memory_usage FLOAT,
                disk_usage FLOAT,
                network_sent BIGINT,
                network_received BIGINT,
                avg_sent_mbps FLOAT,
                avg_recv_mbps FLOAT,
                server_ping_min FLOAT,
                server_ping_max FLOAT,
                server_ping_avg FLOAT,
                server_ping_stddev FLOAT,
                ip_address VARCHAR(45),
                mac_address VARCHAR(17),
                hostname VARCHAR(255),
                FOREIGN KEY (client_id) REFERENCES clients(id)
            )
        `, (err) => {
            if (err) {
                console.error('Error creating metrics table:', err);
            } else {
                console.log('Metrics table ready');
            }
        });
    });

    // Ustawienie body-parser do przetwarzania JSON
    app.use(bodyParser.json());

    // Endpoint do rejestracji nowego klienta
    app.post('/clients', (req, res) => {
        const { client_name, ip_address, mac_address, hostname } = req.body;

        // Sprawdzenie, czy klient już istnieje
        const selectQuery = `SELECT * FROM clients WHERE client_name = ?`;
        db.query(selectQuery, [client_name], (err, rows) => {
            if (err) {
                console.error('Error selecting client:', err);
                res.status(500).send("Error selecting client");
            } else if (rows.length > 0) {
                // Klient już istnieje, zwróć jego ID
                res.status(200).send({ clientId: rows[0].id });
            } else {
                // Dodaj nowego klienta
                const insertQuery = `INSERT INTO clients (client_name, ip_address, mac_address, hostname) VALUES (?, ?, ?, ?)`;
                db.query(insertQuery, [client_name, ip_address, mac_address, hostname], (err, result) => {
                    if (err) {
                        console.error('Error inserting client:', err);
                        res.status(500).send("Error inserting client");
                    } else {
                        res.status(201).send({ clientId: result.insertId });
                    }
                });
            }
        });
    });

    // Endpoint do odbierania metryk od klienta
    app.post('/metrics', (req, res) => {
        const {
            client_id, cpu_usage, memory_usage, disk_usage,
            network_sent, network_received, avg_sent_mbps, avg_recv_mbps,
            server_ping_min, server_ping_max, server_ping_avg, server_ping_stddev,
            ip_address, mac_address, hostname
        } = req.body;

        const insertQuery = `
            INSERT INTO metrics (
                client_id, cpu_usage, memory_usage, disk_usage, network_sent, network_received,
                avg_sent_mbps, avg_recv_mbps,
                server_ping_min, server_ping_max, server_ping_avg, server_ping_stddev,
                ip_address, mac_address, hostname
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

        db.query(insertQuery, [
            client_id, cpu_usage, memory_usage, disk_usage, network_sent, network_received,
            avg_sent_mbps, avg_recv_mbps,
            server_ping_min, server_ping_max, server_ping_avg, server_ping_stddev,
            ip_address, mac_address, hostname
        ], (err, result) => {
            if (err) {
                console.error('Error inserting metrics:', err);
                res.status(500).send("Error inserting metrics");
            } else {
                res.status(200).send("Metrics received");
            }
        });
    });

    // Endpoint do przeglądania zapisanych metryk dla konkretnego klienta
    app.get('/metrics/:clientId', (req, res) => {
        const clientId = req.params.clientId;
        const selectQuery = `SELECT * FROM metrics WHERE client_id = ? ORDER BY timestamp DESC LIMIT 10`;

        db.query(selectQuery, [clientId], (err, rows) => {
            if (err) {
                console.error('Error retrieving metrics:', err);
                res.status(500).send("Error retrieving metrics");
            } else {
                res.json(rows);
            }
        });
    });

    // Endpoint do serwowania frontendu (opcjonalnie)
    app.use(express.static(path.join(__dirname, 'public')));

    app.listen(port, () => {
        console.log(`Worker ${process.pid} started, server running on http://${server_host}:${port}`);
    });
}
