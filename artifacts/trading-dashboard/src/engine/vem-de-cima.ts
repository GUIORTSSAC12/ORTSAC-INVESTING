// ==========================================
// ESTRATÉGIA 1: VEM DE CIMA - CONFIRMAÇÃO DE COMPRA (ATR)
// ==========================================

export interface DadosEstrategia1 {
  teveToqueNa99DeCima: boolean;
  atrAtual: number;
}

export interface ResultadoEstrategia1 {
  acao: "COMPRA" | "AGUARDAR" | "IGNORADO";
  status: string;
  stopLoss: number;
  takeProfit: number;
}

/**
 * Processa exclusivamente a Estratégia 1 do "Vem de Cima"
 * Gatilho: Toque vindo de cima + ATR fechado entre 0.400 e 0.510
 */
export function processarEstrategia1VemDeCima(dados: DadosEstrategia1): ResultadoEstrategia1 {

  // 1. Valida se o toque ocorreu vindo de cima (conforme regra do accordion 2H)
  if (!dados.teveToqueNa99DeCima) {
    return {
      acao: "IGNORADO",
      status: "Sem toque na média 99 vindo de cima",
      stopLoss: 0,
      takeProfit: 0,
    };
  }

  const atr = dados.atrAtual;

  // 2. Valida o gatilho de ATR da Estratégia 1 (entre 0.400 e 0.510)
  if (atr >= 0.400 && atr <= 0.510) {
    return {
      acao: "COMPRA",
      status: "Estratégia 1 Confirmada: Compra (ATR entre 0.400 e 0.510)",
      stopLoss: 0.35,
      takeProfit: 0.70,
    };
  }

  // Se o ATR estiver fora dessa faixa, a Estratégia 1 não pontua aqui
  return {
    acao: "AGUARDAR",
    status: "ATR fora da faixa da Estratégia 1 (0.400 a 0.510)",
    stopLoss: 0,
    takeProfit: 0,
  };
}
// ==========================================
// ESTRATÉGIA 2: VEM DE CIMA - DEFINIÇÃO DIRECIONAL (MEMÓRIA DE VOLATILIDADE)
// ==========================================

export interface DadosEstrategia2 {
  teveToqueNa99DeCima: boolean;
  atrAtual: number;
  atrReferenciaSalvo?: number;        // Memória temporária do ATR salvo
  proximoCandleFechado?: boolean;     // Indica se o candle de 2h seguinte já fechou
}

export interface ResultadoEstrategia2 {
  acao: "COMPRA" | "VENDA" | "AGUARDAR" | "IGNORADO";
  status: string;
  stopLoss: number;
  takeProfit: number;
  novoAtrReferencia?: number;         // Valor para o sistema armazenar externamente
  limparReferencia?: boolean;         // Sinal para apagar a memória após a definição
}

/**
 * Processa exclusivamente a Estratégia 2 do "Vem de Cima"
 * Gatilho: Toque vindo de cima + ATR atual > 0.510
 */
