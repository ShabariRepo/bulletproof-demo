"""
Honest evaluation for the Silver Bullet demo.

Routing correctness only proves the triage label. Resolution-quality
correctness proves the specialist/escalation answer satisfied ticket-specific
content requirements.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable


@dataclass(frozen=True)
class Evaluation:
    triage_correct: bool
    resolution_quality_correct: bool
    resolution_failures: list[str]


def _flatten(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, dict):
        return " ".join(f"{key} {_flatten(item)}" for key, item in value.items())
    if isinstance(value, list):
        return " ".join(_flatten(item) for item in value)
    return str(value)


def response_text(result: dict[str, Any]) -> str:
    return " ".join(
        [
            str(result.get("subject", "")),
            str(result.get("response", "")),
            _flatten(result.get("parsed", {})),
        ]
    ).lower()


def check_routing(expected: str, actual: str) -> bool:
    """Check triage/escalation routing without marketing fuzz."""
    if not expected or not actual:
        return False
    expected_norm = expected.lower().strip()
    actual_norm = actual.lower().strip()
    if expected_norm == "escalation":
        return actual_norm == "escalation"
    return expected_norm == actual_norm


def _has_any(text: str, needles: list[str]) -> bool:
    return any(needle.lower() in text for needle in needles)


def _missing_if(condition: bool, message: str) -> list[str]:
    return [] if condition else [message]


def _bp001(text: str) -> list[str]:
    return (
        _missing_if("azure" in text or "entra" in text, "must identify Azure AD / Entra ID")
        + _missing_if(_has_any(text, ["reset password", "temporary password", "temp"]), "must perform/administer password reset")
        + _missing_if(_has_any(text, ["mfa", "authentication method", "re-enroll", "reenroll"]), "must address broken MFA/re-enrollment")
    )


def _bp002(text: str) -> list[str]:
    return (
        _missing_if(_has_any(text, ["aduc", "active directory"]), "must use ADUC/on-prem AD unlock path")
        + _missing_if("unlock" in text, "must unlock account")
        + _missing_if(_has_any(text, ["suspicious", "failed login", "sign-in", "source ip"]), "must flag suspicious failed-login activity")
    )


def _bp003(text: str) -> list[str]:
    return (
        _missing_if("okta" in text, "must identify Okta")
        + _missing_if(_has_any(text, ["break-glass", "break glass", "bypass code"]), "must use break-glass/bypass procedure")
        + _missing_if(_has_any(text, ["ciso", "maria santos"]), "must notify CISO")
    )


def _bp004(text: str) -> list[str]:
    wrong_anyconnect_steps = any(
        phrase in text
        for phrase in [
            "update anyconnect",
            "anyconnect client version",
            "vpn.{client}.com",
            "cisco certificate",
            "anyconnect profile cache",
        ]
    )
    return (
        _missing_if(_has_any(text, ["zscaler", "zpa"]), "must correct to Apex Zscaler ZPA")
        + _missing_if(_has_any(text, ["client connector", "app segment", "zpa status", "reconnect"]), "must give ZPA-specific troubleshooting")
        + _missing_if(not wrong_anyconnect_steps, "must not provide Cisco AnyConnect procedure steps for Apex")
    )


def _bp005(text: str) -> list[str]:
    return (
        _missing_if("wireguard" in text, "must identify WireGuard")
        + _missing_if(_has_any(text, ["public key", "key pair"]), "must include key generation/public key step")
        + _missing_if(_has_any(text, ["cto", "akim", "alex kim", "server-side", "adds peer"]), "must note TechStart CTO/server-side peer step")
    )


def _bp006(text: str) -> list[str]:
    return (
        _missing_if("adobe" in text and "creative" in text, "must identify Adobe Creative Cloud")
        + _missing_if(_has_any(text, ["approved", "approve"]), "must approve approved software")
        + _missing_if(_has_any(text, ["38", "50", "12 in use", "license"]), "must reference license pool availability")
    )


def _bp007(text: str) -> list[str]:
    return (
        _missing_if("dropbox" in text, "must identify Dropbox")
        + _missing_if(_has_any(text, ["deny", "denied", "prohibited", "not approved"]), "must deny Dropbox")
        + _missing_if("gli" in text, "must cite GLI compliance reason")
        + _missing_if("sharepoint" in text, "must suggest SharePoint alternative")
    )


def _bp008(text: str) -> list[str]:
    return (
        _missing_if(_has_any(text, ["dell", "latitude", "5540"]), "must preserve hardware model")
        + _missing_if(_has_any(text, ["14 months", "14mo", "in warranty", "warranty"]), "must assess likely warranty status")
        + _missing_if(_has_any(text, ["dispatch", "rma", "manufacturer", "replacement"]), "must recommend dispatch/RMA/replacement path if unresolved")
        + _missing_if("halo url" not in text and "provide the url" not in text, "must not ask user for Halo URL")
    )


def _bp009(text: str) -> list[str]:
    return (
        _missing_if(_has_any(text, ["soc", "security operations"]), "must escalate to SOC")
        + _missing_if(_has_any(text, ["angela foster", "ciso", "director digital"]), "must include Maple Ridge security escalation contact")
        + _missing_if(_has_any(text, ["nigeria", "unusual location", "suspicious"]), "must preserve suspicious login context")
    )


def _bp010(text: str) -> list[str]:
    return (
        _missing_if("p1" in text, "must mark P1")
        + _missing_if(_has_any(text, ["sandra mitchell", "cto", "executive"]), "must preserve executive reporter")
        + _missing_if(_has_any(text, ["org-wide", "organization-wide", "entire email", "all users", "nobody"]), "must preserve org-wide outage")
    )


ASSERTIONS: dict[str, Callable[[str], list[str]]] = {
    "BP-001": _bp001,
    "BP-002": _bp002,
    "BP-003": _bp003,
    "BP-004": _bp004,
    "BP-005": _bp005,
    "BP-006": _bp006,
    "BP-007": _bp007,
    "BP-008": _bp008,
    "BP-009": _bp009,
    "BP-010": _bp010,
}


def evaluate_result(result: dict[str, Any]) -> Evaluation:
    ticket_id = str(result.get("ticket_id", ""))
    triage_correct = check_routing(str(result.get("expected_routing", "")), str(result.get("actual_routing", "")))
    assertion = ASSERTIONS.get(ticket_id)
    text = response_text(result)
    failures = assertion(text) if assertion else ["no resolution-quality assertion defined"]
    if _has_any(text, ["tool error", "tool errors", "unable to delegate", "failed to delegate"]):
        failures.append("must not contain delegation/tool failure")
    if _has_any(text, ["what is the halo url", "provide the halo url", "need the halo url"]):
        failures.append("must not ask the user for Halo URL")
    return Evaluation(triage_correct, not failures, failures)


def attach_evaluation(result: dict[str, Any]) -> dict[str, Any]:
    evaluation = evaluate_result(result)
    result["triage_correct"] = evaluation.triage_correct
    result["routing_correct"] = evaluation.triage_correct
    result["resolution_quality_correct"] = evaluation.resolution_quality_correct
    result["resolution_failures"] = evaluation.resolution_failures
    return result


def summarize(results: list[dict[str, Any]]) -> dict[str, Any]:
    evaluated = [attach_evaluation(dict(result)) for result in results]
    total = len(evaluated)
    triage_correct = sum(1 for result in evaluated if result.get("triage_correct"))
    resolution_correct = sum(1 for result in evaluated if result.get("resolution_quality_correct"))
    return {
        "total": total,
        "triage_correct": triage_correct,
        "resolution_correct": resolution_correct,
        "triage_accuracy": triage_correct / total * 100 if total else 0,
        "resolution_quality_accuracy": resolution_correct / total * 100 if total else 0,
        "results": evaluated,
    }
