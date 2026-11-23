#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
database_dir="$project_dir/.local-mysql"
if [[ ! -x "$database_dir/runtime/usr/sbin/mysqld" ]]; then
  echo 'Local MySQL binaries are missing from .local-mysql.' >&2
  exit 1
fi
if [[ -f "$database_dir/mysql.pid" ]] && kill -0 "$(cat "$database_dir/mysql.pid")" 2>/dev/null; then
  echo 'Local test database is already running.'
  exit 0
fi
export LD_LIBRARY_PATH="$database_dir/runtime/usr/lib/x86_64-linux-gnu${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
"$database_dir/runtime/usr/sbin/mysqld" --no-defaults \
  --basedir="$database_dir/runtime/usr" \
  --datadir="$database_dir/data" \
  --socket="$database_dir/mysql.sock" \
  --pid-file="$database_dir/mysql.pid" \
  --log-error="$database_dir/server.log" \
  --secure-file-priv="$database_dir/files" \
  --bind-address=127.0.0.1 --port=3307 --mysqlx=OFF --daemonize
echo 'Local test database started on 127.0.0.1:3307.'