export function processarEstrategia2VemDeCima(dados: DadosEstrategia2): ResultadoEstrategia2 {

  // 1. Valida o toque inicial vindo de cima
  if (!dados.teveToqueNa99DeCima) {
    return {
      acao: "IGNORADO",
      status: "Sem toque na média 99 vindo de cima",
      stopLoss: 0,
      takeProfit: 0,
    };
  }

  // 2. Gatilho de ativação: ATR atual acima de 0.510
  if (dados.atrAtual > 0.510) {

    // Passo A: Se ainda não existe referência salva, armazena o ATR atual e aguarda o fechamento
    if (dados.atrReferenciaSalvo === undefined) {
      return {
        acao: "AGUARDAR",
        status: `Estratégia 2 Ativada: ATR > 0.510`,
        stopLoss: 0.35,
        takeProfit: 0.70,
        novoAtrReferencia: dados.atrAtual, // Salva este valor na memória temporária
      };
    }

    // Passo B: Se já possui referência salva, mas o candle AINDA NÃO FECHOU, fica apenas aguardando
    if (!dados.proximoCandleFechado) {
      return {
        acao: "AGUARDAR",
        status: `Estratégia 2 Definida (Ref: ${dados.atrReferenciaSalvo.toFixed(3)})`,
        stopLoss: 0.35,
        takeProfit: 0.70,
      };
    }

    // Passo C: Candle fechado! Hora de comparar o Novo ATR com a Referência salva
    const novoAtr = dados.atrAtual;
    const atrRef = dados.atrReferenciaSalvo;

    if (novoAtr < atrRef) {
      return {
        acao: "VENDA",
        status: `Estratégia 2 Definida: Venda Confirmada (Novo ATR ${novoAtr.toFixed(3)} < Referência ${atrRef.toFixed(3)})`,
        stopLoss: 0.35,
        takeProfit: 0.70,
        limparReferencia: true,
      };
    } else if (novoAtr > atrRef) {
      return {
        acao: "COMPRA",
        status: `Estratégia 2 Definida: Compra Confirmada (Novo ATR ${novoAtr.toFixed(3)} > Referência ${atrRef.toFixed(3)})`,
        stopLoss: 0.35,
        takeProfit: 0.70,
        limparReferencia: true,
      };
    } else {
      // Se forem exatamente iguais, ignora/aguarda nova variação para não gerar conflito
      return {
        acao: "IGNORADO",
        status: `Estratégia 2: Novo ATR (${novoAtr.toFixed(3)}) igual à Referência (${atrRef.toFixed(3)}). Nova variação necessária.`,
        stopLoss: 0.35,
        takeProfit: 0.70,
      };
    }
  }

  // Se o ATR estiver em faixa menor ou igual a 0.510
  return {
    acao: "IGNORADO",
    status: "ATR fora da faixa da Estratégia 2 (<= 0.510)",
    stopLoss: 0,
    takeProfit: 0,
  };
}
// ==========================================
// ESTRATÉGIA 3: VEM DE CIMA - ZONA DE EXCLUSÃO (VOLATILIDADE INDETERMINADA)
// ==========================================

export interface DadosEstrategia3 {
  teveToqueNa99DeCima: boolean;
  atrAtual: number;
}

export interface ResultadoEstrategia3 {
  acao: "IGNORADO";
  status: string;
  stopLoss: number;
  takeProfit: number;
}

/**
 * Processa exclusivamente a Estratégia 3 do "Vem de Cima"
 * Gatilho: Toque vindo de cima + ATR fechado entre 0.500 e 0.510
 */
export function processarEstrategia3VemDeCima(dados: DadosEstrategia3): ResultadoEstrategia3 {

  // 1. Valida se o toque ocorreu vindo de cima
  if (!dados.teveToqueNa99DeCima) {
    return {
      acao: "IGNORADO",
      status: "Sem toque na média 99 vindo de cima",
      stopLoss: 0,
      takeProfit: 0,
    };
  }

  const atr = dados.atrAtual;

  // 2. Valida o gatilho de exclusão da Estratégia 3 (entre 0.500 e 0.510)
  if (atr >= 0.500 && atr <= 0.510) {
    return {
      acao: "IGNORADO",
      status: "Estratégia 3 Ativada: Zona de Exclusão (Compra e Venda canceladas, modo neutro)",
      stopLoss: 0,
      takeProfit: 0,
    };
  }

  // Se o ATR estiver fora dessa faixa, a Estratégia 3 não interfere
  return {
    acao: "IGNORADO",
    status: "ATR fora da faixa de exclusão da Estratégia 3 (0.500 a 0.510)",
    stopLoss: 0,
    takeProfit: 0,
  };
}
// ==========================================
// ESTRATÉGIA 4: VEM DE CIMA - REVERSÃO DE FLUXO (ATR 0.350 - 0.400)
// ==========================================

