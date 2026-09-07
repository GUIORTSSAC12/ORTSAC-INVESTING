// ==========================================
// MOTOR DE VALIDAÇÃO E BLINDAGEM - 2H (REGRA GLOBAL)
// ==========================================

export const NIVEIS_ATR = {
  MIN_VALIDO: 0.310,
  LIMITE_INFERIOR: 0.350,
  INTERMEDIARIO: 0.400,
  ALTO_1: 0.500,
  ALTO_2: 0.510,
};

export const GERENCIAMENTO_RISCO_2H = {
  stopLoss: 0.35,
  alvoParcialProtecao: 0.50,
  novoStopProtecao: 0.10,
};

export function validarIntervaloAtr(atrAtual: number, min: number, max: number): boolean {
  return atrAtual >= min && atrAtual <= max;
}

export function validarSincroniaMedia(
  posicaoCandle: "ACIMA" | "ABAIXO", 
  corFundoMedia20: "AZUL" | "VERMELHO"
): boolean {
  if (corFundoMedia20 === "AZUL" && posicaoCandle === "ACIMA") return true;
  if (corFundoMedia20 === "VERMELHO" && posicaoCandle === "ABAIXO") return true;
  return false;
}

/**
 * FUNÇÃO MESTRE DE VALIDAÇÃO DE TOQUE
 * Analisa se o candle atual respeita todas as regras globais e de blindagem.
 */
  export function validarToqueGlobal2H(dadosMercado: {
    candleFechado: boolean;
    statusBanner: string; // <-- Mudado para string simples
    diaDaSemana: string;
    teveToqueNa99: boolean;
    posicaoCandle: "ACIMA" | "ABAIXO";
    corFundoMedia20: "AZUL" | "VERMELHO";
    atrAtual: number;
    operacaoAberta: boolean;
  }) {

  // 1. Prioridade de Leitura: Ignora candles abertos
  if (!dadosMercado.candleFechado) {
    return { valido: false, motivo: "Candle ainda em formação (Aberto)" };
  }

  // 2. Ação de Segurança Global: Mercado Fechado
  if (dadosMercado.statusBanner === "MERCADO_FECHADO") {
    return { valido: false, motivo: "Status de Mercado Fechado - Sinal ignorado" };
  }

  // 3. Regra de Invalidação de Sexta-feira
  if (dadosMercado.diaDaSemana === "SEXTA" && dadosMercado.statusBanner === "MERCADO_FECHADO") {
    return { valido: false, motivo: "Toque coincidiu com a mudança para Mercado Fechado na sexta-feira" };
  }

  // 4. Se já existe operação aberta, aplica a Regra de Soberania (ignora novos padrões)
  if (dadosMercado.operacaoAberta) {
    return { valido: false, motivo: "Operação já vigente no 2H (Soberania ativa)" };
  }

  // 5. Verifica se houve toque válido na média 99
  if (!dadosMercado.teveToqueNa99) {
    return { valido: false, motivo: "Sem toque registrado na média 99" };
  }

  // 6. Filtro de Sincronia Obrigatória (Fundo da 20 e posição do candle)
  const sincroniaOk = validarSincroniaMedia(dadosMercado.posicaoCandle, dadosMercado.corFundoMedia20);
  if (!sincroniaOk) {
    return { valido: false, motivo: "Divergência: Posição do candle não bate com a cor da média 20" };
  }

  // 7. Validação dos Níveis de ATR permitidos
  const atrValido = validarIntervaloAtr(dadosMercado.atrAtual, NIVEIS_ATR.MIN_VALIDO, NIVEIS_ATR.ALTO_2);
  if (!atrValido) {
    return { valido: false, motivo: "Valor de ATR fora dos limites aceitáveis" };
  }

  // Se passou por TODAS as travas e filtros, o toque é oficialmente VÁLIDO
  return {
    valido: true,
    motivo: "Toque blindado e validado com sucesso",
    gerenciamentoSugerido: GERENCIAMENTO_RISCO_2H
  };
}