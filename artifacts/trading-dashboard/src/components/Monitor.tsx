import React, { useState, useEffect } from "react";
import msnSound from "../assets/MSN.mp3";

interface Candle4H {
  timestamp?: number;
  time?: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface MediasAtrCardProps {
  precoAtual?: number | null;
  candles4h?: Candle4H[];
}

export function MediasAtrCard({ precoAtual = null, candles4h = [] }: MediasAtrCardProps) {
  const [valorEntrada, setValorEntrada] = useState(() => {
    try {
      return localStorage.getItem("monitor_entrada_manual") || "";
    } catch {
      return "";
    }
  });

  const [valorSaida, setValorSaida] = useState<string>("0.000");
  const [statusCor, setStatusCor] = useState<"normal" | "vermelho" | "azul">("normal");
  
  // Estado para a Margem dinâmica puxada do localStorage
  const [margemDinamica, setMargemDinamica] = useState<string>("0.00");
  
  const [rompido, setRompido] = useState<boolean>(() => {
    try {
      return localStorage.getItem("monitor_rompido") === "true";
    } catch {
      return false;
    }
  });

  const [candleAlvoTimestamp, setCandleAlvoTimestamp] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem("monitor_candle_alvo_ts");
      return saved !== null ? parseInt(saved, 10) : null;
    } catch {
      return null;
    }
  });

  // Sincroniza a Margem em tempo real com o localStorage
  useEffect(() => {
    const atualizarMargem = () => {
      try {
        const margemSalva = 
          localStorage.getItem('gestao_margem_atual') || 
          localStorage.getItem('margem_atual') || 
          localStorage.getItem('margem');

        if (margemSalva) {
          setMargemDinamica(margemSalva);
        }
      } catch (e) {
        console.error('Erro ao ler dados da margem', e);
      }
    };

    atualizarMargem();

    window.addEventListener('storage', atualizarMargem);
    const interval = setInterval(atualizarMargem, 200);

    return () => {
      window.removeEventListener('storage', atualizarMargem);
      clearInterval(interval);
    };
  }, []);

  const playSound = () => {
    try {
      if (localStorage.getItem("SOUND_KEY") === "0") return;
      const audio = new Audio(msnSound);
      audio.volume = 1.0;
      audio.play().catch(() => {});
    } catch (e) {}
  };

  const atualizarValorEntrada = (novoNum: number) => {
    const formatado = novoNum.toFixed(3);
    setValorEntrada(formatado);
    try {
      localStorage.setItem("monitor_entrada_manual", formatado);
    } catch (err) {}
  };

  const handleEntradaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const novoValor = e.target.value;
    setValorEntrada(novoValor);
    try {
      localStorage.setItem("monitor_entrada_manual", novoValor);
    } catch (err) {}
  };

  const handleIncrementar = () => {
    const atual = parseFloat(valorEntrada.replace(",", ".")) || 0;
    atualizarValorEntrada(atual + 0.010);
  };

  const handleDecrementar = () => {
    const atual = parseFloat(valorEntrada.replace(",", ".")) || 0;
    atualizarValorEntrada(Math.max(0, atual - 0.010));
  };

  const handleZerar = () => {
    setValorEntrada("");
    setValorSaida("0.000");
    setStatusCor("normal");
    setRompido(false);
    setCandleAlvoTimestamp(null);
    try {
      localStorage.removeItem("monitor_entrada_manual");
      localStorage.removeItem("monitor_rompido");
      localStorage.removeItem("monitor_candle_alvo_ts");
    } catch (err) {}
  };

  // 1. Monitora o preço em tempo real para detectar o ROMPIMENTO
  useEffect(() => {
    if (!valorEntrada || valorEntrada.trim() === "" || candles4h.length === 0) return;
    if (rompido) return;

    const numEntrada = parseFloat(valorEntrada.replace(",", "."));
    if (isNaN(numEntrada)) return;

    const candleAtual = candles4h[candles4h.length - 1];
    
    if (candleAtual.high >= numEntrada && candleAtual.low <= numEntrada) {
      setRompido(true);
      const candleId = candleAtual.timestamp || candleAtual.time || candles4h.length - 1;
      setCandleAlvoTimestamp(Number(candleId));

      try {
        localStorage.setItem("monitor_rompido", "true");
        localStorage.setItem("monitor_candle_alvo_ts", String(candleId));
      } catch (err) {}
    }
  }, [candles4h, valorEntrada, rompido]);

  // 2. Após romper, espera o candle fechar e avalia a direção
  useEffect(() => {
    if (!rompido || candleAlvoTimestamp === null || candles4h.length === 0 || !valorEntrada) return;

    const numEntrada = parseFloat(valorEntrada.replace(",", "."));

    const candleTocadoIndex = candles4h.findIndex(c => {
      const id = c.timestamp || c.time || candles4h.indexOf(c);
      return Number(id) === candleAlvoTimestamp;
    });

    if (candleTocadoIndex === -1) return;

    const candleTocado = candles4h[candleTocadoIndex];
    const candleFechado = candles4h.length > candleTocadoIndex + 1;

    if (candleFechado) {
      const precoFechamento = candleTocado.close;
      const precoAbertura = candleTocado.open;

      const ehOperacaoDeVenda = numEntrada < precoAbertura;
      let condicaoSucesso = false;

      if (ehOperacaoDeVenda) {
        condicaoSucesso = precoFechamento < numEntrada;
      } else {
        condicaoSucesso = precoFechamento > numEntrada;
      }

      setValorSaida(precoFechamento.toFixed(3));
      setStatusCor(condicaoSucesso ? "vermelho" : "azul");

      if (condicaoSucesso) {
        playSound();
      }
    } else {
      setValorSaida("AGUARDANDO 4H");
      setStatusCor("normal");
    }
  }, [candles4h, candleAlvoTimestamp, rompido, valorEntrada]);

  const getSaidaStyles = () => {
    if (statusCor === "vermelho") {
      return { border: "border-red-500", bgInput: "border-red-500/60", textCor: "text-red-400" };
    }
    if (statusCor === "azul") {
      return { border: "border-[#2563eb]", bgInput: "border-[#2563eb]/60", textCor: "text-blue-400" };
    }
    return { border: "border-[#52525b]", bgInput: "border-[#52525b]/60", textCor: "text-white" };
  };

  const currentStyle = getSaidaStyles();

  return (
    <div className="rounded-2xl border border-[#4a4a4a] bg-black p-4 shadow-sm h-[360px] w-full flex flex-col justify-between font-mono">
      <div className="flex flex-col justify-between h-full gap-3">
        
        <div className="flex-[1.5] flex flex-col">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-base font-semibold text-cyan-300">
              MONITOR DE SAÍDA
            </span>
            <div className="flex items-center space-x-1.5">
              {/* Botão Menos (-) */}
              <button
                onClick={handleDecrementar}
                className="text-[11px] font-mono px-2.5 py-1 rounded border border-red-600 bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white hover:border-red-500 transition-all font-bold shadow cursor-pointer"
                title="Subtrair 10 pontos"
              >
                -
              </button>
              {/* Botão Mais (+) */}
              <button
                onClick={handleIncrementar}
                className="text-[11px] font-mono px-2.5 py-1 rounded border border-blue-600 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white hover:border-blue-500 transition-all font-bold shadow cursor-pointer"
                title="Adicionar 10 pontos"
              >
                +
              </button>
              {/* Botão Zerar */}
              <button
                onClick={handleZerar}
                className="text-[11px] font-mono px-2.5 py-1 rounded border border-red-600 bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white hover:border-red-500 transition-all shadow ml-1 cursor-pointer"
                title="Zerar monitor"
              >
                Zerar
              </button>
            </div>
          </div>
          <div className="rounded-xl border border-[#4a4a4a] p-3 flex-1 bg-black flex flex-col justify-center gap-3 items-center">
            
            {/* ENTRADA */}
            <div className="w-full max-w-[280px] flex flex-col gap-2">
              <div className="flex items-center justify-between rounded-lg bg-[#1e3a8a]/40 border border-[#2563eb] px-3 py-2">
                <span className="font-bold text-blue-400 text-[18px] tracking-wide">ENTRADA</span>
                <input
                  type="text"
                  value={valorEntrada}
                  onChange={handleEntradaChange}
                  placeholder="0.000"
                  className="w-[130px] bg-black/40 border border-[#2563eb]/60 rounded px-2 py-1 text-white text-[24px] font-bold text-center focus:outline-none focus:border-cyan-400 tabular-nums placeholder-blue-300/30"
                />
              </div>
            </div>

            {/* SAÍDA */}
            <div className="w-full max-w-[280px] flex flex-col gap-2">
              <div className={`flex items-center justify-between rounded-lg bg-[#27272a]/40 border ${currentStyle.border} px-3 py-2 transition-colors`}>
                <span className="font-bold text-zinc-400 text-[18px] tracking-wide">SAÍDA</span>
                <div className={`w-[130px] bg-black/40 border ${currentStyle.bgInput} rounded px-2 py-1 flex items-center justify-center`}>
                  <span className={`tabular-nums text-[24px] font-bold ${currentStyle.textCor} truncate`}>
                    {valorSaida}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* BLOCO INFERIOR: MARGEM COM TÍTULO NO TOPO CENTRALIZADO E VALOR EM 40PX */}
        <div className="flex-1 flex flex-col">
          <div className="rounded-xl border border-[#4a4a4a] p-3 flex-1 bg-black flex flex-col justify-center items-center">
            <span className="font-semibold text-cyan-300 text-base tracking-wide mb-1">
              MARGEM
            </span>
            <span className="font-extrabold text-emerald-600 text-[40px] tabular-nums leading-tight" title="Margem Atual">
              {margemDinamica}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}