export interface DadosEstrategia4 {
  teveToqueNa99DeCima: boolean;
  atrAtual: number;
  atrReferenciaSalvo?: number;      // Memória do ATR de referência salvo
  candleAtualFechouParaReferencia?: boolean; // Indica se o candle do clique acabou de fechar para tirar a referência
  proximoCandleFechado?: boolean;   // Indica se o ciclo de 2h seguinte realmente fechou
}

export interface ResultadoEstrategia4 {
  acao: "COMPRA" | "VENDA" | "AGUARDAR" | "IGNORADO";
  status: string;
  stopLoss: number;
  takeProfit: number;
  novoAtrReferencia?: number;       
  limparReferencia?: boolean;       
}

export function processarEstrategia4VemDeCima(dados: DadosEstrategia4): ResultadoEstrategia4 {

  // 1. Valida o toque inicial vindo de cima
  if (!dados.teveToqueNa99DeCima) {
    return {
      acao: "IGNORADO",
      status: "Sem toque na média 99 vindo de cima",
      stopLoss: 0,
      takeProfit: 0,
    };
  }

  // 2. Gatilho de ativação: ATR atual entre 0.350 e 0.400
  if (dados.atrAtual >= 0.350 && dados.atrAtual <= 0.400) {

    // PASSO 1: Acabei de clicar (faltando 10 min) e AINDA NÃO temos o ATR de referência salvo, 
    // nem o candle fechou para capturá-lo. Exibimos a mensagem de espera pura.
    if (dados.atrReferenciaSalvo === undefined && !dados.candleAtualFechouParaReferencia) {
      return {
        acao: "AGUARDAR",
        status: "[VEM DE CIMA] - ESTRATÉGIA 4 - EM ESPERA: AGUARDANDO ATR DE REFERÊNCIA.",
        stopLoss: 0.35,
        takeProfit: 0.70,
        // Repare que NÃO passamos 'novoAtrReferencia' aqui, para não mostrar número nenhum ainda!
      };
    }

    // PASSO 2: O candle do momento do clique acabou de fechar! Agora sim gravamos o ATR atual como referência.
    if (dados.atrReferenciaSalvo === undefined && dados.candleAtualFechouParaReferencia) {
      return {
        acao: "AGUARDAR",
        status: `[VEM DE CIMA] - ESTRATÉGIA 4 - ATR DE REFERÊNCIA DEFINIDO.`,
        stopLoss: 0.35,
        takeProfit: 0.70,
        novoAtrReferencia: dados.atrAtual, // Grava o valor oficial agora que o candle fechou
      };
    }

    // PASSO 3: Já temos a referência salva, mas o ciclo de 2h seguinte AINDA NÃO fechou.
    if (dados.atrReferenciaSalvo !== undefined && !dados.proximoCandleFechado) {
      return {
        acao: "AGUARDAR",
        status: `[VEM DE CIMA] - ESTRATÉGIA 4 - ATIVADA | ATR DE REFERÊNCIA: ${dados.atrReferenciaSalvo.toFixed(3)} | AÇÃO: AGUARDANDO FECHAMENTO DE CANDLE.`,
        stopLoss: 0.35,
        takeProfit: 0.70,
      };
    }

    // PASSO 4: O candle de 2h fechou! Hora de comparar o novo ATR com a referência.
    if (dados.atrReferenciaSalvo !== undefined && dados.proximoCandleFechado) {
      const novoAtr = dados.atrAtual;
      const atrRef = dados.atrReferenciaSalvo;

      if (novoAtr > atrRef) {
        return {
          acao: "VENDA",
          status: `[VEM DE CIMA] - ESTRATÉGIA 4 - DEFINIDA: VENDA CONFIRMADA (NOVO ATR ${novoAtr.toFixed(3)} > REFERÊNCIA ${atrRef.toFixed(3)})`,
          stopLoss: 0.35,
          takeProfit: 0.70,
          limparReferencia: true,
        };
      } else {
        return {
          acao: "COMPRA",
          status: `[VEM DE CIMA] - ESTRATÉGIA 4 - DEFINIDA: COMPRA CONFIRMADA (NOVO ATR ${novoAtr.toFixed(3)} < REFERÊNCIA ${atrRef.toFixed(3)})`,
          stopLoss: 0.35,
          takeProfit: 0.70,
          limparReferencia: true,
        };
      }
    }
  }

  return {
    acao: "IGNORADO",
    status: "ATR fora da faixa da Estratégia 4 (0.350 a 0.400)",
    stopLoss: 0,
    takeProfit: 0,
  };
}
// ==========================================
// ESTRATÉGIA 5: VEM DE CIMA - FILTRO DE REVERSÃO NO 2H / 4H (ATR 0.310 - 0.350)
// ==========================================

