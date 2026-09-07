import React, { useEffect, useRef, useState } from "react";
import scannerbg from "../assets/scanner.jpeg";
import msnSound from "../assets/MSN.mp3";
import {
  getGlobalAnimationProgress,
  getGlobalDotStep,
  useGlobalAnimationClock,
} from "./globalAnimationClock";

// Imports da Engine de Vem de Cima, Vem de Baixo, Regras e Validação
import * as VemDeCima from "../engine/vem-de-cima";
import * as VemDeBaixo from "../engine/vem-de-baixo";
import * as Regras from "../engine/Regras";
import * as Validacao from "../engine/validação";

interface ScannerCardProps {
  divRef?: React.RefObject<HTMLDivElement | null>;
  patternReport?: string | null;
  timeRemaining?: string | null;
  onPatternChange?: (report: string | null) => void;
  
  // Dados de mercado repassados em tempo real
  atrAtual?: number;
  corFundoMedia20?: "AZUL" | "VERMELHO";
  candleFechado?: boolean;
  teveToqueNa99?: boolean;
  precoAtual?: number;
  valorMedia99?: number; // Adicionado para a conferência matemática exata
  maximaCandle?: number;
  minimaCandle?: number;
}

function formatStrategyMessage(
  direcao: "VEM DE CIMA" | "VEM DE BAIXO",
  resultado: { status: string; acao?: string | null },
  regiaoAtr: string,
): string | null {
  const acao = resultado.acao?.trim().toUpperCase();
  if (!acao || acao.startsWith("IGNOR")) return null;

  return `[${direcao}] - ${resultado.status} (Região: ${regiaoAtr}) | AÇÃO: ${acao}`;
}

