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

router.get("/vix", async (_req, res) => {
  const target =
    "https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?range=1d&interval=5m&includePrePost=false";

  try {
    const upstream = await fetch(target, {
      headers: {
        accept: "application/json",
        "user-agent": "Mozilla/5.0",
      },
    });
    const payload = (await upstream.json()) as {
      chart?: {
        result?: Array<{
          meta?: { regularMarketPrice?: number; regularMarketTime?: number };
          indicators?: { quote?: Array<{ close?: Array<number | null> }> };
        }>;
      };
    };

    const result = payload.chart?.result?.[0];
    const metaValue = Number(result?.meta?.regularMarketPrice);
    const closes = result?.indicators?.quote?.[0]?.close ?? [];
    const lastClose = [...closes].reverse().find((value) => value != null);
    const value = Number.isFinite(metaValue) ? metaValue : Number(lastClose);

    if (!upstream.ok || !Number.isFinite(value)) {
      res.status(502).json({ error: "Yahoo Finance não retornou um valor válido para o VIX." });
      return;
    }

    res
      .status(200)
      .setHeader("content-type", "application/json; charset=utf-8")
      .setHeader("cache-control", "no-store")
      .json({
        symbol: "^VIX",
        value,
        timestamp: Number(result?.meta?.regularMarketTime ?? Math.floor(Date.now() / 1000)) * 1000,
      });
  } catch (e) {
    res.status(502).json({ error: e instanceof Error ? e.message : "proxy error" });
  }
});

export default router;
