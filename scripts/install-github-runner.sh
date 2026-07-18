#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "usage: $0 <registration-token>" >&2
  exit 2
fi

token=$1
runner_dir=/opt/actions-runner
repo_url=https://github.com/sungjin20/cockcalendar

sudo mkdir -p "$runner_dir"
sudo chown ubuntu:ubuntu "$runner_dir"
cd "$runner_dir"

if [[ ! -x ./config.sh ]]; then
  version=$(curl -fsSL https://api.github.com/repos/actions/runner/releases/latest | sed -n 's/.*"tag_name": "v\([^"]*\)".*/\1/p' | head -n 1)
  test -n "$version"
  archive="actions-runner-linux-x64-${version}.tar.gz"
  curl -fL --retry 3 -o "$archive" "https://github.com/actions/runner/releases/download/v${version}/${archive}"
  tar xzf "$archive"
  rm "$archive"
  sudo ./bin/installdependencies.sh
fi

if [[ -f .runner ]]; then
  sudo ./svc.sh stop || true
  sudo ./svc.sh uninstall || true
  ./config.sh remove --token "$token" || true
fi

./config.sh \
  --unattended \
  --replace \
  --url "$repo_url" \
  --token "$token" \
  --name cockcalendar-server \
  --labels cockcalendar-prod \
  --work _work

sudo usermod -aG docker ubuntu
sudo ./svc.sh install ubuntu
sudo ./svc.sh start
sudo ./svc.sh status
