import argparse
import ctypes
import json
import os
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "temp" / "ml-training"
STATE_FILE = DATA_DIR / "state.json"
LOCK_FILE = DATA_DIR / "auto-train.lock"
TRAINING_FILE = DATA_DIR / "training" / "krishisetu_training.csv"
NODE_SCRIPT = ROOT / "scripts" / "mvp-ml-data.mjs"
TRAIN_SCRIPT = Path(__file__).resolve().parent / "train.py"
ARTIFACT = Path(__file__).resolve().parent / "artifacts" / "forecast_bundle.joblib"


class AlreadyRunningError(RuntimeError):
    def __init__(self, process_id):
        self.process_id = process_id
        super().__init__(f"Auto trainer is already running with PID {process_id}.")


def run(command):
    print(f"[auto-train] {' '.join(map(str, command))}", flush=True)
    try:
        completed = subprocess.run(command, cwd=ROOT, text=True, check=True, capture_output=True)
    except subprocess.CalledProcessError as error:
        if error.stdout and error.stdout.strip():
            print(error.stdout.strip(), flush=True)
        if error.stderr and error.stderr.strip():
            print(error.stderr.strip(), file=sys.stderr, flush=True)
        raise
    if completed.stdout.strip():
        print(completed.stdout.strip(), flush=True)
    return completed.stdout


def node(*arguments):
    executable = os.environ.get("KRISHISETU_NODE", "node")
    return run([executable, str(NODE_SCRIPT), *arguments])


def read_state():
    if not STATE_FILE.exists():
        return {}
    return json.loads(STATE_FILE.read_text(encoding="utf-8"))


def save_training_time():
    current = read_state()
    current["lastTrainingAt"] = datetime.now(timezone.utc).isoformat()
    STATE_FILE.write_text(json.dumps(current, indent=2) + "\n", encoding="utf-8")


def train_once(advance_hours=0):
    node("generate")
    node("seed-history")
    if advance_hours:
        node("tick", "--hours", str(advance_hours))
    simulated_at = read_state().get("simulatedAt")
    export_arguments = ["export-training"]
    if simulated_at:
        export_arguments.extend(["--as-of", simulated_at])
    node(*export_arguments)
    run([sys.executable, str(TRAIN_SCRIPT), "--data", str(TRAINING_FILE), "--output", str(ARTIFACT)])
    save_training_time()


def process_is_running(process_id):
    if process_id <= 0:
        return False
    if os.name == "nt":
        process_query_limited_information = 0x1000
        handle = ctypes.windll.kernel32.OpenProcess(process_query_limited_information, False, process_id)
        if not handle:
            return False
        ctypes.windll.kernel32.CloseHandle(handle)
        return True
    try:
        os.kill(process_id, 0)
        return True
    except (OSError, ProcessLookupError):
        return False


def acquire_lock():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    try:
        descriptor = os.open(LOCK_FILE, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        os.write(descriptor, str(os.getpid()).encode("ascii"))
        os.close(descriptor)
    except FileExistsError as error:
        try:
            locked_process_id = int(LOCK_FILE.read_text(encoding="ascii").strip())
        except (OSError, ValueError):
            locked_process_id = 0
        if not process_is_running(locked_process_id):
            LOCK_FILE.unlink()
            return acquire_lock()
        raise AlreadyRunningError(locked_process_id) from error


def main():
    parser = argparse.ArgumentParser(description="Seed, release, and retrain the KrishiSetu MVP model.")
    parser.add_argument("--once", action="store_true", help="Seed history and train once without waiting.")
    parser.add_argument("--watch", action="store_true", help="Advance one simulation hour and retrain every interval.")
    parser.add_argument("--interval-seconds", type=int, default=3600)
    arguments = parser.parse_args()
    if not arguments.once and not arguments.watch:
        parser.error("Choose --once or --watch.")
    if arguments.interval_seconds < 60:
        parser.error("--interval-seconds must be at least 60.")
    try:
        acquire_lock()
    except AlreadyRunningError as error:
        print(f"[auto-train] Already running (PID {error.process_id}). Do not start a second hourly worker.")
        return
    try:
        if arguments.once:
            train_once(advance_hours=0)
        next_advance_hours = 0
        while arguments.watch:
            try:
                train_once(advance_hours=next_advance_hours)
                next_advance_hours = 1
                delay = arguments.interval_seconds
            except Exception as error:
                print(f"[auto-train] hourly run failed: {error}", file=sys.stderr, flush=True)
                delay = min(300, arguments.interval_seconds)
            time.sleep(delay)
    finally:
        LOCK_FILE.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