export default function ScannerCard({
  divRef,
  patternReport = null,
  timeRemaining = "02:00:00",
  onPatternChange,
  atrAtual = 0.400,
  corFundoMedia20 = "AZUL",
  candleFechado = true,
  teveToqueNa99 = true,
  precoAtual = 209.022,
  valorMedia99 = 213.338,
  maximaCandle = 100.5,
  minimaCandle = 99.5,
}: ScannerCardProps) {
  const globalAnimationNow = useGlobalAnimationClock();
  const animationProgress = getGlobalAnimationProgress(globalAnimationNow);
  const dotStep = getGlobalDotStep(globalAnimationNow);
  
  const [testReport, setTestReport] = useState<string | null>(null);
  const [confirmedReport, setConfirmedReport] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);

  // Estados locais para persistir a memória de certas estratégias
  const [estadoEst6Cima, setEstadoEst6Cima] = useState<VemDeCima.EstadoEstrategia6>({
    fase: "AGUARDANDO_ATIVACAO"
  });
  const [atrRefCima2, setAtrRefCima2] = useState<number | undefined>(undefined);
  const [atrRefCima4, setAtrRefCima4] = useState<number | undefined>(undefined);

  const [estadoEst1Baixo, setEstadoEst1Baixo] = useState<VemDeBaixo.EstadoEstrategia1VemDeBaixo>({
    fase: "MONITORANDO_TOPO"
  });
  const [estadoEst3Baixo, setEstadoEst3Baixo] = useState<VemDeBaixo.EstadoEstrategia3VemDeBaixo>({
    fase: "MONITORANDO_MAXIMA"
  });
  const [estadoEst4Baixo, setEstadoEst4Baixo] = useState<VemDeBaixo.EstadoEstrategia4VemDeBaixo>({
    fase: "MONITORANDO_FUNDO"
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasAlertedRef = useRef(false);
  const onPatternChangeRef = useRef(onPatternChange);
  const patternReportRef = useRef(patternReport);
  onPatternChangeRef.current = onPatternChange;
  patternReportRef.current = patternReport;

  const testIndexRef = useRef(0);
  const [displayIndex, setDisplayIndex] = useState(0);

  const incomingReport: string | null =
    patternReport !== null ? patternReport : testReport;

  // Inicializa o elemento de áudio do MSN
  useEffect(() => {
    audioRef.current = new Audio(msnSound);
  }, []);

  const getMinutesRemaining = (timeStr: string | null): number => {
    if (!timeStr) return 999;
    const parts = timeStr.split(":").map(Number);
    if (parts.length === 3) return parts[0] * 60 + parts[1] + parts[2] / 60;
    if (parts.length === 2) return parts[0] + parts[1] / 60;
    return 999;
  };

  // Dispara o som nos últimos 10 minutos
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

  // ==========================================
  // LOOP DE VARREDURA REAL DAS ESTRATÉGIAS DA ENGINE
  // ==========================================
  useEffect(() => {
    if (testReport !== null) return; // Se houver teste manual ativo, pausa o automático
    if (isConfirmed) return; // Se já estiver confirmado, pausa novas varreduras

    const monitoringInterval = setInterval(() => {
      try {
        // ==========================================
        // CAMADA 1: O VALIDAÇÃO.TS RODA PRIMEIRO (COM PREÇO EM TEMPO REAL)
        // ==========================================
        const validacaoToque = Validacao.validarToqueGlobal2H({
          corFundoMedia20Grafico2H: corFundoMedia20,
          precoAtualMercado: precoAtual,
          valorMedia99Grafico2H: valorMedia99,
          teveToqueNa99: teveToqueNa99,
          candleFechado: candleFechado,
          respiroCandleOk: true,
          atrAtual: atrAtual,
        });

        if (!validacaoToque.valido) return;

        // ==========================================
        // CAMADA 2: O REGRAS.TS RODA EM SEGUIDA (Contexto e Soberania)
        // ==========================================
        const resultadoRegras = Regras.verificarRestricoesGlobais2H({
          candleFechado: candleFechado,
          statusBanner: "MERCADO_ABERTO",
          diaDaSemana: "QUARTA",
          operacaoAberta: false,
        });

        if (!resultadoRegras.permitido) return;

        const mensagemAtiva = { value: null as string | null };

        // ==========================================
        // CAMADA 3: DISPARO DA ENGINE USANDO A DIREÇÃO APROVADA
        // ==========================================
        if (validacaoToque.direcao === "VEM_DE_CIMA") {
          const toqueCima = teveToqueNa99;
          const aplicarResultado = (resultado: { status: string; acao?: string | null }) => {
            const mensagem = formatStrategyMessage(
              "VEM DE CIMA",
              resultado,
              validacaoToque.regiaoAtr,
            );
            if (mensagem) mensagemAtiva.value = mensagem;
          };

          // Estratégia 1: Vem de Cima
          const res1Cima = VemDeCima.processarEstrategia1VemDeCima({
            teveToqueNa99DeCima: toqueCima,
            atrAtual,
          });
          aplicarResultado(res1Cima);

          // Estratégia 2: Vem de Cima
          const res2Cima = VemDeCima.processarEstrategia2VemDeCima({
            teveToqueNa99DeCima: toqueCima,
            atrAtual,
            atrReferenciaSalvo: atrRefCima2,
            proximoCandleFechado: candleFechado,
          });
          if (res2Cima.novoAtrReferencia !== undefined) setAtrRefCima2(res2Cima.novoAtrReferencia);
          if (res2Cima.limparReferencia) setAtrRefCima2(undefined);
          aplicarResultado(res2Cima);

          // Estratégia 3: Vem de Cima (Zona de Exclusão)
          const res3Cima = VemDeCima.processarEstrategia3VemDeCima({
            teveToqueNa99DeCima: toqueCima,
            atrAtual,
          });
          aplicarResultado(res3Cima);

          // Estratégia 4: Vem de Cima (Reversão de Fluxo)
          const res4Cima = VemDeCima.processarEstrategia4VemDeCima({
            teveToqueNa99DeCima: toqueCima,
            atrAtual,
            atrReferenciaSalvo: atrRefCima4,
            proximoCandleFechado: candleFechado,
          });
          if (res4Cima.novoAtrReferencia !== undefined) setAtrRefCima4(res4Cima.novoAtrReferencia);
          if (res4Cima.limparReferencia) setAtrRefCima4(undefined);
          aplicarResultado(res4Cima);

          // Estratégia 5: Vem de Cima
          const res5Cima = VemDeCima.processarEstrategia5VemDeCima({
            teveToqueNa99DeCima: toqueCima,
            atrAtual2H: atrAtual,
            atrAnterior2H: atrAtual - 0.01,
            fechamentoCorpoAbaixoDaMedia99: precoAtual < 100,
          });
          aplicarResultado(res5Cima);

          // Estratégia 6: Vem de Cima (Reteste de Topo Dinâmico)
          const res6Cima = VemDeCima.processarEstrategia6VemDeCima({
            teveToqueNa99DeCima: toqueCima,
            atrAtual,
            precoAtual,
            maximaCandleToque: maximaCandle,
            minimaCandleToque: minimaCandle,
            estadoAtual: estadoEst6Cima,
          });
          setEstadoEst6Cima(res6Cima.novoEstado);
          aplicarResultado(res6Cima);

        } 
        else if (validacaoToque.direcao === "VEM_DE_BAIXO") {
          const toqueBaixo = teveToqueNa99;
          const aplicarResultado = (resultado: { status: string; acao?: string | null }) => {
            const mensagem = formatStrategyMessage(
              "VEM DE BAIXO",
              resultado,
              validacaoToque.regiaoAtr,
            );
            if (mensagem) mensagemAtiva.value = mensagem;
          };

          // Estratégia 1: Vem de Baixo
          const res1Baixo = VemDeBaixo.processarEstrategia1VemDeBaixo({
            teveToqueNa99DeBaixo: toqueBaixo,
            atrAtual,
            precoAtual,
            maximaCandleAtual: maximaCandle,
            estadoAtual: estadoEst1Baixo,
          });
          setEstadoEst1Baixo(res1Baixo.novoEstado);
          aplicarResultado(res1Baixo);

          // Estratégia 2: Vem de Baixo
          const res2Baixo = VemDeBaixo.processarEstrategia2VemDeBaixo({
            teveToqueNa99DeBaixo: toqueBaixo,
            atrAtual,
            toqueOcorreuNoCandleAberto: !candleFechado,
            corpoInstitucionalInteiroAcimaDa20: true,
            corpoInstitucionalAbaixoDa99: true,
            media20TocouCorpoInstitucional: false,
          });
          aplicarResultado(res2Baixo);

          // Estratégia 3: Vem de Baixo
          const res3Baixo = VemDeBaixo.processarEstrategia3VemDeBaixo({
            teveToqueNa99DeBaixo: toqueBaixo,
            atrAtual,
            precoAtual,
            maximaCandleAtual: maximaCandle,
            estadoAtual: estadoEst3Baixo,
          });
          setEstadoEst3Baixo(res3Baixo.novoEstado);
          aplicarResultado(res3Baixo);

          // Estratégia 4: Vem de Baixo
          const res4Baixo = VemDeBaixo.processarEstrategia4VemDeBaixo({
            teveToqueNa99DeBaixo: toqueBaixo,
            atrAtual,
            precoAtual,
            minimaCandleAnterior: minimaCandle,
            media20AbaixoDoCorpo: true,
            media20TocouApenasPavio: false,
            estadoAtual: estadoEst4Baixo,
          });
          setEstadoEst4Baixo(res4Baixo.novoEstado);
          aplicarResultado(res4Baixo);
        }

        const mensagemFinal = mensagemAtiva.value;
        if (mensagemFinal) {
          const mensagemMaiuscula = mensagemFinal.toUpperCase();
          setConfirmedReport(mensagemMaiuscula);
          setIsConfirmed(true);
          onPatternChange?.(mensagemMaiuscula);
        }

      } catch (err) {
        console.error("Erro no loop de varredura do ScannerCard:", err);
      }
    }, 2000);

    return () => clearInterval(monitoringInterval);
  }, [testReport, isConfirmed, atrAtual, corFundoMedia20, candleFechado, teveToqueNa99, precoAtual, valorMedia99, maximaCandle, minimaCandle, estadoEst6Cima, estadoEst1Baixo, estadoEst3Baixo, estadoEst4Baixo, atrRefCima2, atrRefCima4, onPatternChange]);

  // ==========================================
  // GERENCIAMENTO DO TEMPORIZADOR DE 10 MINUTOS
  // ==========================================
  useEffect(() => {
    const reportToConfirm = confirmedReport ?? incomingReport;
    if (reportToConfirm === null || reportToConfirm === "") return;

    const mensagemMaiuscula = reportToConfirm.toUpperCase();
    setConfirmedReport(mensagemMaiuscula);
    setIsConfirmed(true);
    onPatternChangeRef.current?.(mensagemMaiuscula);

    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const contemAguardar = mensagemMaiuscula.includes("AGUARDAR");

    if (!contemAguardar) {
      timerRef.current = setTimeout(() => {
        setIsConfirmed(false);
        setConfirmedReport(null);
        if (patternReportRef.current === null) setTestReport(null);
        onPatternChangeRef.current?.(null);
        timerRef.current = null;
      }, 10 * 60 * 1000);
    }

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [confirmedReport, incomingReport]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const renderDots = () => (
    <span className="inline-flex items-center ml-1 space-x-1">
      <span className={`h-1.5 w-1.5 rounded-full transition-opacity duration-200 ${dotStep === 1 ? "bg-cyan-300 opacity-100 shadow-[0_0_8px_#22d3ee]" : "bg-cyan-800 opacity-30"}`} />
      <span className={`h-1.5 w-1.5 rounded-full transition-opacity duration-200 ${dotStep === 2 ? "bg-cyan-300 opacity-100 shadow-[0_0_8px_#22d3ee]" : "bg-cyan-800 opacity-30"}`} />
      <span className={`h-1.5 w-1.5 rounded-full transition-opacity duration-200 ${dotStep === 3 ? "bg-cyan-300 opacity-100 shadow-[0_0_8px_#22d3ee]" : "bg-cyan-800 opacity-30"}`} />
    </span>
  );

  const cycleTest = () => {
    const nextIndex = (testIndexRef.current + 1) % 11;
    testIndexRef.current = nextIndex;
    setDisplayIndex(nextIndex);

    let reportResult: string | null = null;
    switch (nextIndex) {
      case 1:
        reportResult = formatStrategyMessage(
          "VEM DE CIMA",
          VemDeCima.processarEstrategia1VemDeCima({
            teveToqueNa99DeCima: true,
            atrAtual: 0.45,
          }),
          "TESTE",
        );
        break;
      case 2:
        reportResult = formatStrategyMessage(
          "VEM DE CIMA",
          VemDeCima.processarEstrategia2VemDeCima({
            teveToqueNa99DeCima: true,
            atrAtual: 0.55,
            atrReferenciaSalvo: 0.6,
            proximoCandleFechado: true,
          }),
          "TESTE",
        );
        break;
      case 3:
        reportResult = formatStrategyMessage(
          "VEM DE CIMA",
          VemDeCima.processarEstrategia3VemDeCima({
            teveToqueNa99DeCima: true,
            atrAtual: 0.505,
          }),
          "TESTE",
        );
        break;
      case 4:
        reportResult = formatStrategyMessage(
          "VEM DE CIMA",
          VemDeCima.processarEstrategia4VemDeCima({
            teveToqueNa99DeCima: true,
            atrAtual: 0.4,
            atrReferenciaSalvo: 0.35,
            proximoCandleFechado: true,
          }),
          "TESTE",
        );
        break;
      case 5:
        reportResult = formatStrategyMessage(
          "VEM DE CIMA",
          VemDeCima.processarEstrategia5VemDeCima({
            teveToqueNa99DeCima: true,
            atrAtual2H: 0.33,
            atrAnterior2H: 0.2,
            fechamentoCorpoAbaixoDaMedia99: true,
          }),
          "TESTE",
        );
        break;
      case 6:
        reportResult = formatStrategyMessage(
          "VEM DE CIMA",
          VemDeCima.processarEstrategia6VemDeCima({
            teveToqueNa99DeCima: true,
            atrAtual: 0.25,
            precoAtual: 100,
            maximaCandleToque: 100.5,
            minimaCandleToque: 99.5,
            estadoAtual: { fase: "AGUARDANDO_ATIVACAO" },
          }),
          "TESTE",
        );
        break;
      case 7:
        reportResult = formatStrategyMessage(
          "VEM DE BAIXO",
          VemDeBaixo.processarEstrategia1VemDeBaixo({
            teveToqueNa99DeBaixo: true,
            atrAtual: 0.6,
            precoAtual: 100,
            maximaCandleAtual: 100.5,
            estadoAtual: { fase: "MONITORANDO_TOPO" },
          }),
          "TESTE",
        );
        break;
      case 8:
        reportResult = formatStrategyMessage(
          "VEM DE BAIXO",
          VemDeBaixo.processarEstrategia2VemDeBaixo({
            teveToqueNa99DeBaixo: true,
            atrAtual: 0.45,
            toqueOcorreuNoCandleAberto: false,
            corpoInstitucionalInteiroAcimaDa20: true,
            corpoInstitucionalAbaixoDa99: true,
            media20TocouCorpoInstitucional: false,
          }),
          "TESTE",
        );
        break;
      case 9:
        reportResult = formatStrategyMessage(
          "VEM DE BAIXO",
          VemDeBaixo.processarEstrategia3VemDeBaixo({
            teveToqueNa99DeBaixo: true,
            atrAtual: 0.375,
            precoAtual: 100,
            maximaCandleAtual: 100.5,
            estadoAtual: { fase: "MONITORANDO_MAXIMA" },
          }),
          "TESTE",
        );
        break;
      case 10:
        reportResult = formatStrategyMessage(
          "VEM DE BAIXO",
          VemDeBaixo.processarEstrategia4VemDeBaixo({
            teveToqueNa99DeBaixo: true,
            atrAtual: 0.25,
            precoAtual: 100,
            minimaCandleAnterior: 99.5,
            media20AbaixoDoCorpo: true,
            media20TocouApenasPavio: false,
            estadoAtual: { fase: "MONITORANDO_FUNDO" },
          }),
          "TESTE",
        );
        break;
      case 0:
      default:
        reportResult = null;
        break;
    }

    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const finalResult = reportResult ? reportResult.toUpperCase() : null;
    setTestReport(finalResult);

    if (finalResult === null) {
      setIsConfirmed(false);
      setConfirmedReport(null);
      onPatternChange?.(null);
    } else {
      setConfirmedReport(finalResult);
      setIsConfirmed(true);
      onPatternChange?.(finalResult);
    }
  };

  const getButtonLabel = () => {
    if (displayIndex === 0) return "Monitorando";
    if (displayIndex === 1) return "Cima - Est.1";
    if (displayIndex === 2) return "Cima - Est.2";
    if (displayIndex === 3) return "Cima - Est.3";
    if (displayIndex === 4) return "Cima - Est.4";
    if (displayIndex === 5) return "Cima - Est.5";
    if (displayIndex === 6) return "Cima - Est.6";
    if (displayIndex === 7) return "Baixo - Est.1";
    if (displayIndex === 8) return "Baixo - Est.2";
    if (displayIndex === 9) return "Baixo - Est.3";
    if (displayIndex === 10) return "Baixo - Est.4";
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
          <span style={{ fontSize: "16px" }} className="font-bold tracking-wider text-cyan-400 uppercase block">
            SCANNER
          </span>

          <div className="flex items-center mt-1">
            <h2 className={`text-lg md:text-xl font-bold tracking-wider transition-colors duration-300 ${isConfirmed ? "text-emerald-400 drop-shadow-[0_0_10px_#34d399]" : "text-cyan-300 drop-shadow-[0_0_10px_#22d3ee]"}`}>
              {isConfirmed ? "PADRÃO CONFIRMADO" : "MONITORANDO PADRÃO"}
            </h2>
            {!isConfirmed && renderDots()}
          </div>
        </div>

        <div className="w-full">
          <div className="relative w-full h-2 flex items-center">
            <div className={`absolute inset-0 h-1.5 rounded-full transition-colors duration-300 ${isConfirmed ? "bg-emerald-400 shadow-[0_0_12px_#34d399]" : "bg-cyan-400 shadow-[0_0_12px_#22d3ee]"}`} />
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
            <p className="font-mono text-xs md:text-sm font-bold text-emerald-300 tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] leading-tight uppercase">
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
            className="text-[9px] font-mono px-2 py-0.5 bg-black/60 border border-cyan-500/30 text-cyan-400 rounded hover:bg-cyan-900/80 transition-colors uppercase"
          >
            [Testar: {getButtonLabel()}]
          </button>
        </div>
      </div>
    </div>
  );
}