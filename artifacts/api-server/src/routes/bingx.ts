import { Router } from "express";

const router = Router();

const BINGX_BASE = "https://open-api.bingx.com";

router.get("/ticker", async (req, res) => {
  const symbol = (req.query["symbol"] as string) ?? "GBPJPY-USDT";
  const target = `${BINGX_BASE}/openApi/swap/v2/quote/ticker?symbol=${encodeURIComponent(symbol)}`;
  try {
    const upstream = await fetch(target, {
      headers: { accept: "application/json" },
    });
    const text = await upstream.text();
    res.status(upstream.status)
      .setHeader("content-type", "application/json; charset=utf-8")
      .setHeader("cache-control", "no-store")
      .send(text);
  } catch (e) {
    res.status(502).json({ error: e instanceof Error ? e.message : "proxy error" });
  }
});

router.get("/klines", async (req, res) => {
  const symbol = (req.query["symbol"] as string) ?? "GBPJPY-USDT";
  const interval = (req.query["interval"] as string) ?? "1h";
  const limit = (req.query["limit"] as string) ?? "300";
  const target = `${BINGX_BASE}/openApi/swap/v3/quote/klines?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&limit=${encodeURIComponent(limit)}`;
  try {
    const upstream = await fetch(target, {
      headers: { accept: "application/json" },
    });
    const text = await upstream.text();
    res.status(upstream.status)
      .setHeader("content-type", "application/json; charset=utf-8")
      .setHeader("cache-control", "no-store")
      .send(text);
  } catch (e) {
    res.status(502).json({ error: e instanceof Error ? e.message : "proxy error" });
  }
});

export default router;
