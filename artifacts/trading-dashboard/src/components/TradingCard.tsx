import React, { useState, useEffect, useRef } from "react";
import scannerbg from "../assets/scanner.jpeg";
import msnSound from "../assets/MSN.mp3";
import {
  getGlobalAnimationProgress,
  getGlobalDotStep,
  useGlobalAnimationClock,
} from "./globalAnimationClock";
import type { StrategySignal } from "../types/strategy";

export interface TradeStrategy {
  type: "COMPRA" | "VENDA";
  title: string;
  entry: number;
  stopVal: number;
  gainVal: number;
  zoneVal: number;
  stopText: string;
  stopClass: string;
  gainText: string;
}

const INITIAL_STOP_PCT = 0.2; 
const STOP_EXTRA_POINTS = 0.010; 
const INITIAL_GAIN_PCT = 0.6; 
const ZONE_PCT = 0.70; 
const PROTECTION_TRIGGER_PCT = 0.3; 
const PROTECTED_STOP_PCT = 0.1; 

const formatForexPrice = (value: number | null | undefined): string => {
  if (value == null || !Number.isFinite(value)) return "—";
  return Number(value.toFixed(3)).toFixed(3);
};

const extractPriceFromReport = (report: string | null): number | null => {
  if (!report) return null;
  
  const matches = report.match(/(\d+[\.,]\d+|\d+)/g);
  if (!matches) return null;

  for (let i = matches.length - 1; i >= 0; i--) {
    const normalized = matches[i].replace(",", ".");
    const parsed = parseFloat(normalized);
    if (!isNaN(parsed) && parsed > 10) {
      return parsed;
    }
  }
  
  return null;
};

interface TradingCardProps {
  divRef?: React.RefObject<HTMLDivElement | null>;
  patternReport?: string | null;
  strategySignal?: StrategySignal;
  basePrice?: number;
  precoAtual?: number | null;
}

