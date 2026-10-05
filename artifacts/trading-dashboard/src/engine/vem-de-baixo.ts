// ==========================================
// ESTRATÉGIA 1: VEM DE BAIXO - VENDA NO TOPO COM ATUALIZAÇÃO
// ATR > 0.510
// ==========================================

export interface EstadoEstrategia1VemDeBaixo {
  fase: "MONITORANDO_TOPO" | "AGUARDANDO_RETORNO" | "VALIDANDO_NOVO_TOPO";
  topoReferencia?: number;
  aguardandoTesteImediato?: boolean;
  aguardandoFechamentoRetorno?: boolean;
}

export interface DadosEstrategia1VemDeBaixo {
  teveToqueNa99DeBaixo: boolean;
  atrAtual: number;
  precoAtual: number;
  maximaCandleAtual: number;
  candleImediatoSeguinte?: boolean;
  candleFechado?: boolean;
  estadoAtual: EstadoEstrategia1VemDeBaixo;
}

export interface ResultadoEstrategia1VemDeBaixo {
  acao: "VENDA" | "AGUARDAR" | "CANCELAR" | "IGNORADO";
  status: string;
  stopLoss: number;
  takeProfit: number;
  novoEstado: EstadoEstrategia1VemDeBaixo;
  precoEntrada?: number;
}

/**
 * Processa exclusivamente a Estratégia 1 do "Vem de Baixo".
 *
 * Regra:
 * 1. Toque inicial na 99 vindo de baixo + ATR > 0.510:
 *    grava a máxima do candle e arma VENDA nesse topo.
 *
 * 2. Candle imediatamente seguinte:
 *    se tocar o topo, VENDA.
 *    se fechar sem tocar, o teste imediato termina.
 *
 * 3. Retorno futuro:
 *    se o preço voltar a tocar o topo antigo, NÃO grava a máxima
 *    naquele instante. Aguarda o fechamento desse candle.
 *
 * 4. Após o fechamento do candle de retorno:
 *    pega a máxima FINAL desse candle, apaga o topo antigo e
 *    transforma a nova máxima no novo topo.
 *
 * 5. Candle seguinte ao novo topo:
 *    se tocar o novo topo, VENDA.
 *    se fechar sem tocar, CANCELAR.
 */
