// ==========================================
// LEITURA DO CARD GRÁFICO 2H (MÉDIAS MÓVEIS)
// ==========================================

export interface DadosCardGrafico2H {
  corFundoMedia20: "AZUL" | "VERMELHO";
}

export function identificarDirecaoCardGrafico2H(dados: DadosCardGrafico2H) {
  // Verifica especificamente o resultado da Média 20 no Card Gráfico 2H das Médias Móveis
  if (dados.corFundoMedia20 === "VERMELHO") {
    return {
      direcao: "VEM_DE_BAIXO",
      motivo: "Média 20 com fundo vermelho no Card Gráfico 2H (Médias Móveis)"
    };
  }

  if (dados.corFundoMedia20 === "AZUL") {
    return {
      direcao: "VEM_DE_CIMA",
      motivo: "Média 20 com fundo azul no Card Gráfico 2H (Médias Móveis)"
    };
  }

  return {
    direcao: "indefinido",
    motivo: "Cor da média 20 no Card Gráfico 2H não reconhecida (dados corrompidos ou ausentes)"
  };
}
// ==========================================
// VALIDAÇÃO MESTRE + CLASSIFICAÇÃO DE ATR (2H)
// ==========================================

export interface DadosValidacaoToque {
  corFundoMedia20Grafico2H: "AZUL" | "VERMELHO";
  posicaoMercado: "ACIMA" | "ABAIXO";
  teveToqueNa99: boolean;
  candleFechado: boolean;
  respiroCandleOk: boolean;
  atrAtual: number; // Ex: 0.567
}

export function validarToqueGlobal2H(dados: DadosValidacaoToque) {

  // 1. TRAVAS DE INVALIDAÇÃO (BLOQUEIOS)
  if (dados.corFundoMedia20Grafico2H === "VERMELHO" && dados.posicaoMercado === "ACIMA") {
    return { valido: false, motivo: "Bloqueio: Gráfico 2H vermelho, mas mercado acima da 99." };
  }

  if (dados.corFundoMedia20Grafico2H === "AZUL" && dados.posicaoMercado === "ABAIXO") {
    return { valido: false, motivo: "Bloqueio: Gráfico 2H azul, mas mercado abaixo da 99." };
  }

  // 2. VALIDAÇÕES DE CANDLE E TOQUE
  if (!dados.candleFechado) {
    return { valido: false, motivo: "Aguardando fechamento do candle." };
  }

  if (!dados.respiroCandleOk) {
    return { valido: false, motivo: "Inválido: O candle violou a regra de respiro da média 99." };
  }

  if (!dados.teveToqueNa99) {
    return { valido: false, motivo: "Sem toque registrado na média 99." };
  }

  // 3. CLASSIFICAÇÃO AUTOMÁTICA NAS SUAS REGIÕES DE ATR
  // Suas regiões: 0.510, 0.500, 0.400, 0.350, 0.310
  let regiaoAtr = "ABAIXO_DO_MINIMO";

  if (dados.atrAtual >= 0.510) {
    regiaoAtr = "REGIAO_0_510"; // Acima de 0.510 (inclui o seu 0.567)
  } else if (dados.atrAtual >= 0.500) {
    regiaoAtr = "REGIAO_0_500";
  } else if (dados.atrAtual >= 0.400) {
    regiaoAtr = "REGIAO_0_400";
  } else if (dados.atrAtual >= 0.350) {
    regiaoAtr = "REGIAO_0_350";
  } else if (dados.atrAtual >= 0.310) {
    regiaoAtr = "REGIAO_0_310";
  }

  // Se estiver abaixo da menor região aceitável, barra o sinal
  if (regiaoAtr === "ABAIXO_DO_MINIMO") {
    return { 
      valido: false, 
      motivo: `Inválido: ATR atual (${dados.atrAtual}) está abaixo da menor região mapeada (0.310).` 
    };
  }

  // 4. APROVAÇÃO FINAL COM A DIREÇÃO E A FAIXA DE ATR CLASSIFICADA
  const direcaoMapeada = dados.corFundoMedia20Grafico2H === "VERMELHO" ? "VEM_DE_BAIXO" : "VEM_DE_CIMA";

  return {
    valido: true,
    direcao: direcaoMapeada,
    atrCapturado: dados.atrAtual,
    regiaoAtr: regiaoAtr, // Ex: "REGIAO_0_510" para o seu 0.567
    motivo: `Toque 100% validado! Direção: ${direcaoMapeada} | ATR: ${dados.atrAtual} (${regiaoAtr})`
  };
}
