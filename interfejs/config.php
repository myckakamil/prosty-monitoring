<?php
// config.php
$servername = "localhost";  // Adres serwera bazy danych
$username = "monitoring_user";  // Nazwa użytkownika bazy danych
$password = "password";  // Hasło do bazy danych
$dbname = "monitoring";  // Nazwa bazy danych

// Utwórz połączenie
$conn = new mysqli($servername, $username, $password, $dbname);

// Sprawdź połączenie
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}
?>