export function processarEstrategia1VemDeBaixo(dados: DadosEstrategia1VemDeBaixo): ResultadoEstrategia1VemDeBaixo {
  let estado = { ...dados.estadoAtual };
  const atr = dados.atrAtual;
  const candleFechado = dados.candleFechado === true;

  // ==========================================================
  // 1. ATIVAÇÃO INICIAL
  // ==========================================================

  if (dados.teveToqueNa99DeBaixo && atr > 0.510 && estado.fase === "MONITORANDO_TOPO") {
    const maximaGravada = dados.maximaCandleAtual;

    return {
      acao: "VENDA",
      status: `[EST. 1] Topo marcado e Venda armada na máxima: ${maximaGravada}`,
      stopLoss: 0.35,
      takeProfit: 0.70,
      precoEntrada: maximaGravada,
      novoEstado: {
        fase: "AGUARDANDO_RETORNO",
        topoReferencia: maximaGravada,
        aguardandoTesteImediato: true,
        aguardandoFechamentoRetorno: false
      }
    };
  }

  // ==========================================================
  // 2. TOPO JÁ ARMADO
  // ==========================================================

  if (estado.fase === "AGUARDANDO_RETORNO" && estado.topoReferencia !== undefined) {
    const topoRef = estado.topoReferencia;

    // ========================================================
    // 2A. TESTE IMEDIATO
    // ========================================================

    if (estado.aguardandoTesteImediato) {
      if (dados.candleImediatoSeguinte && dados.maximaCandleAtual >= topoRef) {
        return {
          acao: "VENDA",
          status: `[EST. 1] Venda executada no teste imediato do topo: ${topoRef}`,
          stopLoss: 0.35,
          takeProfit: 0.70,
          precoEntrada: topoRef,
          novoEstado: {
            fase: "MONITORANDO_TOPO",
            topoReferencia: undefined,
            aguardandoTesteImediato: false,
            aguardandoFechamentoRetorno: false
          }
        };
      }

      if (dados.candleImediatoSeguinte && candleFechado && dados.maximaCandleAtual < topoRef) {
        return {
          acao: "AGUARDAR",
          status: `[EST. 1] Teste imediato encerrado. Topo ${topoRef} permanece válido para eventual retorno futuro.`,
          stopLoss: 0.35,
          takeProfit: 0.70,
          novoEstado: {
            ...estado,
            aguardandoTesteImediato: false,
            aguardandoFechamentoRetorno: false
          }
        };
      }

      return {
        acao: "AGUARDAR",
        status: `[EST. 1] Aguardando teste imediato do topo ${topoRef}.`,
        stopLoss: 0.35,
        takeProfit: 0.70,
        novoEstado: estado
      };
    }

    // ========================================================
    // 2B. RETORNO FUTURO - DETECTA O TOQUE
    // ========================================================

    if (!estado.aguardandoTesteImediato && !estado.aguardandoFechamentoRetorno && dados.precoAtual >= topoRef) {
      return {
        acao: "AGUARDAR",
        status: `[EST. 1] Retorno futuro detectado no topo antigo (${topoRef}). Aguardando o fechamento deste candle para definir a nova máxima.`,
        stopLoss: 0.35,
        takeProfit: 0.70,
        novoEstado: {
          ...estado,
          aguardandoFechamentoRetorno: true
        }
      };
    }

    // ========================================================
    // 2C. CANDLE DO RETORNO AINDA ESTÁ ABERTO
    // ========================================================

    if (estado.aguardandoFechamentoRetorno && !candleFechado) {
      return {
        acao: "AGUARDAR",
        status: `[EST. 1] Candle de retorno ao topo ${topoRef} ainda está aberto. Aguardando fechamento para gravar a máxima final.`,
        stopLoss: 0.35,
        takeProfit: 0.70,
        novoEstado: estado
      };
    }

    // ========================================================
    // 2D. CANDLE DO RETORNO FECHOU
    // ========================================================

    if (estado.aguardandoFechamentoRetorno && candleFechado) {
      const novoTopo = dados.maximaCandleAtual;

      return {
        acao: "AGUARDAR",
        status: `[EST. 1] Candle de retorno fechado. Topo antigo ${topoRef} substituído pela nova máxima final: ${novoTopo}. Aguardando teste no próximo candle.`,
        stopLoss: 0.35,
        takeProfit: 0.70,
        precoEntrada: novoTopo,
        novoEstado: {
          fase: "VALIDANDO_NOVO_TOPO",
          topoReferencia: novoTopo,
          aguardandoTesteImediato: true,
          aguardandoFechamentoRetorno: false
        }
      };
    }
  }

  // ==========================================================
  // 3. TESTE DO NOVO TOPO
  // ==========================================================

  if (estado.fase === "VALIDANDO_NOVO_TOPO" && estado.topoReferencia !== undefined) {
    const novoTopoRef = estado.topoReferencia;

    // ========================================================
    // 3A. NOVO TOPO FOI TOCADO NO CANDLE SEGUINTE
    // ========================================================

    if (estado.aguardandoTesteImediato && dados.candleImediatoSeguinte && dados.maximaCandleAtual >= novoTopoRef) {
      return {
        acao: "VENDA",
        status: `[EST. 1] Venda executada no NOVO topo: ${novoTopoRef}`,
        stopLoss: 0.35,
        takeProfit: 0.70,
        precoEntrada: novoTopoRef,
        novoEstado: {
          fase: "MONITORANDO_TOPO",
          topoReferencia: undefined,
          aguardandoTesteImediato: false,
          aguardandoFechamentoRetorno: false
        }
      };
    }

    // ========================================================
    // 3B. CANDLE SEGUINTE FECHOU SEM TOCAR O NOVO TOPO
    // ========================================================

    if (estado.aguardandoTesteImediato && dados.candleImediatoSeguinte && candleFechado && dados.maximaCandleAtual < novoTopoRef) {
      return {
        acao: "CANCELAR",
        status: `[EST. 1] Novo topo ${novoTopoRef} cancelado. O candle seguinte fechou sem atingir a máxima.`,
        stopLoss: 0.35,
        takeProfit: 0.70,
        novoEstado: {
          fase: "MONITORANDO_TOPO",
          topoReferencia: undefined,
          aguardandoTesteImediato: false,
          aguardandoFechamentoRetorno: false
        }
      };
    }

    return {
      acao: "AGUARDAR",
      status: `[EST. 1] Novo topo ${novoTopoRef} armado. Aguardando teste no candle seguinte.`,
      stopLoss: 0.35,
      takeProfit: 0.70,
      novoEstado: estado
    };
  }

  // ==========================================================
  // 4. ESTADO PADRÃO
  // ==========================================================

  return {
    acao: "IGNORADO",
    status: "Estratégia 1 (Vem de Baixo) .",
    stopLoss: 0.35,
    takeProfit: 0.70,
    novoEstado: estado
  };
}
// ==========================================
// ESTRATÉGIA 2: VEM DE BAIXO - COMPRA POR FILTRO INSTITUCIONAL (ATR 0.400 - 0.500)
// ==========================================

