from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace

from update_data import REQUIRED_FILES, run_update


def write_json(path: Path, data) -> None:
    path.write_text(json.dumps(data) + "\n", encoding="utf-8")


def seed_data(data_dir: Path, accession: str, marker: str = "old") -> None:
    data_dir.mkdir(parents=True, exist_ok=True)
    write_json(data_dir / "latest.json", {"accessionNumber": accession, "marker": marker})
    for name in REQUIRED_FILES:
        if name != "latest":
            write_json(data_dir / f"{name}.json", {"marker": marker})


def generated_payload(output_dir: Path, accession: str, marker: str = "new") -> None:
    for name in REQUIRED_FILES:
        payload = {"marker": marker}
        if name == "latest":
            payload["accessionNumber"] = accession
        write_json(output_dir / f"{name}.json", payload)


class UpdateDataTests(unittest.TestCase):
    def test_same_accession_exits_without_writing(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            data_dir = Path(temp_dir)
            seed_data(data_dir, "same-accession")
            generate_calls = []

            updated = run_update(
                3,
                data_dir,
                get_filings=lambda limit: [SimpleNamespace(accession_number="same-accession")],
                generate=lambda output_dir, filings: generate_calls.append(output_dir),
                sleep=lambda seconds: None,
            )

            self.assertFalse(updated)
            self.assertEqual(generate_calls, [])
            self.assertEqual(json.loads((data_dir / "latest.json").read_text())["marker"], "old")

    def test_first_failure_then_success_promotes_once(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            data_dir = Path(temp_dir)
            seed_data(data_dir, "old-accession")
            calls = 0
            delays = []

            def generate(output_dir, filings):
                nonlocal calls
                calls += 1
                if calls == 1:
                    raise RuntimeError("temporary SEC failure")
                generated_payload(output_dir, filings[0].accession_number)

            updated = run_update(
                3,
                data_dir,
                get_filings=lambda limit: [SimpleNamespace(accession_number="new-accession")],
                generate=generate,
                validator=lambda data_dir: [],
                sleep=delays.append,
            )

            self.assertTrue(updated)
            self.assertEqual(calls, 2)
            self.assertEqual(delays, [15])
            latest = json.loads((data_dir / "latest.json").read_text())
            self.assertEqual(latest["accessionNumber"], "new-accession")
            self.assertEqual(latest["marker"], "new")

    def test_three_failures_preserve_existing_data(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            data_dir = Path(temp_dir)
            seed_data(data_dir, "old-accession")
            calls = 0
            delays = []

            def generate(output_dir, filings):
                nonlocal calls
                calls += 1
                raise RuntimeError("persistent failure")

            with self.assertRaises(RuntimeError):
                run_update(
                    3,
                    data_dir,
                    get_filings=lambda limit: [SimpleNamespace(accession_number="new-accession")],
                    generate=generate,
                    validator=lambda data_dir: [],
                    sleep=delays.append,
                )

            self.assertEqual(calls, 3)
            self.assertEqual(delays, [15, 45])
            latest = json.loads((data_dir / "latest.json").read_text())
            self.assertEqual(latest["accessionNumber"], "old-accession")
            self.assertEqual(latest["marker"], "old")

    def test_validation_failure_retries_full_generation(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            data_dir = Path(temp_dir)
            seed_data(data_dir, "old-accession")
            generate_calls = 0
            validate_calls = 0
            delays = []

            def generate(output_dir, filings):
                nonlocal generate_calls
                generate_calls += 1
                generated_payload(output_dir, filings[0].accession_number)

            def validator(staging_dir):
                nonlocal validate_calls
                validate_calls += 1
                return ["latest.json: simulated mismatch"] if validate_calls == 1 else []

            updated = run_update(
                3,
                data_dir,
                get_filings=lambda limit: [SimpleNamespace(accession_number="new-accession")],
                generate=generate,
                validator=validator,
                sleep=delays.append,
            )

            self.assertTrue(updated)
            self.assertEqual(generate_calls, 2)
            self.assertEqual(validate_calls, 2)
            self.assertEqual(delays, [15])


if __name__ == "__main__":
    unittest.main()
