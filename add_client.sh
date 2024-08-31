#!/bin/bash

# Sprawdzenie, czy podano wymagane argumenty
if [ $# -ne 2 ]; then
    echo "Użycie: $0 <remote_user> <remote_host>"
    exit 1
fi

# Sprawdzenie, czy istnieje klucz dla tego serwera
if [ ! -f ~/.ssh/id_rsa.pub ]; then
    echo "Klucz publiczny nie istnieje. Proszę wygenerować klucz SSH."
    exit 1
fi

# Parametry połączenia SSH
REMOTE_USER=$1  # Nazwa użytkownika na zdalnym serwerze
REMOTE_HOST=$2  # Adres IP lub domena zdalnego serwera
REMOTE_DIR="/home/$REMOTE_USER/client_monitor"  # Ścieżka na zdalnym serwerze, gdzie skrypt będzie przechowywany
CLIENT_SCRIPT="client.py"  # Nazwa skryptu klienta

# Ścieżka do lokalnego pliku klienta
LOCAL_CLIENT_SCRIPT_PATH="./client.py"

# Zdalne komendy do uruchomienia
REMOTE_COMMANDS=$(cat <<'EOF'
# Tworzenie katalogu na zdalnym serwerze
mkdir -p $REMOTE_DIR

# Przejście do katalogu
cd $REMOTE_DIR

# Zapisanie skryptu klienta
cat > $CLIENT_SCRIPT << 'END_SCRIPT'
$(cat $LOCAL_CLIENT_SCRIPT_PATH)
END_SCRIPT

# Sprawdzanie instalacji wymaganych pakietów
if ! command -v python3 &>/dev/null; then
    echo "Python3 nie jest zainstalowany. Proszę zainstalować go ręcznie."
    exit 1
fi

if ! command -v pip3 &>/dev/null; then
    echo "pip3 nie jest zainstalowany. Proszę zainstalować go ręcznie."
    exit 1
fi

# Sprawdzanie instalacji modułów Python
python3 -m pip show psutil &>/dev/null || {
    echo "Moduł psutil nie jest zainstalowany. Proszę zainstalować go komendą: pip3 install psutil"
    exit 1
}

python3 -m pip show requests &>/dev/null || {
    echo "Moduł requests nie jest zainstalowany. Proszę zainstalować go komendą: pip3 install requests"
    exit 1
}

# Uruchomienie skryptu klienta w tle
nohup python3 $CLIENT_SCRIPT &
EOF
)

# Kopiowanie skryptu klienta na zdalny serwer
scp $LOCAL_CLIENT_SCRIPT_PATH $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/$CLIENT_SCRIPT

# Uruchamianie komend na zdalnym serwerze
if ssh $REMOTE_USER@$REMOTE_HOST "$REMOTE_COMMANDS"; then
    echo "Skrypt został skopiowany i uruchomiony na zdalnym serwerze."
else
    echo "Wystąpił błąd podczas połączenia SSH z zdalnym serwerem."
fi