export interface DadosEstrategia2VemDeBaixo {
  teveToqueNa99DeBaixo: boolean;
  atrAtual: number;
  toqueOcorreuNoCandleAberto: boolean;
  // Dados do candle institucional analisado (último completo ou anterior se o atual estiver aberto)
  corpoInstitucionalInteiroAcimaDa20: boolean;
  corpoInstitucionalAbaixoDa99: boolean;
  media20TocouCorpoInstitucional: boolean;
}

export interface ResultadoEstrategia2VemDeBaixo {
  acao: "COMPRA" | "CANCELAR" | "IGNORADO";
  status: string;
  stopLoss: number;
  takeProfit: number;
}

/**
 * Processa exclusivamente a Estratégia 2 do "Vem de Baixo"
 */
export function processarEstrategia2VemDeBaixo(dados: DadosEstrategia2VemDeBaixo): ResultadoEstrategia2VemDeBaixo {

  // 1. Condição de Ativação Inicial: Toque vindo de baixo com ATR entre 0.400 e 0.500
  if (!dados.teveToqueNa99DeBaixo || dados.atrAtual < 0.400 || dados.atrAtual > 0.500) {
    return {
      acao: "IGNORADO",
      status: "Estratégia 2 (Vem de Baixo) inativa (ATR fora da faixa 0.400 - 0.500 ou sem toque)",
      stopLoss: 0.35,
      takeProfit: 0.70,
    };
  }

  // 2. Exceção de toque durante o institucional atual
  // Se o toque ocorreu no candle aberto, o sistema ignora o atual e avalia o último institucional anterior fechado
  // (Assume-se que as variáveis de entrada já refletem o candle correto a ser validado)

  // 3. Regra de Validação do Filtro da Média 20
  // Condições para Compra Confirmada:
  // - O corpo inteiro do institucional deve estar acima da Média 20 e abaixo da Média 99.
  // - A Média 20 NÃO pode tocar ou cruzar o corpo do institucional (pavio na 20 é permitido).
  const corpoValidoNoCanal = dados.corpoInstitucionalInteiroAcimaDa20 && dados.corpoInstitucionalAbaixoDa99;
  const semToqueDa20NoCorpo = !dados.media20TocouCorpoInstitucional;

  if (corpoValidoNoCanal && semToqueDa20NoCorpo) {
    return {
      acao: "COMPRA",
      status: "Estratégia 2 Confirmada: Compra validada pelo Filtro Institucional (Média 20 e 99 respeitadas).",
      stopLoss: 0.35,
      takeProfit: 0.70,
    };
  } else {
    // Se a Média 20 tocou o corpo, ou se o institucional está fora do canal correto
    return {
      acao: "CANCELAR",
      status: "Estratégia 2 Cancelada: Filtro institucional violado (Média 20 cruzou o corpo ou fora do canal).",
      stopLoss: 0.35,
      takeProfit: 0.70,
    };
  }
}
// ==========================================
// ESTRATÉGIA 3: VEM DE BAIXO - VENDA DIRETA NA MÁXIMA (ATR 0.350 - 0.400)
// ==========================================

