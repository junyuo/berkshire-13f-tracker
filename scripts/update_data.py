from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
import tempfile
import time
import uuid
from pathlib import Path
from typing import Any, Callable

from validate_data import REQUIRED_FILES, validate_directory


DATA_DIR = Path(__file__).resolve().parents[1] / "public" / "data"
RETRY_DELAYS = (15, 45)


def current_accession(data_dir: Path) -> str | None:
    latest_path = data_dir / "latest.json"
    if not latest_path.exists():
        return None
    try:
        latest = json.loads(latest_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    value = latest.get("accessionNumber")
    return value if isinstance(value, str) and value else None


def promote_validated_data(staging_dir: Path, data_dir: Path) -> None:
    data_dir.mkdir(parents=True, exist_ok=True)
    token = uuid.uuid4().hex
    next_paths: dict[str, Path] = {}
    backup_paths: dict[str, Path] = {}

    try:
        for name in REQUIRED_FILES:
            source = staging_dir / f"{name}.json"
            next_path = data_dir / f".{name}.{token}.next"
            shutil.copyfile(source, next_path)
            next_paths[name] = next_path

        for name in REQUIRED_FILES:
            target = data_dir / f"{name}.json"
            if target.exists():
                backup_path = data_dir / f".{name}.{token}.backup"
                shutil.copyfile(target, backup_path)
                backup_paths[name] = backup_path

        try:
            for name in REQUIRED_FILES:
                os.replace(next_paths[name], data_dir / f"{name}.json")
        except Exception:
            for name, backup_path in backup_paths.items():
                os.replace(backup_path, data_dir / f"{name}.json")
            raise
    finally:
        for path in [*next_paths.values(), *backup_paths.values()]:
            path.unlink(missing_ok=True)


def run_update(
    max_attempts: int,
    data_dir: Path = DATA_DIR,
    get_filings: Callable[..., list[Any]] | None = None,
    generate: Callable[..., None] | None = None,
    validator: Callable[[Path], list[str]] = validate_directory,
    sleep: Callable[[float], None] = time.sleep,
) -> bool:
    if max_attempts < 1:
        raise ValueError("max_attempts must be at least 1")

    if get_filings is None or generate is None:
        from fetch_13f import generate_data, get_recent_13f_filings

        get_filings = get_filings or get_recent_13f_filings
        generate = generate or generate_data

    existing_accession = current_accession(data_dir)
    last_error: Exception | None = None

    for attempt in range(1, max_attempts + 1):
        print(f"Update attempt {attempt}/{max_attempts}")
        try:
            filings = get_filings(limit=8)
            if not filings:
                raise RuntimeError("SEC submissions feed returned no 13F-HR filings.")

            latest_accession = filings[0].accession_number
            print(f"SEC latest accession: {latest_accession}")
            print(f"Local latest accession: {existing_accession or 'not recorded'}")
            if existing_accession == latest_accession:
                print("No new filing. Existing data remains unchanged.")
                return False

            with tempfile.TemporaryDirectory(prefix="berkshire-13f-staging-") as temp_dir:
                staging_dir = Path(temp_dir)
                generate(staging_dir, filings=filings)
                errors = validator(staging_dir)
                if errors:
                    details = "\n".join(f"- {error}" for error in errors)
                    raise RuntimeError(f"Staging data validation failed:\n{details}")
                promote_validated_data(staging_dir, data_dir)

            print(f"Updated data to accession {latest_accession} after successful validation.")
            return True
        except Exception as exc:
            last_error = exc
            print(f"Attempt {attempt} failed: {exc}", file=sys.stderr)
            if attempt < max_attempts:
                delay = RETRY_DELAYS[min(attempt - 1, len(RETRY_DELAYS) - 1)]
                print(f"Retrying in {delay} seconds.", file=sys.stderr)
                sleep(delay)

    raise RuntimeError(f"Update failed after {max_attempts} attempts: {last_error}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Check, update, and validate Berkshire 13F data.")
    parser.add_argument("--max-attempts", type=int, default=3)
    parser.add_argument("--data-dir", type=Path, default=DATA_DIR)
    args = parser.parse_args()

    try:
        run_update(args.max_attempts, args.data_dir)
    except Exception as exc:
        print(f"Update process failed: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