export interface DadosEstrategia5 {
  teveToqueNa99DeCima: boolean;
  atrAtual2H: number;
  atrAnterior2H: number;
  // Dados do Candle do Toque no 2H
  fechamentoCorpoAbaixoDaMedia99: boolean; 
  // Dados para o Padrão 2 (4H)
  modoMonitoramento4H?: boolean;
  candleVermelho4HFechadoTocou99?: boolean;
}

export interface ResultadoEstrategia5 {
  acao: "COMPRA" | "AGUARDAR" | "CANCELAR" | "IGNORADO";
  status: string;
  stopLoss: number;
  takeProfit: number;
  mudarFocoPara4H?: boolean; // Sinaliza para o scanner alternar o monitoramento para o 4H
}

/**
 * Processa exclusivamente a Estratégia 5 do "Vem de Cima" (Padrão 1 e Padrão 2)
 */
export function processarEstrategia5VemDeCima(dados: DadosEstrategia5): ResultadoEstrategia5 {

  // 1. Valida o toque inicial vindo de cima
  if (!dados.teveToqueNa99DeCima) {
    return {
      acao: "IGNORADO",
      status: "Sem toque na média 99 vindo de cima",
      stopLoss: 0,
      takeProfit: 0,
    };
  }

  const atrAtual = dados.atrAtual2H;
  const atrAnterior = dados.atrAnterior2H;

  // Verifica se o ATR atual está na faixa da Estratégia 5 (0.310 a 0.350)
  if (atrAtual >= 0.310 && atrAtual <= 0.350) {

    // ==========================================
    // PADRÃO 2: TRANSIÇÃO E VALIDAÇÃO NO 4H
    // Condição: ATR anterior também estava entre 0.310 e 0.350
    // ==========================================
    if (atrAnterior >= 0.310 && atrAnterior <= 0.350) {

      // Se já mudou o foco para o 4H e o candle vermelho fechou tocando a 99
      if (dados.modoMonitoramento4H && dados.candleVermelho4HFechadoTocou99) {
        return {
          acao: "COMPRA",
          status: "Estratégia 5 (Padrão 2 - 4H) Confirmada: Compra validada no fechamento do candle vermelho do 4H.",
          stopLoss: 0.35,
          takeProfit: 0.70,
        };
      }

      // Caso contrário, ativa a transição para monitorar no 4H
      return {
        acao: "AGUARDAR",
        status: "Estratégia 5 (Padrão 2): ATRs consecutivos na faixa. Alternando monitoramento para o gráfico de 4H (Aguardando candle vermelho).",
        stopLoss: 0.35,
        takeProfit: 0.70,
        mudarFocoPara4H: true,
      };
    }

    // ==========================================
    // PADRÃO 1: ENTRADA DIRETA NO 2H
    // Condição: ATR anterior estava abaixo de 0.310
    // ==========================================
    if (atrAnterior < 0.310) {

      // Validação do toque: O corpo deve fechar obrigatoriamente abaixo da média 99
      if (dados.fechamentoCorpoAbaixoDaMedia99) {
        return {
          acao: "COMPRA",
          status: "Estratégia 5 (Padrão 1 - 2H) Confirmada: Compra direta no fechamento do candle.",
          stopLoss: 0.35,
          takeProfit: 0.70,
        };
      } else {
        // Filtro de anulação: Se o corpo fechou acima e o anterior era < 0.310
        return {
          acao: "CANCELAR",
          status: "Estratégia 5 Anulada: Corpo fechou acima da média 99 com ATR anterior < 0.310. Operação cancelada.",
          stopLoss: 0,
          takeProfit: 0,
        };
      }
    }
  }

  // Se o ATR estiver fora da faixa da Estratégia 5
  return {
    acao: "IGNORADO",
    status: "ATR fora da faixa da Estratégia 5 (0.310 a 0.350)",
    stopLoss: 0,
    takeProfit: 0,
  };
}
// ==========================================
// ESTRATÉGIA 6: VEM DE CIMA - RETESTE DE TOPO DINÂMICO (2H)
// ==========================================

