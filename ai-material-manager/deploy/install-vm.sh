#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Please run with sudo: sudo bash deploy/install-vm.sh" >&2
  exit 1
fi

apt-get update
apt-get install -y docker.io docker-compose-v2 ca-certificates curl
systemctl enable --now docker
install -m 0644 deploy/ai-material-manager.service /etc/systemd/system/ai-material-manager.service
systemctl daemon-reload
systemctl enable ai-material-manager.service

echo "VM runtime is ready. Create /opt/ai-material-manager/.env.production, then start the service."
