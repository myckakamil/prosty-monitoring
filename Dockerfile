FROM debian:12-slim
RUN apt-get update && apt-get install -y nodejs npm apache2 mariadb-client php php-mysqli libapache2-mod-php
WORKDIR /prosty-monitoring
RUN npm install express mysql2 body-parser
COPY . /prosty-monitoring
ENV SERVER_HOST="127.0.0.1"
ENV SERVER_PORT=5000
CMD ["sh", "-c", "cp 000-default.conf /etc/apache2/sites-available/ && sed -i \"s/$servername = \\\"localhost\\\"/$servername = \\\"$SERVER_HOST\\\"/\" interfejs/config.php && rm -rf /var/www/html/* && cp interfejs/* /var/www/html && /etc/init.d/apache2 restart && cd backend && sed -i \"s/const server_host = '127.0.0.1'/const server_host = '$SERVER_HOST'/\" server.js && sed -i \"s/const port = 5000/const port = $SERVER_PORT/\" server.js && node server.js"]
