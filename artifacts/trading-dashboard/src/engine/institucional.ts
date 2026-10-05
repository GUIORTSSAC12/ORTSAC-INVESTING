// ==========================================
// MOTOR DE BLINDAGEM - CANDLE INSTITUCIONAL (2H)
// ==========================================

const GERENCIAMENTO_RISCO_2H = {
  stopLoss: -0.35,
};

/**
 * 1. REGRA DE VALIDAÇÃO DO HORÁRIO DE LONDRES
 * Valida o fuso ativo e garante que o relógio de referência é o de Londres (nunca Brasília).
 */
export function validarHorarioInstitucional(dados: {
  fusoAtivo: "UTC_0" | "UTC_PLUS_1";
  botaoLondresAzul: boolean;
  horaAtualLondres: number; // Ex: 7 para 07:00 ou 8 para 08:00
}): boolean {
  if (!dados.botaoLondresAzul) return false;

  if (dados.fusoAtivo === "UTC_0" && dados.horaAtualLondres === 8) {
    return true; // Cenário A: UTC 0 às 08:00
  }

  if (dados.fusoAtivo === "UTC_PLUS_1" && dados.horaAtualLondres === 7) {
    return true; // Cenário B: UTC +1 às 07:00
  }

  return false;
}

/**
 * 2. REGRA DE AJUSTE DE STOP DO 1º INSTITUCIONAL (Média 20)
 * Compara o corpo do candle institucional (ignorando pavios) com a média 20 do gráfico 2H.
 * Só atua se o candle tiver fechado APÓS a entrada na operação.
 */
export function avaliarAjusteStopInstitucional(dados: {
  direcaoOperacao: "COMPRA" | "VENDA";
  aberturaCandle: number;
  fechamentoCandle: number;
  media20Gráfico2H: number;
  timestampCandle: number; // Timestamp de fechamento do candle avaliado
  timestampEntradaTrade: number; // Timestamp exato de quando o botão foi acionado
}): { novoStop: number; motivo: string } {
  
  // REGRA DE OURO: Se o candle fechou ANTES da entrada do trade, ele NUNCA pode ajustar o stop.
  if (dados.timestampCandle <= dados.timestampEntradaTrade) {
    return {
      novoStop: GERENCIAMENTO_RISCO_2H.stopLoss,
      motivo: "ESTABILIDADE: CANDLE ANTERIOR À ENTRADA, MANTIDO STOP INICIAL -0.35%",
    };
  }

  const ehCandleDeAlta = dados.fechamentoCandle > dados.aberturaCandle;
  const ehCandleDeBaixa = dados.fechamentoCandle < dados.aberturaCandle;

  // SE EM COMPRA
  if (dados.direcaoOperacao === "COMPRA") {
    // Gatilho: Fecha como baixa E abaixo da média 20 (após a entrada)
    if (ehCandleDeBaixa && dados.fechamentoCandle < dados.media20Gráfico2H) {
      return {
        novoStop: -0.5,
        motivo:
          "1º INSTITUCIONAL DE BAIXA ABAIXO DA MÉDIA 20 APÓS A ENTRADA (AJUSTE PARA -0.50%)",
      };
    }
  }

  // SE EM VENDA
  if (dados.direcaoOperacao === "VENDA") {
    // Gatilho: Fecha como alta E acima da média 20 (após a entrada)
    if (ehCandleDeAlta && dados.fechamentoCandle > dados.media20Gráfico2H) {
      return {
        novoStop: -0.5,
        motivo:
          "1º INSTITUCIONAL DE ALTA ACIMA DA MÉDIA 20 APÓS A ENTRADA (AJUSTE PARA -0.50%)",
      };
    }
  }

  // Regra de Estabilidade: A favor ou neutro mantém o stop original (-0.35%)
  return {
    novoStop: GERENCIAMENTO_RISCO_2H.stopLoss,
    motivo: "ESTABILIDADE: MOVIMENTO A FAVOR OU NEUTRO APÓS A ENTRADA, MANTIDO -0.35%",
  };
}

/**
 * 3. REGRA DO 2º INSTITUCIONAL (Saída Forçada ou Retorno à Segurança)
 * Verifica o posicionamento do corpo frente à Média 99 do gráfico 2H após 24 horas.
 */
export function avaliarSegundoInstitucional(dados: {
  direcaoOperacao: "COMPRA" | "VENDA";
  fechamentoCorpo: number;
  media99Grafico2H: number;
}): { acao: "SAIR_imediato" | "REDUZIR_STOP"; motivo: string } {
  if (dados.direcaoOperacao === "COMPRA") {
    // Se o corpo fechar abaixo da média 99 em compra -> Saída Forçada
    if (dados.fechamentoCorpo < dados.media99Grafico2H) {
      return {
        acao: "SAIR_imediato",
        motivo: "2º INSTITUCIONAL FECHOU ABAIXO DA MÉDIA 99 (COMPRA ENCERRADA)",
      };
    }
  } else {
    // Se o corpo fechar acima da média 99 em venda -> Saída Forçada
    if (dados.fechamentoCorpo > dados.media99Grafico2H) {
      return {
        acao: "SAIR_imediato",
        motivo: "2º INSTITUCIONAL FECHOU ACIMA DA MÉDIA 99 (VENDA ENCERRADA)",
      };
    }
  }

  // Se não foi atingido (está do lado certo), reduz o stop de volta para -0.35%
  return {
    acao: "REDUZIR_STOP",
    motivo:
      "2º INSTITUCIONAL RESPEITOU A MÉDIA 99 (RETORNO DO STOP PARA -0.35%)",
  };
}

/**
 * 4. PROTOCOLO DE SEGURANÇA: FILTRO DE EXPOSIÇÃO (A "PAREDE" DOS 50 CANDLES)
 * Varre o histórico para ver se o pivot mais próximo está a mais ou a menos de 0.35%.
 */
export function avaliarFiltroExposicaoParede(dados: {
  precoEntrada: number;
  valorParedePivot: number; // Mínima (compra) ou Máxima (venda) encontrada nos últimos 50 candles
}): { permitirAjusteStop: boolean; motivo: string } {
  // Cálculo da distância percentual entre a entrada e a parede
  const distanciaPercentual =
    Math.abs(
      (dados.precoEntrada - dados.valorParedePivot) / dados.precoEntrada,
    ) * 100;

  if (distanciaPercentual > 0.35) {
    return {
      permitirAjusteStop: false,
      motivo: `DISTÂNCIA ATÉ A PAREDE (${distanciaPercentual.toFixed(2)}%) É MAIOR QUE -0.35%. BLOQUEADO O AJUSTE, MANTIDO -0.35%.`,
    };
  }

  return {
    permitirAjusteStop: true,
    motivo: `DISTÂNCIA ATÉ A PAREDE (${distanciaPercentual.toFixed(2)}%) É MENOR OU IGUAL A -0.35%. AJUSTE DE STOP LIBERADO.`,
  };
}
