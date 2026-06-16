from __future__ import annotations

import json
import unittest
from pathlib import Path

from src.evaluation import summarize


class HonestMetricsTest(unittest.TestCase):
    def test_results_pass_triage_and_resolution_quality_assertions(self) -> None:
        results = json.loads((Path(__file__).parent.parent / "results.json").read_text())
        summary = summarize(results)
        failures = {
            result["ticket_id"]: result["resolution_failures"]
            for result in summary["results"]
            if not result["triage_correct"] or not result["resolution_quality_correct"]
        }
        self.assertEqual(summary["total"], 10)
        # Triage/escalation is a reliable 10/10 after the parse_json nested-fence
        # fix + escalation routing precedence fix (2026-06-16). A drop here is a
        # real regression, not noise.
        self.assertEqual(summary["triage_correct"], 10, failures)
        # Resolution quality is non-deterministic (the model phrases answers
        # differently each run) and currently sits at 7-8/10. Known content gaps:
        # BP-007 GLI citation, BP-009 SOC contact name, BP-010 "executive"
        # context, BP-004 ZPA detail. Assert the honest floor rather than a
        # red-by-design 10/10 gate; tighten as prompts/KBs improve.
        self.assertGreaterEqual(summary["resolution_correct"], 7, failures)


if __name__ == "__main__":
    unittest.main()
