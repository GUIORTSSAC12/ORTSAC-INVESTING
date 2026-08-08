import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ThumbsDown, ThumbsUp, Lock, User, LogOut, Eye, EyeOff, ChevronDown } from "lucide-react";
import radarBg from "./assets/radar-bg.jpeg";
import royalLondon from "./assets/royal-london.jpeg";
import entradasBg from "./assets/entradas-bg.jpeg";

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
          <h1 className="mt-4 text-lg font-semibold tracking-tight">Trading Dashboard</h1>
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
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>
        </div>

        {err && (
          <div className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/5 px-3 py-2 text-xs text-rose-400">
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

type Kline = { open: number; high: number; low: number; close: number; time: number };
type MAs = { ma20: number; ma99: number };
type TFData = { mas: MAs | null; atr14: number | null; stale?: boolean; error?: string | null };

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

// klines = all candles including forming; closedKlines = forming candle excluded (for ATR)
function processTF(klines: Kline[], closedKlines: Kline[]): TFData {
  const closes = klines.map((k) => k.close);
  return {
    mas: {
      ma20: computeEMA(closes, 20) ?? NaN,
      ma99: computeEMA(closes, 99) ?? NaN,
    },
    atr14: computeATR14(closedKlines),  // ATR usa só candles fechados (sem distorção da vela atual)
  };
}

type TickerData = {
  price: number;
  ask: number;
  bid: number;
  spread: number;
  changePct: number;
  ts: number;
};

function FiltroCard({ title, cardId, rows }: { title: string; cardId: string; rows: string[] }) {
  const [open, setOpen] = useState<boolean[]>(rows.map(() => false));
  const [notes, setNotes] = useState<string[]>(rows.map(() => ""));
  const timersRef = useRef<(ReturnType<typeof setTimeout> | null)[]>(rows.map(() => null));

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
      <div className="mb-3 text-sm font-bold tracking-widest text-cyan-400">{title}</div>
      <div className="space-y-2">
        {rows.map((label, i) => (
          <div key={i} className="overflow-hidden rounded-lg border border-[#2a2a2a] bg-[#0d1117]">
            <button
              className="flex w-full items-center justify-between px-3 py-2.5 text-left"
              onClick={() => toggleRow(i)}
            >
              <span className="text-xs font-mono tracking-wider text-cyan-400">{label}</span>
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
  const [data, setData] = useState<TickerData | null>(null);
  const [prevPrice, setPrevPrice] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [vix, setVix] = useState<number | null>(null);
  const [vixLoading, setVixLoading] = useState(true);
  const [vixError, setVixError] = useState<string | null>(null);
  const [utcOffset, setUtcOffset] = useState<0 | 1>(1);
  const [now, setNow] = useState<Date | null>(null);
  const [tf2h, setTf2h] = useState<TFData | null>(null);
  const [tf4h, setTf4h] = useState<TFData | null>(null);
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
      const macroBottom = macroVolatilityRef.current?.getBoundingClientRect().bottom;
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
    if (macroVolatilityRef.current) resizeObserver.observe(macroVolatilityRef.current);
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
        const ask = Number(d.askPrice ?? 0);
        const bid = Number(d.bidPrice ?? 0);
        const next: TickerData = {
          price: Number(d.lastPrice ?? 0),
          ask,
          bid,
          spread: ask - bid,
          changePct: Number(d.priceChangePercent ?? 0),
          ts: Number(d.closeTime ?? Date.now()),
        };
        if (cancelled) return false;
        setData((curr) => {
          if (curr) setPrevPrice(curr.price);
          return next;
        });
        setLastUpdate(new Date());
        setError(null);
        return true;
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Erro desconhecido");
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
    ): Promise<{ data: TFData | null; status: string | null }> => {
      try {
        const r = await fetch(
          `/api/klines?symbol=${SYMBOL}&interval=${interval}&limit=500`,
          { cache: "no-store" },
        );
        const j = await r.json();
        if (j?.code && j.code !== 0) {
          return { data: null, status: `Mercado pausado (${j.code})` };
        }
        const arr = (j?.data ?? []) as Array<{
          open: string;
          high: string;
          low: string;
          close: string;
          time: number;
        }>;
        if (!arr.length) {
          return { data: null, status: "Sem candles disponíveis" };
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


        return { data: processTF(allKs, closedKs), status: null };
      } catch (e) {
        return { data: null, status: "Erro de rede" };
      }
    };

    const fetchTFs = async () => {
      const [a, b] = await Promise.all([fetchKlines("2h"), fetchKlines("4h")]);
      if (cancelled) return { ok: false };
      if (a.data) {
        setTf2h(a.data);
      } else {
        setTf2h((prev) =>
          prev ? { ...prev, stale: true } : { mas: null, atr14: null, stale: true },
        );
      }
      if (b.data) {
        setTf4h(b.data);
      } else {
        setTf4h((prev) =>
          prev ? { ...prev, stale: true } : { mas: null, atr14: null, stale: true },
        );
      }
      return { ok: Boolean(a.data && b.data) };
    };

    const runCycle = async () => {
      const [tickerOk, tfRes] = await Promise.all([fetchTicker(), fetchTFs(), fetchVix()]);
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
      ? "text-emerald-400"
      : direction === "down"
        ? "text-rose-400"
        : "text-foreground";

  const londonClock = now
    ? new Date(now.getTime() + utcOffset * 3600_000).toISOString().substring(11, 19)
    : "--:--:--";

  const brasiliaDate = now
    ? new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(now)
    : "--/--/----";

  const spreadPips = data ? data.spread * 100 : 0;

  void ATR14_REFERENCE_LEVELS;

  const marketOpen = !error && !paused;

  // ─── REGRA GLOBAL: ALINHAMENTO DE ABERTURA DE VELAS ────────────────────────
  // LONDRES UTC 0  → velas 2H/4H abrem em horas PARES  (00,02,04,06,08,10,...)
  // LONDRES UTC +1 → velas 2H/4H abrem em horas ÍMPARES (01,03,05,07,09,11,...)
  // isCandleOpenHour(londonHour, cycle) → true quando aquela hora de Londres
  // é um ponto de abertura de vela, respeitando o utcOffset ativo.
  const isCandleOpenHour = (londonHour: number, cycle: number): boolean =>
    ((londonHour - utcOffset) % cycle + cycle) % cycle === 0;

  // Arrays com todos os horários de abertura de vela no dia (hora de Londres)
  const candleOpenHours2h = Array.from({ length: 24 }, (_, h) => h).filter((h) =>
    isCandleOpenHour(h, 2),
  );
  const candleOpenHours4h = Array.from({ length: 24 }, (_, h) => h).filter((h) =>
    isCandleOpenHour(h, 4),
  );

  void isCandleOpenHour;
  void candleOpenHours2h;
  void candleOpenHours4h;

  const nextCloseMs = (cycle: number): number | null => {
    if (!now) return null;
    const londonMs = now.getTime() + utcOffset * 3600_000;
    const ld = new Date(londonMs);
    const h = ld.getUTCHours();
    const offsetInCycle = ((h - utcOffset) % cycle + cycle) % cycle;
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
            <h1 className="text-base font-semibold tracking-tight">Trading Dashboard</h1>
            <p className="text-xs text-muted-foreground">
              Fonte: BingX · Atualização a cada {POLL_MS / 1000}s
            </p>
          </div>

          <div className="flex items-center gap-3">
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
                  ? "bg-blue-500 text-white"
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
                  ? "bg-blue-500 text-white"
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
              className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-rose-400 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              SAIR
            </button>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div
            ref={radarCardRef}
            className="dashboard-radar-short relative flex h-full flex-col overflow-hidden rounded-2xl border border-[#4a4a4a] bg-black p-8 shadow-sm"
          >
            {/* Radar artwork occupies only the area above the fixed bottom banner. */}
            <div className="pointer-events-none absolute inset-0 bottom-[82px] overflow-hidden">
              <img
                src={radarBg}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-contain object-center"
                style={{
                  transform: "scale(1.15)",
                  opacity: 0.75,
                  border: "none",
                  outline: "none",
                }}
              />

              {/* Radar sweep beam — its pivot follows the reserved artwork area. */}
              <div
                aria-hidden="true"
                className="absolute inset-0 overflow-hidden"
                style={{
                  borderRadius: "inherit",
                  transformOrigin: "50% 50%",
                  animation: "radar-sweep 5s linear infinite",
                  background:
                    "conic-gradient(from 0deg at 50% 50%, transparent 0deg, transparent 315deg, rgba(0,220,255,0.03) 328deg, rgba(0,220,255,0.13) 342deg, rgba(0,220,255,0.48) 356deg, rgba(0,220,255,0.9) 360deg)",
                  mixBlendMode: "screen",
                }}
              />
            </div>

            <div className="relative z-10 flex min-h-0 flex-1 flex-col">
              <div className="flex items-baseline justify-between">
                <div className="text-base font-semibold">
                  <span className="text-emerald-400">{DISPLAY_SYMBOL}</span>{" "}
                  <span className="text-muted-foreground">PERPETUAL</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      error ? "bg-rose-500" : "bg-emerald-500 animate-pulse"
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
                        data.changePct >= 0 ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {data.changePct >= 0 ? "+" : ""}
                      {data.changePct.toFixed(2)}%
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold tracking-wide">SPREAD</div>
                  <div className="mt-1 text-xl font-semibold tabular-nums text-foreground">
                    {data ? spreadPips.toFixed(1) : "—"} pips
                  </div>
                </div>
              </div>
            </div>

            <div
              ref={marketBannerWrapperRef}
              className="relative z-10 mt-6 shrink-0"
              style={{ transform: `translateY(${marketBannerShift}px)` }}
            >
              <MarketStatusBanner open={marketOpen} bannerRef={marketBannerRef} />
            </div>
          </div>

          <div className="dashboard-secondary-lift flex flex-col gap-6">
             <MacroVolatilityCard
               vix={vix}
               loading={vixLoading}
               error={vixError}
               macroVolatilityRef={macroVolatilityRef}
             />
            <div className="grid grid-cols-2 gap-4">
              <CloseInCard title="2H FECHA EM" value={closeIn2h} />
              <CloseInCard title="4H FECHA EM" value={closeIn4h} />
            </div>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <EntradaCard title="ENTRADAS 2H" divRef={entrada2hRef} />
            <EntradaCard title="ENTRADAS 4H" />
          </div>

          <div className="space-y-4">
            <MediasMoveisCard tf2h={tf2h} tf4h={tf4h} />
            <div className="grid grid-cols-2 gap-4">
              <AtrCard title="ATR 2H" atr={tf2h?.atr14 ?? null} />
              <AtrCard title="ATR 4H" atr={tf4h?.atr14 ?? null} />
            </div>
          </div>
        </section>

        {/* Filtros — visível só com scroll */}
        <section className="mt-6 pb-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FiltroCard
              title="FILTRO 2H"
              cardId="filtro_2h"
              rows={["2H", "COMO FUGIR DO INSTITUCIONAL", "VEM DE CIMA", "VEM DE BAIXO", "", ""]}
            />
            <FiltroCard
              title="FILTRO 4H"
              cardId="filtro_4h"
              rows={["4H", "OLHAR O GBP USD", "COMPRA", "VENDA", "", ""]}
            />
            <div className="rounded-2xl border border-[#4a4a4a] bg-black p-5 shadow-sm min-h-[200px]" />
          </div>
        </section>

      </div>
    </div>
  );
}

function EntradaCard({ title, divRef }: { title: string; divRef?: React.RefObject<HTMLDivElement | null> }) {
  return (
    <div
      ref={divRef}
      className="relative overflow-hidden rounded-2xl border border-[#4a4a4a] bg-black shadow-sm min-h-[120px]"
    >
      <img
        src={entradasBg}
        alt=""
        className="absolute inset-0 w-full h-full object-contain"
        draggable={false}
      />
      <div className="relative z-10 p-5">
        <div className="text-base font-semibold tracking-wide text-cyan-400">{title}</div>
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
        : "bg-rose-500/90 text-white";
  return (
    <div className="space-y-1 text-sm tabular-nums">
      <div className="flex flex-row flex-nowrap items-center justify-between gap-2 whitespace-nowrap">
        <span className="text-yellow-400 whitespace-nowrap">EMA 99:</span>
        <span className="font-semibold text-yellow-400 whitespace-nowrap">
          {valid99 ? ma99.toFixed(3) : "N/A"}
        </span>
      </div>
      <div className="flex flex-row flex-nowrap items-center justify-between gap-2 whitespace-nowrap">
        <span className="text-rose-400 whitespace-nowrap">EMA 20:</span>
        <span className={`rounded px-2 py-0.5 font-semibold whitespace-nowrap ${bg}`}>
          {valid20 ? ma20.toFixed(3) : "N/A"}
        </span>
      </div>
    </div>
  );
}

function MediasMoveisCard({ tf2h, tf4h }: { tf2h: TFData | null; tf4h: TFData | null }) {
  const renderBody = (tf: TFData | null) => {
    const ma20 = tf?.mas?.ma20 ?? NaN;
    const ma99 = tf?.mas?.ma99 ?? NaN;
    return <MaValue ma20={ma20} ma99={ma99} />;
  };

  return (
    <div className="rounded-2xl border border-[#4a4a4a] bg-black p-5 shadow-sm">
      <div className="text-base font-semibold text-muted-foreground text-center">
        MÉDIAS MÓVEIS
      </div>
      <div className="mt-3 grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-[#4a4a4a] p-3">
          <div className="mb-2 text-base font-semibold text-foreground">GRÁFICO 2H</div>
          {renderBody(tf2h)}
        </div>
        <div className="rounded-xl border border-[#4a4a4a] p-3">
          <div className="mb-2 text-base font-semibold text-foreground">GRÁFICO 4H</div>
          {renderBody(tf4h)}
        </div>
      </div>
    </div>
  );
}

function AtrCard({ title, atr }: { title: string; atr: number | null }) {
  return (
    <div className="rounded-2xl border border-[#4a4a4a] bg-black p-5 shadow-sm text-center">
      <div className="text-base font-semibold text-muted-foreground">{title}</div>
      <div className="mt-2 text-2xl font-bold tabular-nums text-blue-400">
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
          ? "border-emerald-500/60 bg-emerald-500/5 text-emerald-400"
          : "border-rose-500/60 bg-rose-500/5 text-rose-400"
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
      <div className="text-xs font-semibold uppercase tracking-wider text-blue-400">{title}</div>
      <div className="mt-2 text-2xl font-bold tabular-nums text-foreground">{value}</div>
    </div>
  );
}

function MacroVolatilityCard({
  vix,
  loading,
  error,
  macroVolatilityRef,
}: {
  vix: number | null;
  loading: boolean;
  error: string | null;
  macroVolatilityRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const diagnostic =
    vix == null
      ? null
      : vix < 20
        ? {
            className: "border-emerald-400/70 bg-emerald-400 text-black",
            text: "DIAGNÓSTICO OPERACIONAL: MERCADO TÉCNICO CALMO. Volatilidade macro em níveis normais. Comportamento do preço previsível e oscilações dentro do esperado. Risco sistêmico baixo.",
          }
        : vix <= 30
          ? {
              className: "border-yellow-300/70 bg-yellow-300 text-black",
              text: "DIAGNÓSTICO OPERACIONAL: ATENÇÃO. Aumento de volatilidade macro detectado. Maior propensão a falsos rompimentos. Opere com gerenciamento rigoroso.",
            }
          : {
              className: "border-rose-400/70 bg-rose-500 text-black",
              text: "DIAGNÓSTICO OPERACIONAL: ALTO RISCO. Volatilidade extrema nos mercados macros. Movimentos atípicos e ruídos elevados. Recomendado reduzir a mão ou aguardar normalização.",
            };

  const barPercent = vix == null ? 0 : Math.min(100, Math.max(0, (vix / 40) * 100));
  const barClass =
    vix == null
      ? "bg-[#4a4a4a]"
      : vix < 20
        ? "bg-emerald-400"
        : vix <= 30
          ? "bg-yellow-300"
          : "bg-rose-500";

  return (
    <div
      ref={macroVolatilityRef}
      className="relative overflow-hidden rounded-2xl border border-[#4a4a4a] bg-black p-5 shadow-sm"
    >
      <div className="relative z-10 text-center text-base font-bold tracking-widest text-foreground">
        VOLATILIDADE MACRO
      </div>

      <div className="relative z-10 mt-5 grid grid-cols-1 items-stretch gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(7rem,0.72fr)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-[#4a4a4a] bg-[#0b0d12] p-4">
          <div className="text-center text-base font-bold text-foreground">VIX (S&amp;P 500)</div>
          <div className="mt-3 text-center text-4xl font-bold tabular-nums text-emerald-400">
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
          {error && <div className="mt-2 text-center text-[10px] text-rose-400">VIX indisponível</div>}
        </div>

        <div className="relative flex min-h-[160px] items-center justify-center overflow-hidden">
          <img
            src={royalLondon}
            alt=""
            aria-hidden="true"
            className="pointer-events-none h-full w-full object-contain object-center"
            style={{ opacity: 0.75 }}
          />
        </div>

        <div
          aria-hidden="true"
          className="min-h-[160px] rounded-2xl border border-[#4a4a4a] bg-black"
        />
      </div>

      <div
        className={`relative z-10 mt-5 rounded-2xl border px-5 py-4 text-center text-xs font-bold leading-relaxed transition-colors duration-500 ${diagnostic?.className ?? "border-[#4a4a4a] bg-[#101217] text-muted-foreground"}`}
      >
        {diagnostic?.text ?? "DIAGNÓSTICO OPERACIONAL: AGUARDANDO LEITURA DO VIX."}
      </div>
    </div>
  );
}


export default function App() {
  return <Gate />;
}
