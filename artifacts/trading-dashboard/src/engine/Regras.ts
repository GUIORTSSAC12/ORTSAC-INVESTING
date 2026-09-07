// ==========================================
// REGRAS DE GERENCIAMENTO E RESTRIÇÕES - 2H
// ==========================================

export const GERENCIAMENTO_RISCO_2H = {
  stopLoss: 0.35,
  alvoParcialProtecao: 0.50,
  novoStopProtecao: 0.10,
};

/**
 * FUNÇÃO DE RESTRIÇÕES GLOBAIS DE CONTEXTO
 * Analisa restrições de banner, dias da semana e estado de operações vigentes.
 */
export function verificarRestricoesGlobais2H(dadosMercado: {
  candleFechado: boolean;
  statusBanner: string;
  diaDaSemana: string;
  operacaoAberta: boolean;
}) {

  // 1. Prioridade de Leitura: Ignora candles abertos
  if (!dadosMercado.candleFechado) {
    return { permitido: false, motivo: "Candle ainda em formação (Aberto)" };
  }

  // 2. Ação de Segurança Global: Mercado Fechado
  if (dadosMercado.statusBanner === "MERCADO_FECHADO") {
    return { permitido: false, motivo: "Status de Mercado Fechado - Sinal ignorado" };
  }

  // 3. Regra de Invalidação de Sexta-feira
  if (dadosMercado.diaDaSemana === "SEXTA" && dadosMercado.statusBanner === "MERCADO_FECHADO") {
    return { permitido: false, motivo: "Restrição de Sexta-feira / Fechamento de mercado" };
  }

  // 4. Se já existe operação aberta, aplica a Regra de Soberania (ignora novos padrões)
  if (dadosMercado.operacaoAberta) {
    return { permitido: false, motivo: "Operação já vigente no 2H (Soberania ativa)" };
  }

  // Se passou pelas restrições de contexto
  return {
    permitido: true,
    motivo: "Contexto livre de restrições globais",
    gerenciamentoSugerido: GERENCIAMENTO_RISCO_2H
  };
}