export interface EstadoEstrategia6 {
  fase: 
    | "AGUARDANDO_ATIVACAO" 
    | "AGUARDANDO_VALIDACAO_MAXIMA" 
    | "MONITORANDO_ZONAS" 
    | "AGUARDANDO_TOQUE_99_SEGUNDO_TOPO"
    | "BLOQUEADO_INTERMEDIARIO"
    | "VENDA_DIRETA_APOS_INVALIDACAO_DUPLA";
  minimaFixa?: number;
  topoValidado?: number;
  tipoTopo?: 1 | 2; 
  regraCompra062?: number;
  barreiraAlta045?: number;
  atrOrigem?: number;
  maximaCandleToqueInicial?: number;
  maximaCandleRompimentoDuplo?: number;
}

export interface DadosEstrategia6 {
  teveToqueNa99DeCima: boolean;
  atrAtual: number;
  precoAtual: number;
  maximaCandleToque?: number;
  minimaCandleToque?: number;
  toqueNaMedia99Agora?: boolean; // Indica se o preço atual tocou na média 99 neste ciclo
  fundoCardToposFundos?: number; // Vindo do card azul lateral (Vem de Baixo)
  estadoAtual: EstadoEstrategia6;
}

export interface ResultadoEstrategia6 {
  acao: "COMPRA" | "VENDA" | "AGUARDAR" | "CANCELAR" | "IGNORADO";
  status: string;
  stopLoss: number;
  takeProfit: number;
  novoEstado: EstadoEstrategia6;
}

/**
 * Processa exclusivamente a Estratégia 6 do "Vem de Cima" com as regras refinadas.
 */
