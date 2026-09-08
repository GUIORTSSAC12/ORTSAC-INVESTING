import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ThumbsDown,
  ThumbsUp,
  Lock,
  User,
  LogOut,
  Eye,
  EyeOff,
  ChevronDown,
} from "lucide-react";
import radarBg from "./assets/radar-bg.jpeg";
import royalLondon from "./assets/royal-london.jpeg";
import scannerbg from "./assets/scanner.jpeg";
import { BotaoSomVix } from "./components/BOTAOSOM";
import ScannerCard from "./components/ScannerCard";
import TradingCard from "./components/TradingCard";
import type { StrategySignal } from "./types/strategy";

const AUTH_KEY = "dashboard_auth_v1";
const AUTH_USER = "guilhermeortsac";
const AUTH_PASS = "Fxgbpgui12@";

function Gate() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setAuthed(localStorage.getItem(AUTH_KEY) === "1");
    } catch {
      setAuthed(false);
    }
  }, []);

  if (authed === null) {
    return <div className="min-h-screen bg-black" />;
  }
  if (!authed) {
    return <Login onSuccess={() => setAuthed(true)} />;
  }
  return (
    <Index
      onLogout={() => {
        try {
          localStorage.removeItem(AUTH_KEY);
        } catch {}
        setAuthed(false);
      }}
    />
  );
}

function Login({ onSuccess }: { onSuccess: () => void }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    setTimeout(() => {
      if (user.trim() === AUTH_USER && pass === AUTH_PASS) {
        try {
          localStorage.setItem(AUTH_KEY, "1");
        } catch {}
        onSuccess();
      } else {
        setErr("Usuário ou senha inválidos.");
        setLoading(false);
      }
    }, 250);
  };

  return (
    <div className="min-h-screen bg-black text-foreground font-mono flex items-center justify-center px-4">
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          background:
            "radial-gradient(ellipse at top, rgba(59,130,246,0.15), transparent 60%), radial-gradient(ellipse at bottom, rgba(16,185,129,0.10), transparent 60%)",
        }}
      />
      <form
        onSubmit={submit}
        className="relative w-full max-w-sm rounded-2xl border border-[#4a4a4a] bg-black/80 backdrop-blur p-8 shadow-2xl"
      >
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10 border border-blue-500/40">
            <Lock className="h-5 w-5 text-blue-400" />
          </div>
          <h1 className="mt-4 text-lg font-semibold tracking-tight">
            Trading Dashboard
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">Acesso restrito</p>
        </div>

        <div className="mt-6 space-y-3">
          <label className="block">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Usuário
            </span>
            <div className="mt-1 flex items-center gap-2 rounded-lg border border-[#4a4a4a] bg-black px-3 py-2 focus-within:border-blue-500 transition-colors">
              <User className="h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                autoComplete="username"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                placeholder="seu usuário"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Senha
            </span>
            <div className="mt-1 flex items-center gap-2 rounded-lg border border-[#4a4a4a] bg-black px-3 py-2 focus-within:border-blue-500 transition-colors">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <input
                type={show ? "text" : "password"}
                autoComplete="current-password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {show ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </label>
        </div>

        {err && (
          <div className="mt-3 rounded-lg border border-red-500/40 bg-red-500/5 px-3 py-2 text-xs text-red-400">
            {err}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-5 w-full rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-600 disabled:opacity-60"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>

        <p className="mt-4 text-center text-[10px] text-muted-foreground">
          Fonte: BingX · GBP/JPY
        </p>
      </form>
    </div>
  );
}

const SYMBOL = "NCFXGBP2JPY-USDT";
const DISPLAY_SYMBOL = "GBP/JPY";
const API_URL = `/api/ticker?symbol=${SYMBOL}`;
const POLL_MS = 30000;
const BACKOFF_MS = 5 * 60 * 1000;

const ATR14_REFERENCE_LEVELS = [0.51, 0.5, 0.4, 0.35, 0.31] as const;

type Kline = {
  open: number;
  high: number;
  low: number;
  close: number;
  time: number;
};
type MAs = { ma20: number; ma99: number };
type TFData = {
  mas: MAs | null;
  atr14: number | null;
  lastClosedCandle?: Kline | null;
  stale?: boolean;
  error?: string | null;
};

