#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

have() {
  command -v "$1" >/dev/null 2>&1
}

step() {
  printf '\n==> %s\n' "$1"
}

wait_for_http() {
  local url="$1"
  local tries=30
  while (( tries > 0 )); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
    tries=$((tries - 1))
  done
  return 1
}

ensure_vosk_model() {
  if [[ -f fixtures/model.tar.gz ]]; then
    return 0
  fi
  if [[ "${RUN_VOSK:-0}" != "1" ]]; then
    return 1
  fi
  if ! have curl || ! have unzip; then
    echo "curl and unzip are required to fetch the Vosk model"
    return 1
  fi
  local work_dir
  work_dir="$(mktemp -d "${TMPDIR:-/tmp}/content-editing-vosk.XXXXXX")"
  trap 'rm -rf "$work_dir"' RETURN
  step "Fetch Vosk model"
  curl -sL -o "$work_dir/model.zip" https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip
  unzip -q -o "$work_dir/model.zip" -d "$work_dir"
  mkdir -p fixtures
  tar -czf fixtures/model.tar.gz -C "$work_dir/vosk-model-small-en-us-0.15" .
  rm -rf "$work_dir"
  trap - RETURN
}

pick_port() {
  python3 - "$1" <<'PY'
import socket, sys
start = int(sys.argv[1])
for port in range(start, start + 50):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        try:
            sock.bind(("127.0.0.1", port))
        except OSError:
            continue
        print(port)
        break
else:
    raise SystemExit(1)
PY
}

run_browser_suite() {
  if ! node -e "require('playwright')" >/dev/null 2>&1; then
    echo "playwright not installed; skipping browser tests"
    return 0
  fi

  if [[ -n "${PIPELINE_URL:-}" ]]; then
    URL="$PIPELINE_URL" node test_component.js
    return 0
  fi

  if have docker; then
    local image="${PIPELINE_IMAGE:-content-editing-local}"
    local container="${PIPELINE_CONTAINER:-content-editing-local}"
    local host_port
    host_port="$(pick_port "${PIPELINE_PORT:-8787}")"
    docker rm -f "$container" >/dev/null 2>&1 || true
    docker build -t "$image" .
    docker run -d --rm --name "$container" -p "127.0.0.1:${host_port}:8787" "$image" >/dev/null
    trap "docker rm -f '$container' >/dev/null 2>&1 || true" EXIT
    wait_for_http "http://127.0.0.1:${host_port}/" || {
      echo "docker app did not start on :${host_port}"
      return 1
    }
    URL="http://127.0.0.1:${host_port}" node test_component.js
    if [[ -f fixtures/model.tar.gz || "${RUN_VOSK:-0}" == "1" ]]; then
      URL="http://127.0.0.1:${host_port}" node test_vosk.js
    else
      echo "fixtures/model.tar.gz missing; skipping vosk test"
    fi
    return 0
  fi

  python3 devserver.py >/tmp/content-editing-devserver.log 2>&1 &
  local server_pid=$!
  trap "kill $server_pid >/dev/null 2>&1 || true" EXIT
  wait_for_http http://127.0.0.1:8787/ || {
    echo "local devserver did not start on :8787"
    return 1
  }
  URL=http://127.0.0.1:8787 node test_component.js
  if [[ -f fixtures/model.tar.gz || "${RUN_VOSK:-0}" == "1" ]]; then
    URL=http://127.0.0.1:8787 node test_vosk.js
  else
    echo "fixtures/model.tar.gz missing; skipping vosk test"
  fi
  kill "$server_pid" >/dev/null 2>&1 || true
}

step "Compile checks"
node --check commands.js
node --check voice_kit.js
node --check test_component.js
node --check test_vosk.js
python3 -m py_compile devserver.py
bash -n scripts/local_pipeline.sh

step "Unit tests"
node test_commands.js

step "SAST"
if rg -n --no-heading -e '\beval\s*\(' -e '\bnew\s+Function\s*\(' -e '\bdocument\.write\s*\(' -e '\.innerHTML\s*=' \
  commands.js voice_kit.js devserver.py test_component.js test_vosk.js index.html test_vosk.html; then
  echo "static scan found a risky pattern above"
  exit 1
fi
if have semgrep; then
  SEMGREP_HOME_DIR="${TMPDIR:-/tmp}/content-editing-semgrep"
  mkdir -p "$SEMGREP_HOME_DIR/config" "$SEMGREP_HOME_DIR/cache"
  if command -v timeout >/dev/null 2>&1; then
    SAST_RC=0
    XDG_CONFIG_HOME="$SEMGREP_HOME_DIR/config" \
    XDG_CACHE_HOME="$SEMGREP_HOME_DIR/cache" \
      timeout 20s semgrep --config semgrep.yml --error --quiet . || SAST_RC=$?
    if [[ "$SAST_RC" -eq 124 ]]; then
      echo "semgrep timed out after 20s; continuing"
    elif [[ "$SAST_RC" -ne 0 ]]; then
      exit "$SAST_RC"
    fi
  else
    XDG_CONFIG_HOME="$SEMGREP_HOME_DIR/config" \
    XDG_CACHE_HOME="$SEMGREP_HOME_DIR/cache" \
      semgrep --config semgrep.yml --error --quiet .
  fi
else
  echo "semgrep not installed; skipping SAST"
fi

if [[ "${RUN_VOSK:-0}" == "1" ]]; then
  ensure_vosk_model
fi

step "Local app"
run_browser_suite

step "Done"
echo "local pipeline complete"
