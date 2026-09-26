const BASE = "https://fapi.binance.com";

async function getJson(path) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const r = await fetch(BASE + path, {
      cache: "no-store",
      headers: { "user-agent": "SCMv3-Cloud-Collector/1.0" },
      signal: controller.signal
    });
    if (!r.ok) throw new Error(path + " HTTP " + r.status);
    return await r.json();
  } finally {
    clearTimeout(timer);
  }
}

function lastClosed(rows, now) {
  if (!Array.isArray(rows)) return null;
  const row = [...rows].reverse().find(x => Number(x[6]) < now);
  if (!row) return null;
  return {
    open_time: Number(row[0]),
    open: Number(row[1]),
    high: Number(row[2]),
    low: Number(row[3]),
    close: Number(row[4]),
    volume: Number(row[5]),
    close_time: Number(row[6]),
    quote_volume: Number(row[7]),
    trades: Number(row[8]),
    taker_buy_base: Number(row[9]),
    taker_buy_quote: Number(row[10])
  };
}

function depthSummary(depth) {
  if (!depth || !Array.isArray(depth.bids) || !Array.isArray(depth.asks)) return null;
  const bids = depth.bids.slice(0, 10).map(([p,q]) => [Number(p), Number(q)]);
  const asks = depth.asks.slice(0, 10).map(([p,q]) => [Number(p), Number(q)]);
  const bq = bids.reduce((s,x) => s + x[1], 0);
  const aq = asks.reduce((s,x) => s + x[1], 0);
  return {
    evidence_tier: "RESTING_LIQUIDITY_SNAPSHOT",
    last_update_id: Number(depth.lastUpdateId),
    event_time: depth.E == null ? null : Number(depth.E),
    transaction_time: depth.T == null ? null : Number(depth.T),
    top10_bid_qty: bq,
    top10_ask_qty: aq,
    top10_imbalance: (bq - aq) / ((bq + aq) || 1),
    best_bid: bids[0] || null,
    best_ask: asks[0] || null
  };
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=90");

  const fetchedAt = Date.now();
  const errors = {};
  async function safe(name, path) {
    try { return await getJson(path); }
    catch (e) { errors[name] = String(e && e.message || e); return null; }
  }

  const [
    premium, oi, oiHist, taker, longShort,
    ena5, ena15, btc15, depth
  ] = await Promise.all([
    safe("premium", "/fapi/v1/premiumIndex?symbol=ENAUSDT"),
    safe("open_interest", "/fapi/v1/openInterest?symbol=ENAUSDT"),
    safe("open_interest_hist", "/futures/data/openInterestHist?symbol=ENAUSDT&period=5m&limit=2"),
    safe("taker", "/futures/data/takerlongshortRatio?symbol=ENAUSDT&period=5m&limit=1"),
    safe("long_short", "/futures/data/globalLongShortAccountRatio?symbol=ENAUSDT&period=5m&limit=1"),
    safe("ena_5m", "/fapi/v1/klines?symbol=ENAUSDT&interval=5m&limit=4"),
    safe("ena_15m", "/fapi/v1/klines?symbol=ENAUSDT&interval=15m&limit=4"),
    safe("btc_15m", "/fapi/v1/klines?symbol=BTCUSDT&interval=15m&limit=4"),
    safe("depth", "/fapi/v1/depth?symbol=ENAUSDT&limit=20")
  ]);

  let oiChange5m = null;
  if (Array.isArray(oiHist) && oiHist.length >= 2) {
    const a = Number(oiHist[oiHist.length - 2].sumOpenInterest);
    const b = Number(oiHist[oiHist.length - 1].sumOpenInterest);
    if (Number.isFinite(a) && a !== 0 && Number.isFinite(b)) oiChange5m = (b - a) / a;
  }

  const snapshot = {
    schema_version: "scmv3-cloud-snapshot-1.0.0",
    spec_version: "SCMv3-1.0.0",
    execution_enabled: false,
    status: "RESEARCH_NO_PROVEN_EDGE",
    data_tier: "CLOUD_5M_SNAPSHOT",
    venue: "Binance",
    market: "USD-M Futures",
    symbol: "ENAUSDT",
    benchmark: "BTCUSDT",
    fetched_at_utc: new Date(fetchedAt).toISOString(),
    fetched_at_ms: fetchedAt,
    source_region_intent: "sin1",
    quality: {
      source_count: 9,
      source_ok: 9 - Object.keys(errors).length,
      partial: Object.keys(errors).length > 0,
      errors
    },
    ena: {
      mark_price: premium ? Number(premium.markPrice) : null,
      index_price: premium ? Number(premium.indexPrice) : null,
      funding_rate: premium ? Number(premium.lastFundingRate) : null,
      next_funding_time: premium ? Number(premium.nextFundingTime) : null,
      open_interest: oi ? Number(oi.openInterest) : null,
      oi_change_5m: oiChange5m,
      taker_buy_sell_ratio_5m: Array.isArray(taker) && taker[0] ? Number(taker[0].buySellRatio) : null,
      long_short_account_ratio_5m: Array.isArray(longShort) && longShort[0] ? Number(longShort[0].longShortRatio) : null,
      closed_5m: lastClosed(ena5, fetchedAt),
      closed_15m: lastClosed(ena15, fetchedAt),
      depth_snapshot: depthSummary(depth)
    },
    btc: {
      closed_15m: lastClosed(btc15, fetchedAt)
    },
    limitations: [
      "Five-minute cloud snapshots are not a substitute for continuous aggTrade or diff-depth recording.",
      "Order-book data is a point-in-time REST snapshot and is not RECORDED_BOOK_REPLAY.",
      "This endpoint uses public market data only and exposes no account or order actions."
    ]
  };

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(snapshot));
};