export default function TradingCard({
  divRef,
  patternReport = null,
  strategySignal,
  basePrice = 215.0,
  precoAtual = null,
}: TradingCardProps) {
  
  const priceFromReport = extractPriceFromReport(patternReport);

  const referencePrice =
    priceFromReport != null
      ? priceFromReport
      : precoAtual != null && Number.isFinite(precoAtual) && precoAtual > 0
      ? precoAtual
      : basePrice;

  const calculationPrice = Number(referencePrice.toFixed(3));

  const fontSizeConfig = {
    cardTitle: "16px",
    statusText: "20px",
    labelPx: "18px",
    valuePx: "24px",
  };

  const globalAnimationNow = useGlobalAnimationClock();
  const animationProgress = getGlobalAnimationProgress(globalAnimationNow);
  const dotStep = getGlobalDotStep(globalAnimationNow);

  const rawIncomingReport = patternReport;
  const isAguardando = rawIncomingReport
    ? rawIncomingReport.toUpperCase().includes("AGUARDAR")
    : false;

  const incomingReport =
    isAguardando || !rawIncomingReport ? null : rawIncomingReport;

  const [activeStrategy, setActiveStrategy] = useState<TradeStrategy | null>(() => {
    try {
      const saved = localStorage.getItem("TRADING_CARD_ACTIVE_STRATEGY");
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [activeReportName, setActiveReportName] = useState<string | null>(() => {
    return localStorage.getItem("TRADING_CARD_REPORT_NAME") || null;
  });

  const [isStopProtected, setIsStopProtected] = useState<boolean>(() => {
    const savedStrategy = localStorage.getItem("TRADING_CARD_ACTIVE_STRATEGY");
    if (!savedStrategy) return false;
    return localStorage.getItem("TRADING_CARD_STOP_PROTECTED") === "true";
  });

  const mountTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (activeStrategy) {
      localStorage.setItem("TRADING_CARD_ACTIVE_STRATEGY", JSON.stringify(activeStrategy));
    } else {
      localStorage.removeItem("TRADING_CARD_ACTIVE_STRATEGY");
    }
  }, [activeStrategy]);

  useEffect(() => {
    if (activeReportName) {
      localStorage.setItem("TRADING_CARD_REPORT_NAME", activeReportName);
    } else {
      localStorage.removeItem("TRADING_CARD_REPORT_NAME");
    }
  }, [activeReportName]);

  useEffect(() => {
    localStorage.setItem("TRADING_CARD_STOP_PROTECTED", String(isStopProtected));
  }, [isStopProtected]);

  const processedIncomingKeyRef = useRef<string | null>(null);

  const playSound = () => {
    try {
      if (localStorage.getItem("SOUND_KEY") === "0") return;

      const audio = new Audio(msnSound);
      audio.volume = 1.0;
      audio.play().catch(() => {});
    } catch (e) {}
  };

  const clearCard = () => {
    localStorage.removeItem("TRADING_CARD_ACTIVE_STRATEGY");
    localStorage.removeItem("TRADING_CARD_REPORT_NAME");
    localStorage.removeItem("TRADING_CARD_STOP_PROTECTED");

    setActiveStrategy(null);
    setActiveReportName(null);
    setIsStopProtected(false);
    mountTimeRef.current = Date.now();
  };

  useEffect(() => {
    if (!incomingReport) {
      processedIncomingKeyRef.current = null;
      return;
    }

    processedIncomingKeyRef.current = incomingReport;

    localStorage.removeItem("TRADING_CARD_STOP_PROTECTED");
    setIsStopProtected(false);
    mountTimeRef.current = Date.now();

    const reportUpper = incomingReport.toUpperCase();
    const isSell = reportUpper.includes("VENDA") || reportUpper.includes("TOPO");

    const stopPct = INITIAL_STOP_PCT; 
    const gainPct = INITIAL_GAIN_PCT; 

    const sText = `STOP (-${stopPct.toFixed(2)}%)`;
    const gText = `GAIN (+${gainPct.toFixed(2)}%)`;

    const sVal = Number(
      (
        calculationPrice *
          (isSell ? 1 + stopPct / 100 : 1 - stopPct / 100) +
        (isSell ? STOP_EXTRA_POINTS : -STOP_EXTRA_POINTS)
      ).toFixed(3),
    );

    const gVal = Number(
      (
        calculationPrice * (isSell ? 1 - gainPct / 100 : 1 + gainPct / 100)
      ).toFixed(3),
    );

    const zVal = Number(
      (
        calculationPrice * (isSell ? 1 - ZONE_PCT / 100 : 1 + ZONE_PCT / 100)
      ).toFixed(3),
    );

    const newCalculatedData: TradeStrategy = {
      type: isSell ? "VENDA" : "COMPRA",
      title: reportUpper.split("|")[0].trim() || "PADRÃO",
      entry: calculationPrice,
      stopVal: sVal,
      gainVal: gVal,
      zoneVal: zVal,
      stopText: sText,
      stopClass: "text-red-500",
      gainText: gText,
    };

    setActiveStrategy(newCalculatedData);
    setActiveReportName(newCalculatedData.title);
    playSound();
  }, [incomingReport, calculationPrice]);

  useEffect(() => {
    if (!activeStrategy || precoAtual == null || !Number.isFinite(precoAtual)) {
      return;
    }

    if (Date.now() - mountTimeRef.current < 1500) {
      return;
    }

    const isSell = activeStrategy.type === "VENDA";
    const entry = activeStrategy.entry;

    const movementPct = isSell
      ? ((entry - precoAtual) / entry) * 100
      : ((precoAtual - entry) / entry) * 100;

    if (movementPct >= PROTECTION_TRIGGER_PCT && !isStopProtected) {
      setIsStopProtected(true);
      playSound();
    }

    const currentStopVal = isStopProtected
      ? Number(
          (
            entry *
            (isSell ? 1 - PROTECTED_STOP_PCT / 100 : 1 + PROTECTED_STOP_PCT / 100)
          ).toFixed(3),
        )
      : activeStrategy.stopVal;

    const hitGain = isSell ? precoAtual <= activeStrategy.gainVal : precoAtual >= activeStrategy.gainVal;
    const hitStop = isStopProtected
      ? isSell ? precoAtual >= currentStopVal : precoAtual <= currentStopVal
      : isSell ? precoAtual >= activeStrategy.stopVal : precoAtual <= activeStrategy.stopVal;

    if (hitGain || hitStop) {
      playSound();
      clearCard();
    }
  }, [precoAtual, activeStrategy, isStopProtected]);

  const isConfirmed = activeStrategy !== null;
  const isSellOperation = activeStrategy?.type === "VENDA";

  const renderedStopText = isStopProtected
    ? `STOP (+${PROTECTED_STOP_PCT.toFixed(2)}%)`
    : `STOP (-${INITIAL_STOP_PCT.toFixed(2)}%)`;

  const renderedStopClass = isStopProtected ? "text-blue-500" : "text-red-500";

  const renderedStopValue =
    activeStrategy
      ? Number(
          (
            activeStrategy.entry *
              (isStopProtected
                ? isSellOperation
                  ? 1 - PROTECTED_STOP_PCT / 100
                  : 1 + PROTECTED_STOP_PCT / 100
                : isSellOperation
                  ? 1 + INITIAL_STOP_PCT / 100
                  : 1 - INITIAL_STOP_PCT / 100) +
            (!isStopProtected
              ? isSellOperation
                ? STOP_EXTRA_POINTS
                : -STOP_EXTRA_POINTS
              : 0)
          ).toFixed(3),
        )
      : 0;

  const statusColor = !isConfirmed
    ? "text-cyan-300 drop-shadow-[0_0_10px_#22d3ee]"
    : isSellOperation
      ? "text-red-500 drop-shadow-[0_0_10px_#ef4444]"
      : "text-blue-500 drop-shadow-[0_0_10px_#3b82f6]";

  const barColor = !isConfirmed
    ? "bg-cyan-400 shadow-[0_0_12px_#22d3ee]"
    : isSellOperation
      ? "bg-red-500 shadow-[0_0_12px_#ef4444]"
      : "bg-blue-500 shadow-[0_0_12px_#3b82f6]";

  return (
    <div
      ref={divRef}
      className="relative overflow-hidden rounded-2xl border border-[#4a4a4a] bg-black p-5 flex flex-col h-auto min-h-[360px] shadow-lg"
    >
      <img
        src={scannerbg}
        alt=""
        className="absolute inset-0 w-full h-full object-cover opacity-80 pointer-events-none"
        draggable={false}
      />

      <div className="relative z-10 flex flex-col h-full space-y-3">
        <div>
          <span
            style={{ fontSize: fontSizeConfig.cardTitle }}
            className="font-bold tracking-wider text-cyan-400 uppercase block"
          >
            TRADING
          </span>

          <div className="flex items-center mt-1">
            <h2
              style={{ fontSize: fontSizeConfig.statusText }}
              className={`font-bold tracking-wider uppercase transition-colors duration-300 ${statusColor}`}
            >
              {isConfirmed
                ? `${activeStrategy?.type} CONFIRMADA`
                : "MONITORANDO SCANNER"}
            </h2>

            {!isConfirmed && (
              <span className="inline-flex items-center ml-1 space-x-1">
                <span className={`h-1.5 w-1.5 rounded-full transition-opacity duration-200 ${dotStep === 1 ? "bg-cyan-300 opacity-100 shadow-[0_0_8px_#22d3ee]" : "bg-cyan-800 opacity-30"}`} />
                <span className={`h-1.5 w-1.5 rounded-full transition-opacity duration-200 ${dotStep === 2 ? "bg-cyan-300 opacity-100 shadow-[0_0_8px_#22d3ee]" : "bg-cyan-800 opacity-30"}`} />
                <span className={`h-1.5 w-1.5 rounded-full transition-opacity duration-200 ${dotStep === 3 ? "bg-cyan-300 opacity-100 shadow-[0_0_8px_#22d3ee]" : "bg-cyan-800 opacity-30"}`} />
              </span>
            )}
          </div>
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

            {isSellOperation ? (
              <>
                <div className="flex justify-between items-center px-1 py-0.5">
                  <span
                    style={{ fontSize: fontSizeConfig.labelPx }}
                    className={`${renderedStopClass} font-bold uppercase tracking-wider`}
                  >
                    {renderedStopText}
                  </span>
                  <span
                    style={{ fontSize: fontSizeConfig.valuePx }}
                    className={`${renderedStopClass} font-bold tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]`}
                  >
                    {formatForexPrice(renderedStopValue)}
                  </span>
                </div>

                <div className="flex justify-between items-center px-1 py-0.5">
                  <span
                    style={{ fontSize: fontSizeConfig.labelPx }}
                    className="text-white font-bold uppercase tracking-wider"
                  >
                    Entrada
                  </span>
                  <span
                    style={{ fontSize: fontSizeConfig.valuePx }}
                    className="text-cyan-200 font-bold tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
                  >
                    {formatForexPrice(activeStrategy.entry)}
                  </span>
                </div>

                <div className="flex justify-between items-center px-1 py-0.5">
                  <span
                    style={{ fontSize: fontSizeConfig.labelPx }}
                    className="text-emerald-500 font-bold uppercase tracking-wider"
                  >
                    {activeStrategy.gainText}
                  </span>
                  <span
                    style={{ fontSize: fontSizeConfig.valuePx }}
                    className="text-emerald-500 font-bold tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
                  >
                    {formatForexPrice(activeStrategy.gainVal)}
                  </span>
                </div>

                {/* ZONE (-0.70%) ABAIXO DO GAIN PARA VENDA (EM VERMELHO) */}
                <div className="flex justify-between items-center px-1 py-0.5">
                  <span
                    style={{ fontSize: fontSizeConfig.labelPx }}
                    className="text-red-500 font-bold uppercase tracking-wider"
                  >
                    ZONE (-0.70%)
                  </span>
                  <span
                    style={{ fontSize: fontSizeConfig.valuePx }}
                    className="text-red-500 font-bold tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
                  >
                    {formatForexPrice(activeStrategy.zoneVal)}
                  </span>
                </div>
              </>
            ) : (
              <>
                {/* ZONE (+0.70%) ACIMA DO GAIN PARA COMPRA (EM VERMELHO) */}
                <div className="flex justify-between items-center px-1 py-0.5">
                  <span
                    style={{ fontSize: fontSizeConfig.labelPx }}
                    className="text-red-500 font-bold uppercase tracking-wider"
                  >
                    ZONE (+0.70%)
                  </span>
                  <span
                    style={{ fontSize: fontSizeConfig.valuePx }}
                    className="text-red-500 font-bold tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
                  >
                    {formatForexPrice(activeStrategy.zoneVal)}
                  </span>
                </div>

                <div className="flex justify-between items-center px-1 py-0.5">
                  <span
                    style={{ fontSize: fontSizeConfig.labelPx }}
                    className="text-emerald-500 font-bold uppercase tracking-wider"
                  >
                    {activeStrategy.gainText}
                  </span>
                  <span
                    style={{ fontSize: fontSizeConfig.valuePx }}
                    className="text-emerald-500 font-bold tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
                  >
                    {formatForexPrice(activeStrategy.gainVal)}
                  </span>
                </div>

                <div className="flex justify-between items-center px-1 py-0.5">
                  <span
                    style={{ fontSize: fontSizeConfig.labelPx }}
                    className="text-white font-bold uppercase tracking-wider"
                  >
                    Entrada
                  </span>
                  <span
                    style={{ fontSize: fontSizeConfig.valuePx }}
                    className="text-cyan-200 font-bold tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
                  >
                    {formatForexPrice(activeStrategy.entry)}
                  </span>
                </div>

                <div className="flex justify-between items-center px-1 py-0.5">
                  <span
                    style={{ fontSize: fontSizeConfig.labelPx }}
                    className={`${renderedStopClass} font-bold uppercase tracking-wider`}
                  >
                    {renderedStopText}
                  </span>
                  <span
                    style={{ fontSize: fontSizeConfig.valuePx }}
                    className={`${renderedStopClass} font-bold tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]`}
                  >
                    {formatForexPrice(renderedStopValue)}
                  </span>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="py-4"></div>
        )}

        <div className="mt-auto pt-1 flex items-center justify-between">
          <div className="flex items-center space-x-1.5"></div>

          <div className="flex items-center space-x-1.5 ml-auto">
            <button
              onClick={clearCard}
              className="text-[10px] font-mono px-2 py-1 rounded bg-red-950/60 border border-red-800/80 text-red-400 hover:bg-red-900/80 hover:text-red-200 transition-colors uppercase tracking-wider shadow"
              title="Zerar status do card"
            >
              Zerar Card
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}