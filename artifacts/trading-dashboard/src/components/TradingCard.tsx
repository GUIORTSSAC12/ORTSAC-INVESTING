import React, { useState, useEffect, useRef } from 'react';
import scannerbg from "../assets/scanner.jpeg";
import msnSound from "../assets/MSN.mp3";

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

interface TradingCardProps {
  divRef?: React.RefObject<HTMLDivElement | null>;
  patternReport?: string | null;          
  basePrice?: number;          
  isInstitutionalActive?: boolean; 
  onPendingChange?: (pending: { title: string; type: string } | null) => void;
}

export default function TradingCard({ 
  divRef, 
  patternReport = null, 
  basePrice = 215000.00,
  isInstitutionalActive = false,
  onPendingChange
}: TradingCardProps) {

  const fontSizeConfig = {
    cardTitle: '16px',
    statusText: '18px',
    labelPx: '18px',
    valuePx: '18px',
  };

  const [dotStep, setDotStep] = useState(1);

  const rawIncomingReport = patternReport;
  const isAguardando = rawIncomingReport ? rawIncomingReport.toUpperCase().includes("AGUARDAR") : false;
  const incomingReport = (isAguardando || !rawIncomingReport) ? null : rawIncomingReport;

  const [activeStrategy, setActiveStrategy] = useState<TradeStrategy | null>(null);
  const [activeReportName, setActiveReportName] = useState<string | null>(null);

  const [pendingStrategy, setPendingStrategy] = useState<{
    reportName: string;
    data: TradeStrategy;
  } | null>(null);

  const lastStopTextRef = useRef<string | null>(null);

  const playSound = () => {
    try {
      if (localStorage.getItem("SOUND_KEY") === "0") return;
      const audio = new Audio(msnSound);
      audio.volume = 1.0;
      audio.play().catch(() => {});
    } catch (e) {}
  };

  useEffect(() => {
    if (onPendingChange) {
      onPendingChange(pendingStrategy ? { title: pendingStrategy.reportName, type: pendingStrategy.data.type } : null);
    }
  }, [pendingStrategy, onPendingChange]);

  // Processamento principal do sinal vindo do ScannerCard (Sem loops!)
  useEffect(() => {
    if (!incomingReport) {
      return;
    }

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

    let isSell = reportUpper.includes("VENDA DIRETA") || reportUpper.includes("VEM DE CIMA");
    if (reportUpper.includes("COMPRA DIRETA")) {
      isSell = false;
    } else if (reportUpper.includes("VEM DE BAIXO") && reportUpper.includes("ESTRATÉGIA 1")) {
      isSell = false; 
    }

    let gainPctNum = 0.70;
    if (baseStratTitle.includes("6")) {
      gainPctNum = 1.00; 
    }

    const isProtected = isInstitutionalActive || reportUpper.includes("PROTEGIDO");

    let sText = "STOP (-0,35%)";
    let sClass = "text-red-500";
    let sVal = 0;

    if (isSell) {
      if (isProtected) {
        sText = "STOP (-0,50%)";
        sVal = Math.round(basePrice * (1 + 0.50 / 100));
      } else {
        sText = "STOP (-0,35%)";
        sVal = Math.round(basePrice * (1 + 0.35 / 100));
      }
    } else {
      if (isProtected) {
        sText = "STOP (-0,50%)";
        sVal = Math.round(basePrice * (1 - 0.50 / 100));
      } else {
        sText = "STOP (-0,35%)";
        sVal = Math.round(basePrice * (1 - 0.35 / 100));
      }
    }

    const gVal = Math.round(basePrice * (isSell ? (1 - gainPctNum / 100) : (1 + gainPctNum / 100)));

    const newCalculatedData: TradeStrategy = {
      type: isSell ? 'VENDA' : 'COMPRA',
      title: baseStratTitle,
      entry: Math.round(basePrice),
      stopVal: sVal,
      gainVal: gVal,
      stopText: sText,
      stopClass: sClass,
      gainText: `GAIN (+${gainPctNum.toFixed(2)}%)`,
    };

    // Usamos o setter funcional para checar o estado anterior sem precisar dele no array de dependências
    setActiveStrategy(currentActive => {
      // Se já for a mesma estratégia, não mexe em nada
      if (currentActive && currentActive.title === baseStratTitle) {
        return currentActive;
      }

      // SWAP: Se houver estratégia ativa diferente, joga para os pendentes
      if (currentActive) {
        setPendingStrategy({
          reportName: baseStratTitle, // ou o nome anterior
          data: currentActive
        });
      }

      // Toca o som apenas quando o foco muda de verdade
      playSound();

      return newCalculatedData;
    });

    setActiveReportName(baseStratTitle);

  }, [incomingReport, basePrice, isInstitutionalActive]);

  useEffect(() => {
    if (activeStrategy) return;
    const timer = setInterval(() => {
      setDotStep((prev) => (prev % 3) + 1);
    }, 400);
    return () => clearInterval(timer);
  }, [activeStrategy]);

  // Ação de resgatar o pendente para o TradingCard (Aqui faz barulho, pois o pendente virou foco!)
  const handleResetCard = () => {
    if (pendingStrategy) {
      setActiveStrategy(pendingStrategy.data);
      setActiveReportName(pendingStrategy.reportName);
      setPendingStrategy(null);
      lastStopTextRef.current = pendingStrategy.data.stopText;
      playSound(); // Faz barulho ao reativar o trade que estava na fila
    } else {
      setActiveStrategy(null);
      setActiveReportName(null);
      lastStopTextRef.current = null;
    }
  };

  const isConfirmed = activeStrategy !== null;
  const isSellOperation = activeStrategy?.type === 'VENDA';

  const statusColor = !isConfirmed 
    ? 'text-cyan-300 drop-shadow-[0_0_10px_#22d3ee]' 
    : isSellOperation ? 'text-red-500 drop-shadow-[0_0_10px_#ef4444]' : 'text-blue-500 drop-shadow-[0_0_10px_#3b82f6]';

  const barColor = !isConfirmed 
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
              TRADING {pendingStrategy && <span className="text-[10px] text-amber-400 font-mono">[PENDENTE NA FILA]</span>}
            </span>

            <div className="flex items-center mt-1">
              <h2 style={{ fontSize: fontSizeConfig.statusText }} className={`font-bold tracking-wider transition-colors duration-300 ${statusColor}`}>
                {isConfirmed ? `${activeStrategy?.type} CONFIRMADA` : 'MONITORANDO SCANNER'}
              </h2>
              {!isConfirmed && (
                <span className="inline-flex items-center ml-1 space-x-1">
                  <span className={`h-1.5 w-1.5 rounded-full ${dotStep === 1 ? 'bg-cyan-300 opacity-100 shadow-[0_0_8px_#22d3ee]' : 'bg-cyan-800 opacity-30'}`} />
                  <span className={`h-1.5 w-1.5 rounded-full ${dotStep === 2 ? 'bg-cyan-300 opacity-100 shadow-[0_0_8px_#22d3ee]' : 'bg-cyan-800 opacity-30'}`} />
                  <span className={`h-1.5 w-1.5 rounded-full ${dotStep === 3 ? 'bg-cyan-300 opacity-100 shadow-[0_0_8px_#22d3ee]' : 'bg-cyan-800 opacity-30'}`} />
                </span>
              )}
            </div>
          </div>

          {isConfirmed && (
            <button 
              onClick={handleResetCard}
              title="Zerar ou Resgatar Pendente"
              className="text-[9px] font-mono px-2 py-1 bg-red-950/80 border border-red-500/40 text-red-300 rounded hover:bg-red-900 transition-colors"
            >
              [Zerar / Swap]
            </button>
          )}
        </div>

        <div className="w-full">
          <div className="relative w-full h-2 flex items-center">
            <div className={`absolute inset-0 h-1.5 rounded-full transition-colors duration-300 ${barColor}`} />
            {!isConfirmed && (
              <div className="absolute h-3.5 w-3.5 rounded-full bg-white shadow-[0_0_14px_#22d3ee] animate-scanner-restart" />
            )}
          </div>
        </div>

        {isConfirmed && activeStrategy ? (
          <div className="flex flex-col space-y-1.5 py-1 font-mono">
            <div className="text-[10px] text-cyan-300 font-bold truncate mb-1">
              FOCO: {activeReportName}
            </div>

            <div className="flex justify-between items-center px-1 py-0.5">
              <span style={{ fontSize: fontSizeConfig.labelPx }} className={`${activeStrategy.stopClass} font-bold uppercase tracking-wider`}>
                {activeStrategy.stopText}
              </span>
              <span style={{ fontSize: fontSizeConfig.valuePx }} className={`${activeStrategy.stopClass} font-bold tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]`}>
                {activeStrategy.stopVal.toLocaleString('pt-BR')}
              </span>
            </div>

            <div className="flex justify-between items-center px-1 py-0.5">
              <span style={{ fontSize: fontSizeConfig.labelPx }} className="text-white font-bold uppercase tracking-wider">
                Entrada
              </span>
              <span style={{ fontSize: fontSizeConfig.valuePx }} className="text-cyan-200 font-bold tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                {activeStrategy.entry.toLocaleString('pt-BR')}
              </span>
            </div>

            <div className="flex justify-between items-center px-1 py-0.5">
              <span style={{ fontSize: fontSizeConfig.labelPx }} className="text-emerald-600 font-bold uppercase tracking-wider">
                {activeStrategy.gainText}
              </span>
              <span style={{ fontSize: fontSizeConfig.valuePx }} className="text-emerald-600 font-bold tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                {activeStrategy.gainVal.toLocaleString('pt-BR')}
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

          <div className="text-[9px] font-mono text-cyan-400">
            {isConfirmed ? "[Ativo]" : "[Aguardando Sinal]"}
          </div>
        </div>

      </div>

      <style>{`
        @keyframes restartSlide {
          0% { left: 0%; transform: translateX(0); opacity: 1; }
          95% { left: 100%; transform: translateX(-100%); opacity: 1; }
          96% { opacity: 0; }
          100% { left: 0%; transform: translateX(0); opacity: 0; }
        }
        .animate-scanner-restart {
          animation: restartSlide 2s linear infinite;
        }
      `}</style>
    </div>
  );
}