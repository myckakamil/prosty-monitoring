#!/usr/bin/env bash
# network name, mariadb user and password to change
if [[ "$1" == "" ]] || [[ "$2" == "" ]] || [[ "$3" == "" ]]; then
  echo "First argument: docker network name, second argument: mariadb user, third argument: mariadb password"
fi
docker run -d --rm --name database --network $1 --env MARIADB_USER=$2 --env MARIADB_PASSWORD=$3 --env MARIADB_DATABASE=monitoring --env MARIADB_ALLOW_EMPTY_ROOT_PASSWORD=1 docker.io/mariadb:10.11.6-jammy