export function processarEstrategia6VemDeCima(dados: DadosEstrategia6): ResultadoEstrategia6 {

  const atr = dados.atrAtual;
  let estado = { ...dados.estadoAtual };

  // ==========================================
  // FILTRO DE VOLATILIDADE (ATR DO CARD) - ABORTAGEM GERAL
  // ==========================================
  if (estado.fase !== "AGUARDANDO_ATIVACAO" && atr >= 0.310) {
    return {
      acao: "CANCELAR",
      status: "Estratégia 6 Abortada: ATR atual subiu para >= 0.310 após validação. Sistema resetado.",
      stopLoss: 0.35,
      takeProfit: 1.00,
      novoEstado: { fase: "AGUARDANDO_ATIVACAO" }
    };
  }

  // ==========================================
  // ESTADO ESPECIAL: VENDA DIRETA APÓS INVALIDAÇÃO DUPLA
  // ==========================================
  if (estado.fase === "VENDA_DIRETA_APOS_INVALIDACAO_DUPLA") {
    const topoFinal = estado.maximaCandleRompimentoDuplo ?? 0;

    if (topoFinal > 0 && dados.precoAtual >= topoFinal) {
      return {
        acao: "VENDA",
        status: "Estratégia 6 - Venda Confirmada no Topo de Rompimento Duplo.",
        stopLoss: 0.35,
        takeProfit: 1.00,
        novoEstado: estado
      };
    }

    return {
      acao: "AGUARDAR",
      status: "Estratégia 6: Estrutura anterior invalidada por rompimento duplo. Aguardando preço tocar no novo topo de venda.",
      stopLoss: 0.35,
      takeProfit: 1.00,
      novoEstado: estado
    };
  }

  // ==========================================
  // 1. CONDIÇÃO INICIAL & FIXAÇÃO DA MÍNIMA ABSOLUTA (ATR < 0.310)
  // ==========================================
  if (estado.fase === "AGUARDANDO_ATIVACAO") {
    if (dados.teveToqueNa99DeCima && atr < 0.310) {
      const minimaGravada = dados.minimaCandleToque ?? dados.precoAtual;
      const maximaGravada = dados.maximaCandleToque ?? dados.precoAtual;

      return {
        acao: "AGUARDAR",
        status: "Estratégia 6 Ativada: Toque com ATR < 0.310. Mínima fixa gravada. Aguardando romper máxima para validar o topo.",
        stopLoss: 0.35,
        takeProfit: 1.00,
        novoEstado: {
          fase: "AGUARDANDO_VALIDACAO_MAXIMA",
          minimaFixa: minimaGravada,
          topoValidado: maximaGravada,
          maximaCandleToqueInicial: maximaGravada,
          tipoTopo: 1,
          atrOrigem: atr
        }
      };
    }
    return {
      acao: "IGNORADO",
      status: "Estratégia 6 inativa (Aguardando toque com ATR < 0.310)",
      stopLoss: 0,
      takeProfit: 0,
      novoEstado: estado
    };
  }

  // ==========================================
  // 2. REGRA DE VALIDAÇÃO SIMULTÂNEA (Romper a máxima do toque)
  // ==========================================
  if (estado.fase === "AGUARDANDO_VALIDACAO_MAXIMA") {
    const topoAtual = estado.topoValidado ?? 0;

    if (dados.precoAtual > topoAtual) {
      const minima = estado.minimaFixa ?? 0;
      const regiao062 = topoAtual - (topoAtual * 0.0062); 
      const barreira045 = minima + (minima * 0.0045);    

      return {
        acao: "AGUARDAR",
        status: "Estratégia 6 Validada: Máxima rompida. Mínima fixa e 1º Topo ativados. Monitorando zonas.",
        stopLoss: 0.35,
        takeProfit: 1.00,
        novoEstado: {
          ...estado,
          fase: "MONITORANDO_ZONAS",
          regraCompra062: regiao062,
          barreiraAlta045: barreira045
        }
      };
    }
    return {
      acao: "AGUARDAR",
      status: "Estratégia 6 em Espera: Aguardando preço romper a máxima do candle de toque.",
      stopLoss: 0.35,
      takeProfit: 1.00,
      novoEstado: estado
    };
  }

  // ==========================================
  // 3. MONITORAMENTO DE ZONAS (1º Topo / 2º Topo / Regiões de 0.62% e 0.45%)
  // ==========================================
  if (
    estado.fase === "MONITORANDO_ZONAS" || 
    estado.fase === "BLOQUEADO_INTERMEDIARIO" || 
    estado.fase === "AGUARDANDO_TOQUE_99_SEGUNDO_TOPO"
  ) {
    const topo = estado.topoValidado ?? 0;
    const linha062 = estado.regraCompra062 ?? 0;
    const barreira045 = estado.barreiraAlta045 ?? 0;
    const minima = estado.minimaFixa ?? 0;

    // A. VERIFICAÇÃO DE INVALIDAÇÃO POR ROMPIMENTO DUPLO (Mínima Fixa + Região 0.62%)
    if (minima > 0 && linha062 > 0 && dados.precoAtual <= minima && dados.precoAtual <= linha062) {
      const novaMaximaTopo = dados.maximaCandleToque ?? dados.precoAtual;
      return {
        acao: "AGUARDAR",
        status: "Estratégia 6: Rompimento duplo da mínima fixa e 0.62%. Estrutura anterior apagada. Novo topo de venda definido.",
        stopLoss: 0.35,
        takeProfit: 1.00,
        novoEstado: {
          fase: "VENDA_DIRETA_APOS_INVALIDACAO_DUPLA",
          maximaCandleRompimentoDuplo: novaMaximaTopo,
          minimaFixa: undefined,
          topoValidado: undefined,
          regraCompra062: undefined,
          barreiraAlta045: undefined,
          tipoTopo: undefined
        }
      };
    }

    // B. FILTRO ANTI-RUÍDO (NOVO): Toque na Média 99 sem ter subido +0.45%
    if (dados.toqueNaMedia99Agora && barreira045 > 0 && dados.precoAtual < barreira045) {
      return {
        acao: "IGNORADO",
        status: "Estratégia 6: Toque secundário ignorado (Mínima fixa ativa e alta < 0.45%).",
        stopLoss: 0.35,
        takeProfit: 1.00,
        novoEstado: estado // Mantém o estado intacto sem resetar o setup
      };
    }

    // C. Verifica se subiu e rompeu a barreira de 0.45% (Início da tentativa de 2º Topo)
    if (estado.tipoTopo === 1 && barreira045 > 0 && dados.precoAtual >= barreira045 && dados.precoAtual < topo) {
      const rascunhoTopo = dados.precoAtual;
      return {
        acao: "AGUARDAR",
        status: "Estratégia 6: Preço rompeu barreira de 0.45%. Aguardando toque na média 99 para confirmar o 2º Topo.",
        stopLoss: 0.35,
        takeProfit: 1.00,
        novoEstado: {
          ...estado,
          fase: "AGUARDANDO_TOQUE_99_SEGUNDO_TOPO",
          topoValidado: rascunhoTopo // Temporário até confirmar o toque na 99
        }
      };
    }

    // D. Confirmação do 2º Topo ao tocar na Média 99 após romper 0.45%
    if (estado.fase === "AGUARDANDO_TOQUE_99_SEGUNDO_TOPO" && dados.toqueNaMedia99Agora) {
      const novoTopoOficial = estado.topoValidado ?? dados.precoAtual;
      const novaRegiao062 = novoTopoOficial - (novoTopoOficial * 0.0062);

      return {
        acao: "AGUARDAR",
        status: "Estratégia 6 - 2º Topo Validado (Toque na 99 confirmado). Mínima fixa mantida, 0.62% recalculado.",
        stopLoss: 0.35,
        takeProfit: 1.00,
        novoEstado: {
          ...estado,
          fase: "BLOQUEADO_INTERMEDIARIO",
          topoValidado: novoTopoOficial,
          tipoTopo: 2,
          regraCompra062: novaRegiao062,
          barreiraAlta045: undefined
        }
      };
    }

    // E. Fluxo de Venda no Topo Ativo (1º ou 2º Topo)
    if (topo > 0 && dados.precoAtual >= topo) {
      return {
        acao: "VENDA",
        status: `Estratégia 6 Confirmada: Toque no ${estado.tipoTopo}º Topo validado. Venda acionada com alvo de 1.00%.`,
        stopLoss: 0.35,
        takeProfit: 1.00,
        novoEstado: estado
      };
    }

    // F. Fluxo de Compra na Região de 0.62%
    if (linha062 > 0 && dados.precoAtual <= linha062) {
      return {
        acao: "COMPRA",
        status: `Estratégia 6 Confirmada: Compra executada na região de 0.62% do ${estado.tipoTopo}º Topo. Alvo no topo.`,
        stopLoss: 0.35,
        takeProfit: topo,
        novoEstado: estado
      };
    }
  }

  return {
    acao: "AGUARDAR",
    status: "Estratégia 6 em monitoramento contínuo de zonas operacionais.",
    stopLoss: 0.35,
    takeProfit: 1.00,
    novoEstado: estado
  };
}