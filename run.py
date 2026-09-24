#!/usr/bin/env python3
"""Start Postgres, the FastAPI backend, and the Next.js frontend together.

Usage: python3 run.py [--no-db] [--no-migrate]
Ctrl+C stops the backend and frontend (Postgres keeps running in Docker).
"""

import argparse
import os
import signal
import subprocess
import sys
import threading
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend"
VENV_BIN = BACKEND / ".venv" / "bin"

COLORS = {"backend": "\033[36m", "frontend": "\033[35m"}
RESET = "\033[0m"


def start_db() -> None:
    print("Starting Postgres...")
    subprocess.run(["docker", "compose", "up", "-d", "db"], cwd=ROOT, check=True)
    for _ in range(30):
        ready = subprocess.run(
            ["docker", "compose", "exec", "-T", "db", "pg_isready", "-U", "hylo"],
            cwd=ROOT,
            capture_output=True,
        )
        if ready.returncode == 0:
            print("Postgres is ready.")
            return
        time.sleep(1)
    sys.exit("Postgres did not become ready within 30s.")


def migrate() -> None:
    versions = BACKEND / "alembic" / "versions"
    if not versions.is_dir() or not any(versions.glob("*.py")):
        print("No migrations found; skipping (see README first-time setup).")
        return
    print("Applying migrations...")
    subprocess.run([str(VENV_BIN / "alembic"), "upgrade", "head"], cwd=BACKEND, check=True)


def stream(name: str, proc: subprocess.Popen) -> None:
    prefix = f"{COLORS[name]}[{name}]{RESET} "
    for line in proc.stdout:
        sys.stdout.write(prefix + line)
        sys.stdout.flush()


def spawn(name: str, cmd: list[str], cwd: Path) -> subprocess.Popen:
    proc = subprocess.Popen(
        cmd,
        cwd=cwd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        start_new_session=True,  # own process group so we can kill children (e.g. next dev)
        env={**os.environ, "PYTHONUNBUFFERED": "1", "FORCE_COLOR": "1"},
    )
    threading.Thread(target=stream, args=(name, proc), daemon=True).start()
    return proc


def stop(procs: list[subprocess.Popen]) -> None:
    for proc in procs:
        if proc.poll() is None:
            os.killpg(proc.pid, signal.SIGTERM)
    deadline = time.time() + 10
    for proc in procs:
        try:
            proc.wait(timeout=max(0, deadline - time.time()))
        except subprocess.TimeoutExpired:
            os.killpg(proc.pid, signal.SIGKILL)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--no-db", action="store_true", help="don't start Postgres via Docker")
    parser.add_argument("--no-migrate", action="store_true", help="skip alembic upgrade head")
    args = parser.parse_args()

    if not (VENV_BIN / "uvicorn").exists():
        sys.exit("backend/.venv is missing uvicorn; run the README first-time setup.")
    if not (FRONTEND / "node_modules").is_dir():
        sys.exit("frontend/node_modules is missing; run `npm install` in frontend/.")

    if not args.no_db:
        start_db()
    if not args.no_migrate:
        migrate()

    procs = [
        spawn(
            "backend",
            [str(VENV_BIN / "uvicorn"), "app.main:app", "--reload", "--port", "8000"],
            BACKEND,
        ),
        spawn("frontend", ["npm", "run", "dev"], FRONTEND),
    ]
    print("App: http://localhost:3000  |  API docs: http://localhost:8000/docs  |  Ctrl+C to stop")

    try:
        while all(p.poll() is None for p in procs):
            time.sleep(0.5)
        print("A process exited; shutting down the other.")
    except KeyboardInterrupt:
        print("\nStopping...")
    finally:
        stop(procs)


if __name__ == "__main__":
    main()
