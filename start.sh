#!/usr/bin/env bash
docker build -t prosty-monitoring:latest .
docker run -d --rm -it -e SERVER_HOST=$2 -p8000:80 -p5000:5000 --name monitoring --network $1 prosty-monitoring:latest
