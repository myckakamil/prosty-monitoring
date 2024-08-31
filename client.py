import requests
import json
import socket
import uuid
import psutil
import time

# Adres URL serwera
SERVER_URL = 'http://192.168.122.100:5000'

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
    if response.status_code == 201:
        return response.json()['clientId']
    else:
        raise Exception('Failed to register client')

# Wysyłanie metryk na serwer
def send_metrics(client_id):
    cpu_usage, memory_usage, disk_usage, network_sent, network_received = get_metrics()
    hostname, ip_address, mac_address = get_system_info()
    metrics_data = {
        'client_id': client_id,
        'cpu_usage': cpu_usage,
        'memory_usage': memory_usage,
        'disk_usage': disk_usage,
        'network_sent': network_sent,
        'network_received': network_received,
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

# Przykład użycia
if __name__ == '__main__':
    client_name = 'Client 1'
    client_id = register_client(client_name)

    while True:
        try:
            send_metrics(client_id)
            time.sleep(5)
        except Exception as e:
            print(f"Failed to send metrics: {str(e)}. Retrying in 15 seconds...")
            time.sleep(15)

