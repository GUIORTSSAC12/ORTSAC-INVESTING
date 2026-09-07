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
  atrReferenciaSalvo?: number;      // Memória temporária do ATR salvo no 1º toque
  proximoCandleFechado?: boolean;   // Indica se o candle de 2h seguinte já fechou
}

export interface ResultadoEstrategia2 {
  acao: "COMPRA" | "VENDA" | "AGUARDAR" | "IGNORADO";
  status: string;
  stopLoss: number;
  takeProfit: number;
  novoAtrReferencia?: number;       // Valor para o sistema armazenar externamente
  limparReferencia?: boolean;       // Sinal para apagar a memória após a definição
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

    // Passo A: Se ainda não existe referência salva, salva o ATR atual e entra em espera
    if (dados.atrReferenciaSalvo === undefined) {
      return {
        acao: "AGUARDAR",
        status: "Estratégia 2 Ativada: ATR > 0.510. Salvando referência e aguardando próximo candle.",
        stopLoss: 0.35,
        takeProfit: 0.70,
        novoAtrReferencia: dados.atrAtual, // Guarda este valor na memória temporária
      };
    }

    // Passo B: Se já possui referência salva, aguarda o fechamento do próximo candle para comparar
    if (dados.proximoCandleFechado) {
      const novoAtr = dados.atrAtual;
      const atrRef = dados.atrReferenciaSalvo;

      // Protocolo de Definição
      if (novoAtr < atrRef) {
        return {
          acao: "VENDA",
          status: `Estratégia 2 Definida: Venda Confirmada (Novo ATR ${novoAtr} < Referência ${atrRef})`,
          stopLoss: 0.35,
          takeProfit: 0.70,
          limparReferencia: true, // Limpa a variável de referência após definir o estado
        };
      } else {
        return {
          acao: "COMPRA",
          status: `Estratégia 2 Definida: Compra Confirmada (Novo ATR ${novoAtr} > Referência ${atrRef})`,
          stopLoss: 0.35,
          takeProfit: 0.70,
          limparReferencia: true, // Limpa a variável de referência após definir o estado
        };
      }
    } else {
      // Continua em modo de espera até o candle atual fechar
      return {
        acao: "AGUARDAR",
        status: "Estratégia 2 em Espera: Aguardando fechamento do candle para avaliação.",
        stopLoss: 0.35,
        takeProfit: 0.70,
      };
    }
  }

  // Se o ATR estiver em outra faixa, a Estratégia 2 não se aplica
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
  acao: "EXCLUSAO" | "IGNORADO";
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
      acao: "EXCLUSAO",
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
  atrReferenciaSalvo?: number;      // Memória temporária do ATR salvo no toque inicial
  proximoCandleFechado?: boolean;   // Indica se o candle de 2h seguinte já fechou
}

export interface ResultadoEstrategia4 {
  acao: "COMPRA" | "VENDA" | "AGUARDAR" | "IGNORADO";
  status: string;
  stopLoss: number;
  takeProfit: number;
  novoAtrReferencia?: number;       // Valor para o sistema armazenar externamente
  limparReferencia?: boolean;       // Sinal para apagar a memória após a definição
}

/**
 * Processa exclusivamente a Estratégia 4 do "Vem de Cima"
 * Gatilho: Toque vindo de cima + ATR atual entre 0.350 e 0.400
 */
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

    // Passo A: Se ainda não existe referência salva, salva o ATR atual e entra em espera
    if (dados.atrReferenciaSalvo === undefined) {
      return {
        acao: "AGUARDAR",
        status: "Estratégia 4 Ativada: ATR entre 0.350 e 0.400. Salvando referência e aguardando próximo candle.",
        stopLoss: 0.35,
        takeProfit: 0.70,
        novoAtrReferencia: dados.atrAtual, // Guarda este valor na memória temporária
      };
    }

    // Passo B: Se já possui referência salva, aguarda o fechamento do próximo candle para comparar
    if (dados.proximoCandleFechado) {
      const novoAtr = dados.atrAtual;
      const atrRef = dados.atrReferenciaSalvo;

      // Protocolo de Definição (Reversão)
      if (novoAtr > atrRef) {
        return {
          acao: "VENDA",
          status: `Estratégia 4 Definida: Venda Confirmada (Novo ATR ${novoAtr} > Referência ${atrRef})`,
          stopLoss: 0.35,
          takeProfit: 0.70,
          limparReferencia: true, // Limpa a variável de referência após definir o estado
        };
      } else {
        return {
          acao: "COMPRA",
          status: `Estratégia 4 Definida: Compra Confirmada (Novo ATR ${novoAtr} < Referência ${atrRef})`,
          stopLoss: 0.35,
          takeProfit: 0.70,
          limparReferencia: true, // Limpa a variável de referência após definir o estado
        };
      }
    } else {
      // Continua em modo de espera até o candle atual fechar
      return {
        acao: "AGUARDAR",
        status: "Estratégia 4 em Espera: Aguardando fechamento do candle para avaliação de reversão.",
        stopLoss: 0.35,
        takeProfit: 0.70,
      };
    }
  }

  // Se o ATR estiver fora dessa faixa, a Estratégia 4 não se aplica
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
    | "BLOQUEADO_INTERMEDIARIO";
  minimaFixa?: number;
  topoValidado?: number;
  tipoTopo?: 1 | 2; // <--- Adicionamos o ponto de interrogação aqui para virar opcional!
  regraCompra062?: number;
  barreiraAlta045?: number;
  atrOrigem?: number;
}

