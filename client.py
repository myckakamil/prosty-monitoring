import requests
import json
import socket
import uuid
import psutil
import time
import subprocess
import statistics  

# Adres URL serwera
SERVER_URL = 'http://192.168.10.113:5000'

# Wyciąganie IP serwera z URL
def get_server_ip(url):
    try:
        return url.split('/')[2].split(':')[0]  # Otrzymuje IP lub nazwę hosta
    except IndexError:
        return None

# Zbieranie informacji o systemie
def get_system_info():
    hostname = socket.gethostname()
    ip_address = socket.gethostbyname(hostname)
    mac_address = ':'.join(['{:02x}'.format((uuid.getnode() >> elements) & 0xff) for elements in range(0, 2*6, 8)][::-1])
    return hostname, ip_address, mac_address

# Zbieranie metryk systemowych
def get_metrics():
    cpu_usage = psutil.cpu_percent(interval=1)
    memory_usage = psutil.virtual_memory().percent
    disk_usage = psutil.disk_usage('/').percent
    network_sent = psutil.net_io_counters().bytes_sent
    network_received = psutil.net_io_counters().bytes_recv
    return cpu_usage, memory_usage, disk_usage, network_sent, network_received

# Obliczanie statystyk pingu
def get_ping_statistics(target):
    try:
        result = subprocess.run(['ping', '-c', '4', target], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if result.returncode == 0:
            output = result.stdout
            times = [float(line.split('time=')[1].split(' ms')[0])
                     for line in output.split('\n') if 'time=' in line]

            if times:
                min_ping = min(times)
                max_ping = max(times)
                avg_ping = sum(times) / len(times)
                stddev_ping = statistics.stdev(times) if len(times) > 1 else 0.0
                return min_ping, max_ping, avg_ping, stddev_ping
            else:
                return None, None, None, None
        else:
            print(f"Ping failed for {target}: {result.stderr}")
            return None, None, None, None
    except Exception as e:
        print(f"Ping error for {target}: {e}")
        return None, None, None, None

# Rejestracja klienta na serwerze
def register_client(client_name):
    hostname, ip_address, mac_address = get_system_info()
    client_data = {
        'client_name': client_name,
        'ip_address': ip_address,
        'mac_address': mac_address,
        'hostname': hostname
    }
    response = requests.post(f'{SERVER_URL}/clients', json=client_data)
    if response.status_code == 200 or response.status_code == 201:
        return response.json()['clientId']
    else:
        raise Exception('Failed to register client')

# Wysyłanie metryk na serwer
def send_metrics(client_id, prev_sent, prev_recv, interval):
    cpu_usage, memory_usage, disk_usage, network_sent, network_received = get_metrics()
    hostname, ip_address, mac_address = get_system_info()

    # Obliczanie średniej przepustowości (Mbps)
    sent_diff = network_sent - prev_sent
    recv_diff = network_received - prev_recv
    avg_sent_mbps = (sent_diff * 8) / (interval * 1024 * 1024)
    avg_recv_mbps = (recv_diff * 8) / (interval * 1024 * 1024)
    
    # Obliczanie opóźnienia pingu do serwera
    server_ip = get_server_ip(SERVER_URL)
    server_ping_min, server_ping_max, server_ping_avg, server_ping_stddev = get_ping_statistics(server_ip)

    metrics_data = {
        'client_id': client_id,
        'cpu_usage': cpu_usage,
        'memory_usage': memory_usage,
        'disk_usage': disk_usage,
        'network_sent': network_sent,
        'network_received': network_received,
        'avg_sent_mbps': avg_sent_mbps,
        'avg_recv_mbps': avg_recv_mbps,
        'server_ping_min': server_ping_min,
        'server_ping_max': server_ping_max,
        'server_ping_avg': server_ping_avg,
        'server_ping_stddev': server_ping_stddev,
        'ip_address': ip_address,
        'mac_address': mac_address,
        'hostname': hostname
    }

    while True:
        response = requests.post(f'{SERVER_URL}/metrics', json=metrics_data)
        if response.status_code == 200:
            print("Metrics sent successfully")
            break
        else:
            print("Failed to send metrics. Retrying in 15 seconds...")
            time.sleep(15)

# Przykład użycia
if __name__ == '__main__':
    client_name = 'Client 1'
    prev_sent = prev_recv = 0
    interval = 5

    client_id = register_client(client_name)

    while True:
        try:
            send_metrics(client_id, prev_sent, prev_recv, interval)
            prev_sent, prev_recv = psutil.net_io_counters().bytes_sent, psutil.net_io_counters().bytes_recv
            time.sleep(interval)
        except Exception as e:
            print(f"Failed to send metrics: {str(e)}. Retrying in 15 seconds...")
            time.sleep(15)
