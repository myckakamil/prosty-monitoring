const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const port = 5000;

// Konfiguracja połączenia z bazą danych MySQL
const db = mysql.createConnection({
    host: '127.0.0.1', // IPv4
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
    
    db.query(`
        CREATE DATABASE IF NOT EXISTS monitoring
        `)

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
    const selectQuery = `SELECT * FROM clients WHERE client_name = ?`;
    const insertQuery = `INSERT INTO clients (client_name, ip_address, mac_address, hostname) VALUES (?, ?, ?, ?)`;

    db.query(selectQuery, [client_name], (err, rows) => {
        if (err) {
            console.error('Error selecting client:', err);
            res.status(500).send("Error selecting client");
        } else if (rows.length > 0) {
            res.status(409).send("Client already exists");
        } else {
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
    const { client_id, cpu_usage, memory_usage, disk_usage, network_sent, network_received, avg_sent_mbps, avg_recv_mbps, ip_address, mac_address, hostname } = req.body;
    const insertQuery = `
        INSERT INTO metrics (client_id, cpu_usage, memory_usage, disk_usage, network_sent, network_received, avg_sent_mbps, avg_recv_mbps, ip_address, mac_address, hostname)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    db.query(insertQuery, [client_id, cpu_usage, memory_usage, disk_usage, network_sent, network_received, avg_sent_mbps, avg_recv_mbps, ip_address, mac_address, hostname], (err, result) => {
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
    console.log(`Server running on http://localhost:${port}`);
});
