<?php
include 'config.php';

// Pobierz listę klientów
$clients = [];
$client_query = "SELECT id, client_name FROM clients";
$client_result = $conn->query($client_query);

if ($client_result->num_rows > 0) {
    while ($row = $client_result->fetch_assoc()) {
        $clients[] = $row;
    }
}

// Sprawdź, czy wybrano klienta
$selected_client_id = isset($_GET['client_id']) ? intval($_GET['client_id']) : 0;
$metrics = [];

if ($selected_client_id > 0) {
    $metrics_query = "SELECT * FROM metrics WHERE client_id = ? ORDER BY timestamp DESC";
    $stmt = $conn->prepare($metrics_query);
    $stmt->bind_param("i", $selected_client_id);
    $stmt->execute();
    $metrics_result = $stmt->get_result();

    if ($metrics_result->num_rows > 0) {
        while ($row = $metrics_result->fetch_assoc()) {
            $metrics[] = $row;
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Client Metrics</title>
    <style>
        table {
            width: 100%;
            border-collapse: collapse;
        }
        table, th, td {
            border: 1px solid black;
        }
        th, td {
            padding: 10px;
            text-align: left;
        }
        th {
            background-color: #f2f2f2;
        }
    </style>
</head>
<body>
    <h1>Client Metrics</h1>

    <form method="get" action="">
        <label for="client_id">Select Client:</label>
        <select name="client_id" id="client_id" onchange="this.form.submit()">
            <option value="">Select a client</option>
            <?php foreach ($clients as $client): ?>
                <option value="<?php echo htmlspecialchars($client['id']); ?>" <?php echo ($selected_client_id == $client['id']) ? 'selected' : ''; ?>>
                    <?php echo htmlspecialchars($client['client_name']); ?>
                </option>
            <?php endforeach; ?>
        </select>
    </form>

    <?php if ($selected_client_id > 0 && !empty($metrics)): ?>
        <h2>Metrics for Client ID: <?php echo htmlspecialchars($selected_client_id); ?></h2>
        <table>
            <tr>
                <th>ID</th>
                <th>Timestamp</th>
                <th>CPU Usage</th>
                <th>Memory Usage</th>
                <th>Disk Usage</th>
                <th>Network Sent</th>
                <th>Network Received</th>
                <th>Avg Sent (Mbps)</th>
                <th>Avg Received (Mbps)</th>
                <th>Server Ping Min</th>
                <th>Server Ping Max</th>
                <th>Server Ping Avg</th>
                <th>Server Ping Stddev</th>
                <th>IP Address</th>
                <th>MAC Address</th>
            </tr>
            <?php foreach ($metrics as $metric): ?>
                <tr>
                    <td><?php echo htmlspecialchars($metric['id']); ?></td>
                    <td><?php echo htmlspecialchars($metric['timestamp']); ?></td>
                    <td><?php echo htmlspecialchars($metric['cpu_usage']); ?></td>
                    <td><?php echo htmlspecialchars($metric['memory_usage']); ?></td>
                    <td><?php echo htmlspecialchars($metric['disk_usage']); ?></td>
                    <td><?php echo htmlspecialchars($metric['network_sent']); ?></td>
                    <td><?php echo htmlspecialchars($metric['network_received']); ?></td>
                    <td><?php echo htmlspecialchars($metric['avg_sent_mbps']); ?></td>
                    <td><?php echo htmlspecialchars($metric['avg_recv_mbps']); ?></td>
                    <td><?php echo htmlspecialchars($metric['server_ping_min']); ?></td>
                    <td><?php echo htmlspecialchars($metric['server_ping_max']); ?></td>
                    <td><?php echo htmlspecialchars($metric['server_ping_avg']); ?></td>
                    <td><?php echo htmlspecialchars($metric['server_ping_stddev']); ?></td>
                    <td><?php echo htmlspecialchars($metric['ip_address']); ?></td>
                    <td><?php echo htmlspecialchars($metric['mac_address']); ?></td>
                </tr>
            <?php endforeach; ?>
        </table>
    <?php elseif ($selected_client_id > 0): ?>
        <p>No metrics found for this client.</p>
    <?php endif; ?>

    <?php $conn->close(); ?>
</body>
</html>
