#!/bin/bash

# Sprawdzenie, czy skrypt uruchomiony jako root
if [ "$(id -u)" -ne "0" ]; then
    echo "Ten skrypt musi być uruchomiony jako root. Proszę uruchomić go z uprawnieniami root."
    exit 1
fi

# Definiowanie zmiennych
MYSQL_ROOT_PASSWORD="root_password"
MYSQL_USER="monitoring_user"
MYSQL_PASSWORD="password"
MYSQL_DATABASE="monitoring"
SERVER_IP="127.0.0.1"
APACHE_CONF="/etc/apache2/sites-available/000-default.conf"
SERVER_IP_ADDRESS=$(ip -br -4 addr | sort -d | head --lines=1 | awk '{print $3}' | cut -d/ -f1)

# Aktualizacja i instalacja zależności
echo "Aktualizacja systemu..."
apt-get update -y
apt-get upgrade -y

echo "Instalowanie Apache, PHP, i MySQL..."
apt-get install -y apache2 php libapache2-mod-php php-mysql mariadb-server 

# Konfiguracja MySQL
echo "Konfigurowanie MySQL..."
mysql -e "CREATE DATABASE IF NOT EXISTS $MYSQL_DATABASE;"
mysql -e "CREATE USER IF NOT EXISTS '$MYSQL_USER'@'localhost' IDENTIFIED BY '$MYSQL_PASSWORD';"
mysql -e "GRANT ALL PRIVILEGES ON $MYSQL_DATABASE.* TO '$MYSQL_USER'@'localhost';"
mysql -e "FLUSH PRIVILEGES;"

# Tworzenie tabel w bazie danych
echo "Tworzenie tabel w bazie danych..."
MYSQL_CMD="mysql -u $MYSQL_USER -p$MYSQL_PASSWORD $MYSQL_DATABASE"
$MYSQL_CMD <<EOF
CREATE TABLE IF NOT EXISTS clients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_name VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    mac_address VARCHAR(17),
    hostname VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

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
);
EOF

# Konfiguracja Apache do obsługi PHP
echo "Konfigurowanie Apache..."
a2enmod php8.2
systemctl restart apache2

# Konfiguracja VirtualHosta
echo "Konfigurowanie VirtualHosta..."
cat <<EOF > $APACHE_CONF
<VirtualHost *:80>
    ServerAdmin webmaster@localhost
    DocumentRoot /var/www/html
    ErrorLog ${APACHE_LOG_DIR}/error.log
    CustomLog ${APACHE_LOG_DIR}/access.log combined
</VirtualHost>
EOF

# Umieszczanie plików PHP w katalogu /var/www/html
echo "Umieszczanie plików PHP w katalogu /var/www/html..."
rm -rf /var/www/html/*
ln -s $(pwd)/interfejs/index.php /var/www/html/
ln -s $(pwd)/prosty-monitoring/interfejs/config.php /var/www/html/


# Restart Apache
echo "Restartowanie Apache..."
systemctl restart apache2

echo "Konfiguracja zakończona pomyślnie."
echo "Przejdz do http://$SERVER_IP_ADDRESS w przeglądarce, aby zobaczyć interfejs."