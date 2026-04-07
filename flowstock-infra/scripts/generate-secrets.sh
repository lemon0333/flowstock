#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(dirname "$SCRIPT_DIR")"

# Load .env file
if [ -f "$INFRA_DIR/.env" ]; then
    set -a
    source "$INFRA_DIR/.env"
    set +a
else
    echo "Error: .env file not found at $INFRA_DIR/.env"
    echo "Copy .env.example to .env and fill in the values."
    exit 1
fi

# Generate secrets using envsubst
envsubst < "$INFRA_DIR/k8s/namespace/secrets.yaml" | kubectl apply -f -

echo "Secrets applied successfully to flowstock namespace."
