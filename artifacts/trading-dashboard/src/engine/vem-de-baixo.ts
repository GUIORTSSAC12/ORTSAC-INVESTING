// ==========================================
// ESTRATÉGIA 1: VEM DE BAIXO - VENDA NO TOPO COM ATUALIZAÇÃO (ATR > 0.510)
// ==========================================

export interface EstadoEstrategia1VemDeBaixo {
  fase: "MONITORANDO_TOPO" | "AGUARDANDO_RETORNO" | "VALIDANDO_NOVO_TOPO";
  topoReferencia?: number;
  aguardandoTesteImediato?: boolean;
}

export interface DadosEstrategia1VemDeBaixo {
  teveToqueNa99DeBaixo: boolean;
  atrAtual: number;
  precoAtual: number;
  maximaCandleAtual: number;
  candleImediatoSeguinte?: boolean;
  estadoAtual: EstadoEstrategia1VemDeBaixo;
}

export interface ResultadoEstrategia1VemDeBaixo {
  acao: "VENDA" | "AGUARDAR" | "CANCELAR" | "IGNORADO";
  status: string;
  stopLoss: number;
  takeProfit: number;
  novoEstado: EstadoEstrategia1VemDeBaixo;
}

/**
 * Processa exclusivamente a Estratégia 1 do "Vem de Baixo"
 */
