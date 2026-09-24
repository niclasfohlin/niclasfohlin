#!/usr/bin/env python3
"""DNS hos Loopia för niclasfohlin.se, via LoopiaAPI (XML-RPC).

  python scripts/loopia.py domaner                          alla domäner på kontot
  python scripts/loopia.py poster [subdomän]                zonposter för @ (eller www, _dmarc ...)
  python scripts/loopia.py lagg <subdomän> <TYP> <värde> [ttl]
  python scripts/loopia.py andra <subdomän> <record_id> <TYP> <värde> [ttl] [prio]
  python scripts/loopia.py tabort <subdomän> <record_id>

Inloggningen läses ur miljövariablerna LOOPIA_USER och LOOPIA_PASSWORD (Claude Code sätter dem
från .claude/settings.local.json, som git ignorerar). Domänen är niclasfohlin.se om inte
LOOPIA_DOMAN säger annat. Subdomänen @ betyder själva domänen.
"""
import os
import sys
import xmlrpc.client

API = "https://api.loopia.se/RPCSERV"
USER = os.environ.get("LOOPIA_USER")
PASSWORD = os.environ.get("LOOPIA_PASSWORD")
DOMAN = os.environ.get("LOOPIA_DOMAN", "niclasfohlin.se")


def klient():
    if not USER or not PASSWORD:
        sys.exit("LOOPIA_USER och LOOPIA_PASSWORD saknas i miljön.")
    return xmlrpc.client.ServerProxy(API, encoding="utf-8")


def post(typ, varde, ttl, prioritet=0, record_id=None):
    p = {"type": typ, "ttl": int(ttl), "priority": int(prioritet), "rdata": varde}
    if record_id is not None:
        p["record_id"] = int(record_id)
    return p


def main(argv):
    if not argv or argv[0] in ("-h", "--help", "hjalp"):
        print(__doc__)
        return 0
    c = klient()
    kmd, rest = argv[0], argv[1:]
    if kmd == "domaner":
        for d in c.getDomains(USER, PASSWORD):
            print(d["domain"], "| betald" if d.get("paid") else "| obetald", "| löper ut", d.get("expiration_date"))
        return 0
    if kmd == "poster":
        sub = rest[0] if rest else "@"
        poster = c.getZoneRecords(USER, PASSWORD, DOMAN, sub)
        if isinstance(poster, str):
            print(poster)
            return 1
        if not poster:
            print(f"(inga poster för {sub}.{DOMAN})")
        for p in poster:
            print(p["record_id"], p["type"], f"ttl {p['ttl']}", f"prio {p['priority']}", "->", p["rdata"])
        return 0
    if kmd == "lagg":
        sub, typ, varde = rest[0], rest[1].upper(), rest[2]
        ttl = rest[3] if len(rest) > 3 else 3600
        prio = rest[4] if len(rest) > 4 else 0
        if sub != "@" and sub not in c.getSubdomains(USER, PASSWORD, DOMAN):
            print("subdomän skapad:", c.addSubdomain(USER, PASSWORD, DOMAN, sub))
        print(c.addZoneRecord(USER, PASSWORD, DOMAN, sub, post(typ, varde, ttl, prio)))
        return 0
    if kmd == "andra":
        sub, rid, typ, varde = rest[0], rest[1], rest[2].upper(), rest[3]
        ttl = rest[4] if len(rest) > 4 else 3600
        prio = rest[5] if len(rest) > 5 else 0
        print(c.updateZoneRecord(USER, PASSWORD, DOMAN, sub, post(typ, varde, ttl, prio, rid)))
        return 0
    if kmd == "tabort":
        sub, rid = rest[0], rest[1]
        print(c.removeZoneRecord(USER, PASSWORD, DOMAN, sub, int(rid)))
        return 0
    print("okänt kommando:", kmd)
    print(__doc__)
    return 1


if __name__ == "__main__":
    try:
        sys.exit(main(sys.argv[1:]))
    except xmlrpc.client.Fault as f:
        sys.exit(f"LoopiaAPI-fel: {f}")
