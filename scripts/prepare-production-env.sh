#!/usr/bin/env sh
set -eu

env_file=/opt/cockcalendar/.env
filtered_file="${env_file}.filtered"

grep -v -E '^(DATABASE_URL|POSTGRES_PASSWORD)=' "$env_file" > "$filtered_file"
printf '\nPOSTGRES_PASSWORD=%s\n' "$(openssl rand -hex 24)" >> "$filtered_file"
chmod 600 "$filtered_file"
mv "$filtered_file" "$env_file"

cd /opt/cockcalendar/release
sudo docker compose --env-file "$env_file" -f docker-compose.prod.yml config --quiet
