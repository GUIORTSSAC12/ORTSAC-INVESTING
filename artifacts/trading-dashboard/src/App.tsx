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
import Minigrafico from "./components/Minigrafico";
import SaldoTaxaMargem from "./components/saldotaxamargem";
import { GestaoDeRisco } from "./components/GestaoDeRisco";
import { MediasAtrCard } from "./components/Monitor";

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
            ORTSAC INVESTING
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

function processTF(klines: Kline[], closedKlines: Kline[]): TFData {
  const closes = klines.map((k) => k.close);
  return {
    mas: {
      ma20: computeEMA(closes, 20) ?? NaN,
      ma99: computeEMA(closes, 99) ?? NaN,
    },
    atr14: computeATR14(closedKlines),
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
    mas:
      ma20 != null || ma99 != null
        ? { ma20: ma20 ?? NaN, ma99: ma99 ?? NaN }
        : null,
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
  const [queuedTrade, setQueuedTrade] = useState<{
    title: string;
    type: string;
  } | null>(null);

  // Estado para armazenar a validação selecionada
  const [selectedValidation, setSelectedValidation] = useState<string | null>(
    null,
  );

  const [zonaValor, setZonaValor] = useState(() => localStorage.getItem("zona_1s_valor") || "210.410");

  useEffect(() => {
    const atualizarZona = () => {
      setZonaValor(localStorage.getItem("zona_1s_valor") || "210.410");
      try {
        const audio = new AudioContext();
        const osc = audio.createOscillator();
        osc.frequency.value = 880;
        osc.connect(audio.destination);
        osc.start();
        setTimeout(() => osc.stop(), 150);
      } catch (e) {}
    };
    window.addEventListener("zona_1s_atualizada", atualizarZona);
    return () => window.removeEventListener("zona_1s_atualizada", atualizarZona);
  }, []);

  // ==========================================
  // 1. ADICIONADO: Gatilho para forçar o fetch imediato
  // ==========================================
  const [forceFetchTrigger, setForceFetchTrigger] = useState<number>(0);

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
  // Lê o UTC salvo no navegador ao iniciar (padrão é 1 se não houver nada salvo)
const [utcOffset, setUtcOffset] = useState<0 | 1>(() => {
  try {
    const salvo = localStorage.getItem("utc_offset");
    return salvo !== null ? (Number(salvo) as 0 | 1) : 1;
  } catch {
    return 1;
  }
});

// Função para alterar e salvar instantaneamente no localStorage
const handleMudarUtc = (offset: 0 | 1) => {
  setUtcOffset(offset);
  try {
    localStorage.setItem("utc_offset", String(offset));
  } catch (err) {}
};
  const [now, setNow] = useState<Date | null>(null);
  const [tf2h, setTf2h] = useState<TFData | null>(null);
  const [candles2H, setCandles2H] = useState<Kline[]>([]);
  const [tf4h, setTf4h] = useState<TFData | null>(null);
  const [candles4h, setCandles4H] = useState<Kline[]>([]);
  const [candles5h, setCandles5h] = useState<Kline[]>([]);
  const [candles1s, setCandles1s] = useState<Kline[]>([]); // Adicionado para o Semanal (1S)

  // ==========================================
  // AGORA SIM: O useEffect fica aqui embaixo, depois do candles1s existir!
  // ==========================================
  useEffect(() => {
    if (!candles1s || candles1s.length < 2) return;

    const ultimo1s = candles1s.at(-2);
    if (!ultimo1s) return;

    const abertura = ultimo1s.open ?? 0;
    const maxima = ultimo1s.high ?? 0;
    const minima = ultimo1s.low ?? 0;
    const fechamento = ultimo1s.close ?? 0;

    const amplitude = maxima - minima;
    const isAlta = fechamento >= abertura;
    const zonaCalculada = isAlta 
      ? minima + (amplitude * 0.786) 
      : maxima - (amplitude * 0.786);

    try {
      const valorFormatado = zonaCalculada.toFixed(3);
      if (localStorage.getItem("zona_1s_valor") !== valorFormatado) {
        localStorage.setItem("zona_1s_valor", valorFormatado);
        window.dispatchEvent(new CustomEvent("zona_1s_atualizada"));
      }
    } catch (e) {}
  }, [candles1s]);

  // Lê do localStorage ao iniciar (suporta '4H', '5H' ou '1S')
  const [visao, setVisao] = useState<string>(() => {
    try {
      const salvo = localStorage.getItem("status_visao_ativo");
      return salvo !== null ? JSON.parse(salvo) : '4H';
    } catch {
      return '4H';
    }
  });

  // Salva automaticamente no localStorage sempre que alternar os botões
  useEffect(() => {
    try {
      localStorage.setItem("status_visao_ativo", JSON.stringify(visao));
    } catch (err) {}
  }, [visao]);

  // Atualizado para salvar o fechamento correto (4H, 5H ou 1S) com base no modo ativo
  useEffect(() => {
    const candlesAtivos = visao === '5H' ? candles5h : (visao === '1S' ? candles1s : candles4h);
    const fechamentoAnterior = candlesAtivos?.at(-2)?.close;
    
    if (fechamentoAnterior !== undefined && fechamentoAnterior !== null) {
      try {
        const chave = visao === '5H' ? "ultimo_5h_fechamento" : (visao === '1S' ? "ultimo_1s_fechamento" : "ultimo_4h_fechamento");
        localStorage.setItem(chave, String(fechamentoAnterior));
      } catch (err) {}
    }
  }, [candles4h, candles5h, candles1s, visao]);

  const [atr2hPrevious, setAtr2hPrevious] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const entrada2hRef = useRef<HTMLDivElement>(null);
  const radarCardRef = useRef<HTMLDivElement>(null);
  const marketBannerRef = useRef<HTMLDivElement>(null);
  const marketBannerWrapperRef = useRef<HTMLDivElement>(null);
  const macroVolatilityRef = useRef<HTMLDivElement>(null);
  const [marketBannerShift, setMarketBannerShift] = useState(0);
  const [entrada2hHeight, setEntrada2hHeight] = useState(0);
  const [tradeMinigrafico, setTradeMinigrafico] = useState<any>(null);
  const [ptaxVenda, setPtaxVenda] = useState("--");

  useEffect(() => {
    // Busca direto da API oficial do Banco Central (Série 1: Dólar PTAX Venda)
    fetch("https://api.bcb.gov.br/dados/serie/bcdata.sgs.1/dados/ultimos/1?formato=json")
      .then((res) => res.json())
      .then((dados) => {
        if (dados && dados.length > 0) {
          // Converte o valor para o padrão brasileiro (ex: R$ 5,0521)
          const valorNumerico = parseFloat(dados[0].valor);
          const valorFormatado = "R$ " + valorNumerico.toFixed(4).replace(".", ",");

          setPtaxVenda(valorFormatado);
        }
      })
      .catch((err) => console.error("Erro ao buscar Ptax da API:", err));
  }, []);
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
      // Adicionei um "+ 20" (ou o valor que preferir) logo aqui no topo natural do banner:
      const naturalBannerTop = banner.getBoundingClientRect().top - 24;
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

  // ==========================================
  // 3. ADICIONADO: Observa o cronômetro para zerar o atraso na hora
  // ==========================================

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
          const validAsk =
            isFiniteNumber(ask) && ask > 0 ? ask : (curr?.ask ?? null);
          const validBid =
            isFiniteNumber(bid) && bid > 0 ? bid : (curr?.bid ?? null);
          const spread =
            validAsk != null && validBid != null && validAsk >= validBid
              ? validAsk - validBid
              : (curr?.spread ?? null);
          const next: TickerData = {
            price,
            ask: validAsk,
            bid: validBid,
            spread,
            changePct: isFiniteNumber(changePct)
              ? changePct
              : (curr?.changePct ?? 0),
            ts: isFiniteNumber(ts) ? ts : (curr?.ts ?? Date.now()),
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
    interval: "2h" | "4h" | "5h" | "1w",
  ): Promise<{
    data: TFData | null;
    adx: number | null;
    atrPrevious: number | null;
    status: string | null;
  }> => {
    try {
      // Se for 5h usa 1h, se for 1w usa 1w com limit=520 conforme a regra
      const apiInterval = interval === "5h" ? "1h" : interval;
      const limitMax = interval === "1w" ? 520 : 500;

      const r = await fetch(
        `/api/klines?symbol=${SYMBOL}&interval=${apiInterval}&limit=${limitMax}`,
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
      let allKs: Kline[] = arr
        .map((k) => ({
          open: Number(k.open),
          high: Number(k.high),
          low: Number(k.low),
          close: Number(k.close),
          time: Number(k.time),
        }))
        .sort((a, b) => a.time - b.time);

     // Se o intervalo pedido for 5h, agrupamos os candles de 1h respeitando a janela assimétrica da corretora (BingX)
      if (interval === "5h") {
        const blocos5hMap = new Map<number, Kline>();
        allKs.forEach(c => {
          const dataCandle = new Date(c.time);
          const horaUTC = dataCandle.getUTCHours();
          const ano = dataCandle.getUTCFullYear();
          const mes = dataCandle.getUTCMonth();
          const dia = dataCandle.getUTCDate();

          let blocoStartHour = 12;
          let offsetDias = 0;

          // Define o início do bloco conforme a regra exata da corretora:
          if (horaUTC >= 12 && horaUTC < 16) {
            blocoStartHour = 12; // Bloco especial de 4 horas (12:00 - 16:00)
          } else if (horaUTC >= 16 && horaUTC < 21) {
            blocoStartHour = 16; // 5 horas (16:00 - 21:00)
          } else if (horaUTC >= 21 || horaUTC < 2) {
            blocoStartHour = 21; // 5 horas (21:00 - 02:00)
            if (horaUTC < 2) {
              offsetDias = -1; // Horas 00:00 e 01:00 pertencem ao bloco que começou no dia anterior às 21:00
            }
          } else if (horaUTC >= 2 && horaUTC < 7) {
            blocoStartHour = 2;  // 5 horas (02:00 - 07:00)
          } else if (horaUTC >= 7 && horaUTC < 12) {
            blocoStartHour = 7;  // 5 horas (07:00 - 12:00)
          }

          const dataAbertura = new Date(Date.UTC(ano, mes, dia + offsetDias, blocoStartHour, 0, 0, 0));
          const chaveTempo = dataAbertura.getTime();

          if (!blocos5hMap.has(chaveTempo)) {
            blocos5hMap.set(chaveTempo, {
              time: chaveTempo,
              open: c.open,
              high: c.high,
              low: c.low,
              close: c.close,
            });
          } else {
            const bloco = blocos5hMap.get(chaveTempo)!;
            bloco.high = Math.max(bloco.high, c.high);
            bloco.low = Math.min(bloco.low, c.low);
            bloco.close = c.close; // Atualiza com o fechamento do candle de 1h mais recente do bloco
          }
        });
        allKs = Array.from(blocos5hMap.values()).sort((a, b) => a.time - b.time);
        setCandles5h(allKs);
      }

      if (interval === "4h") {
        setCandles4H(allKs);
      }

      // Salva os candles semanais (1S / 1W) no estado correspondente
      if (interval === "1w") {
        setCandles1s(allKs);
      }

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
    const [a, b, c5, w1] = await Promise.all([
      fetchKlines("2h"), 
      fetchKlines("4h"), 
      fetchKlines("5h"),
      fetchKlines("1w"), // <-- Adicionado para buscar o semanal (1S) com 520 candles
    ]);
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
    return { ok: Boolean(a.data && b.data && c5.data) };
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
  }, [forceFetchTrigger]); // <--- 2. ADICIONADO AQUI: Reseta o ciclo e busca na hora quando o gatilho muda

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

  const marketOpen = !error && data !== null;
  
  const isCandleOpenHour = (londonHour: number, cycle: number): boolean =>
    (((londonHour - utcOffset) % cycle) + cycle) % cycle === 0;

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

  // Calcula direto o próximo fechamento de 4 horas, sem acréscimo de segundos
  const rawMs = nextCloseMs(4) ?? 0;
  const closeIn4h = fmtCountdown(rawMs);

  return (
    <div className="min-h-screen bg-black text-foreground font-mono">
      <div className="mx-auto w-full max-w-[1600px] px-[clamp(0.75rem,2vw,2rem)] pb-[clamp(1rem,2.5vh,2.5rem)] pt-[clamp(2.5rem,6vh,5rem)]">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
  <div>
    <h1 className="text-base font-semibold tracking-tight">
      ORTSAC INVESTING
    </h1>
    <p className="text-xs text-muted-foreground">
      Fonte: BingX · Atualização a cada {POLL_MS / 1000}s
    </p>
  </div>

  <div className="flex items-center gap-3">
    {/* 1. Botão do Som */}
    <BotaoSomVix />

    {/* 2. CARD ANUAL (Mesmo tamanho/estilo da Ptax) */}
    <div className="rounded-xl border border-[#4a4a4a] bg-black p-2.5 min-w-[130px] flex flex-col items-center justify-center">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground text-center">
        ANUAL
      </div>
      <div className={`text-2xl font-bold tabular-nums leading-none mt-1 text-center ${
        !(localStorage.getItem("variacoes_pct_anual") || "").includes("-")
          ? "text-emerald-600"
          : "text-red-600"
      }`}>
        {localStorage.getItem("variacoes_pct_anual") || "0.00%"}
      </div>
    </div>

    {/* 3. Card Ptax */}
    <div className="rounded-xl border border-[#4a4a4a] bg-black p-2.5 min-w-[130px] flex flex-col items-center justify-center">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground text-center">
        Ptax
      </div>
      <div className="text-2xl font-bold tabular-nums leading-none mt-1 text-center">
        {ptaxVenda}
      </div>
    </div>

    {/* 4. Data Atual */}
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

    {/* 5. Hora Atual em Londres */}
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

    {/* Botões de UTC Londres e Sair */}
    <button
    onClick={() => handleMudarUtc(0)}
    className={`rounded-lg px-3 py-2 text-xs font-semibold leading-tight transition-colors ${
      utcOffset === 0
        ? "bg-blue-600 text-cyan-300"
        : "bg-secondary text-muted-foreground hover:text-foreground"
    }`}
  >
    LONDRES
    <br />
    UTC 0
  </button>

  <button
    onClick={() => handleMudarUtc(1)}
    className={`rounded-lg px-3 py-2 text-xs font-semibold leading-tight transition-colors ${
      utcOffset === 1
        ? "bg-blue-600 text-cyan-300"
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
            <div
              className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center"
              aria-hidden="true"
            >
              <div
                className="relative opacity-95"
                style={{ width: "min(90%, 495px)", aspectRatio: "1 / 1" }}
              >
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
  
  <div className="flex flex-col gap-2 w-full">
    {/* O card principal expandido de ponta a ponta com SL, Taxa, Stop e Gain */}
    <div className="w-full">
      <SaldoTaxaMargem />
    </div>

    {/* SEÇÃO GUARDADA PARA O CRONÔMETRO (Descomente e use quando for colocar de volta) */}
    {/* 
    <div className="grid grid-cols-2 gap-2">
      <CloseInCard title="4H FECHA EM" value={closeIn4h} />
    </div> 
    */}
  </div>
</div>
        </section>
        <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2 items-start">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ScannerCard
              divRef={entrada2hRef}
              selectedValidation={selectedValidation}
              precoAtual={data?.price ?? undefined}
              onPatternChange={(report: string | null) => {
                if (!report) {
                  setSelectedValidation(null);
                  setPendingTrade(null);
                  return;
                }

                // Trava para só disparar a escadinha se o preço realmente tocou
                if (report.includes("TOCADO NO ALVO")) {
                  setPendingTrade((current) => ({
                    title: report,
                    type: "scanner",
                    signal: current?.signal,
                  }));

                  // Pega direto do localStorage para garantir que o nível ativo não se perca
                  const validationAtiva = localStorage.getItem(
                    "scanner_active_validation",
                  );

                  if (validationAtiva) {
                    const cleanValidation = validationAtiva.toUpperCase();
                    const tipoPrefix = cleanValidation.startsWith("F")
                      ? "F"
                      : cleanValidation.startsWith("T")
                        ? "T"
                        : null;

                    if (tipoPrefix) {
                      // Ajustado estritamente para 4 níveis (1 até 4)
                      let valores = [
                        localStorage.getItem(`regioes_${tipoPrefix}1`) || "",
                        localStorage.getItem(`regioes_${tipoPrefix}2`) || "",
                        localStorage.getItem(`regioes_${tipoPrefix}3`) || "",
                        localStorage.getItem(`regioes_${tipoPrefix}4`) || "",
                      ];

                      const indexMatch = cleanValidation.match(/\d+/);
                      if (indexMatch) {
                        const targetIndex = parseInt(indexMatch[0]) - 1;

                        if (targetIndex >= 0 && targetIndex < valores.length) {
                          // Executa a escadinha: remove o nível atingido e empurra os de baixo para cima
                          valores.splice(targetIndex, 1);
                          valores.push(""); // Adiciona o espaço vazio no final (mantendo o limite de 4)

                          // Salva de volta no localStorage com as chaves corretas de 1 a 4
                          valores.forEach((val, i) => {
                            localStorage.setItem(
                              `regioes_${tipoPrefix}${i + 1}`,
                              val,
                            );
                          });

                          // Limpa a validação ativa do storage após subir a escadinha
                          localStorage.removeItem("scanner_active_validation");

                          // Dispara os eventos para atualizar a tela na mesma aba
                          window.dispatchEvent(new Event("storage"));
                          window.dispatchEvent(new Event("atualizar_regioes"));
                        }
                      }
                    }
                  }

                  // Limpa a validação ativa da tela
                  setSelectedValidation(null);
                } else {
                  setPendingTrade(null);
                }
              }}
            />
            <TradingCard
              divRef={entrada2hRef as any}
              patternReport={pendingTrade?.title ?? null}
              strategySignal={pendingTrade?.signal}
              basePrice={
                (pendingTrade as any)?.entry ??
                (pendingTrade as any)?.price ??
                undefined
              }
              precoAtual={data?.price ?? null}
            />
          </div>

         <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
  <div className="relative border border-[#4a4a4a] bg-black rounded-xl p-2 flex flex-col shadow-lg text-white font-mono w-full h-auto min-h-[360px]">

    <div className="flex items-center justify-between mb-2 px-1">
  {/* Título limpo à esquerda */}
  <h3 className="text-cyan-400 font-bold text-[16px] tracking-wider uppercase">
    GBP/JPY
  </h3>

  {/* Bloco de controles à direita */}
  <div className="flex items-start space-x-2">
    {/* Botão Cíclico 4H / 5H / 1S posicionado exatamente à esquerda do botão Z */}
    <button
      type="button"
      onClick={() => {
        setVisao(prev => {
          if (prev === '4H') return '5H';
          if (prev === '5H') return '1S';
          return '4H';
        });
      }}
      className="px-2 py-0.5 rounded border border-cyan-400/60 bg-cyan-950/40 text-cyan-400 hover:bg-cyan-500 hover:text-gray-950 transition-all font-bold text-xs cursor-pointer shadow mt-0.5"
      title="Alternar Timeframe (4H / 5H / 1S)"
    >
      {visao}
    </button>

    {/* Botão Z */}
    <button
      onClick={() => {
        localStorage.setItem("mensal_percentual_acumulado", "0.00");
        window.dispatchEvent(new Event("storage"));
      }}
      className="px-2 py-0.5 rounded border border-blue-600 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white transition-all font-bold text-xs cursor-pointer shadow mt-0.5"
      title="Zerar acumulador mensal"
    >
      Z
    </button>

    {/* Coluna do Botão de Menos */}
    <div className="flex flex-col space-y-1">
      <button
        onClick={() => {
          const atual = parseFloat(localStorage.getItem("mensal_percentual_acumulado") || "0");
          const novo = Math.round((atual - 0.10) * 100) / 100;
          localStorage.setItem("mensal_percentual_acumulado", novo.toFixed(2));
          window.dispatchEvent(new Event("storage"));
        }}
        className="px-2 py-0.5 rounded border border-red-600 bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white transition-all font-bold text-xs cursor-pointer shadow mt-0.5"
        title="Subtrair 0.10%"
      >
        -
      </button>

      <button
        onClick={() => {
          const atual = parseFloat(localStorage.getItem("mensal_percentual_acumulado") || "0");
          const novo = Math.round((atual - 0.05) * 100) / 100;
          localStorage.setItem("mensal_percentual_acumulado", novo.toFixed(2));
          window.dispatchEvent(new Event("storage"));
        }}
        className="px-2 py-0.5 rounded border border-red-600 bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white transition-all font-bold text-xs cursor-pointer shadow"
        title="Subtrair 0.05%"
      >
        -
      </button>
    </div>

    {/* BLOCO CENTRAL: PERCENTUAIS + VALOR DA ZONA SEMANAL ALINHADO */}
    <div className="flex flex-col items-center leading-none">
      {/* Primeiro Percentual (Acumulado) */}
      <span className={`font-bold text-[24px] tabular-nums leading-none tracking-tight ${
        (parseFloat(localStorage.getItem("mensal_percentual_acumulado") || "0")) >= 0 ? "text-emerald-600" : "text-red-600"
      }`}>
        {(() => {
          const val = parseFloat(localStorage.getItem("mensal_percentual_acumulado") || "0");
          return `${val > 0 ? "+" : ""}${val.toFixed(2)}%`;
        })()}
      </span>

      {/* Segundo Percentual (-1.59%) */}
      <span className={`font-bold text-[24px] tabular-nums leading-none mt-1 ${
        !(localStorage.getItem("variacoes_pct_mes") || "").includes("-") ? "text-emerald-600" : "text-red-600"
      }`}>
        {localStorage.getItem("variacoes_pct_mes") || "+0.00%"}
      </span>

      {/* VALOR DA ZONA SEMANAL (EMPURRADO PARA BAIXO COM MT-1, MESMO TAMANHO E COR CIANO) */}
      <span className="font-bold text-[24px] tabular-nums leading-none mt-1 text-cyan-400 tracking-tight">
  {zonaValor}
</span>
    </div>

    {/* Coluna do Botão de Mais */}
    <div className="flex flex-col space-y-1">
      <button
        onClick={() => {
          const atual = parseFloat(localStorage.getItem("mensal_percentual_acumulado") || "0");
          const novo = Math.round((atual + 0.10) * 100) / 100;
          localStorage.setItem("mensal_percentual_acumulado", novo.toFixed(2));
          window.dispatchEvent(new Event("storage"));
        }}
        className="px-2 py-0.5 rounded border border-emerald-600 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white transition-all font-bold text-xs cursor-pointer shadow mt-0.5"
        title="Adicionar 0.10%"
      >
        +
      </button>

      <button
        onClick={() => {
          const atual = parseFloat(localStorage.getItem("mensal_percentual_acumulado") || "0");
          const novo = Math.round((atual + 0.05) * 100) / 100;
          localStorage.setItem("mensal_percentual_acumulado", novo.toFixed(2));
          window.dispatchEvent(new Event("storage"));
        }}
        className="px-2 py-0.5 rounded border border-emerald-600 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white transition-all font-bold text-xs cursor-pointer shadow"
        title="Adicionar 0.05%"
      >
        +
      </button>
    </div>
  </div>
</div>

<div className="flex-1 min-h-0">
 <Minigrafico
  precoAtual={data?.price ?? null}
  candles4h={candles4h}
  candles5h={candles5h}
  candles1s={candles1s}   // <-- Passa o array semanal
  visao={visao}            // <-- Passa o estado ('4H', '5H', '1S')
  tradeAtivo={tradeMinigrafico}
/>
</div>
  </div>

  <MediasAtrCard />
</div>
</section>
        
<section className="mt-6 pb-8">
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <div className="rounded-2xl border border-[#4a4a4a] bg-black p-4 flex flex-col h-full min-h-[220px] shadow-lg font-mono">
      <div className="flex items-center justify-between mb-3">
        <span
          style={{ fontSize: "16px" }}
          className="font-bold tracking-wider text-cyan-300 uppercase block"
        >
          VARIAÇÕES
        </span>

        <button
          id="variacoes_toggle_visibility"
          type="button"
          onClick={() => {
            const anualInput = document.getElementById("variacoes_anual_input") as HTMLInputElement;
            const mesInput = document.getElementById("variacoes_saldo_mes_input") as HTMLInputElement;
            const atualInput = document.getElementById("variacoes_saldo_atual_input") as HTMLInputElement;
            const lucroEl = document.getElementById("variacoes_lucro");
            const eyeIcon = document.getElementById("variacoes_eye_icon");

            const estaOculto = anualInput?.value === "****";

            if (estaOculto) {
              // MOSTRAR VALORES EM DINHEIRO
              if (anualInput) anualInput.value = localStorage.getItem("variacoes_anual") || "12.95";
              if (mesInput) mesInput.value = localStorage.getItem("variacoes_saldo_mes") || "8.81";
              if (atualInput) atualInput.value = localStorage.getItem("gestao_saldo_interno") || "0.00";
              if (lucroEl) lucroEl.textContent = localStorage.getItem("variacoes_lucro_valor") || "+0.00";

              if (eyeIcon) {
                eyeIcon.innerHTML = `
                  <path d="M2 12C2 12 5.5 5 12 5C18.5 5 22 12 22 12C22 12 18.5 19 12 19C5.5 19 2 12 2 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
                `;
              }
            } else {
              // OCULTAR VALORES EM DINHEIRO (ANUAL, MÊS, ATUAL E LUCRO)
              if (anualInput) anualInput.value = "****";
              if (mesInput) mesInput.value = "****";
              if (atualInput) atualInput.value = "****";
              if (lucroEl) lucroEl.textContent = "****";

              if (eyeIcon) {
                eyeIcon.innerHTML = `
                  <path d="M2 12C2 12 5.5 5 12 5C18.5 5 22 12 22 12C22 12 18.5 19 12 19C5.5 19 2 12 2 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
                  <path d="M4 4L20 20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                `;
              }
            }
          }}
          className="text-cyan-300 hover:text-white transition-colors flex items-center justify-center"
          title="Mostrar ou ocultar saldos"
          aria-label="Mostrar ou ocultar saldos"
        >
          <svg
            id="variacoes_eye_icon"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M2 12C2 12 5.5 5 12 5C18.5 5 22 12 22 12C22 12 18.5 19 12 19C5.5 19 2 12 2 12Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle
              cx="12"
              cy="12"
              r="3"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-between">
        <div className="grid grid-cols-2 gap-2 w-full">

          {/* Coluna 1: ANUAL, SALDO DO MÊS e SALDO ATUAL empilhados */}
          <div className="flex flex-col gap-2">

            <div className="flex flex-col items-center">
              <span style={{ fontSize: "18px" }} className="text-cyan-300 font-bold uppercase tracking-wider mb-1 text-center">ANUAL</span>
              <div className="w-full bg-black/80 border border-[#4a4a4a] rounded-xl p-2 flex items-center justify-center text-center shadow">
                <input 
                  id="variacoes_anual_input"
                  type="text" 
                  defaultValue={localStorage.getItem("variacoes_anual") || "12.95"}
                  onChange={(e) => {
                    const val = e.target.value;
                    localStorage.setItem("variacoes_anual", val);

                    const anual = parseFloat(val.replace(",", ".")) || 0;
                    const mes = parseFloat((localStorage.getItem("variacoes_saldo_mes") || "8.81").replace(",", ".")) || 0;
                    const atual = parseFloat((localStorage.getItem("gestao_saldo_interno") || "0").replace(",", ".")) || 0;
                    
                    // O MÊS AGORA É O MANDANTE NAS FÓRMULAS
                    const pctAnual = anual !== 0 ? ((mes - anual) / anual) * 100 : 0;
                    const pctMes = atual !== 0 ? ((mes - atual) / atual) * 100 : 0;
                    const lucro = Number((mes - atual).toFixed(2));

                    const strPctAnual = `${pctAnual >= 0 ? "+" : ""}${pctAnual.toFixed(2)}%`;
                    const strPctMes = `${pctMes >= 0 ? "+" : ""}${pctMes.toFixed(2)}%`;
                    const strLucro = `${lucro >= 0 ? "+" : ""}${lucro.toFixed(2)}`;

                    localStorage.setItem("variacoes_pct_anual", strPctAnual);
                    localStorage.setItem("variacoes_pct_mes", strPctMes);
                    localStorage.setItem("variacoes_lucro_valor", strLucro);
                    
                    const anualEl = document.getElementById("variacoes_anual_pct");
                    const mesEl = document.getElementById("variacoes_mes_pct");
                    const lucroEl = document.getElementById("variacoes_lucro");
                    
                    if (anualEl) {
                      anualEl.textContent = strPctAnual;
                      anualEl.className = `font-bold tracking-wide ${pctAnual >= 0 ? "text-emerald-600" : "text-red-600"}`;
                    }

                    if (mesEl) {
                      mesEl.textContent = strPctMes;
                      mesEl.className = `font-bold tracking-wide ${pctMes >= 0 ? "text-emerald-600" : "text-red-600"}`;
                    }

                    if (lucroEl && (document.getElementById("variacoes_anual_input") as HTMLInputElement)?.value !== "****") {
                      lucroEl.textContent = strLucro;
                      lucroEl.className = `font-bold tracking-wide ${lucro >= 0 ? "text-emerald-600" : "text-red-600"}`;
                    }
                  }}
                  className="w-full bg-transparent text-emerald-600 font-bold text-center focus:outline-none tabular-nums" 
                  style={{ fontSize: "24px" }} 
                  placeholder="0.00" 
                />
              </div>
            </div>

            <div className="flex flex-col items-center">
              <span style={{ fontSize: "18px" }} className="text-cyan-300 font-bold uppercase tracking-wider mb-1 text-center">SALDO DO MÊS</span>
              <div className="w-full bg-black/80 border border-[#4a4a4a] rounded-xl p-2 flex items-center justify-center text-center shadow">
                <input 
                  id="variacoes_saldo_mes_input"
                  type="text" 
                  defaultValue={localStorage.getItem("variacoes_saldo_mes") || "8.81"}
                  onChange={(e) => {
                    const val = e.target.value;
                    localStorage.setItem("variacoes_saldo_mes", val);

                    const anual = parseFloat((localStorage.getItem("variacoes_anual") || "12.95").replace(",", ".")) || 0;
                    const mes = parseFloat(val.replace(",", ".")) || 0;
                    const atual = parseFloat((localStorage.getItem("gestao_saldo_interno") || "0").replace(",", ".")) || 0;
                    
                    // O MÊS AGORA É O MANDANTE NAS FÓRMULAS
                    const pctAnual = anual !== 0 ? ((mes - anual) / anual) * 100 : 0;
                    const pctMes = atual !== 0 ? ((mes - atual) / atual) * 100 : 0;
                    const lucro = Number((mes - atual).toFixed(2));

                    const strPctAnual = `${pctAnual >= 0 ? "+" : ""}${pctAnual.toFixed(2)}%`;
                    const strPctMes = `${pctMes >= 0 ? "+" : ""}${pctMes.toFixed(2)}%`;
                    const strLucro = `${lucro >= 0 ? "+" : ""}${lucro.toFixed(2)}`;

                    localStorage.setItem("variacoes_pct_anual", strPctAnual);
                    localStorage.setItem("variacoes_pct_mes", strPctMes);
                    localStorage.setItem("variacoes_lucro_valor", strLucro);
                    
                    const anualEl = document.getElementById("variacoes_anual_pct");
                    const mesEl = document.getElementById("variacoes_mes_pct");
                    const lucroEl = document.getElementById("variacoes_lucro");
                    
                    if (anualEl) {
                      anualEl.textContent = strPctAnual;
                      anualEl.className = `font-bold tracking-wide ${pctAnual >= 0 ? "text-emerald-600" : "text-red-600"}`;
                    }

                    if (mesEl) {
                      mesEl.textContent = strPctMes;
                      mesEl.className = `font-bold tracking-wide ${pctMes >= 0 ? "text-emerald-600" : "text-red-600"}`;
                    }

                    if (lucroEl && (document.getElementById("variacoes_anual_input") as HTMLInputElement)?.value !== "****") {
                      lucroEl.textContent = strLucro;
                      lucroEl.className = `font-bold tracking-wide ${lucro >= 0 ? "text-emerald-600" : "text-red-600"}`;
                    }
                  }}
                  className="w-full bg-transparent text-emerald-600 font-bold text-center focus:outline-none tabular-nums" 
                  style={{ fontSize: "24px" }} 
                  placeholder="0.00" 
                />
              </div>
            </div>

            <div className="flex flex-col items-center">
              <span style={{ fontSize: "18px" }} className="text-cyan-300 font-bold uppercase tracking-wider mb-1 text-center">SALDO ATUAL</span>
              <div className="w-full bg-black/80 border border-[#4a4a4a] rounded-xl p-2 flex items-center justify-center text-center shadow">
                <input 
                  id="variacoes_saldo_atual_input"
                  type="text" 
                  defaultValue={localStorage.getItem("gestao_saldo_interno") || "0.00"}
                  readOnly
                  className="w-full bg-transparent text-emerald-600 font-bold text-center focus:outline-none tabular-nums cursor-default" 
                  style={{ fontSize: "24px" }} 
                  placeholder="0.00" 
                />
              </div>
            </div>
          </div>

          {/* Coluna 2: Resultados das porcentagens e LUCRO */}
          <div className="flex flex-col gap-2">

            {/* Variação Anual (%) */}
            <div className="flex flex-col items-center">
              <span style={{ fontSize: "18px" }} className="opacity-0 mb-1 select-none pointer-events-none">&nbsp;</span>
              <div className="w-full bg-black/80 border border-[#4a4a4a] rounded-xl p-2 flex items-center justify-center text-center shadow min-h-[46px]">
                <span 
                  id="variacoes_anual_pct"
                  style={{ fontSize: "24px" }} 
                  className="font-bold tracking-wide text-red-600"
                >
                  {(() => {
                    const anual = parseFloat((localStorage.getItem("variacoes_anual") || "12.95").replace(",", ".")) || 0;
                    const mes = parseFloat((localStorage.getItem("variacoes_saldo_mes") || "8.81").replace(",", ".")) || 0;
                    // (MES - ANUAL) / ANUAL
                    const pct = anual !== 0 ? ((mes - anual) / anual) * 100 : 0;
                    const res = `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
                    localStorage.setItem("variacoes_pct_anual", res);
                    return res;
                  })()}
                </span>
              </div>
            </div>

            {/* Variação do Mês (%) */}
            <div className="flex flex-col items-center">
              <span style={{ fontSize: "18px" }} className="opacity-0 mb-1 select-none pointer-events-none">&nbsp;</span>
              <div className="w-full bg-black/80 border border-[#4a4a4a] rounded-xl p-2 flex items-center justify-center text-center shadow min-h-[46px]">
                <span 
                  id="variacoes_mes_pct"
                  style={{ fontSize: "24px" }} 
                  className={`font-bold tracking-wide ${!((localStorage.getItem("variacoes_pct_mes") || "").includes("-")) ? "text-emerald-600" : "text-red-600"}`}
                >
                  {(() => {
                    const mes = parseFloat((localStorage.getItem("variacoes_saldo_mes") || "8.81").replace(",", ".")) || 0;
                    const atual = parseFloat((localStorage.getItem("gestao_saldo_interno") || "0").replace(",", ".")) || 0;
                    // (MES - ATUAL) / ATUAL
                    const pctMes = atual !== 0 ? ((mes - atual) / atual) * 100 : 0;
                    const res = `${pctMes >= 0 ? "+" : ""}${pctMes.toFixed(2)}%`;
                    localStorage.setItem("variacoes_pct_mes", res);
                    return res;
                  })()}
                </span>
              </div>
            </div>

            {/* LUCRO */}
            <div className="flex flex-col items-center">
              <span style={{ fontSize: "18px" }} className="text-cyan-300 font-bold uppercase tracking-wider mb-1 text-center">LUCRO</span>
              <div className="w-full bg-black/80 border border-[#4a4a4a] rounded-xl p-2 flex items-center justify-center text-center shadow min-h-[46px]">
                <span 
                  id="variacoes_lucro"
                  style={{ fontSize: "24px" }} 
                  className={`font-bold tracking-wide ${!((localStorage.getItem("variacoes_lucro_valor") || "").includes("-")) ? "text-emerald-600" : "text-red-600"}`}
                >
                  {(() => {
                    const atual = parseFloat((localStorage.getItem("gestao_saldo_interno") || "0").replace(",", ".")) || 0;
                    const mes = parseFloat((localStorage.getItem("variacoes_saldo_mes") || "8.81").replace(",", ".")) || 0;
                    // MES - ATUAL
                    const diff = Number((mes - atual).toFixed(2));
                    const res = `${diff >= 0 ? "+" : ""}${diff.toFixed(2)}`;
                    localStorage.setItem("variacoes_lucro_valor", res);
                    return res;
                  })()}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
        <div className="rounded-2xl border border-[#4a4a4a] bg-black p-5 flex flex-col h-full justify-between shadow-lg font-mono">
<div className="flex flex-col space-y-4 relative">
  {/* Botões compactos no canto superior direito: 4H, 5H e 1S */}
  <div className="absolute top-2 right-2 flex space-x-1 z-10">
    <button
      type="button"
      onClick={() => setVisao('4H')}
      className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border transition-all cursor-pointer shadow ${
        visao === '4H' 
          ? 'bg-cyan-500 text-gray-950 border-cyan-400' 
          : 'border-cyan-400/60 bg-cyan-950/40 text-cyan-400 hover:bg-cyan-500 hover:text-gray-950'
      }`}
    >
      4H
    </button>
    <button
      type="button"
      onClick={() => setVisao('5H')}
      className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border transition-all cursor-pointer shadow ${
        visao === '5H' 
          ? 'bg-cyan-500 text-gray-950 border-cyan-400' 
          : 'border-cyan-400/60 bg-cyan-950/40 text-cyan-400 hover:bg-cyan-500 hover:text-gray-950'
      }`}
    >
      5H
    </button>
    <button
      type="button"
      onClick={() => setVisao('1S')}
      className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border transition-all cursor-pointer shadow ${
        visao === '1S' 
          ? 'bg-cyan-500 text-gray-950 border-cyan-400' 
          : 'border-cyan-400/60 bg-cyan-950/40 text-cyan-400 hover:bg-cyan-500 hover:text-gray-950'
      }`}
    >
      1S
    </button>
  </div>

  <div>
    <span
      style={{ fontSize: "16px" }}
      className="font-bold tracking-wider text-cyan-400 uppercase block"
    >
      STATUS
    </span>
  </div>
</div>
  {/* Conteúdo dividido em duas colunas */}
  <div className="flex-1 grid grid-cols-2 relative py-4 gap-4">
    {/* Linha vertical divisória no meio */}
    <div className="absolute top-2 bottom-2 left-1/2 -translate-x-1/2 w-[1px] bg-cyan-400/40" />

    {/* LADO ESQUERDO: Se for 1S mostra Sentido e Zona. Se for 4H/5H mostra o Atual */}
    <div className="flex flex-col pr-2">
      {visao === '1S' ? (
        (() => {
          const ultimo1s = candles1s?.at(-2);
          const abertura = ultimo1s?.open ?? 0;
          const maxima = ultimo1s?.high ?? 0;
          const minima = ultimo1s?.low ?? 0;
          const fechamento = ultimo1s?.close ?? 0;

          const amplitude = maxima - minima;
          const isAlta = fechamento >= abertura;
          const sentido = isAlta ? 'ALTA' : 'BAIXA';
          const zonaCalculada = isAlta 
            ? minima + (amplitude * 0.786) 
            : maxima - (amplitude * 0.786);

          return (
            // ... resto do seu código normal do card ...
            <div className="flex flex-col h-full justify-around">
              <span className="text-[16px] font-bold text-cyan-400 uppercase tracking-wider mb-3 text-center">
                Filtro 1S (0.786)
              </span>
              <div className="flex-1 flex flex-col justify-around space-y-3 text-[16px] text-gray-300">
                <div className="flex justify-between items-center">
                  <span style={{ fontSize: "16px" }}>Sentido:</span>
                  <span className={`font-bold text-[18px] ${isAlta ? 'text-green-400' : 'text-red-400'}`}>
                    {sentido}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span style={{ fontSize: "16px" }}>Zona:</span>
                  <span className="font-bold text-cyan-300 text-[20px]">
                    {zonaCalculada.toFixed(3)}
                  </span>
                </div>
              </div>
            </div>
          );
        })()
      ) : (
        <>
          <span className="text-[16px] font-bold text-cyan-400 uppercase tracking-wider mb-3 text-center">
            {visao === '5H' ? 'Atual 5H' : 'Atual 4H'}
          </span>
          <div className="flex-1 flex flex-col justify-around space-y-2 text-[16px] text-gray-300">
            <div className="flex justify-between items-center">
              <span style={{ fontSize: "16px" }}>Abertura:</span>
              <span className="font-bold text-gray-100 text-[20px]">
                {visao === '5H' ? (candles5h?.at(-1)?.open ?? 0) : (candles4h?.at(-1)?.open ?? 0)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span style={{ fontSize: "16px" }}>Máxima:</span>
              <span className="font-bold text-green-400 text-[20px]">
                {visao === '5H' ? (candles5h?.at(-1)?.high ?? 0) : (candles4h?.at(-1)?.high ?? 0)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span style={{ fontSize: "16px" }}>Mínima:</span>
              <span className="font-bold text-red-400 text-[20px]">
                {visao === '5H' ? (candles5h?.at(-1)?.low ?? 0) : (candles4h?.at(-1)?.low ?? 0)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span style={{ fontSize: "16px" }}>Fechamento:</span>
              <span className="font-bold text-gray-100 text-[20px]">
                {visao === '5H' ? (candles5h?.at(-1)?.close ?? 0) : (candles4h?.at(-1)?.close ?? 0)}
              </span>
            </div>
          </div>
        </>
      )}
    </div>

    {/* LADO DIREITO: Último (4H, 5H ou 1S) */}
    <div className="flex flex-col pl-2">
      <span className="text-[16px] font-bold text-cyan-400 uppercase tracking-wider mb-3 text-center">
        {visao === '1S' ? 'Último 1S' : (visao === '5H' ? 'Último 5H' : 'Último 4H')}
      </span>
      <div className="flex-1 flex flex-col justify-around space-y-2 text-[16px] text-gray-300">
        <div className="flex justify-between items-center">
          <span style={{ fontSize: "16px" }}>Abertura:</span>
          <span className="font-bold text-gray-100 text-[20px]">
            {visao === '1S' ? (candles1s?.at(-2)?.open ?? 0) : (visao === '5H' ? (candles5h?.at(-2)?.open ?? 0) : (candles4h?.at(-2)?.open ?? 0))}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span style={{ fontSize: "16px" }}>Máxima:</span>
          <span className="font-bold text-green-400 text-[20px]">
            {visao === '1S' ? (candles1s?.at(-2)?.high ?? 0) : (visao === '5H' ? (candles5h?.at(-2)?.high ?? 0) : (candles4h?.at(-2)?.high ?? 0))}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span style={{ fontSize: "16px" }}>Mínima:</span>
          <span className="font-bold text-red-400 text-[20px]">
            {visao === '1S' ? (candles1s?.at(-2)?.low ?? 0) : (visao === '5H' ? (candles5h?.at(-2)?.low ?? 0) : (candles4h?.at(-2)?.low ?? 0))}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span style={{ fontSize: "16px" }}>Fechamento:</span>
          <span className="font-bold text-gray-100 text-[20px]">
            {visao === '1S' ? (candles1s?.at(-2)?.close ?? 0) : (visao === '5H' ? (candles5h?.at(-2)?.close ?? 0) : (candles4h?.at(-2)?.close ?? 0))}
          </span>
        </div>
      </div>
    </div>
  </div>
</div>   <div className="rounded-2xl border border-[#4a4a4a] bg-black p-4 flex flex-col">
              {/* Cabeçalho unificado no App.tsx: Título na esquerda e o Botão do Olhinho na direita */}
              <div className="flex items-center justify-between mb-2">
                <span
                  style={{ fontSize: "16px" }}
                  className="font-bold tracking-wider text-cyan-300 uppercase"
                >
                  GESTÃO DE RISCO
                </span>

                <button
                  onClick={() => {
                    const atual =
                      localStorage.getItem("gestao_saldo_oculto") === "true";
                    const novo = !atual;
                    localStorage.setItem("gestao_saldo_oculto", String(novo));
                    window.dispatchEvent(new Event("storage"));
                  }}
                  type="button"
                  className="text-cyan-300 hover:text-white transition-colors flex items-center justify-center focus:outline-none"
                  title="Mostrar ou ocultar saldos"
                  aria-label="Mostrar ou ocultar saldos"
                >
                  {localStorage.getItem("gestao_saldo_oculto") === "true" ? (
                    <EyeOff size={22} />
                  ) : (
                    <Eye size={22} />
                  )}
                </button>
              </div>

              <div className="flex-1 flex flex-col justify-center">
                <GestaoDeRisco />
              </div>
            </div>
          </div>
        </section>
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
      style={{ transform: "translateY(16px)" }}
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
    <div className="rounded-2xl border border-[#4a4a4a] bg-black p-3 shadow-sm text-center">
      <div className="text-[14px] font-semibold uppercase tracking-wider text-cyan-300">
        {title}
      </div>
      <div className="mt-2 text-2xl font-bold tabular-nums text-foreground">
        {value}
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
  uktChange = 0,
  ustChange = 0,
  jgbChange = 0,
  aiProbability = null,
  valueTextSize = "text-[24px]",
}: {
  vix: number | null;
  loading: boolean;
  error: string | null;
  adx?: number | null;
  adxLoading?: boolean;
  macroVolatilityRef?: React.RefObject<HTMLDivElement | null>;
  uktChange?: number;
  ustChange?: number;
  jgbChange?: number;
  aiProbability?: number | null;
  valueTextSize?: string;
}) {
  const [liveUktChange, setLiveUktChange] = useState(uktChange);
  const [liveUstChange, setLiveUstChange] = useState(ustChange);
  const [liveJgbChange, setLiveJgbChange] = useState(jgbChange);

  const [liveUkt2Y, setLiveUkt2Y] = useState(0);
  const [liveUst2Y, setLiveUst2Y] = useState(0);
  const [liveJgb2Y, setLiveJgb2Y] = useState(0);

  const [liveUkt5Y, setLiveUkt5Y] = useState(0);
  const [liveUst5Y, setLiveUst5Y] = useState(0);
  const [liveJgb5Y, setLiveJgb5Y] = useState(0);

  const [liveGbpChange, setLiveGbpChange] = useState(0);
  const [liveJpyChange, setLiveJpyChange] = useState(0);

  const [selectedValidation, setSelectedValidation] = useState<string | null>(
    null,
  );

  // Função para tocar o som do MSN sem precisar de import interno
  const playSound = () => {
    try {
      if (localStorage.getItem("SOUND_KEY") === "0") return;

      const audio = new Audio("./src/assets/MSN.mp3");
      audio.volume = 1.0;
      audio.play().catch(() => {});
    } catch (e) {}
  };

  // Estados locais para os Fundos e Topos para garantir reatividade instantânea
  const [valoresF, setValoresF] = useState<string[]>([
    localStorage.getItem("regioes_F1") || "",
    localStorage.getItem("regioes_F2") || "",
    localStorage.getItem("regioes_F3") || "",
    localStorage.getItem("regioes_F4") || "",
  ]);

  const [valoresT, setValoresT] = useState<string[]>([
    localStorage.getItem("regioes_T1") || "",
    localStorage.getItem("regioes_T2") || "",
    localStorage.getItem("regioes_T3") || "",
    localStorage.getItem("regioes_T4") || "",
  ]);

  // Cálculos dinâmicos automáticos baseados no F1 e T1
  const numF1 = parseFloat((valoresF[0] || "").replace(",", "."));
  const numT1 = parseFloat((valoresT[0] || "").replace(",", "."));

  const valorMais70 =
    !isNaN(numF1) && numF1 > 0 ? (numF1 * 1.007).toFixed(3) : "0.000";
  const valorMenos70 =
    !isNaN(numT1) && numT1 > 0 ? (numT1 * (1 - 0.007)).toFixed(3) : "0.000";

  // Função central de ordenação, validação dos 0.25% e salvamento
  const handleRegiaoChange = (
    tipoPrefix: "T" | "F",
    indexAlterado: number,
    novoTexto: string,
  ) => {
    if (tipoPrefix === "F") {
      const novos = [...valoresF];
      novos[indexAlterado] = novoTexto;

      // Separa em objetos para ordenar mantendo o texto original digitado
      const comValor = novos
        .map((v) => ({ texto: v, num: parseFloat(v.replace(",", ".")) }))
        .filter((item) => !isNaN(item.num) && item.num > 0);

      // Fundo (F): Maior para o menor por padrão (escadinha)
      comValor.sort((a, b) => b.num - a.num);

      let final = [
        comValor[0]?.texto || "",
        comValor[1]?.texto || "",
        comValor[2]?.texto || "",
        comValor[3]?.texto || "",
      ];

      // Regra de Validação de Tolerância de 0.25%
      const valF1 = parseFloat((final[0] || "").replace(",", "."));
      const valF2 = parseFloat((final[1] || "").replace(",", "."));

      if (!isNaN(valF1) && !isNaN(valF2) && valF1 > 0 && valF2 > 0) {
        const limiteTolerancia = valF1 * (1 - 0.0025); // Limite de -0.25%

        if (valF2 >= limiteTolerancia && valF2 < valF1) {
          // Troca as posições para priorizar o fundo menor no F1
          const temp = final[0];
          final[0] = final[1];
          final[1] = temp;

          // Dispara o alerta sonoro do MSN ao ajustar a região
          playSound();
        }
      }

      // Se ainda houver campos em branco ou parciais sendo digitados no campo atual
      if (novoTexto !== "" && !final.includes(novoTexto)) {
        final[indexAlterado] = novoTexto;
      }

      setValoresF(final);
      final.forEach((val, i) => localStorage.setItem(`regioes_F${i + 1}`, val));
    } else {
      const novos = [...valoresT];
      novos[indexAlterado] = novoTexto;

      const comValor = novos
        .map((v) => ({ texto: v, num: parseFloat(v.replace(",", ".")) }))
        .filter((item) => !isNaN(item.num) && item.num > 0);

      // Topo (T): Menor para o maior
      comValor.sort((a, b) => a.num - b.num);

      const final = [
        comValor[0]?.texto || "",
        comValor[1]?.texto || "",
        comValor[2]?.texto || "",
        comValor[3]?.texto || "",
      ];

      setValoresT(final);
      final.forEach((val, i) => localStorage.setItem(`regioes_T${i + 1}`, val));
    }

    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new Event("atualizar_regioes"));
  };

  // Sincroniza com o localStorage caso a escadinha suba externamente
  useEffect(() => {
    const sincronizarDoStorage = () => {
      setValoresF([
        localStorage.getItem("regioes_F1") || "",
        localStorage.getItem("regioes_F2") || "",
        localStorage.getItem("regioes_F3") || "",
        localStorage.getItem("regioes_F4") || "",
      ]);
      setValoresT([
        localStorage.getItem("regioes_T1") || "",
        localStorage.getItem("regioes_T2") || "",
        localStorage.getItem("regioes_T3") || "",
        localStorage.getItem("regioes_T4") || "",
      ]);
    };

    window.addEventListener("atualizar_regioes", sincronizarDoStorage);
    window.addEventListener("storage", sincronizarDoStorage);
    return () => {
      window.removeEventListener("atualizar_regioes", sincronizarDoStorage);
      window.removeEventListener("storage", sincronizarDoStorage);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchCnbcData = async () => {
      try {
        const symbols =
          "UK2Y-GB|US2Y|JP2Y-JP|UK5Y-GB|US5Y|JP5Y-JP|UK10Y-GB|US10Y|JP10Y-JP";
        const url =
          `https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol` +
          `?symbols=${encodeURIComponent(symbols)}` +
          `&requestMethod=itv&noform=1&partnerId=2&fund=1&exthrs=1&output=json&events=1&_ts=${Date.now()}`;

        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) return;

        const json = await response.json();
        const quotes = json?.FormattedQuoteResult?.FormattedQuote;
        if (!Array.isArray(quotes) || cancelled) return;

        quotes.forEach((quote: any) => {
          const symbol = quote?.symbol;
          const rawChange = String(quote?.change_pct ?? "")
            .replace("%", "")
            .replace(",", ".")
            .trim();
          const changeVal = Number(rawChange);
          if (!Number.isFinite(changeVal)) return;

          if (symbol === "UK2Y-GB") setLiveUkt2Y(changeVal);
          if (symbol === "US2Y") setLiveUst2Y(changeVal);
          if (symbol === "JP2Y-JP") setLiveJgb2Y(changeVal);

          if (symbol === "UK5Y-GB") setLiveUkt5Y(changeVal);
          if (symbol === "US5Y") setLiveUst5Y(changeVal);
          if (symbol === "JP5Y-JP") setLiveJgb5Y(changeVal);

          if (symbol === "UK10Y-GB") setLiveUktChange(changeVal);
          if (symbol === "US10Y") setLiveUstChange(changeVal);
          if (symbol === "JP10Y-JP") setLiveJgbChange(changeVal);
        });
      } catch (err) {
        if (!cancelled) console.error("Erro CNBC:", err);
      }
    };

    const fetchBingxChange = async (symbol: string): Promise<number | null> => {
      try {
        const response = await fetch(
          `/api/ticker?symbol=${encodeURIComponent(symbol)}`,
          { cache: "no-store" },
        );
        if (!response.ok) return null;

        const json = await response.json();
        if (json?.code && json.code !== 0) return null;

        const rawChange =
          json?.data?.priceChangePercent ?? json?.data?.priceChange ?? 0;
        const change = Number(rawChange);
        return Number.isFinite(change) ? change : null;
      } catch {
        return null;
      }
    };

    const atualizarMacro = async () => {
      await fetchCnbcData();

      const [gbp, jpy] = await Promise.all([
        fetchBingxChange("NCFXGBP2USD-USDT"),
        fetchBingxChange("NCFXUSD2JPY-USDT"),
      ]);

      if (cancelled) return;

      if (gbp != null) setLiveGbpChange(gbp);
      if (jpy != null) setLiveJpyChange(jpy);
    };

    atualizarMacro();
    const intervalId = setInterval(atualizarMacro, 15 * 1000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, []);

  const normalizar = (v: number) => Math.tanh(v / 0.5);

  const calcularIndiceComPesos = (
    ukt: number,
    ust: number,
    jgb: number,
  ): number => {
    let pontosAcumulados = 0;
    const PESO_UKT = 20,
      PESO_UST = 10,
      PESO_JGB = 20,
      PESO_GBP = 25,
      PESO_JPY = 25;

    pontosAcumulados += normalizar(ukt) * PESO_UKT;
    pontosAcumulados += normalizar(ust) * PESO_UST;
    pontosAcumulados -= normalizar(jgb) * PESO_JGB;
    pontosAcumulados += normalizar(liveGbpChange) * PESO_GBP;
    pontosAcumulados += normalizar(liveJpyChange) * PESO_JPY;

    const valorLimitado = Math.min(Math.max(pontosAcumulados, -100), 100);
    return Number((valorLimitado / 100).toFixed(2));
  };

  const valorJuros2Y = calcularIndiceComPesos(liveUkt2Y, liveUst2Y, liveJgb2Y);
  const valorJuros5Y = calcularIndiceComPesos(liveUkt5Y, liveUst5Y, liveJgb5Y);
  const valorJuros10Y =
    aiProbability ??
    calcularIndiceComPesos(liveUktChange, liveUstChange, liveJgbChange);

  const getChangeColor = (val: number) =>
    val < 0 ? "text-red-600" : "text-emerald-600";
  const formatChange = (val: number) =>
    `${val > 0 ? "+" : ""}${val.toFixed(2)}%`;

  const colunaF = ["F1", "F2", "F3"];
  const colunaT = ["T1", "T2", "T3"];

  useEffect(() => {
    const sinalSalvo = localStorage.getItem("scanner_sinal");
    if (sinalSalvo) {
      try {
        const parsed = JSON.parse(sinalSalvo);
        if (parsed?.item) {
          setSelectedValidation(parsed.item);
        }
      } catch (e) {
        // ignora erro de parse
      }
    }
  }, []);

  const handleBotaoClick = (item: string, tipo: "FUNDO" | "TOPO") => {
    const rawInputVal = localStorage.getItem(`regioes_${item}`) || "0";
    const precoBase = Number(rawInputVal.replace(",", ".")) || 0;

    const novoValor = selectedValidation === item ? null : item;
    setSelectedValidation(novoValor);

    if (novoValor) {
      const relatorioTexto = `${tipo} - ${rawInputVal} | AGUARDANDO O PREÇO ATUAL TOCAR NO ALVO`;

      localStorage.setItem("scanner_target_value", String(precoBase));
      localStorage.setItem("scanner_confirmed_report", relatorioTexto);
      localStorage.setItem("scanner_is_confirmed", "true");
      localStorage.removeItem("scanner_is_triggered");
      localStorage.setItem("scanner_active_validation", item);

      localStorage.setItem(
        "scanner_sinal",
        JSON.stringify({
          item: item,
          tipo: tipo,
          valor: precoBase,
        }),
      );
    } else {
      localStorage.removeItem("scanner_confirmed_report");
      localStorage.removeItem("scanner_is_confirmed");
      localStorage.removeItem("scanner_target_value");
      localStorage.removeItem("scanner_is_triggered");
      localStorage.removeItem("scanner_sinal");
      localStorage.removeItem("scanner_active_validation");
    }

    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new CustomEvent("atualizar_scanner"));
    window.dispatchEvent(new CustomEvent("atualizar_gestao_risco"));
  };

  return (
    <div ref={macroVolatilityRef} className="flex flex-row gap-2 items-start">
      {/* Coluna principal dos Juros e VIX */}
      <div className="flex flex-col gap-2 w-[92px] shrink-0">
        <div className="flex h-14 w-full flex-col items-center justify-center rounded-xl border border-[#4a4a4a] bg-black p-1 text-center">
          <span className="text-[11px] font-bold text-cyan-300">JUROS 2Y</span>
          <span
            className={`${valueTextSize} font-semibold tabular-nums ${getChangeColor(valorJuros2Y)}`}
          >
            {formatChange(valorJuros2Y)}
          </span>
        </div>

        <div className="flex h-14 w-full flex-col items-center justify-center rounded-xl border border-[#4a4a4a] bg-black p-1 text-center">
          <span className="text-[11px] font-bold text-cyan-300">JUROS 5Y</span>
          <span
            className={`${valueTextSize} font-semibold tabular-nums ${getChangeColor(valorJuros5Y)}`}
          >
            {formatChange(valorJuros5Y)}
          </span>
        </div>

        <div className="flex h-14 w-full flex-col items-center justify-center rounded-xl border border-[#4a4a4a] bg-black p-1 text-center">
          <span className="text-[11px] font-bold text-cyan-300">JUROS 10Y</span>
          <span
            className={`${valueTextSize} font-semibold tabular-nums ${getChangeColor(valorJuros10Y)}`}
          >
            {formatChange(valorJuros10Y)}
          </span>
        </div>

        <div className="flex h-14 w-full flex-col items-center justify-center rounded-xl border border-[#4a4a4a] bg-black p-1 text-center">
          <span className="text-[11px] font-bold text-cyan-300">VIX</span>
          <span
            className={`${valueTextSize} font-semibold tabular-nums text-emerald-600`}
          >
            {loading && vix == null ? "—" : vix != null ? vix.toFixed(2) : "—"}
          </span>
        </div>
      </div>

      {/* Coluna F1 a F3 + CAMPO AUTOMÁTICO +70% */}
      <div className="flex flex-col gap-2 w-[283px] shrink-0">
        {colunaF.map((item, index) => {
          const isSelected = selectedValidation === item;
          return (
            <div
              key={item}
              className={`flex h-14 w-full items-center justify-between rounded-xl border px-3 transition-all shadow-md ${
                isSelected
                  ? "bg-blue-600/40 border-white ring-2 ring-blue-400"
                  : "bg-blue-600/20 border-blue-600 hover:bg-blue-600/30"
              }`}
            >
              <button
                onClick={() => handleBotaoClick(item, "FUNDO")}
                style={{ fontSize: "14px" }}
                className={`h-10 px-5 rounded-lg font-bold flex items-center justify-center cursor-pointer transition-colors shrink-0 ${
                  isSelected
                    ? "bg-blue-600 text-white"
                    : "bg-blue-600/40 text-blue-300 hover:bg-blue-600 hover:text-white"
                }`}
              >
                {item}
              </button>
              <input
                type="text"
                placeholder="0.000"
                value={valoresF[index]}
                onChange={(e) => handleRegiaoChange("F", index, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="w-44 bg-[#12141c] border border-blue-600/50 rounded px-2 py-1 text-[24px] font-mono font-bold text-blue-200 focus:outline-none focus:border-white text-right"
              />
            </div>
          );
        })}

        {/* CAMPO +70% COM LARGURA IDENTICA AOS BOTÕES F */}
        <div className="group flex h-14 w-full items-center justify-between rounded-xl border border-blue-600 bg-blue-600/20 px-3 transition-all shadow-md hover:bg-blue-600/30">
          <div
            style={{ fontSize: "14px" }}
            className="h-10 w-[58px] rounded-lg font-bold flex items-center justify-center bg-blue-600/40 text-blue-300 group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0 select-none cursor-default text-[13px]"
          >
            +70%
          </div>
          <div className="w-44 bg-[#12141c] border border-blue-600/50 rounded px-2 py-1 text-[24px] font-mono font-bold text-blue-200 text-right select-all">
            {valorMais70}
          </div>
        </div>
      </div>

      {/* Coluna T1 a T3 + CAMPO AUTOMÁTICO -70% */}
      <div className="flex flex-col gap-2 w-[310px] shrink-0">
        {colunaT.map((item, index) => {
          const isSelected = selectedValidation === item;
          return (
            <div
              key={item}
              className={`flex h-14 w-full items-center justify-between rounded-xl border px-3 transition-all shadow-md ${
                isSelected
                  ? "bg-red-600/40 border-white ring-2 ring-red-400"
                  : "bg-red-600/20 border-red-600 hover:bg-red-600/30"
              }`}
            >
              <button
                onClick={() => handleBotaoClick(item, "TOPO")}
                style={{ fontSize: "14px" }}
                className={`h-10 px-5 rounded-lg font-bold flex items-center justify-center cursor-pointer transition-colors shrink-0 ${
                  isSelected
                    ? "bg-red-600 text-white"
                    : "bg-red-600/40 text-red-300 hover:bg-red-600 hover:text-white"
                }`}
              >
                {item}
              </button>
              <input
                type="text"
                placeholder="0.000"
                value={valoresT[index]}
                onChange={(e) => handleRegiaoChange("T", index, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="w-44 bg-[#12141c] border border-red-600/50 rounded px-2 py-1 text-[24px] font-mono font-bold text-red-200 focus:outline-none focus:border-white text-right"
              />
            </div>
          );
        })}

        {/* CAMPO -70% COM LARGURA IDENTICA AOS BOTÕES T */}
        <div className="group flex h-14 w-full items-center justify-between rounded-xl border border-red-600 bg-red-600/20 px-3 transition-all shadow-md hover:bg-red-600/30">
          <div
            style={{ fontSize: "14px" }}
            className="h-10 w-[58px] rounded-lg font-bold flex items-center justify-center bg-red-600/40 text-red-300 group-hover:bg-red-600 group-hover:text-white transition-colors shrink-0 select-none cursor-default text-[13px]"
          >
            -70%
          </div>
          <div className="w-44 bg-[#12141c] border border-red-600/50 rounded px-2 py-1 text-[24px] font-mono font-bold text-red-200 text-right select-all">
            {valorMenos70}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return <Gate />;
}