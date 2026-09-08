import React, { useState, useEffect, useRef } from 'react';
import scannerbg from "../assets/scanner.jpeg";
import msnSound from "../assets/MSN.mp3";
import {
  getGlobalAnimationProgress,
  getGlobalDotStep,
  useGlobalAnimationClock,
} from "./globalAnimationClock";
import * as VemDeCima from "../engine/vem-de-cima";
import * as VemDeBaixo from "../engine/vem-de-baixo";
import * as Institucional from "../engine/institucional";
import type { StrategySignal } from "../types/strategy";

interface TradeStrategy {
  type: 'COMPRA' | 'VENDA';
  title: string;
  entry: number;
  stopVal: number;
  gainVal: number;
  stopText: string;
  stopClass: string;
  gainText: string;
}

const PROTECTION_TRIGGER_PCT = 0.50;
const PROTECTED_STOP_PCT = 0.10;

const formatForexPrice = (value: number | null | undefined): string => {
  if (value == null || !Number.isFinite(value)) return "—";
  return Number(value.toFixed(3)).toFixed(3);
};

interface TradingCardProps {
  divRef?: React.RefObject<HTMLDivElement | null>;
  patternReport?: string | null;          
  strategySignal?: StrategySignal;
  basePrice?: number;          
  precoAtual?: number | null;
  atrAtual?: number | null;
  media20?: number | null;
  media99?: number | null;
  institutionalCandle?: {
    open: number;
    high: number;
    low: number;
    close: number;
  } | null;
  secondInstitutionalCandle?: {
    close: number;
  } | null;
  institutionalPivot?: number | null;
  isInstitutionalActive?: boolean; 
  onPendingChange?: (pending: { title: string; type: string } | null) => void;
}