export interface EstadoEstrategia3VemDeBaixo {
  fase: "MONITORANDO_MAXIMA" | "AGUARDANDO_RETORNO";
  maximaFixaGravada?: number;
}

export interface DadosEstrategia3VemDeBaixo {
  teveToqueNa99DeBaixo: boolean;
  atrAtual: number;
  precoAtual: number;
  maximaCandleAtual: number;
  estadoAtual: EstadoEstrategia3VemDeBaixo;
}

export interface ResultadoEstrategia3VemDeBaixo {
  acao: "VENDA" | "AGUARDAR" | "IGNORADO";
  status: string;
  stopLoss: number;
  takeProfit: number;
  novoEstado: EstadoEstrategia3VemDeBaixo;
}

/**
 * Processa exclusivamente a Estratégia 3 do "Vem de Baixo"
 */
export function processarEstrategia3VemDeBaixo(dados: DadosEstrategia3VemDeBaixo): ResultadoEstrategia3VemDeBaixo {

  let estado = { ...dados.estadoAtual };
  const atr = dados.atrAtual;

  // 1. Condição de Ativação Inicial: Toque vindo de baixo com ATR entre 0.350 e 0.400
  if (dados.teveToqueNa99DeBaixo && atr >= 0.350 && atr <= 0.400 && estado.fase === "MONITORANDO_MAXIMA") {
    const maximaFixa = dados.maximaCandleAtual;

    return {
      acao: "VENDA",
      status: `Estratégia 3 (Vem de Baixo) - Venda Confirmada! Máxima fixa gravada em: ${maximaFixa}`,
      stopLoss: 0.35,
      takeProfit: 0.70,
      novoEstado: {
        fase: "AGUARDANDO_RETORNO",
        maximaFixaGravada: maximaFixa
      }
    };
  }

  // 2. Se a máxima fixa já está gravada, monitora o retorno do preço (sem expirar, sem atualizar topo)
  if (estado.fase === "AGUARDANDO_RETORNO" && estado.maximaFixaGravada !== undefined) {
    const maximaFixa = estado.maximaFixaGravada;

    // Quando o mercado retornar e tocar/romper a máxima gravada, executa a venda direta
    if (dados.precoAtual >= maximaFixa) {
      return {
        acao: "VENDA",
        status: "Estratégia 3 Confirmada: Preço retornou à máxima fixa gravada. Venda executada diretamente.",
        stopLoss: 0.35,
        takeProfit: 0.70,
        novoEstado: {
          fase: "MONITORANDO_MAXIMA",
          maximaFixaGravada: undefined // Reseta após executar a ordem
        }
      };
    }
  }

  return {
    acao: "IGNORADO",
    status: "Estrategia 3 (Vem de Baixo) aguardando gatilho ou retorno na máxima fixa.",
    stopLoss: 0.35,
    takeProfit: 0.70,
    novoEstado: estado
  };
}
// ==========================================
// ESTRATÉGIA 4: VEM DE BAIXO - COMPRA DIRETA COM SUPORTE AO TRADINGCARD
// ==========================================

export interface EstadoEstrategia4VemDeBaixo {
  fase: "MONITORANDO_FUNDO";
}

export interface DadosEstrategia4VemDeBaixo {
  teveToqueNa99DeBaixo: boolean;
  atrAtual: number;
  precoAtual: number;
  minimaCandleAnterior: number;
  media20AbaixoDoCorpo: boolean;
  media20TocouApenasPavio: boolean;
  estadoAtual: EstadoEstrategia4VemDeBaixo;
}

