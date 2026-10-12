import React, { useState, useEffect, useRef } from "react";
import msnSound from "../assets/MSN.mp3";

interface Candle4H {
  timestamp?: number;
  time?: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface MonitorProps {
  precoAtual?: number | null;
  candles4h?: Candle4H[];
}

export function MediasAtrCard({ precoAtual = null, candles4h = [] }: MonitorProps) {
  const [valorEntrada, setValorEntrada] = useState(() => {
    try {
      return localStorage.getItem("monitor_entrada_manual") || "";
    } catch {
      return "";
    }
  });

  const [valorSaida, setValorSaida] = useState<string>(() => {
    try {
      return localStorage.getItem("monitor_saida_manual") || "0.000";
    } catch {
      return "0.000";
    }
  });

  const [statusCor, setStatusCor] = useState<"normal" | "vermelho" | "azul">(() => {
    try {
      return (localStorage.getItem("monitor_status_cor") as any) || "normal";
    } catch {
      return "normal";
    }
  });

  const [tempoRestante4H, setTempoRestante4H] = useState<string>("00:00:00");
  const [horasCandle, setHorasCandle] = useState<number>(4);

  const [modoArmado, setModoArmado] = useState<"TOPO" | "FUNDO" | null>(() => {
    try {
      return (localStorage.getItem("monitor_modo_armado") as any) || null;
    } catch {
      return null;
    }
  });

  const [valorReferenciaFechamento, setValorReferenciaFechamento] = useState<string | null>(() => {
    try {
      return localStorage.getItem("monitor_ref_fechamento") || null;
    } catch {
      return null;
    }
  });

  // Usamos ref para manter o valor atualizado sem disparar re-renderizações indesejadas no timer
  const valorEntradaRef = useRef(valorEntrada);
  useEffect(() => {
    valorEntradaRef.current = valorEntrada;
  }, [valorEntrada]);

  const tocarAlerta = () => {
    try {
      if (localStorage.getItem("SOUND_KEY") === "0") return;
      const audio = new Audio(msnSound);
      audio.volume = 1.0;
      audio.play().catch(() => {});
    } catch (e) {}
  };

  const handleAlternarHoras = () => {
    setHorasCandle(prev => (prev === 4 ? 5 : 4));
  };

  // Cronômetro otimizado
  useEffect(() => {
    const calcularTempoRestante = () => {
      const agora = new Date();
      const offsetLondres = horasCandle === 4 ? 1 : 0;
      const horaLondres = (agora.getUTCHours() + offsetLondres) % 24;

      let duracaoCandleHoras = horasCandle;
      if (horasCandle === 5 && horaLondres === 12) {
        duracaoCandleHoras = 4;
      }

      const duracaoMs = duracaoCandleHoras * 60 * 60 * 1000;
      const utcMs = agora.getTime();
      const proximoFechamentoMs = Math.ceil(utcMs / duracaoMs) * duracaoMs;
      const diferencaMs = proximoFechamentoMs - utcMs;

      if (diferencaMs <= 0) {
        setTempoRestante4H("00:00:00");
        return;
      }

      const totalSegundos = Math.floor(diferencaMs / 1000);
      const horas = Math.floor(totalSegundos / 3600);
      const minutos = Math.floor((totalSegundos % 3600) / 60);
      const segundos = totalSegundos % 60;

      setTempoRestante4H(
        `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`
      );
    };

    calcularTempoRestante();
    const intervalCronometro = setInterval(calcularTempoRestante, 1000);
    return () => clearInterval(intervalCronometro);
  }, [horasCandle]);

  const processarVerificacaoFechamento = (fechamentoAtualStr: string) => {
    if (!fechamentoAtualStr) return;

    setValorSaida(fechamentoAtualStr);
    localStorage.setItem("monitor_saida_manual", fechamentoAtualStr);

    if (modoArmado) {
      const entradaNum = parseFloat(valorEntradaRef.current.replace(",", ".")) || 0;
      const saidaNum = parseFloat(fechamentoAtualStr.replace(",", ".")) || 0;

      if (modoArmado === "TOPO") {
        if (saidaNum > entradaNum) {
          setStatusCor("vermelho");
          localStorage.setItem("monitor_status_cor", "vermelho");
          tocarAlerta();
        } else {
          setStatusCor("azul");
          localStorage.setItem("monitor_status_cor", "azul");
        }
      } else if (modoArmado === "FUNDO") {
        if (saidaNum < entradaNum) {
          setStatusCor("vermelho");
          localStorage.setItem("monitor_status_cor", "vermelho");
          tocarAlerta();
        } else {
          setStatusCor("azul");
          localStorage.setItem("monitor_status_cor", "azul");
        }
      }

      setModoArmado(null);
      setValorReferenciaFechamento(null);
      localStorage.removeItem("monitor_modo_armado");
      localStorage.removeItem("monitor_ref_fechamento");
    }
  };

  // Observador de storage otimizado sem dependência direta de valorEntrada
  useEffect(() => {
    if (!modoArmado) return;

    const intervalVerificacaoStorage = setInterval(() => {
      try {
        const valorStorageAtual = localStorage.getItem("ultimo_4h_fechamento");
        if (valorStorageAtual && valorStorageAtual !== valorReferenciaFechamento) {
          processarVerificacaoFechamento(valorStorageAtual);
        }
      } catch (err) {}
    }, 2000);

    return () => clearInterval(intervalVerificacaoStorage);
  }, [modoArmado, valorReferenciaFechamento]);

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

  const handleArmarTopo = () => {
    try {
      const valorStorage = localStorage.getItem("ultimo_4h_fechamento") || (candles4h.at(-2)?.close !== undefined ? String(candles4h.at(-2)?.close) : "0.000");
      setValorReferenciaFechamento(valorStorage);
      setModoArmado("TOPO");
      localStorage.setItem("monitor_modo_armado", "TOPO");
      localStorage.setItem("monitor_ref_fechamento", valorStorage);
    } catch (err) {}
  };

  const handleArmarFundo = () => {
    try {
      const valorStorage = localStorage.getItem("ultimo_4h_fechamento") || (candles4h.at(-2)?.close !== undefined ? String(candles4h.at(-2)?.close) : "0.000");
      setValorReferenciaFechamento(valorStorage);
      setModoArmado("FUNDO");
      localStorage.setItem("monitor_modo_armado", "FUNDO");
      localStorage.setItem("monitor_ref_fechamento", valorStorage);
    } catch (err) {}
  };

  const handleZerar = () => {
    setValorEntrada("");
    setValorSaida("0.000");
    setStatusCor("normal");
    setModoArmado(null);
    setValorReferenciaFechamento(null);
    try {
      localStorage.removeItem("monitor_entrada_manual");
      localStorage.removeItem("monitor_saida_manual");
      localStorage.removeItem("monitor_status_cor");
      localStorage.removeItem("monitor_modo_armado");
      localStorage.removeItem("monitor_ref_fechamento");
    } catch (err) {}
  };

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
              MONITOR
            </span>
            <div className="flex items-center space-x-1.5">
              <button
                onClick={handleArmarFundo}
                className={`text-[11px] font-mono px-2 py-1 rounded border font-bold shadow cursor-pointer transition-all ${
                  modoArmado === "FUNDO"
                    ? "bg-blue-500 text-white border-white animate-pulse ring-2 ring-blue-400"
                    : "border-blue-600 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white"
                }`}
                title="Armar Fundo (F)"
              >
                F
              </button>
              <button
                onClick={handleArmarTopo}
                className={`text-[11px] font-mono px-2 py-1 rounded border font-bold shadow cursor-pointer transition-all ${
                  modoArmado === "TOPO"
                    ? "bg-red-500 text-white border-white animate-pulse ring-2 ring-red-400"
                    : "border-red-600 bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white"
                }`}
                title="Armar Topo (T)"
              >
                T
              </button>
              <button
                onClick={handleDecrementar}
                className="text-[11px] font-mono px-2.5 py-1 rounded border border-red-600 bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white hover:border-red-500 transition-all font-bold shadow cursor-pointer"
                title="Subtrair 10 pontos"
              >
                -
              </button>
              <button
                onClick={handleIncrementar}
                className="text-[11px] font-mono px-2.5 py-1 rounded border border-blue-600 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white hover:border-blue-500 transition-all font-bold shadow cursor-pointer"
                title="Adicionar 10 pontos"
              >
                +
              </button>
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

        <div className="flex-1 flex flex-col">
          <div className="rounded-xl border border-[#4a4a4a] p-3 flex-1 bg-black flex flex-col justify-center items-center relative">
            <button
              onClick={handleAlternarHoras}
              className="absolute top-2 right-2 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded border border-blue-600 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white hover:border-blue-500 transition-all cursor-pointer shadow"
              title="Alternar entre candle de 4h e 5h"
            >
              {horasCandle}H
            </button>

            <span className="font-semibold text-cyan-300 text-[16px] tracking-wide mb-1">
              {horasCandle}H FECHA EM
            </span>
            <span className="font-extrabold text-white text-[40px] tabular-nums leading-tight tracking-wider">
              {tempoRestante4H}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}