export default function TradingCard({ 
  divRef, 
  patternReport = null, 
  strategySignal,
  basePrice = 215000.00,
  precoAtual = null,
  atrAtual = null,
  media20 = null,
  media99 = null,
  institutionalCandle = null,
  secondInstitutionalCandle = null,
  institutionalPivot = null,
  isInstitutionalActive = false,
  onPendingChange
}: TradingCardProps) {
  const referencePrice =
    precoAtual != null &&
    Number.isFinite(precoAtual) &&
    precoAtual > 0
      ? precoAtual
      : basePrice;
  const calculationPrice = Number(referencePrice.toFixed(3));

  const fontSizeConfig = {
    cardTitle: '16px',
    statusText: '20px',
    labelPx: '18px',
    valuePx: '18px',
  };

  const globalAnimationNow = useGlobalAnimationClock();
  const animationProgress = getGlobalAnimationProgress(globalAnimationNow);
  const dotStep = getGlobalDotStep(globalAnimationNow);

  const rawIncomingReport = patternReport;
  const isAguardando = rawIncomingReport ? rawIncomingReport.toUpperCase().includes("AGUARDAR") : false;
  const incomingReport = (isAguardando || !rawIncomingReport) ? null : rawIncomingReport;

  const [activeStrategy, setActiveStrategy] = useState<TradeStrategy | null>(null);
  const [activeReportName, setActiveReportName] = useState<string | null>(null);

  const [pendingStrategy, setPendingStrategy] = useState<{
    reportName: string;
    data: TradeStrategy;
  } | null>(null);
  const [guardianStatus, setGuardianStatus] = useState<string | null>(null);
  const [guardianCancelled, setGuardianCancelled] = useState(false);
  const [institutionalStopPct, setInstitutionalStopPct] = useState<number | null>(null);
  const [isStopProtected, setIsStopProtected] = useState(false);

  const lastStopTextRef = useRef<string | null>(null);
  const onPendingChangeRef = useRef(onPendingChange);
  const processedIncomingKeyRef = useRef<string | null>(null);
  onPendingChangeRef.current = onPendingChange;

  const playSound = () => {
    try {
      if (localStorage.getItem("SOUND_KEY") === "0") return;
      const audio = new Audio(msnSound);
      audio.volume = 1.0;
      audio.play().catch(() => {});
    } catch (e) {}
  };

  useEffect(() => {
    onPendingChangeRef.current?.(
      pendingStrategy
        ? { title: pendingStrategy.reportName, type: pendingStrategy.data.type }
        : null,
    );
  }, [pendingStrategy]);

  // Guardião: reprocessa a engine correspondente sempre que o preço ou o ATR
  // mudam, sem substituir os valores visuais de entrada, stop e gain.
  useEffect(() => {
    setGuardianStatus(null);
    setGuardianCancelled(false);
    setInstitutionalStopPct(null);

    if (!strategySignal) return;

    const livePrice = referencePrice;
    const liveAtr = atrAtual;
    let status = `GUARDIÃO ATIVO: ${strategySignal.direction} · ESTRATÉGIA ${strategySignal.strategyId}`;
    let cancelled = false;
    let stopPct: number | null = null;
    let engineResult: { acao: string; status: string } | null = null;

    if (typeof livePrice === "number" && Number.isFinite(livePrice) &&
        typeof liveAtr === "number" && Number.isFinite(liveAtr)) {
      const candle = institutionalCandle;
      const bodyLow = candle ? Math.min(candle.open, candle.close) : livePrice;
      const bodyHigh = candle ? Math.max(candle.open, candle.close) : livePrice;
      const media20Valida = media20 == null || !Number.isFinite(media20)
        ? true
        : bodyLow > media20;
      const corpoAbaixoDa99 = media99 == null || !Number.isFinite(media99)
        ? true
        : bodyHigh < media99;
      const media20TocouCorpo = media20 != null && Number.isFinite(media20)
        ? media20 >= bodyLow && media20 <= bodyHigh
        : false;
      const maxima = candle?.high ?? livePrice;
      const minima = candle?.low ?? livePrice;

      if (strategySignal.direction === "VEM DE CIMA") {
        switch (strategySignal.strategyId) {
          case 1:
            engineResult = VemDeCima.processarEstrategia1VemDeCima({
              teveToqueNa99DeCima: true,
              atrAtual: liveAtr,
            });
            break;
          case 2:
            engineResult = VemDeCima.processarEstrategia2VemDeCima({
              teveToqueNa99DeCima: true,
              atrAtual: liveAtr,
              proximoCandleFechado: true,
            });
            break;
          case 3:
            engineResult = VemDeCima.processarEstrategia3VemDeCima({
              teveToqueNa99DeCima: true,
              atrAtual: liveAtr,
            });
            break;
          case 4:
            engineResult = VemDeCima.processarEstrategia4VemDeCima({
              teveToqueNa99DeCima: true,
              atrAtual: liveAtr,
              proximoCandleFechado: true,
            });
            break;
          case 5:
            engineResult = VemDeCima.processarEstrategia5VemDeCima({
              teveToqueNa99DeCima: true,
              atrAtual2H: liveAtr,
              atrAnterior2H: liveAtr - 0.01,
              fechamentoCorpoAbaixoDaMedia99: media99 == null || livePrice < media99,
            });
            break;
          case 6:
            engineResult = VemDeCima.processarEstrategia6VemDeCima({
              teveToqueNa99DeCima: true,
              atrAtual: liveAtr,
              precoAtual: livePrice,
              maximaCandleToque: maxima,
              minimaCandleToque: minima,
              estadoAtual: { fase: "AGUARDANDO_ATIVACAO" },
            });
            break;
        }
      } else {
        switch (strategySignal.strategyId) {
          case 1:
            engineResult = VemDeBaixo.processarEstrategia1VemDeBaixo({
              teveToqueNa99DeBaixo: true,
              atrAtual: liveAtr,
              precoAtual: livePrice,
              maximaCandleAtual: maxima,
              estadoAtual: { fase: "MONITORANDO_TOPO" },
            });
            break;
          case 2:
            engineResult = VemDeBaixo.processarEstrategia2VemDeBaixo({
              teveToqueNa99DeBaixo: true,
              atrAtual: liveAtr,
              toqueOcorreuNoCandleAberto: false,
              corpoInstitucionalInteiroAcimaDa20: media20Valida,
              corpoInstitucionalAbaixoDa99: corpoAbaixoDa99,
              media20TocouCorpoInstitucional: media20TocouCorpo,
            });
            break;
          case 3:
            engineResult = VemDeBaixo.processarEstrategia3VemDeBaixo({
              teveToqueNa99DeBaixo: true,
              atrAtual: liveAtr,
              precoAtual: livePrice,
              maximaCandleAtual: maxima,
              estadoAtual: { fase: "MONITORANDO_MAXIMA" },
            });
            break;
          case 4:
            engineResult = VemDeBaixo.processarEstrategia4VemDeBaixo({
              teveToqueNa99DeBaixo: true,
              atrAtual: liveAtr,
              precoAtual: livePrice,
              minimaCandleAnterior: strategySignal.minimaFundoMarcada ?? minima,
              media20AbaixoDoCorpo: media20Valida,
              media20TocouApenasPavio: false,
              estadoAtual: { fase: "MONITORANDO_FUNDO" },
            });
            break;
        }
      }

      // Regra específica do fundo marcado: o reteste é monitorado pelo preço
      // em tempo real, e o limiar operacional é exatamente 0.310.
      if (
        strategySignal.direction === "VEM DE BAIXO" &&
        strategySignal.strategyId === 4 &&
        strategySignal.minimaFundoMarcada != null
      ) {
        const reteste = VemDeBaixo.avaliarRetesteMinimaEstrategia4({
          precoAtual: livePrice,
          atrAtual: liveAtr,
          minimaFundoMarcada: strategySignal.minimaFundoMarcada,
        });
        status = reteste.status;
        if (reteste.acao === "CANCELAR") {
          cancelled = true;
        }
      }

      if (!cancelled && engineResult && ["CANCELAR", "EXCLUSAO"].includes(engineResult.acao)) {
        cancelled = true;
        status = engineResult.status;
      }
    } else {
      status = "GUARDIÃO AGUARDANDO PREÇO E ATR ATUAIS";
    }

    // Regras do institucional são aplicadas à direção de toda entrada.
    // A segunda validação só é executada quando o candle correspondente é
    // fornecido, evitando tratar o mesmo candle como primeiro e segundo.
    if (
      institutionalCandle &&
      media20 != null &&
      Number.isFinite(media20)
    ) {
      const ajuste = Institucional.avaliarAjusteStopInstitucional({
        direcaoOperacao: strategySignal.action === "VENDA" ? "VENDA" : "COMPRA",
        aberturaCandle: institutionalCandle.open,
        fechamentoCandle: institutionalCandle.close,
        media20Gráfico2H: media20,
      });
      stopPct = Math.abs(ajuste.novoStop);
      status = `${status} · INSTITUCIONAL: ${ajuste.motivo}`;

      if (
        secondInstitutionalCandle &&
        media99 != null &&
        Number.isFinite(media99)
      ) {
        const segundo = Institucional.avaliarSegundoInstitucional({
          direcaoOperacao: strategySignal.action === "VENDA" ? "VENDA" : "COMPRA",
          fechamentoCorpo: secondInstitutionalCandle.close,
          media99Grafico2H: media99,
        });
        status = `${status} · ${segundo.motivo}`;
        if (segundo.acao === "SAIR_imediato") cancelled = true;
      }
    }

    if (institutionalPivot != null && Number.isFinite(institutionalPivot)) {
      const parede = Institucional.avaliarFiltroExposicaoParede({
        precoEntrada: referencePrice,
        valorParedePivot: institutionalPivot,
      });
      if (!parede.permitirAjusteStop) {
        stopPct = 0.35;
        status = `${status} · ${parede.motivo}`;
      }
    }

    setGuardianStatus(status);
    setGuardianCancelled(cancelled);
    setInstitutionalStopPct(stopPct);
  }, [
    strategySignal,
    precoAtual,
    referencePrice,
    atrAtual,
    media20,
    media99,
    institutionalCandle,
    secondInstitutionalCandle,
    institutionalPivot,
  ]);

  // Processamento principal estritamente baseado no sinal recebido do ScannerCard
  useEffect(() => {
    if (!incomingReport) {
      processedIncomingKeyRef.current = null;
      return;
    }

    const incomingKey = `${incomingReport}|${strategySignal?.strategyId ?? ""}|${strategySignal?.action ?? ""}`;
    if (processedIncomingKeyRef.current === incomingKey) {
      return;
    }
    processedIncomingKeyRef.current = incomingKey;

    const reportUpper = incomingReport.toUpperCase();

    let baseStratTitle = "ESTRATÉGIA";
    if (reportUpper.includes("ESTRATÉGIA")) {
      const parts = incomingReport.split("-");
      if (parts.length > 1) {
        baseStratTitle = parts[1].trim();
        baseStratTitle = baseStratTitle.split("(")[0].trim();
        baseStratTitle = `ESTRATÉGIA ${baseStratTitle.replace(/[^0-9]/g, '')}`;
      } else {
        baseStratTitle = incomingReport;
      }
    } else {
      baseStratTitle = incomingReport;
    }

    let isSell = strategySignal
      ? strategySignal.action === "VENDA" ||
        (strategySignal.action !== "COMPRA" &&
          (reportUpper.includes("VENDA DIRETA") || reportUpper.includes("VEM DE CIMA")))
      : reportUpper.includes("VENDA DIRETA") || reportUpper.includes("VEM DE CIMA");
    if (!strategySignal && reportUpper.includes("COMPRA DIRETA")) {
      isSell = false;
    } else if (!strategySignal && reportUpper.includes("VEM DE BAIXO") && reportUpper.includes("ESTRATÉGIA 1")) {
      isSell = false; 
    }

    // Identificação de venda explícita no relatório
    if (reportUpper.includes("VENDA")) {
      isSell = true;
    } else if (reportUpper.includes("COMPRA")) {
      isSell = false;
    }

    let gainPctNum = 0.70;
    if (baseStratTitle.includes("6")) {
      gainPctNum = 1.00; 
    }

    const isProtected = isInstitutionalActive || reportUpper.includes("PROTEGIDO");
    const stopPct = isProtected ? 0.50 : 0.35;

    let sText = `STOP (-${stopPct.toFixed(2)}%)`;

    // CORREÇÃO DO CÁLCULO DO STOP (Antes estava fixado em 0)
    const sVal = Number(
      (calculationPrice * (isSell ? (1 + stopPct / 100) : (1 - stopPct / 100))).toFixed(3),
    );
    const gVal = Number(
      (calculationPrice * (isSell ? (1 - gainPctNum / 100) : (1 + gainPctNum / 100))).toFixed(3),
    );

    const newCalculatedData: TradeStrategy = {
      type: isSell ? 'VENDA' : 'COMPRA',
      title: baseStratTitle.toUpperCase(),
      entry: calculationPrice,
      stopVal: sVal,
      gainVal: gVal,
      stopText: sText,
      stopClass: "text-red-500", // Stop é sempre vermelho indicando risco/perda
      gainText: `GAIN (+${gainPctNum.toFixed(2)}%)`,
    };

    setActiveStrategy(currentActive => {
      if (currentActive && currentActive.title === baseStratTitle) {
        return currentActive;
      }

      if (currentActive) {
        setPendingStrategy({
          reportName: baseStratTitle,
          data: currentActive
        });
      } else {
        setPendingStrategy(null);
      }

      setIsStopProtected(false);
      playSound();
      return newCalculatedData;
    });

    setActiveReportName(baseStratTitle);

  }, [incomingReport, strategySignal, referencePrice, isInstitutionalActive]);

  // Proteção de gain: o gatilho é avaliado apenas com um precoAtual válido
  // e fica travado depois de acionado, mesmo se houver retração posterior.
  useEffect(() => {
    if (!activeStrategy) return;
    if (
      precoAtual == null ||
      !Number.isFinite(precoAtual) ||
      precoAtual <= 0 ||
      !Number.isFinite(activeStrategy.entry) ||
      activeStrategy.entry <= 0
    ) {
      return;
    }

    const movimentoFavoravel = activeStrategy.type === "COMPRA"
      ? ((precoAtual - activeStrategy.entry) / activeStrategy.entry) * 100
      : ((activeStrategy.entry - precoAtual) / activeStrategy.entry) * 100;

    if (movimentoFavoravel >= PROTECTION_TRIGGER_PCT) {
      setIsStopProtected(true);
    }
  }, [activeStrategy, precoAtual]);

  const handleResetCard = () => {
    if (pendingStrategy) {
      const activeToQueue = activeStrategy
        ? {
            reportName: activeReportName ?? activeStrategy.title,
            data: activeStrategy,
          }
        : null;

      setActiveStrategy(pendingStrategy.data);
      setActiveReportName(pendingStrategy.reportName);
      setPendingStrategy(activeToQueue);
      setIsStopProtected(false);
      lastStopTextRef.current = pendingStrategy.data.stopText;
      setGuardianStatus(null);
      setGuardianCancelled(false);
      setInstitutionalStopPct(null);
      playSound(); 
    } else {
      setActiveStrategy(null);
      setActiveReportName(null);
      lastStopTextRef.current = null;
      setPendingStrategy(null);
      setIsStopProtected(false);
      setGuardianStatus(null);
      setGuardianCancelled(false);
      setInstitutionalStopPct(null);
    }
  };

  const isConfirmed = activeStrategy !== null;
  const isSellOperation = activeStrategy?.type === 'VENDA';
  const renderedStopPct = isStopProtected
    ? PROTECTED_STOP_PCT
    : institutionalStopPct ?? null;
  const renderedStopValue =
    activeStrategy && renderedStopPct != null
      ? Number(
          (
            activeStrategy.entry *
            (isSellOperation ? (1 - renderedStopPct / 100) : (1 + renderedStopPct / 100))
          ).toFixed(3),
        )
      : activeStrategy?.stopVal;
  const renderedStopText =
    isStopProtected
      ? `STOP PROTEGIDO (+${PROTECTED_STOP_PCT.toFixed(2)}%)`
      : renderedStopPct != null
      ? `STOP (-${renderedStopPct.toFixed(2)}%)`
      : activeStrategy?.stopText;
  const renderedStopClass = isStopProtected
    ? "text-blue-500"
    : activeStrategy?.stopClass;

  const statusColor = guardianCancelled
    ? 'text-red-500 drop-shadow-[0_0_10px_#ef4444]'
    : !isConfirmed
    ? 'text-cyan-300 drop-shadow-[0_0_10px_#22d3ee]' 
    : isSellOperation ? 'text-red-500 drop-shadow-[0_0_10px_#ef4444]' : 'text-blue-500 drop-shadow-[0_0_10px_#3b82f6]';

  const barColor = guardianCancelled
    ? 'bg-red-500 shadow-[0_0_12px_#ef4444]'
    : !isConfirmed
    ? 'bg-cyan-400 shadow-[0_0_12px_#22d3ee]' 
    : isSellOperation ? 'bg-red-500 shadow-[0_0_12px_#ef4444]' : 'bg-blue-500 shadow-[0_0_12px_#3b82f6]';

  return (
    <div 
      ref={divRef}
      className="relative overflow-hidden rounded-2xl border border-[#4a4a4a] bg-black p-5 flex flex-col h-full min-h-[220px] shadow-lg"
    >
      <img
        src={scannerbg}
        alt=""
        className="absolute inset-0 w-full h-full object-cover opacity-80 pointer-events-none"
        draggable={false}
      />

      <div className="relative z-10 flex flex-col h-full space-y-3">

        <div className="flex justify-between items-start">
          <div>
            <span style={{ fontSize: fontSizeConfig.cardTitle }} className="font-bold tracking-wider text-cyan-400 uppercase block">
              TRADING {pendingStrategy && <span className="text-[10px] text-amber-400 font-mono uppercase">[PENDENTE NA FILA]</span>}
            </span>

            <div className="flex items-center mt-1">
              <h2 style={{ fontSize: fontSizeConfig.statusText }} className={`font-bold tracking-wider uppercase transition-colors duration-300 ${statusColor}`}>
                {guardianCancelled
                  ? 'OPERAÇÃO CANCELADA'
                  : isConfirmed
                    ? `${activeStrategy?.type} CONFIRMADA`
                    : 'MONITORANDO SCANNER'}
              </h2>
              {!isConfirmed && (
                <span className="inline-flex items-center ml-1 space-x-1">
                  <span className={`h-1.5 w-1.5 rounded-full transition-opacity duration-200 ${dotStep === 1 ? 'bg-cyan-300 opacity-100 shadow-[0_0_8px_#22d3ee]' : 'bg-cyan-800 opacity-30'}`} />
                  <span className={`h-1.5 w-1.5 rounded-full transition-opacity duration-200 ${dotStep === 2 ? 'bg-cyan-300 opacity-100 shadow-[0_0_8px_#22d3ee]' : 'bg-cyan-800 opacity-30'}`} />
                  <span className={`h-1.5 w-1.5 rounded-full transition-opacity duration-200 ${dotStep === 3 ? 'bg-cyan-300 opacity-100 shadow-[0_0_8px_#22d3ee]' : 'bg-cyan-800 opacity-30'}`} />
                </span>
              )}
            </div>
          </div>

          {isConfirmed && (
            <button 
              onClick={handleResetCard}
              title="Zerar ou Resgatar Pendente"
              className="text-[9px] font-mono px-2 py-1 bg-red-950/80 border border-red-500/40 text-red-300 rounded hover:bg-red-900 transition-colors uppercase"
            >
              [Zerar / Swap]
            </button>
          )}
        </div>

        <div className="w-full">
          <div className="relative w-full h-2 flex items-center">
            <div className={`absolute inset-0 h-1.5 rounded-full transition-colors duration-300 ${barColor}`} />
            {!isConfirmed && (
              <div
                className="absolute h-3.5 w-3.5 rounded-full bg-white shadow-[0_0_14px_#22d3ee]"
                style={{
                  left: `${animationProgress * 100}%`,
                  opacity: animationProgress >= 0.96 ? 0 : 1,
                  transform: animationProgress >= 0.95 ? "translateX(-100%)" : "none",
                }}
              />
            )}
          </div>
        </div>

        {isConfirmed && activeStrategy ? (
          <div className="flex flex-col space-y-1.5 py-1 font-mono uppercase">
            <div className="text-[10px] text-cyan-300 font-bold truncate mb-1">
              FOCO: {activeReportName}
            </div>
            {guardianStatus && (
              <div className={`text-[9px] leading-tight ${guardianCancelled ? "text-red-300" : "text-amber-300"}`}>
                {guardianStatus}
              </div>
            )}

            <div className="flex justify-between items-center px-1 py-0.5">
              <span style={{ fontSize: fontSizeConfig.labelPx }} className={`${renderedStopClass} font-bold uppercase tracking-wider`}>
                {renderedStopText}
              </span>
              <span style={{ fontSize: fontSizeConfig.valuePx }} className={`${renderedStopClass} font-bold tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]`}>
                {formatForexPrice(renderedStopValue)}
              </span>
            </div>

            <div className="flex justify-between items-center px-1 py-0.5">
              <span style={{ fontSize: fontSizeConfig.labelPx }} className="text-white font-bold uppercase tracking-wider">
                Entrada
              </span>
              <span style={{ fontSize: fontSizeConfig.valuePx }} className="text-cyan-200 font-bold tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                {formatForexPrice(activeStrategy.entry)}
              </span>
            </div>

            <div className="flex justify-between items-center px-1 py-0.5">
              <span style={{ fontSize: fontSizeConfig.labelPx }} className="text-emerald-600 font-bold uppercase tracking-wider">
                {activeStrategy.gainText}
              </span>
              <span style={{ fontSize: fontSizeConfig.valuePx }} className="text-emerald-600 font-bold tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                {formatForexPrice(activeStrategy.gainVal)}
              </span>
            </div>
          </div>
        ) : (
          <div className="py-4"></div>
        )}

        <div className="mt-auto pt-1 flex items-center justify-between">
          <div className="text-[9px] font-mono tracking-widest text-cyan-500/60 uppercase">
            [Módulo de Execução]
          </div>

          <div className="text-[9px] font-mono text-cyan-400 uppercase">
            {isConfirmed ? "[Ativo]" : "[Aguardando Sinal]"}
          </div>
        </div>

      </div>

    </div>
  );
}