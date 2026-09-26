#!/usr/bin/env python3
import argparse, json, os
from datetime import datetime, timezone, timedelta
from pathlib import Path

def load_json(path, default):
    try:
        return json.loads(Path(path).read_text())
    except Exception:
        return default

def atomic_write(path: Path, text: str):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(text)
    os.replace(tmp, path)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--snapshot", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--retention-days", type=int, default=31)
    args = ap.parse_args()

    snap = json.loads(Path(args.snapshot).read_text())
    required = {
        "execution_enabled": False,
        "status": "RESEARCH_NO_PROVEN_EDGE",
        "symbol": "ENAUSDT",
        "market": "USD-M Futures",
    }
    for key, expected in required.items():
        if snap.get(key) != expected:
            raise SystemExit(f"refusing snapshot: {key}={snap.get(key)!r}, expected {expected!r}")

    ts_ms = int(snap["fetched_at_ms"])
    ts = datetime.fromtimestamp(ts_ms / 1000, tz=timezone.utc)
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    atomic_write(out / "latest.json", json.dumps(snap, separators=(",", ":"), sort_keys=True))

    recent_path = out / "recent.json"
    recent = load_json(recent_path, [])
    if not isinstance(recent, list):
        recent = []
    by_ts = {int(x.get("fetched_at_ms", 0)): x for x in recent if isinstance(x, dict)}
    by_ts[ts_ms] = snap
    cutoff_24h = ts_ms - 24 * 3600 * 1000
    recent = [by_ts[k] for k in sorted(by_ts) if k >= cutoff_24h][-320:]
    atomic_write(recent_path, json.dumps(recent, separators=(",", ":"), sort_keys=True))

    hist_dir = out / "history"
    hist_dir.mkdir(exist_ok=True)
    daily = hist_dir / f"{ts:%Y-%m-%d}.jsonl"
    seen = set()
    rows = []
    if daily.exists():
        for line in daily.read_text().splitlines():
            if not line.strip():
                continue
            try:
                item = json.loads(line)
                key = int(item.get("fetched_at_ms", 0))
                if key and key not in seen:
                    rows.append(item)
                    seen.add(key)
            except Exception:
                pass
    if ts_ms not in seen:
        rows.append(snap)
    rows.sort(key=lambda x: int(x.get("fetched_at_ms", 0)))
    atomic_write(daily, "\n".join(json.dumps(x, separators=(",", ":"), sort_keys=True) for x in rows) + "\n")

    oldest = ts.date() - timedelta(days=args.retention_days - 1)
    for p in hist_dir.glob("????-??-??.jsonl"):
        try:
            d = datetime.strptime(p.stem, "%Y-%m-%d").date()
            if d < oldest:
                p.unlink()
        except ValueError:
            pass

    manifest = {
        "schema_version": "scmv3-cloud-manifest-1.0.0",
        "updated_at_utc": snap["fetched_at_utc"],
        "latest_fetched_at_ms": ts_ms,
        "records_24h": len(recent),
        "retention_days": args.retention_days,
        "data_tier": "CLOUD_5M_SNAPSHOT",
        "execution_enabled": False,
        "history_files": sorted(p.name for p in hist_dir.glob("????-??-??.jsonl")),
        "limitations": [
            "This branch stores periodic cloud snapshots, not continuous diff-depth or aggTrade replay.",
            "Historical order-book fields are point-in-time REST snapshots only."
        ],
    }
    atomic_write(out / "manifest.json", json.dumps(manifest, separators=(",", ":"), sort_keys=True))
    print(json.dumps({"ok": True, "ts": ts_ms, "records_24h": len(recent)}))

if __name__ == "__main__":
    main()
