import React, { useEffect, useRef, useState } from "react";
import scannerbg from "../assets/scanner.jpeg";
import msnSound from "../assets/MSN.mp3";
import {
  getGlobalAnimationProgress,
  getGlobalDotStep,
  useGlobalAnimationClock,
} from "./globalAnimationClock";

interface ScannerCardProps {
  divRef?: React.RefObject<HTMLDivElement | null>;
  patternReport?: string | null;
  timeRemaining?: string | null;
  onPatternChange?: (report: string | null) => void;
}

export default function ScannerCard({
  divRef,
  patternReport = null,
  timeRemaining = "02:00:00",
  onPatternChange,
}: ScannerCardProps) {
  const globalAnimationNow = useGlobalAnimationClock();
  const animationProgress = getGlobalAnimationProgress(globalAnimationNow);
  const dotStep = getGlobalDotStep(globalAnimationNow);
  const [testReport, setTestReport] = useState<string | null>(null);

  const [confirmedReport, setConfirmedReport] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasAlertedRef = useRef(false);

  const testIndexRef = useRef(0);
  const [displayIndex, setDisplayIndex] = useState(0);

  const incomingReport: string | null =
    patternReport !== null ? patternReport : testReport;

  // Inicializa o elemento de áudio do MSN
  useEffect(() => {
    audioRef.current = new Audio(msnSound);
  }, []);

  const getMinutesRemaining = (timeStr: string | null): number => {
    if (!timeStr) {
      return 999;
    }

    const parts = timeStr.split(":").map(Number);

    if (parts.length === 3) {
      return parts[0] * 60 + parts[1] + parts[2] / 60;
    }

    if (parts.length === 2) {
      return parts[0] + parts[1] / 60;
    }

    return 999;
  };

  // Monitora o tempo restante para disparar o som nos últimos 10 minutos
  useEffect(() => {
    const mins = getMinutesRemaining(timeRemaining);
    if (mins <= 10 && mins > 0) {
      if (!hasAlertedRef.current && audioRef.current) {
        audioRef.current.play().catch((err) => console.log("Erro ao tocar áudio:", err));
        hasAlertedRef.current = true;
      }
    } else if (mins > 10) {
      hasAlertedRef.current = false;
    }
  }, [timeRemaining]);

  useEffect(() => {
    if (incomingReport === null || incomingReport === "") {
      return;
    }

    setConfirmedReport(incomingReport);
    setIsConfirmed(true);
    onPatternChange?.(incomingReport);

    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // Se estiver no estado de AGUARDAR, o card NÃO expira em 10 minutos
    const isAguardando = incomingReport.toUpperCase().includes("AGUARDAR");

    if (!isAguardando) {
      timerRef.current = setTimeout(() => {
        setIsConfirmed(false);
        setConfirmedReport(null);

        if (patternReport === null) {
          setTestReport(null);
        }

        onPatternChange?.(null);
        timerRef.current = null;
      }, 10 * 60 * 1000);
    }

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [incomingReport, patternReport, onPatternChange]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const renderDots = () => {
    return (
      <span className="inline-flex items-center ml-1 space-x-1">
        <span
          className={`h-1.5 w-1.5 rounded-full transition-opacity duration-200 ${
            dotStep === 1
              ? "bg-cyan-300 opacity-100 shadow-[0_0_8px_#22d3ee]"
              : "bg-cyan-800 opacity-30"
          }`}
        />
        <span
          className={`h-1.5 w-1.5 rounded-full transition-opacity duration-200 ${
            dotStep === 2
              ? "bg-cyan-300 opacity-100 shadow-[0_0_8px_#22d3ee]"
              : "bg-cyan-800 opacity-30"
          }`}
        />
        <span
          className={`h-1.5 w-1.5 rounded-full transition-opacity duration-200 ${
            dotStep === 3
              ? "bg-cyan-300 opacity-100 shadow-[0_0_8px_#22d3ee]"
              : "bg-cyan-800 opacity-30"
          }`}
        />
      </span>
    );
  };

  // Ciclo de testes onde o ScannerCard define explicitamente a direção (Venda Direta / Compra Direta / Aguardar)
  const cycleTest = () => {
    const nextIndex = (testIndexRef.current + 1) % 8;
    testIndexRef.current = nextIndex;
    setDisplayIndex(nextIndex);

    let reportResult: string | null = null;

    switch (nextIndex) {
      case 1:
        reportResult = "VEM DE CIMA - ESTRATÉGIA 4 (AGUARDAR)";
        break;
      case 2:
        reportResult = "VEM DE CIMA - ESTRATÉGIA 2 (AGUARDAR)";
        break;
      case 3:
        reportResult = "VEM DE BAIXO - ESTRATÉGIA 1 (AGUARDAR)";
        break;
      case 4:
        // Venda Direta identificada pelo Scanner
        reportResult = "VEM DE CIMA - ESTRATÉGIA 6 - VENDA DIRETA";
        break;
      case 5:
        // Compra Direta identificada pelo Scanner (para testar o Swap para a fila de pendentes)
        reportResult = "VEM DE CIMA - ESTRATÉGIA 1 - COMPRA DIRETA";
        break;
      case 6:
        reportResult = "VEM DE BAIXO - ESTRATÉGIA 3 (AGUARDAR)";
        break;
      case 7:
      default:
        reportResult = null; // Volta a monitorar
        break;
    }

    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    setTestReport(reportResult);

    if (reportResult === null) {
      setIsConfirmed(false);
      setConfirmedReport(null);
      onPatternChange?.(null);
    } else {
      setConfirmedReport(reportResult);
      setIsConfirmed(true);
      onPatternChange?.(reportResult);
    }
  };

  const getButtonLabel = () => {
    if (displayIndex === 0) return "Monitorando";
    if (displayIndex === 1) return "Est. 4 (Aguardar)";
    if (displayIndex === 2) return "Est. 2 (Aguardar)";
    if (displayIndex === 3) return "Est. 1 (Aguardar)";
    if (displayIndex === 4) return "Venda Direta (Est. 6)";
    if (displayIndex === 5) return "Compra Direta (Est. 1)";
    if (displayIndex === 6) return "Est. 3 (Aguardar)";
    return "Zerar";
  };

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
        <div>
          <span
            style={{ fontSize: "16px" }}
            className="font-bold tracking-wider text-cyan-400 uppercase block"
          >
            SCANNER
          </span>

          <div className="flex items-center mt-1">
            <h2
              className={`text-lg md:text-xl font-bold tracking-wider transition-colors duration-300 ${
                isConfirmed
                  ? "text-emerald-400 drop-shadow-[0_0_10px_#34d399]"
                  : "text-cyan-300 drop-shadow-[0_0_10px_#22d3ee]"
              }`}
            >
              {isConfirmed
                ? "PADRÃO CONFIRMADO"
                : "MONITORANDO PADRÃO"}
            </h2>

            {!isConfirmed && renderDots()}
          </div>
        </div>

        <div className="w-full">
          <div className="relative w-full h-2 flex items-center">
            <div
              className={`absolute inset-0 h-1.5 rounded-full transition-colors duration-300 ${
                isConfirmed
                  ? "bg-emerald-400 shadow-[0_0_12px_#34d399]"
                  : "bg-cyan-400 shadow-[0_0_12px_#22d3ee]"
              }`}
            />

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

        {isConfirmed && (
          <div className="py-1">
            <p className="font-mono text-sm md:text-base font-bold text-emerald-300 tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
              {confirmedReport}
            </p>
          </div>
        )}

        <div className="mt-auto pt-1 flex items-center justify-between">
          <div className="text-[9px] font-mono tracking-widest text-cyan-500/60 uppercase">
            [Radar Ativo]
          </div>

          <button
            onClick={cycleTest}
            className="text-[9px] font-mono px-2 py-0.5 bg-black/60 border border-cyan-500/30 text-cyan-400 rounded hover:bg-cyan-900/80 transition-colors"
          >
            [Testar: {getButtonLabel()}]
          </button>
        </div>
      </div>

    </div>
  );
}