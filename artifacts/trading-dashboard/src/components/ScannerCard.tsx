import React, { useState, useEffect } from "react";
import scannerbg from "../assets/scanner.jpeg";
import {
  getGlobalAnimationProgress,
  getGlobalDotStep,
  useGlobalAnimationClock,
} from "./globalAnimationClock";

interface ScannerCardProps {
  divRef?: React.RefObject<HTMLDivElement | null>;
  selectedValidation?: string | null;
  precoAtual?: number | null;
  onPatternChange?: (report: string | null) => void;
  onActionTriggered?: (actionData: { type: string; target: number; action: string }) => void;
}

export default function ScannerCard({
  divRef,
  selectedValidation = null,
  precoAtual = null,
  onPatternChange,
  onActionTriggered,
}: ScannerCardProps) {
  const globalAnimationNow = useGlobalAnimationClock();
  const animationProgress = getGlobalAnimationProgress(globalAnimationNow);
  const dotStep = getGlobalDotStep(globalAnimationNow);

  const [confirmedReport, setConfirmedReport] = useState<string | null>(() => {
    try {
      return localStorage.getItem("scanner_confirmed_report");
    } catch {
      return null;
    }
  });

  const [isConfirmed, setIsConfirmed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("scanner_is_confirmed") === "true";
    } catch {
      return false;
    }
  });

  const [targetValue, setTargetValue] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem("scanner_target_value");
      return saved ? parseFloat(saved) : null;
    } catch {
      return null;
    }
  });

  const [isTriggered, setIsTriggered] = useState<boolean>(() => {
    try {
      return localStorage.getItem("scanner_is_triggered") === "true";
    } catch {
      return false;
    }
  });

  const handleZerarScanner = () => {
    setIsConfirmed(false);
    setIsTriggered(false);
    setConfirmedReport(null);
    setTargetValue(null);

    localStorage.removeItem("scanner_confirmed_report");
    localStorage.removeItem("scanner_is_confirmed");
    localStorage.removeItem("scanner_target_value");
    localStorage.removeItem("scanner_is_triggered");

    onPatternChange?.(null);
  };

  const handleSimularToque = () => {
    if (!isConfirmed) return;

    const isFundo = confirmedReport?.startsWith("FUND");
    const acao = isFundo ? "COMPRA" : "VENDA";
    
    setIsTriggered(true);
    try {
      localStorage.setItem("scanner_is_triggered", "true");
    } catch (e) {}

    const baseText = confirmedReport?.split("|")[0] || (isFundo ? "FUNDO" : "TOPO");
    const mensagemAlvoAlcancado = `${baseText} | PREÇO ATUAL TOCADO NO ALVO | AÇÃO: ${acao}`;
    
    setConfirmedReport(mensagemAlvoAlcancado);
    
    // CORREÇÃO CRUCIAL: Passa o relatório de alvo atingido para o componente Pai / TradingCard
    onPatternChange?.(mensagemAlvoAlcancado);

    onActionTriggered?.({
      type: isFundo ? "FUNDO" : "TOPO",
      target: targetValue || 0,
      action: acao,
    });
  };
  // Sincroniza do localStorage quando o evento de atualizar for disparado
  useEffect(() => {
    const handleAtualizar = () => {
      try {
        // TRAVA DE SEGURANÇA: Se já foi disparado na tela, não deixa o evento sobrescrever
        if (localStorage.getItem("scanner_is_triggered") === "true") return;

        const reportSalvo = localStorage.getItem("scanner_confirmed_report");
        const confirmadoSalvo = localStorage.getItem("scanner_is_confirmed") === "true";
        const targetSalvo = localStorage.getItem("scanner_target_value");
        const disparadoSalvo = localStorage.getItem("scanner_is_triggered") === "true";

        if (reportSalvo) setConfirmedReport(reportSalvo);
        setIsConfirmed(confirmadoSalvo);
        if (targetSalvo) setTargetValue(parseFloat(targetSalvo));
        setIsTriggered(disparadoSalvo);
      } catch (e) {}
    };

    window.addEventListener("atualizar_scanner", handleAtualizar);
    window.addEventListener("storage", handleAtualizar);

    return () => {
      window.removeEventListener("atualizar_scanner", handleAtualizar);
      window.removeEventListener("storage", handleAtualizar);
    };
  }, []);
  useEffect(() => {
    if (!selectedValidation) return;

    const code = selectedValidation.toUpperCase();
    const isFundo = code.startsWith("F");
    const tipoTexto = isFundo ? "FUNDO" : "TOPO";

    let valorAlvo = "";

    // 1. Tenta a chave direta exata
    const directKey = `regioes_${code}`;
    const directVal = localStorage.getItem(directKey);

    if (directVal && directVal.trim() !== "" && directVal !== "0" && directVal !== "0.000") {
      valorAlvo = directVal.trim();
    } else {
      // 2. Varredura por chaves alternativas comuns no localStorage
      const possibleKeys = [
        `regioes_${code.toLowerCase()}`,
        isFundo ? `regioes_fundo_${code}` : `regioes_topo_${code}`,
        isFundo ? `regioes_fundo_${code.toLowerCase()}` : `regioes_topo_${code.toLowerCase()}`,
        isFundo ? `fundo_${code}` : `topo_${code}`,
        code.toLowerCase(),
        code,
        `regiao_${code.toLowerCase()}`
      ];

      for (const key of possibleKeys) {
        try {
          const val = localStorage.getItem(key);
          if (val && val.trim() !== "" && val !== "0" && val !== "0.000") {
            valorAlvo = val.trim();
            break;
          }
        } catch (e) {}
      }

      // 3. Se ainda não achou, tenta procurar dentro de objetos JSON salvos no localStorage
      if (!valorAlvo) {
        for (let i = 0; i < localStorage.length; i++) {
          const storageKey = localStorage.key(i);
          if (storageKey && (storageKey.includes("regiao") || storageKey.includes("topo") || storageKey.includes("fundo") || storageKey.includes("scanner"))) {
            try {
              const rawData = localStorage.getItem(storageKey);
              if (rawData && rawData.startsWith("{")) {
                const parsed = JSON.parse(rawData);
                const found = parsed[code] || parsed[code.toLowerCase()] || parsed.regioes?.[code] || parsed.regioes?.[code.toLowerCase()];
                if (found != null && String(found).trim() !== "" && String(found) !== "0") {
                  valorAlvo = String(found).trim();
                  break;
                }
              }
            } catch (err) {}
          }
        }
      }
    }

    if (!valorAlvo) {
      valorAlvo = "0.000";
    }

    const numericTarget = parseFloat(valorAlvo.replace(",", "."));
    setTargetValue(isNaN(numericTarget) ? 0 : numericTarget);
    setIsTriggered(false);

    try {
      localStorage.setItem("scanner_target_value", String(numericTarget));
      localStorage.removeItem("scanner_is_triggered");
    } catch (e) {}

    const mensagemFinal = `${tipoTexto} - ${valorAlvo} | AGUARDANDO O PREÇO ATUAL TOCAR NO ALVO`;

    setIsConfirmed(true);
    setConfirmedReport(mensagemFinal);
    onPatternChange?.(mensagemFinal);

    try {
      localStorage.setItem("scanner_confirmed_report", mensagemFinal);
      localStorage.setItem("scanner_is_confirmed", "true");
    } catch (e) {}

  }, [selectedValidation]);

  useEffect(() => {
    if (!isConfirmed || isTriggered || precoAtual === null || targetValue === null) return;

    const isFundo = confirmedReport?.startsWith("FUND");
    const acao = isFundo ? "COMPRA" : "VENDA";

    let touched = false;

    if (isFundo && precoAtual <= targetValue) {
      touched = true;
    } else if (!isFundo && precoAtual >= targetValue) {
      touched = true;
    }

    if (touched) {
      setIsTriggered(true);
      try {
        localStorage.setItem("scanner_is_triggered", "true");
      } catch (e) {}

      const baseText = confirmedReport?.split("|")[0] || (isFundo ? "FUNDO" : "TOPO");
      const mensagemAlvoAlcancado = `${baseText} | PREÇO ATUAL TOCADO NO ALVO | AÇÃO: ${acao}`;
      
      setConfirmedReport(mensagemAlvoAlcancado);
      
      // Garante o disparo automático também no toque real por preço
      onPatternChange?.(mensagemAlvoAlcancado);

      onActionTriggered?.({
        type: isFundo ? "FUNDO" : "TOPO",
        target: targetValue,
        action: acao,
      });
    }
  }, [precoAtual, isConfirmed, isTriggered, targetValue, confirmedReport, onPatternChange, onActionTriggered]);

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
          <span style={{ fontSize: "16px" }} className="font-bold tracking-wider text-cyan-400 uppercase block">
            SCANNER
          </span>

          <div className="flex items-center mt-1">
            <h2 className={`text-lg md:text-xl font-bold tracking-wider transition-colors duration-300 ${isTriggered ? "text-emerald-400 drop-shadow-[0_0_10px_#34d399]" : isConfirmed ? "text-emerald-400 drop-shadow-[0_0_10px_#34d399]" : "text-cyan-300 drop-shadow-[0_0_10px_#22d3ee]"}`}>
              {isTriggered ? "ALVO ATINGIDO!" : isConfirmed ? "PADRÃO CONFIRMADO" : "MONITORANDO PADRÃO"}
            </h2>
            {!isConfirmed && (
              <span className="inline-flex items-center ml-1 space-x-1">
                <span className={`h-1.5 w-1.5 rounded-full transition-opacity duration-200 ${dotStep === 1 ? "bg-cyan-300 opacity-100 shadow-[0_0_8px_#22d3ee]" : "bg-cyan-800 opacity-30"}`} />
                <span className={`h-1.5 w-1.5 rounded-full transition-opacity duration-200 ${dotStep === 2 ? "bg-cyan-300 opacity-100 shadow-[0_0_8px_#22d3ee]" : "bg-cyan-800 opacity-30"}`} />
                <span className={`h-1.5 w-1.5 rounded-full transition-opacity duration-200 ${dotStep === 3 ? "bg-cyan-300 opacity-100 shadow-[0_0_8px_#22d3ee]": "bg-cyan-800 opacity-30"}`} />
              </span>
            )}
          </div>
        </div>

        <div className="w-full">
          <div className="relative w-full h-2 flex items-center">
            <div className={`absolute inset-0 h-1.5 rounded-full transition-colors duration-300 ${isTriggered ? "bg-emerald-400 shadow-[0_0_12px_#34d399]" : isConfirmed ? "bg-emerald-400 shadow-[0_0_12px_#34d399]" : "bg-cyan-400 shadow-[0_0_12px_#22d3ee]"}`} />
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
            <p style={{ fontSize: "18px" }} className="font-mono font-bold text-emerald-300 tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] leading-tight uppercase">
              {confirmedReport}
            </p>
          </div>
        )}

        <div className="mt-auto pt-1 flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            {isConfirmed && !isTriggered && (
              <button
                onClick={handleSimularToque}
                className="text-[10px] font-mono px-2 py-1 rounded bg-emerald-950/60 border border-emerald-800/80 text-emerald-400 hover:bg-emerald-900/80 hover:text-emerald-200 transition-colors uppercase tracking-wider shadow"
                title="Simular que o preço atual bateu no alvo"
              >
                Simular Toque
              </button>
            )}
          </div>

          <div className="flex items-center space-x-1.5 ml-auto">
            <button
              onClick={handleZerarScanner}
              className="text-[10px] font-mono px-2 py-1 rounded bg-red-950/60 border border-red-800/80 text-red-400 hover:bg-red-900/80 hover:text-red-200 transition-colors uppercase tracking-wider shadow"
              title="Zerar status do scanner"
            >
              Zerar Scanner
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}