export function processarEstrategia1VemDeBaixo(dados: DadosEstrategia1VemDeBaixo): ResultadoEstrategia1VemDeBaixo {

  let estado = { ...dados.estadoAtual };
  const atr = dados.atrAtual;

  // 1. Condição de Ativação Inicial: Toque vindo de baixo com ATR > 0.510
  if (dados.teveToqueNa99DeBaixo && atr > 0.510 && estado.fase === "MONITORANDO_TOPO") {
    const maximaGravada = dados.maximaCandleAtual;

    return {
      acao: "VENDA", // Mudado para sinalizar que o topo de referência foi estabelecido e o setup está armado
      status: `Estratégia 1 (Vem de Baixo) - Topo Marcado e Armado! Referência na máxima: ${maximaGravada}`,
      stopLoss: 0.35,
      takeProfit: 0.70,
      novoEstado: {
        fase: "AGUARDANDO_RETORNO",
        topoReferencia: maximaGravada,
        aguardandoTesteImediato: true
      }
    };
  }

  // 2. Se o topo já está marcado, monitora a execução (Imediata ou Futura)
  if (estado.fase === "AGUARDANDO_RETORNO" && estado.topoReferencia !== undefined) {
    const topoRef = estado.topoReferencia;

    // A. Execução Imediata (se o candle seguinte testar/romper a máxima)
    if (estado.aguardandoTesteImediato && dados.candleImediatoSeguinte) {
      if (dados.maximaCandleAtual >= topoRef) {
        return {
          acao: "VENDA",
          status: "Estratégia 1 Confirmada: Venda executada na máxima do teste imediato.",
          stopLoss: 0.35,
          takeProfit: 0.70,
          novoEstado: { fase: "MONITORANDO_TOPO" } // Reseta após executar
        };
      } else {
        // Se o candle imediato não rompeu, o mercado se afasta, mas o topo continua ativo para o futuro
        estado.aguardandoTesteImediato = false;
      }
    }

    // B. Execução Futura (Mercado retorna no topo no futuro)
    if (dados.precoAtual >= topoRef) {
      // Quando retorna, o topo antigo é desconsiderado e a máxima deste novo candle vira o novo topo
      const novoTopo = dados.maximaCandleAtual;

      return {
        acao: "VENDA", // Sinaliza que um novo topo foi acionado e está em fase de validação
        status: `Estratégia 1: Preço retornou ao topo antigo. Novo topo provisório gravado em: ${novoTopo}. Validando candle seguinte.`,
        stopLoss: 0.35,
        takeProfit: 0.70,
        novoEstado: {
          fase: "VALIDANDO_NOVO_TOPO",
          topoReferencia: novoTopo,
          aguardandoTesteImediato: true
        }
      };
    }
  }

  // C. Validação do novo topo no retorno futuro (o candle seguinte deve romper o novo topo)
  if (estado.fase === "VALIDANDO_NOVO_TOPO" && estado.topoReferencia !== undefined) {
    const novoTopoRef = estado.topoReferencia;

    if (dados.candleImediatoSeguinte) {
      if (dados.maximaCandleAtual >= novoTopoRef) {
        return {
          acao: "VENDA",
          status: "Estratégia 1 Confirmada: Venda executada no novo topo validado.",
          stopLoss: 0.35,
          takeProfit: 0.70,
          novoEstado: { fase: "MONITORANDO_TOPO" }
        };
      } else {
        return {
          acao: "CANCELAR",
          status: "Estratégia 1 Cancelada: O candle seguinte ao novo topo não o rompeu.",
          stopLoss: 0.35,
          takeProfit: 0.70,
          novoEstado: { fase: "MONITORANDO_TOPO" }
        };
      }
    }
  }

  return {
    acao: "IGNORADO",
    status: "Estratégia 1 (Vem de Baixo) aguardando gatilho.",
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
// ESTRATÉGIA 4: VEM DE BAIXO - COMPRA EM FUNDO COM ALVO ADAPTATIVO (ATR < 0.350)
// ==========================================

export interface EstadoEstrategia4VemDeBaixo {
  fase: "MONITORANDO_FUNDO" | "AGUARDANDO_TESTE_FUNDO";
  minimaFundoMarcada?: number;
  tipoTopoAlvo?: "PADRAO" | "VEM_DE_CIMA_ATR_MENOR_0310" | "VEM_DE_BAIXO_ATR_MAIOR_0510";
  valorTopoAlvo?: number;
}

export interface DadosEstrategia4VemDeBaixo {
  teveToqueNa99DeBaixo: boolean;
  atrAtual: number;
  precoAtual: number;
  minimaCandleAnterior: number;
  media20AbaixoDoCorpo: boolean;
  media20TocouApenasPavio: boolean;
  topoAlvoAtivo?: {
    tipo: "VEM_DE_CIMA_ATR_MENOR_0310" | "VEM_DE_BAIXO_ATR_MAIOR_0510";
    valor: number;
  };
  estadoAtual: EstadoEstrategia4VemDeBaixo;
}

export interface ResultadoEstrategia4VemDeBaixo {
  acao: "COMPRA" | "CANCELAR" | "AGUARDAR" | "IGNORADO";
  status: string;
  stopLoss: number;
  takeProfit: number;
  novoEstado: EstadoEstrategia4VemDeBaixo;
}

/**
 * Processa exclusivamente a Estratégia 4 do "Vem de Baixo"
 */
export function processarEstrategia4VemDeBaixo(dados: DadosEstrategia4VemDeBaixo): ResultadoEstrategia4VemDeBaixo {

  let estado = { ...dados.estadoAtual };
  const atr = dados.atrAtual;

  // 1. Condição de Ativação Inicial: Toque vindo de baixo com ATR < 0.350
  if (dados.teveToqueNa99DeBaixo && atr < 0.350 && estado.fase === "MONITORANDO_FUNDO") {

    // Filtro da Média 20 Obrigatório:
    // - Deve estar totalmente abaixo do candle anterior (ou tocando apenas no pavio inferior).
    const media20Valida = dados.media20AbaixoDoCorpo || dados.media20TocouApenasPavio;

    if (!media20Valida) {
      return {
        acao: "CANCELAR",
        status: "Estratégia 4 Invalidada: Média 20 está cortando o corpo do candle anterior.",
        stopLoss: 0.35,
        takeProfit: 0.70,
        novoEstado: estado
      };
    }

    const minimaFundo = dados.minimaCandleAnterior;

    return {
      acao: "AGUARDAR",
      status: "Estratégia 4 Ativada: Fundo marcado na mínima do candle anterior. Aguardando teste de preço.",
      stopLoss: 0.35,
      takeProfit: 0.70,
      novoEstado: {
        fase: "AGUARDANDO_TESTE_FUNDO",
        minimaFundoMarcada: minimaFundo
      }
    };
  }

  // 2. Monitoramento do Teste/Retorno no Fundo Marcado
  if (estado.fase === "AGUARDANDO_TESTE_FUNDO" && estado.minimaFundoMarcada !== undefined) {
    const fundoMarcado = estado.minimaFundoMarcada;

    // Quando o preço retorna e toca na região do fundo marcado (ou via gap de baixa)
    if (dados.precoAtual <= fundoMarcado) {

      // Filtro de Volatilidade no Momento do Teste (ATR do Card)
      // Se no momento do toque o ATR estiver acima de 0.310, o fundo é imediatamente cancelado
      if (atr >= 0.310) {
        return {
          acao: "CANCELAR",
          status: "Estratégia 4 Cancelada no Teste: ATR atual >= 0.310 na hora do toque no fundo.",
          stopLoss: 0.35,
          takeProfit: 0.70,
          novoEstado: { fase: "MONITORANDO_FUNDO" } // Reseta
        };
      }

      // Se o ATR estiver abaixo de 0.310, a compra é validada!
      // Cálculo do Alvo Adaptativo (Gain):
      let gainFinal = 0.70; // Padrão

      if (dados.topoAlvoAtivo) {
        const valorTopo = dados.topoAlvoAtivo.valor;
        const distanciaPercentualTopo = ((valorTopo - dados.precoAtual) / dados.precoAtual) * 100;

        if (dados.topoAlvoAtivo.tipo === "VEM_DE_CIMA_ATR_MENOR_0310") {
          // Se o topo for do Vem de Cima (ATR < 0.310), o gain passa a ser nele, travado no limite máximo de 0.70%
          gainFinal = Math.min(distanciaPercentualTopo, 0.70);
        } else if (dados.topoAlvoAtivo.tipo === "VEM_DE_BAIXO_ATR_MAIOR_0510") {
          // Exceção de reversão imediata tratada na saída, mas o gain respeita a estrutura
          gainFinal = Math.min(distanciaPercentualTopo, 0.70);
        }
      }

      return {
        acao: "COMPRA",
        status: `Estratégia 4 Confirmada: Compra executada no fundo. Alvo adaptativo definido em ${gainFinal}%.`,
        stopLoss: 0.35,
        takeProfit: gainFinal,
        novoEstado: { fase: "MONITORANDO_FUNDO" } // Reseta após a execução
      };
    }
  }

  return {
    acao: "IGNORADO",
    status: "Estratégia 4 (Vem de Baixo) aguardando teste no fundo marcado.",
    stopLoss: 0.35,
    takeProfit: 0.70,
    novoEstado: estado
  };
}