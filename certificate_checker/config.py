"""State/UT portal configuration.

Only explicitly listed hosts are shown as trusted issuer links. Add a state only
after checking its current government portal. No QR URL is fetched by the app.
"""
from __future__ import annotations

from urllib.parse import urlparse

STATE_CONFIG: dict[str, dict] = {
    "auto": {
        "name": "Auto-detect / other state",
        "portal": "https://services.india.gov.in/",
        "portal_label": "National Government Services Portal",
        "official_domains": [],
    },
    "delhi": {
        "name": "Delhi",
        "portal": "https://edistrict.delhigovt.nic.in/",
        "portal_label": "Delhi e-District portal",
        "official_domains": [
            "edistrict.delhigovt.nic.in",
            "delhi.gov.in",
        ],
    },
}


def get_state_config(state_code: str | None) -> dict:
    """Return a safe copy of the requested state configuration."""
    code = (state_code or "auto").strip().lower()
    return dict(STATE_CONFIG.get(code, STATE_CONFIG["auto"]))


def is_allowed_official_url(url: str, state_code: str | None) -> bool:
    """Check an HTTPS URL against exact configured government host suffixes.

    The comparison allows a listed host and its subdomains, but never a sibling
    or look-alike domain. For example, evil-delhi.gov.in.example.com is rejected.
    """
    try:
        parsed = urlparse(url.strip())
    except ValueError:
        return False
    if parsed.scheme.lower() != "https" or not parsed.hostname:
        return False
    host = parsed.hostname.rstrip(".").lower()
    domains = get_state_config(state_code).get("official_domains", [])
    return any(host == domain or host.endswith("." + domain) for domain in domains)


def looks_like_government_url(url: str) -> bool:
    """Weak informational hint only; this does not establish authenticity."""
    try:
        parsed = urlparse(url.strip())
    except ValueError:
        return False
    if parsed.scheme.lower() != "https" or not parsed.hostname:
        return False
    host = parsed.hostname.rstrip(".").lower()
    return host.endswith(".gov.in") or host.endswith(".nic.in")
