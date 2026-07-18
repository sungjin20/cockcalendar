#!/usr/bin/env sh
set -eu

cd /opt/cockcalendar/release
compose='sudo docker compose --env-file /opt/cockcalendar/.env -f docker-compose.prod.yml'

$compose build
$compose up -d --remove-orphans
sudo docker image prune -f