export interface DadosEstrategia6 {
  teveToqueNa99DeCima: boolean;
  atrAtual: number;
  precoAtual: number;
  maximaCandleToque?: number;
  minimaCandleToque?: number;
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
 * Processa exclusivamente a Estratégia 6 do "Vem de Cima"
 */
export function processarEstrategia6VemDeCima(dados: DadosEstrategia6): ResultadoEstrategia6 {

  const atr = dados.atrAtual;
  let estado = { ...dados.estadoAtual };

  // ==========================================
  // FILTRO DE VOLATILIDADE (ATR DO CARD) - ABORTAGEM GERAL
  // Se após a validação o ATR subir para >= 0.310, reseta tudo
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
          topoValidado: maximaGravada, // Temporariamente a máxima do toque
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
      // Validado! Calcula as regiões de gatilho do 1º Topo
      const minima = estado.minimaFixa ?? 0;
      const regiao062 = topoAtual - (topoAtual * 0.0062); // Exemplo simplificado de 0.62% abaixo do topo
      const barreira045 = minima + (minima * 0.0045);   // 0.45% acima da mínima fixa

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
  if (estado.fase === "MONITORANDO_ZONAS" || estado.fase === "BLOQUEADO_INTERMEDIARIO") {
    const topo = estado.topoValidado ?? 0;
    const linha062 = estado.regraCompra062 ?? 0;
    const barreira045 = estado.barreiraAlta045 ?? 0;
    const minima = estado.minimaFixa ?? 0;

    // A. Verifica se subiu e rompeu a barreira de 0.45% (Recalibragem para o 2º Topo)
    if (estado.tipoTopo === 1 && barreira045 > 0 && dados.precoAtual >= barreira045 && dados.precoAtual < topo) {
      // Recalibra para o 2º Topo (elimina mínima fixa antiga, define novo topo)
      const novoTopo = dados.precoAtual;
      const novaRegiao062 = novoTopo - (novoTopo * 0.0062);

      return {
        acao: "AGUARDAR",
        status: "Estratégia 6 - Regra 2 Ativada: 2º Topo formado e recalibrado. Mínima fixa eliminada. Entrando em bloqueio intermediário.",
        stopLoss: 0.35,
        takeProfit: 1.00,
        novoEstado: {
          fase: "BLOQUEADO_INTERMEDIARIO",
          topoValidado: novoTopo,
          tipoTopo: 2,
          regraCompra062: novaRegiao062,
          barreiraAlta045: undefined, // Sem mínima fixa
          minimaFixa: undefined
        }
      };
    }

    // B. Fluxo de Venda no Topo Original (1º Topo)
    if (estado.tipoTopo === 1 && dados.precoAtual >= topo) {
      return {
        acao: "VENDA",
        status: "Estratégia 6 Confirmada: Toque no 1º Topo validado. Venda acionada com alvo de 1.00%.",
        stopLoss: 0.35,
        takeProfit: 1.00,
        novoEstado: estado
      };
    }

    // C. Fluxo de Compra na Região de 0.62%
    if (linha062 > 0 && dados.precoAtual <= linha062) {
      const alvoSaida = estado.tipoTopo === 2 ? topo : topo; // Alvo no topo correspondente
      const acaoFinal = estado.tipoTopo === 2 ? "COMPRA" : "COMPRA"; // Na regra do 2º topo, encerra a compra e engatilha venda automática

      return {
        acao: acaoFinal,
        status: `Estratégia 6 Confirmada: Compra executada na região de 0.62% do ${estado.tipoTopo}º Topo. Alvo no topo.`,
        stopLoss: 0.35,
        takeProfit: alvoSaida,
        novoEstado: estado
      };
    }

    // D. Fluxo de Saída/Reversa para Venda no 2º Topo (após recálculo)
    if (estado.tipoTopo === 2 && dados.precoAtual >= topo) {
      return {
        acao: "VENDA",
        status: "Estratégia 6 Confirmada (2º Topo): Preço atingiu o novo topo. Venda automática engatilhada com alvo de 1.00%.",
        stopLoss: 0.35,
        takeProfit: 1.00,
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