export interface ResultadoEstrategia4VemDeBaixo {
  acao: "COMPRA" | "CANCELAR" | "IGNORADO";
  status: string;
  stopLoss: number;
  takeProfit: number;
  minimaFundoMarcada?: number;
  novoEstado: EstadoEstrategia4VemDeBaixo;
}

export interface DadosRetesteMinimaEstrategia4 {
  precoAtual: number;
  atrAtual: number;
  minimaFundoMarcada: number;
}

export interface ResultadoRetesteMinimaEstrategia4 {
  acao: "CANCELAR" | "MANTER_COMPRA" | "MONITORAR";
  status: string;
}

/**
 * Aplica a proteção da compra depois que a Estratégia 4 marcou um fundo.
 *
 * O toque ou rompimento da mínima só cancela a compra quando o ATR atinge
 * o limiar operacional de 0.310. Com ATR abaixo do limiar, a compra segue
 * mantida enquanto o reteste é registrado.
 */
export function avaliarRetesteMinimaEstrategia4(
  dados: DadosRetesteMinimaEstrategia4,
): ResultadoRetesteMinimaEstrategia4 {
  if (dados.precoAtual > dados.minimaFundoMarcada) {
    return {
      acao: "MONITORAR",
      status: `Estratégia 4: monitorando reteste da mínima ${dados.minimaFundoMarcada} · preço ${dados.precoAtual.toFixed(3)}.`,
    };
  }

  if (dados.atrAtual >= 0.310) {
    return {
      acao: "CANCELAR",
      status: `Estratégia 4 cancelada: preço tocou/rompeu a mínima ${dados.minimaFundoMarcada} com ATR ${dados.atrAtual.toFixed(3)} >= 0.310.`,
    };
  }

  return {
    acao: "MANTER_COMPRA",
    status: `Estratégia 4: mínima ${dados.minimaFundoMarcada} retestada com ATR ${dados.atrAtual.toFixed(3)} < 0.310. Compra mantida.`,
  };
}

/**
 * Processa exclusivamente a Estratégia 4 do "Vem de Baixo"
 */
export function processarEstrategia4VemDeBaixo(dados: DadosEstrategia4VemDeBaixo): ResultadoEstrategia4VemDeBaixo {

  const atr = dados.atrAtual;

  // Condição de Ativação Inicial: Toque vindo de baixo com ATR < 0.350
  if (dados.teveToqueNa99DeBaixo && atr < 0.350) {

    // Filtro da Média 20 Obrigatório:
    // - Deve estar totalmente abaixo do candle anterior (ou tocando apenas no pavio inferior).
    const media20Valida = dados.media20AbaixoDoCorpo || dados.media20TocouApenasPavio;

    if (!media20Valida) {
      return {
        acao: "CANCELAR",
        status: "Estratégia 4 Invalidada: Média 20 está cortando o corpo do candle anterior.",
        stopLoss: 0.35,
        takeProfit: 0.70,
        novoEstado: { fase: "MONITORANDO_FUNDO" }
      };
    }

    const minimaFundo = dados.minimaCandleAnterior;

    // Retorna a COMPRA direta para o ScannerCard e repassa a mínima marcada
    // para o TradingCard monitorar o reteste e aplicar a regra do ATR >= 0.310
    return {
      acao: "COMPRA",
      status: `Estratégia 4 Confirmada: Compra executada. Fundo marcado na mínima (${minimaFundo}).`,
      stopLoss: 0.35,
      takeProfit: 0.70, // Take fixo operacional padrão
      minimaFundoMarcada: minimaFundo,
      novoEstado: { fase: "MONITORANDO_FUNDO" }
    };
  }

  return {
    acao: "IGNORADO",
    status: "Estratégia 4 (Vem de Baixo) monitorando toque na média 99.",
    stopLoss: 0.35,
    takeProfit: 0.70,
    novoEstado: { fase: "MONITORANDO_FUNDO" }
  };
}