function ema(values: number[], period: number): number[] {
  const out: number[] = new Array(values.length).fill(NaN);
  if (values.length < period) return out;
  const k = 2 / (period + 1);
  // Seed: SMA of first `period` values — matches TradingView / Pine Script behaviour
  let sum = 0;
  for (let i = 0; i < period; i++) sum += values[i];
  let prev = sum / period;
  out[period - 1] = prev;
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

function sma(values: number[], period: number): number[] {
  const out: number[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out.push(sum / period);
    else out.push(NaN);
  }
  return out;
}

function rma(values: number[], period: number): number[] {
  const out: number[] = new Array(values.length).fill(NaN);
  if (values.length < period) return out;
  let sum = 0;
  for (let i = 0; i < period; i++) sum += values[i];
  let prev = sum / period;
  out[period - 1] = prev;
  for (let i = period; i < values.length; i++) {
    prev = (prev * (period - 1) + values[i]) / period;
    out[i] = prev;
  }
  return out;
}

// Raw EMA — "Suavização da linha" in BingX/TradingView is visual only, the legend value is pure EMA
function computeEMA(closes: number[], period: number): number | null {
  if (closes.length < period) return null;
  const e = ema(closes, period);
  const last = e[e.length - 1];
  return Number.isFinite(last) ? last : null;
}

function computeATR14(klines: Kline[]): number | null {
  if (klines.length < 15) return null;
  const trs: number[] = [];
  for (let i = 1; i < klines.length; i++) {
    const h = klines[i].high;
    const l = klines[i].low;
    const pc = klines[i - 1].close;
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  const r = rma(trs, 14);
  const last = r[r.length - 1];
  return Number.isFinite(last) ? last : null;
}

// ADX de Wilder com DI length 14 e suavização ADX 14.
// Usa todos os candles recebidos, incluindo a vela 2H atualmente em formação.
function computeADX14(klines: Kline[]): number | null {
  const period = 14;
  if (klines.length < period * 2 + 1) return null;

  const trueRanges: number[] = [];
  const plusDMs: number[] = [];
  const minusDMs: number[] = [];

  for (let i = 1; i < klines.length; i++) {
    const current = klines[i];
    const previous = klines[i - 1];
    const upMove = current.high - previous.high;
    const downMove = previous.low - current.low;

    trueRanges.push(
      Math.max(
        current.high - current.low,
        Math.abs(current.high - previous.close),
        Math.abs(current.low - previous.close),
      ),
    );
    plusDMs.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDMs.push(downMove > upMove && downMove > 0 ? downMove : 0);
  }

  let smoothedTR = 0;
  let smoothedPlusDM = 0;
  let smoothedMinusDM = 0;
  const dxValues: number[] = [];

  for (let i = 0; i < trueRanges.length; i++) {
    if (i < period) {
      smoothedTR += trueRanges[i];
      smoothedPlusDM += plusDMs[i];
      smoothedMinusDM += minusDMs[i];
      if (i !== period - 1) continue;
    } else {
      smoothedTR = smoothedTR - smoothedTR / period + trueRanges[i];
      smoothedPlusDM = smoothedPlusDM - smoothedPlusDM / period + plusDMs[i];
      smoothedMinusDM =
        smoothedMinusDM - smoothedMinusDM / period + minusDMs[i];
    }

    const plusDI = smoothedTR > 0 ? (100 * smoothedPlusDM) / smoothedTR : 0;
    const minusDI = smoothedTR > 0 ? (100 * smoothedMinusDM) / smoothedTR : 0;
    const diSum = plusDI + minusDI;
    dxValues.push(diSum > 0 ? (100 * Math.abs(plusDI - minusDI)) / diSum : 0);
  }

  if (dxValues.length < period) return null;

  let adx =
    dxValues.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
  for (let i = period; i < dxValues.length; i++) {
    adx = (adx * (period - 1) + dxValues[i]) / period;
  }

  return Number.isFinite(adx) ? adx : null;
}

// klines = all candles including forming; closedKlines = forming candle excluded (for ATR)
function processTF(klines: Kline[], closedKlines: Kline[]): TFData {
  const closes = klines.map((k) => k.close);
  return {
    mas: {
      ma20: computeEMA(closes, 20) ?? NaN,
      ma99: computeEMA(closes, 99) ?? NaN,
    },
    atr14: computeATR14(closedKlines), // ATR usa só candles fechados (sem distorção da vela atual)
  };
}

type TickerData = {
  price: number;
  ask: number | null;
  bid: number | null;
  spread: number | null;
  changePct: number;
  ts: number;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function mergeTFData(previous: TFData | null, next: TFData): TFData {
  const nextMa20 = next.mas?.ma20;
  const nextMa99 = next.mas?.ma99;
  const previousMa20 = previous?.mas?.ma20;
  const previousMa99 = previous?.mas?.ma99;
  const ma20 = isFiniteNumber(nextMa20)
    ? nextMa20
    : isFiniteNumber(previousMa20)
      ? previousMa20
      : null;
  const ma99 = isFiniteNumber(nextMa99)
    ? nextMa99
    : isFiniteNumber(previousMa99)
      ? previousMa99
      : null;

  return {
    mas: ma20 != null || ma99 != null ? { ma20: ma20 ?? NaN, ma99: ma99 ?? NaN } : null,
    atr14: isFiniteNumber(next.atr14)
      ? next.atr14
      : isFiniteNumber(previous?.atr14)
        ? previous!.atr14
        : null,
    lastClosedCandle:
      next.lastClosedCandle ?? previous?.lastClosedCandle ?? null,
    stale: false,
    error: null,
  };
}

function FiltroCard({
  title,
  cardId,
  rows,
}: {
  title: string;
  cardId: string;
  rows: string[];
}) {
  const [open, setOpen] = useState<boolean[]>(rows.map(() => false));
  const [notes, setNotes] = useState<string[]>(rows.map(() => ""));
  const timersRef = useRef<(ReturnType<typeof setTimeout> | null)[]>(
    rows.map(() => null),
  );

  useEffect(() => {
    rows.forEach((_, i) => {
      fetch(`/api/notes/${cardId}_${i}`)
        .then((r) => r.json())
        .then((data: { content?: string }) => {
          setNotes((prev) => {
            const next = [...prev];
            next[i] = data.content ?? "";
            return next;
          });
        })
        .catch(() => {});
    });
    return () => {
      timersRef.current.forEach((t) => t && clearTimeout(t));
    };
  }, [cardId]);

  const handleChange = (i: number, value: string) => {
    setNotes((prev) => {
      const next = [...prev];
      next[i] = value;
      return next;
    });
    if (timersRef.current[i]) clearTimeout(timersRef.current[i]!);
    timersRef.current[i] = setTimeout(() => {
      fetch(`/api/notes/${cardId}_${i}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: value }),
      }).catch(() => {});
    }, 1000);
  };

  const toggleRow = (i: number) => {
    setOpen((prev) => {
      const next = [...prev];
      next[i] = !next[i];
      return next;
    });
  };

  return (
    <div className="rounded-2xl border border-[#4a4a4a] bg-black p-4 shadow-sm">
      <div className="mb-3 text-sm font-bold tracking-widest text-cyan-400">
        {title}
      </div>
      <div className="space-y-2">
        {rows.map((label, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-lg border border-[#2a2a2a] bg-[#0d1117]"
          >
            <button
              className="flex w-full items-center justify-between px-3 py-2.5 text-left"
              onClick={() => toggleRow(i)}
            >
              <span className="text-xs font-mono tracking-wider text-cyan-400">
                {label}
              </span>
              <ChevronDown
                className={`h-4 w-4 flex-shrink-0 text-gray-500 transition-transform duration-200 ${open[i] ? "rotate-180" : ""}`}
              />
            </button>
            {open[i] && (
              <textarea
                className="w-full resize-none border-t border-[#2a2a2a] bg-transparent px-3 py-2 text-xs text-gray-300 placeholder-gray-600 focus:outline-none"
                rows={4}
                value={notes[i]}
                onChange={(e) => handleChange(i, e.target.value)}
                placeholder="Anotações..."
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Index({ onLogout }: { onLogout: () => void }) {
  const [pendingTrade, setPendingTrade] = useState<{
    title: string;
    type: string;
    signal?: StrategySignal;
  } | null>(null);
  const [data, setData] = useState<TickerData | null>(null);
  const [prevPrice, setPrevPrice] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [vix, setVix] = useState<number | null>(null);
  const [vixLoading, setVixLoading] = useState(true);
  const [vixError, setVixError] = useState<string | null>(null);
  const [adx2h, setAdx2h] = useState<number | null>(null);
  const [adxLoading, setAdxLoading] = useState(true);
  const [utcOffset, setUtcOffset] = useState<0 | 1>(1);
  const [now, setNow] = useState<Date | null>(null);
  const [tf2h, setTf2h] = useState<TFData | null>(null);
  const [tf4h, setTf4h] = useState<TFData | null>(null);
  const [atr2hPrevious, setAtr2hPrevious] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const entrada2hRef = useRef<HTMLDivElement>(null);
  const radarCardRef = useRef<HTMLDivElement>(null);
  const marketBannerRef = useRef<HTMLDivElement>(null);
  const marketBannerWrapperRef = useRef<HTMLDivElement>(null);
  const macroVolatilityRef = useRef<HTMLDivElement>(null);
  const [marketBannerShift, setMarketBannerShift] = useState(0);
  const [entrada2hHeight, setEntrada2hHeight] = useState(0);

  useEffect(() => {
    const el = entrada2hRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setEntrada2hHeight(entry.borderBoxSize[0].blockSize);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    const alignMarketBanner = () => {
      const macroBottom =
        macroVolatilityRef.current?.getBoundingClientRect().bottom;
      const banner = marketBannerRef.current;
      const wrapper = marketBannerWrapperRef.current;
      if (macroBottom == null || !banner || !wrapper) return;

      const currentTransform = wrapper.style.transform;
      wrapper.style.transform = "translateY(0px)";
      const naturalBannerTop = banner.getBoundingClientRect().top;
      wrapper.style.transform = currentTransform;
      setMarketBannerShift(Math.round(macroBottom - naturalBannerTop));
    };

    alignMarketBanner();
    const resizeObserver = new ResizeObserver(alignMarketBanner);
    if (macroVolatilityRef.current)
      resizeObserver.observe(macroVolatilityRef.current);
    if (radarCardRef.current) resizeObserver.observe(radarCardRef.current);
    window.addEventListener("resize", alignMarketBanner);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", alignMarketBanner);
    };
  }, []);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const fetchTicker = async () => {
      try {
        const res = await fetch(API_URL, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (json?.code && json.code !== 0) {
          throw new Error(json.msg || `Erro ${json.code}`);
        }
        const d = json?.data;
        if (!d || !d.lastPrice) throw new Error("Resposta inválida da API");
        const price = Number(d.lastPrice);
        if (!isFiniteNumber(price) || price <= 0) {
          throw new Error("Preço inválido recebido da API");
        }
        const ask = Number(d.askPrice);
        const bid = Number(d.bidPrice);
        const changePct = Number(d.priceChangePercent);
        const ts = Number(d.closeTime);
        if (cancelled) return false;
        setData((curr) => {
          const validAsk = isFiniteNumber(ask) && ask > 0 ? ask : curr?.ask ?? null;
          const validBid = isFiniteNumber(bid) && bid > 0 ? bid : curr?.bid ?? null;
          const spread =
            validAsk != null && validBid != null && validAsk >= validBid
              ? validAsk - validBid
              : curr?.spread ?? null;
          const next: TickerData = {
            price,
            ask: validAsk,
            bid: validBid,
            spread,
            changePct: isFiniteNumber(changePct) ? changePct : curr?.changePct ?? 0,
            ts: isFiniteNumber(ts) ? ts : curr?.ts ?? Date.now(),
          };
          if (curr && isFiniteNumber(curr.price)) setPrevPrice(curr.price);
          return next;
        });
        setLastUpdate(new Date());
        setError(null);
        return true;
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Erro desconhecido");
        return false;
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const fetchVix = async () => {
      try {
        const r = await fetch("/api/vix", { cache: "no-store" });
        const j = await r.json();
        if (!r.ok || !Number.isFinite(Number(j?.value))) {
          throw new Error(j?.error || "VIX indisponível");
        }
        if (!cancelled) {
          setVix(Number(j.value));
          setVixError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setVixError(e instanceof Error ? e.message : "VIX indisponível");
        }
      } finally {
        if (!cancelled) setVixLoading(false);
      }
    };

    const fetchKlines = async (
      interval: "2h" | "4h",
    ): Promise<{
      data: TFData | null;
      adx: number | null;
      atrPrevious: number | null;
      status: string | null;
    }> => {
      try {
        const r = await fetch(
          `/api/klines?symbol=${SYMBOL}&interval=${interval}&limit=500`,
          { cache: "no-store" },
        );
        const j = await r.json();
        if (j?.code && j.code !== 0) {
          return {
            data: null,
            adx: null,
            atrPrevious: null,
            status: `Mercado pausado (${j.code})`,
          };
        }
        const arr = (j?.data ?? []) as Array<{
          open: string;
          high: string;
          low: string;
          close: string;
          time: number;
        }>;
        if (!arr.length) {
          return {
            data: null,
            adx: null,
            atrPrevious: null,
            status: "Sem candles disponíveis",
          };
        }
        const allKs: Kline[] = arr
          .map((k) => ({
            open: Number(k.open),
            high: Number(k.high),
            low: Number(k.low),
            close: Number(k.close),
            time: Number(k.time),
          }))
          .sort((a, b) => a.time - b.time);

        // EMA inclui vela em formação (close = preço live); ATR usa só fechadas
        const closedKs = allKs.slice(0, -1);

        return {
          data: {
            ...processTF(allKs, closedKs),
            lastClosedCandle: closedKs.at(-1) ?? null,
          },
          adx: interval === "2h" ? computeADX14(allKs) : null,
          atrPrevious:
            interval === "2h" ? computeATR14(closedKs.slice(0, -1)) : null,
          status: null,
        };
      } catch (e) {
        return {
          data: null,
          adx: null,
          atrPrevious: null,
          status: "Erro de rede",
        };
      }
    };

    const fetchTFs = async () => {
      const [a, b] = await Promise.all([fetchKlines("2h"), fetchKlines("4h")]);
      if (cancelled) return { ok: false };
      if (isFiniteNumber(a.adx)) setAdx2h(a.adx);
      setAdxLoading(false);
      if (isFiniteNumber(a.atrPrevious)) setAtr2hPrevious(a.atrPrevious);
      if (a.data) {
        setTf2h((prev) => mergeTFData(prev, a.data!));
      } else {
        setTf2h((prev) =>
          prev
            ? { ...prev, stale: true }
            : { mas: null, atr14: null, stale: true },
        );
      }
      if (b.data) {
        setTf4h((prev) => mergeTFData(prev, b.data!));
      } else {
        setTf4h((prev) =>
          prev
            ? { ...prev, stale: true }
            : { mas: null, atr14: null, stale: true },
        );
      }
      return { ok: Boolean(a.data && b.data) };
    };

    const runCycle = async () => {
      const [tickerOk, tfRes] = await Promise.all([
        fetchTicker(),
        fetchTFs(),
        fetchVix(),
      ]);
      if (cancelled) return;
      const healthy = tickerOk && tfRes.ok;
      setPaused(!healthy);
      const delay = healthy ? POLL_MS : BACKOFF_MS;
      timeoutId = setTimeout(runCycle, delay);
    };

    runCycle();
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const direction: "up" | "down" | "flat" =
    data && prevPrice != null
      ? data.price > prevPrice
        ? "up"
        : data.price < prevPrice
          ? "down"
          : "flat"
      : "flat";

  const priceColor =
    direction === "up"
      ? "text-emerald-600"
      : direction === "down"
        ? "text-red-500"
        : "text-foreground";

  const londonClock = now
    ? new Date(now.getTime() + utcOffset * 3600_000)
        .toISOString()
        .substring(11, 19)
    : "--:--:--";

  const brasiliaDate = now
    ? new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(now)
    : "--/--/----";

  const spreadPips = data?.spread != null ? data.spread * 100 : null;

  void ATR14_REFERENCE_LEVELS;

  const marketOpen = !error && !paused;

  // ─── REGRA GLOBAL: ALINHAMENTO DE ABERTURA DE VELAS ────────────────────────
  // LONDRES UTC 0  → velas 2H/4H abrem em horas PARES  (00,02,04,06,08,10,...)
  // LONDRES UTC +1 → velas 2H/4H abrem em horas ÍMPARES (01,03,05,07,09,11,...)
  // isCandleOpenHour(londonHour, cycle) → true quando aquela hora de Londres
  // é um ponto de abertura de vela, respeitando o utcOffset ativo.
  const isCandleOpenHour = (londonHour: number, cycle: number): boolean =>
    (((londonHour - utcOffset) % cycle) + cycle) % cycle === 0;

  // Arrays com todos os horários de abertura de vela no dia (hora de Londres)
  const candleOpenHours2h = Array.from({ length: 24 }, (_, h) => h).filter(
    (h) => isCandleOpenHour(h, 2),
  );
  const candleOpenHours4h = Array.from({ length: 24 }, (_, h) => h).filter(
    (h) => isCandleOpenHour(h, 4),
  );

  void isCandleOpenHour;
  void candleOpenHours2h;
  void candleOpenHours4h;

  const nextCloseMs = (cycle: number): number | null => {
    if (!now) return null;
    const londonMs = now.getTime() + utcOffset * 3600_000;
    const ld = new Date(londonMs);
    const h = ld.getUTCHours();
    const offsetInCycle = (((h - utcOffset) % cycle) + cycle) % cycle;
    const baseHour = h - offsetInCycle;
    const baseLondonMs = Date.UTC(
      ld.getUTCFullYear(),
      ld.getUTCMonth(),
      ld.getUTCDate(),
      baseHour,
      0,
      0,
    );
    const nextLondonMs = baseLondonMs + cycle * 3600_000;
    return nextLondonMs - londonMs;
  };

  const fmtCountdown = (ms: number | null) => {
    if (ms == null || ms < 0) return "--:--:--";
    const total = Math.floor(ms / 1000);
    const h = String(Math.floor(total / 3600)).padStart(2, "0");
    const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
    const s = String(total % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  const closeIn2h = fmtCountdown(nextCloseMs(2));
  const closeIn4h = fmtCountdown(nextCloseMs(4));

  return (
    <div className="min-h-screen bg-black text-foreground font-mono">
      <div className="mx-auto w-full max-w-[1600px] px-[clamp(0.75rem,2vw,2rem)] pb-[clamp(1rem,2.5vh,2.5rem)] pt-[clamp(2.5rem,6vh,5rem)]">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-base font-semibold tracking-tight">
              Trading Dashboard
            </h1>
            <p className="text-xs text-muted-foreground">
              Fonte: BingX · Atualização a cada {POLL_MS / 1000}s
            </p>
          </div>

          <div className="flex items-center gap-3">
            <BotaoSomVix />
            <div className="rounded-xl border border-[#4a4a4a] bg-black px-4 py-2 text-center">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Data atual
              </div>
              <div
                className="text-2xl font-bold tabular-nums leading-tight"
                suppressHydrationWarning
              >
                {brasiliaDate}
              </div>
            </div>
            <div className="rounded-xl border border-[#4a4a4a] bg-black px-4 py-2 text-center">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Hora atual em Londres
              </div>
              <div
                className="text-2xl font-bold tabular-nums leading-tight"
                suppressHydrationWarning
              >
                {londonClock}
              </div>
            </div>
            <button
              onClick={() => setUtcOffset(0)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold leading-tight transition-colors ${
                utcOffset === 0
                  ? "bg-blue-600 text-Cyan-300"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              LONDRES
              <br />
              UTC 0
            </button>
            <button
              onClick={() => setUtcOffset(1)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold leading-tight transition-colors ${
                utcOffset === 1
                  ? "bg-blue-600 text-Cyan-300"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              LONDRES
              <br />
              UTC +1
            </button>
            <button
              onClick={onLogout}
              title="Sair"
              className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-red-600 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              SAIR
            </button>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div
            ref={radarCardRef}
            className="relative flex h-full min-h-[300px] flex-col overflow-hidden rounded-2xl border border-[#4a4a4a] bg-black p-6 shadow-sm"
          >
            {/* Radar artwork occupies only the area above the fixed bottom banner. */}
            <div
              className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center"
              aria-hidden="true"
            >
              <div
                className="relative opacity-95"
                style={{ width: "min(90%, 495px)", aspectRatio: "1 / 1" }}
              >
                500
                <img
                  src={radarBg}
                  alt=""
                  draggable={false}
                  className="absolute inset-0 h-full w-full select-none object-contain"
                  style={{ imageRendering: "auto" }}
                />
                <div className="radar-sweep absolute inset-0 h-full w-full" />
              </div>
            </div>

            <div className="relative z-10 flex min-h-0 flex-1 flex-col">
              <div className="flex items-baseline justify-between">
                <div className="text-base font-semibold">
                  <span className="text-emerald-500">{DISPLAY_SYMBOL}</span>{" "}
                  <span className="text-cyan-300 ">PERPETUAL</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      error ? "bg-red-500" : "bg-emerald-600 animate-pulse"
                    }`}
                  />
                  {error ? "Desconectado" : "Ao vivo"}
                </div>
              </div>

              <div className="mt-6 flex flex-1 items-start justify-between">
                <div>
                  {loading && !data ? (
                    <div className="h-12 w-48 animate-pulse rounded-md bg-muted" />
                  ) : (
                    <div
                      className={`font-bold tabular-nums transition-colors ${priceColor}`}
                      style={{ fontSize: "40px", lineHeight: 1.1 }}
                    >
                      {data ? data.price.toFixed(3) : "—"}
                    </div>
                  )}
                  {data && (
                    <div
                      className={`mt-1 text-base font-semibold tabular-nums ${
                        data.changePct >= 0
                          ? "text-emerald-600"
                          : "text-red-500"
                      }`}
                    >
                      {data.changePct >= 0 ? "+" : ""}
                      {data.changePct.toFixed(2)}%
                    </div>
                  )}
                </div>
                <div className="text-cyan-300 ">
                  <div className="text-2xl font-bold tracking-wide">SPREAD</div>
                  <div className="mt-1 text-xl font-semibold tabular-nums text-cyan-300">
                    {spreadPips != null ? spreadPips.toFixed(1) : "—"} pips
                  </div>
                </div>
              </div>
            </div>

            <div
              ref={marketBannerWrapperRef}
              className="relative z-10 mt-6 shrink-0"
              style={{ transform: `translateY(${marketBannerShift}px)` }}
            >
              <MarketStatusBanner
                open={marketOpen}
                bannerRef={marketBannerRef}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <MacroVolatilityCard
              vix={vix}
              loading={vixLoading}
              error={vixError}
              adx={adx2h}
              adxLoading={adxLoading}
              macroVolatilityRef={macroVolatilityRef}
            />
            <div className="grid grid-cols-2 gap-2">
              <ToposFundosCard />
              <CloseInCard title="2H FECHA EM" value={closeIn2h} />
            </div>
          </div>
        </section>
        <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ScannerCard
              divRef={entrada2hRef}
              atrAtual={tf2h?.atr14 ?? undefined}
              precoAtual={data?.price ?? undefined}
              valorMedia99={tf2h?.mas?.ma99 ?? undefined}
              onPatternChange={(report: string | null) =>
                setPendingTrade((current) =>
                  report
                    ? {
                        title: report,
                        type: "scanner",
                        signal: current?.signal,
                      }
                    : null,
                )
              }
              onStrategySignal={(signal) =>
                setPendingTrade(
                  signal
                    ? {
                        title: signal.report,
                        type: "scanner",
                        signal,
                      }
                    : null,
                )
              }
            />

            <TradingCard
              divRef={entrada2hRef}
              patternReport={pendingTrade?.title ?? null}
              strategySignal={pendingTrade?.signal}
              basePrice={data?.price ?? undefined}
              precoAtual={data?.price ?? null}
              atrAtual={tf2h?.atr14 ?? null}
              media20={tf2h?.mas?.ma20 ?? null}
              media99={tf2h?.mas?.ma99 ?? null}
              institutionalCandle={tf2h?.lastClosedCandle ?? null}
              onPendingChange={(pending) =>
                setPendingTrade((current) =>
                  pending
                    ? {
                        ...pending,
                        signal: current?.signal,
                      }
                    : null,
                )
              }
            />
          </div>

          <MediasAtrCard
            tf2h={tf2h}
            tf4h={tf4h}
            atr2hCurrent={tf2h?.atr14 ?? null}
            atr2hPrevious={atr2hPrevious}
          />
        </section>

        {/* Filtros — visível só com scroll */}
        <section className="mt-6 pb-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FiltroCard
              title="FILTRO 2H"
              cardId="filtro_2h"
              rows={[
                "2H",
                "COMO FUGIR DO INSTITUCIONAL",
                "VEM DE CIMA",
                "VEM DE BAIXO",
                "",
                "",
              ]}
            />
            <FiltroCard
              title="FILTRO 4H"
              cardId="filtro_4h"
              rows={["4H", "OLHAR O GBP USD", "COMPRA", "VENDA", "", ""]}
            />
            <div className="rounded-2xl border border-[#4a4a4a] bg-black p-5 flex flex-col h-full min-h-[220px] shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span
                  style={{ fontSize: "16px" }}
                  className="font-bold tracking-wider text-cyan-300 uppercase block"
                >
                  TRADE PENDENTE
                </span>
                <span className="text-[9px] font-mono px-2 py-0.5 bg-black/60 border border-cyan-500/30 text-cyan-300 rounded">
                  [Reserva Ativa]
                </span>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center text-center font-mono text-xs">
                {pendingTrade ? (
                  <span className="text-amber-400 font-bold">
                    [RESERVA ATIVA: {pendingTrade.title} - {pendingTrade.type}]
                  </span>
                ) : (
                  <span className="text-cyan-500/80">
                    [Aguardando estratégia em reserva...]
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function EntradaCard({
  title,
  divRef,
}: {
  title: string;
  divRef?: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={divRef}
      className="relative overflow-hidden rounded-2xl border border-[#4a4a4a] bg-black shadow-sm min-h-[160px]"
    >
      <img
        src={scannerbg}
        alt=""
        className="absolute inset-0 w-full h-full object-contain"
        draggable={false}
      />
      <div className="relative z-10 p-5">
        <div className="text-base font-semibold tracking-wide text-cyan-400">
          {title}
        </div>
      </div>
    </div>
  );
}

function MaValue({ ma20, ma99 }: { ma20: number; ma99: number }) {
  const valid20 = Number.isFinite(ma20);
  const valid99 = Number.isFinite(ma99);
  const bg =
    !valid20 || !valid99
      ? "bg-muted text-muted-foreground"
      : ma20 > ma99
        ? "bg-blue-500/90 text-white"
        : "bg-red-500/90 text-white";
  return (
    <div className="space-y-1 text-sm tabular-nums">
      <div className="flex flex-row flex-nowrap items-center justify-between gap-2 whitespace-nowrap">
        <span className="text-yellow-400 whitespace-nowrap">MÉDIA 99:</span>
        <span className="font-semibold text-yellow-400 whitespace-nowrap">
          {valid99 ? ma99.toFixed(3) : "N/A"}
        </span>
      </div>
      <div className="flex flex-row flex-nowrap items-center justify-between gap-2 whitespace-nowrap">
        <span className="text-red-500 whitespace-nowrap">MÉDIA 20:</span>
        <span
          className={`rounded px-2 py-0.5 font-semibold whitespace-nowrap ${bg}`}
        >
          {valid20 ? ma20.toFixed(3) : "N/A"}
        </span>
      </div>
    </div>
  );
}

function MediasAtrCard({
  tf2h,
  tf4h,
  atr2hCurrent,
  atr2hPrevious,
}: {
  tf2h: TFData | null;
  tf4h: TFData | null;
  atr2hCurrent: number | null;
  atr2hPrevious: number | null;
}) {
  const renderBody = (tf: TFData | null) => {
    const ma20 = tf?.mas?.ma20 ?? NaN;
    const ma99 = tf?.mas?.ma99 ?? NaN;
    return <MaValue ma20={ma20} ma99={ma99} />;
  };

  return (
    <div className="rounded-2xl border border-[#4a4a4a] bg-black p-5 shadow-sm">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
        <div>
          <div className="text-center text-base font-semibold text-cyan-300 ">
            MÉDIAS MÓVEIS
          </div>
          <div className="mt-3 space-y-4">
            <div className="rounded-xl border border-[#4a4a4a] p-3">
              <div className="mb-4 text-base font-semibold text-cyan-300 ">
                GRÁFICO 2H
              </div>
              {renderBody(tf2h)}
            </div>
            <div className="rounded-xl border border-[#4a4a4a] p-3">
              <div className="mb-4 text-base font-semibold text-cyan-300 ">
                GRÁFICO 4H
              </div>
              {renderBody(tf4h)}
            </div>
          </div>
        </div>

        <div>
          <div className="text-center text-base font-semibold text-cyan-300 ">
            ATR
          </div>
          <div className="mt-3 space-y-4">
            <AtrCard
              title="ATR 2H"
              atr={atr2hCurrent}
              status="ATUAL"
              statusColor="green"
            />
            <AtrCard
              title="ATR 2H"
              atr={atr2hPrevious}
              status="ANTERIOR"
              statusColor="red"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function AtrCard({
  title,
  atr,
  status,
  statusColor,
}: {
  title: string;
  atr: number | null;
  status: "ATUAL" | "ANTERIOR";
  statusColor: "green" | "red";
}) {
  return (
    <div className="rounded-xl border border-[#4a4a4a] bg-black p-3 text-center">
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex-1" />
        <div
          className={`flex items-center gap-1.5 text-[10px] font-bold ${
            statusColor === "green" ? "text-emerald-600" : "text-red-500"
          }`}
        >
          <span
            className={`h-2.5 w-2.5 rounded-full border-2 ${
              statusColor === "green"
                ? "border-emerald-600 bg-emerald-600"
                : "border-red-500 bg-red-500"
            }`}
          />
          {status}
        </div>
      </div>
      <div className="mt-1.5 text-base font-semibold text-cyan-300 ">
        {title}
      </div>
      <div className="mt-1.75 text-3xl font-bold tabular-nums text-blue-600">
        {atr != null ? atr.toFixed(3) : "—"}
      </div>
    </div>
  );
}

function MarketStatusBanner({
  open,
  bannerRef,
}: {
  open: boolean;
  bannerRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const label = open ? "MERCADO ABERTO" : "MERCADO FECHADO";
  const Icon = open ? ThumbsUp : ThumbsDown;
  return (
    <div
      ref={bannerRef}
      className={`mt-4 flex items-center justify-center gap-3 rounded-xl border px-4 py-3 ${
        open
          ? "border-emerald-600/60 bg-emerald-600/5 text-emerald-600"
          : "border-red-600/60 bg-red-600/5 text-red-600"
      }`}
    >
      <Icon className="h-6 w-6" />
      <span className="text-base font-bold tracking-wider">{label}</span>
    </div>
  );
}

function CloseInCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#4a4a4a] bg-black p-5 shadow-sm text-center">
      <div className="text-xs font-semibold uppercase tracking-wider text-blue-400">
        {title}
      </div>
      <div className="mt-2 text-2xl font-bold tabular-nums text-foreground">
        {value}
      </div>
    </div>
  );
}

function ToposFundosCard() {
  return (
    <div className="rounded-2xl border border-[#4a4a4a] bg-black p-5 shadow-sm text-center">
      <div className="text-xs font-semibold uppercase tracking-wider text-blue-400">
        TOPOS/FUNDOS 2H
      </div>
      <div className="relative mt-2 grid h-8 grid-cols-2">
        <div aria-label="Área para fundo 2H" />
        <div aria-label="Área para topo 2H" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[#4a4a4a]"
        />
      </div>
    </div>
  );
}

function MacroVolatilityCard({
  vix,
  loading,
  error,
  adx,
  adxLoading,
  macroVolatilityRef,
}: {
  vix: number | null;
  loading: boolean;
  error: string | null;
  adx: number | null;
  adxLoading: boolean;
  macroVolatilityRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const diagnostic =
    vix == null
      ? null
      : vix < 20
        ? {
            className: "border-emerald-600/70 bg-emerald-600 text-black",
            text: "DIAGNÓSTICO OPERACIONAL: MERCADO TÉCNICO CALMO. VOLATILIDADE MACRO EM NÍVEIS NORMAIS. COMPORTAMENTO DO PREÇO PREVISÍVEL E OSCILAÇÕES DENTRO DO ESPERADO. RISCO SISTÊMICO BAIXO.",
          }
        : vix <= 30
          ? {
              className: "border-yellow-300/70 bg-yellow-300 text-black",
              text: "DIAGNÓSTICO OPERACIONAL: ATENÇÃO.AUMENTO DE VOLATILIDADE MACRO DETECTADO. MAIOR PROPENSÃO A FALSOS ROMPIMENTOS. OPERE COM GERENCIAMENTO RIGOROSO.",
            }
          : {
              className: "border-red-600/70 bg-red-600 text-black",
              text: "DIAGNÓSTICO OPERACIONAL: ALTO RISCO. VOLATILIDADE EXTREMA NOS MERCADOS MACROS. MOVIMENTOS ATÍPICOS E RUÍDOS ELEVADOS. RECOMENDADO REDUZIR A MÃO OU AGUARDAR NORMALIZAÇÃO.",
            };

  const barPercent =
    vix == null ? 0 : Math.min(100, Math.max(0, (vix / 40) * 100));
  const barClass =
    vix == null
      ? "bg-[#4a4a4a]"
      : vix < 20
        ? "bg-emerald-600"
        : vix <= 30
          ? "bg-yellow-300"
          : "bg-red-500";

  const adxState =
    adx == null
      ? null
      : adx < 20
        ? { label: "LATERAL", fillPercent: 0 }
        : adx <= 25
          ? { label: "INÍCIO", fillPercent: 30 }
          : adx <= 40
            ? { label: "FORTE", fillPercent: 60 }
            : { label: "MUITO FORTE", fillPercent: 100 };

  return (
    <div
      ref={macroVolatilityRef}
      className="relative overflow-hidden rounded-2xl border border-[#4a4a4a] bg-black p-3 shadow-sm"
    >
      <div className="relative z-10 text-center text-base font-bold tracking-widest text-cyan-300 ">
        VOLATILIDADE MACRO
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="rounded-2xl border border-[#4a4a4a] bg-black p-4">
          <div className="text-center text-base font-bold text-cyan-300 ">
            VIX (S&amp;P 500)
          </div>
          <div className="mt-3 text-center text-4xl font-bold tabular-nums text-emerald-600">
            {loading && vix == null ? "—" : vix != null ? vix.toFixed(2) : "—"}
          </div>
          <div className="mt-4">
            <div className="h-3 overflow-hidden rounded-full bg-[#4a4a4a]">
              <div
                className={`h-full rounded-full transition-[width,background-color] duration-500 ${barClass}`}
                style={{ width: `${barPercent}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[10px] font-semibold text-muted-foreground">
              <span>0</span>
              <span>40</span>
            </div>
          </div>
          {error && (
            <div className="mt-2 text-center text-[10px] text-red-400">
              VIX indisponível
            </div>
          )}
        </div>

        <div className="relative flex min-h-[110px] items-center justify-center overflow-hidden">
          <img
            src={royalLondon}
            alt=""
            aria-hidden="true"
            className="pointer-events-none h-[110px] w-auto object-contain object-center"
            style={{ opacity: 1.95 }}
          />
        </div>

        <div className="min-h-[110px]  rounded-2xl border border-[#4a4a4a] bg-black p-4">
          <div className="text-center text-base font-bold text-cyan-300">
            ADX (2H)
          </div>
          <div className="mt-3 text-center text-4xl font-bold tabular-nums text-emerald-600">
            {adxLoading && adx == null
              ? "—"
              : adx != null
                ? adx.toFixed(2)
                : "—"}
          </div>
          <div className="mt-4">
            <div className="h-3 overflow-hidden rounded-full bg-[#4a4a4a]">
              <div
                className="h-full rounded-full bg-emerald-600 transition-[width] duration-500"
                style={{ width: `${adxState?.fillPercent ?? 0}%` }}
              />
            </div>
            <div className="mt-1 text-center text-[10px] font-semibold text-muted-foreground">
              {adxState?.label ?? "—"}
            </div>
          </div>
        </div>
      </div>

      <div
        className={`relative z-10 mt-5 rounded-2xl border px-5 py-4 text-center text-xs font-bold leading-relaxed transition-colors duration-500 ${diagnostic?.className ?? "border-[#4a4a4a] bg-[#101217] text-muted-foreground"}`}
      >
        {diagnostic?.text ??
          "DIAGNÓSTICO OPERACIONAL: AGUARDANDO LEITURA DO VIX."}
      </div>
    </div>
  );
}

export default function App() {
  return <Gate />;
}
