#!/usr/bin/env bash
# ============================================================
# setup-certs.sh — Enterprise dev HTTPS certificates
#
# Generates a self-signed CA + server certs using OpenSSL.
# No external dependencies (OpenSSL is preinstalled on all OS).
#
# Usage:         ./scripts/dev/setup-certs.sh
# Idempotent:    Yes (overwrites existing certs)
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
CERTS_DIR="${SCRIPT_DIR}/.certs"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check OpenSSL
if ! command -v openssl &> /dev/null; then
  error "OpenSSL not found. Install it first."
  exit 1
fi

mkdir -p "$CERTS_DIR"

# ------------------------------------------------------------------
# Step 1: Generate CA key + certificate
# ------------------------------------------------------------------
CA_KEY="${CERTS_DIR}/ca-key.pem"
CA_CERT="${CERTS_DIR}/ca-cert.pem"

if [ ! -f "$CA_KEY" ]; then
  info "Generating CA..."
  openssl req -x509 -nodes -newkey rsa:4096 \
    -keyout "$CA_KEY" \
    -out "$CA_CERT" \
    -days 3650 \
    -subj "/C=VN/O=BTN HRMS Dev/CN=BTN HRMS Dev CA"
else
  info "CA already exists"
fi

# ------------------------------------------------------------------
# Step 2: Generate server key
# ------------------------------------------------------------------
SERVER_KEY="${CERTS_DIR}/dev-key.pem"
SERVER_CERT="${CERTS_DIR}/dev-cert.pem"

info "Generating server certificate..."
openssl genrsa -out "$SERVER_KEY" 2048

# Generate CSR
openssl req -new -key "$SERVER_KEY" \
  -out /tmp/dev.csr \
  -subj "/C=VN/O=BTN HRMS Dev/CN=BTN HRMS Dev Cert"

# SAN config at fixed path
SAN_CFG="/tmp/openssl-san.cnf"
cat > "$SAN_CFG" << CFG
[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth, clientAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = btn-hrms.local
IP.1 = 127.0.0.1
IP.2 = 10.8.1.84
IP.3 = 10.10.3.231
IP.4 = 10.139.143.90
CFG

# Sign with CA
openssl x509 -req -in /tmp/dev.csr \
  -CA "$CA_CERT" \
  -CAkey "$CA_KEY" \
  -CAcreateserial \
  -out "$SERVER_CERT" \
  -days 365 \
  -extfile "$SAN_CFG" \
  -extensions v3_req

# Clean up temp files
rm -f /tmp/dev.csr "$SAN_CFG" "${CERTS_DIR}/ca-cert.srl"

# ------------------------------------------------------------------
# Step 3: Set permissions
# ------------------------------------------------------------------
chmod 644 "$CA_CERT" "$SERVER_CERT"
chmod 600 "$CA_KEY" "$SERVER_KEY"

# ------------------------------------------------------------------
# Step 4: Verify
# ------------------------------------------------------------------
echo ""
info "──────────────────────────────────────────"
info "Certificates generated!"
info "──────────────────────────────────────────"
echo ""
info "  CA:       ${CA_CERT}"
info "  Cert:     ${SERVER_CERT}"
info "  Key:      ${SERVER_KEY}"
echo ""
info "To trust locally (no browser warning):"
info "  Linux:"
info "    sudo cp ${CA_CERT} /usr/local/share/ca-certificates/btn-hrms-dev-ca.crt"
info "    sudo update-ca-certificates"
info "  macOS:"
info "    sudo security add-trusted-cert -d -r trustRoot \\"
info "      -k /Library/Keychains/System.keychain ${CA_CERT}"
info "  Windows (as Admin):"
info "    certutil -addstore Root ${CA_CERT//\//\\}"
echo ""
info "Next:"
info "  docker compose up -d"
info "  https://10.8.1.84"
