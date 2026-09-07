// ==========================================
// LEITURA DO CARD GRÁFICO 2H (MÉDIAS MÓVEIS)
// ==========================================

export interface DadosCardGrafico2H {
  corFundoMedia20: "AZUL" | "VERMELHO";
}

export function identificarDirecaoCardGrafico2H(dados: DadosCardGrafico2H) {
  // Vermelho = Vem de Baixo | Azul = Vem de Cima
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
  precoAtualMercado: number; // Ex: 209.022 (Preço do GBP/JPY Perpetual)
  valorMedia99Grafico2H: number; // Ex: 213.338 (Valor numérico da Média 99)
  teveToqueNa99: boolean;
  candleFechado: boolean;
  respiroCandleOk: boolean;
  atrAtual: number; // Ex: 0.521
}

export function validarToqueGlobal2H(dados: DadosValidacaoToque) {

  // 1. COMPARAÇÃO MATEMÁTICA RIGOROSA (PREÇO VS MÉDIA 99 & COR DE FUNDO)
  // Se o fundo for VERMELHO (Vem de Baixo), o preço do mercado OBRIGATORIAMENTE tem que estar ABAIXO da Média 99.
  if (dados.corFundoMedia20Grafico2H === "VERMELHO" && dados.precoAtualMercado >= dados.valorMedia99Grafico2H) {
    return { 
      valido: false, 
      motivo: `Bloqueio de Anulação: Fundo 2H vermelho (Vem de Baixo), mas o preço atual (${dados.precoAtualMercado}) está acima ou igual à Média 99 (${dados.valorMedia99Grafico2H}).` 
    };
  }

  // Se o fundo for AZUL (Vem de Cima), o preço do mercado OBRIGATORIAMENTE tem que estar ACIMA da Média 99.
  if (dados.corFundoMedia20Grafico2H === "AZUL" && dados.precoAtualMercado <= dados.valorMedia99Grafico2H) {
    return { 
      valido: false, 
      motivo: `Bloqueio de Anulação: Fundo 2H azul (Vem de Cima), mas o preço atual (${dados.precoAtualMercado}) está abaixo ou igual à Média 99 (${dados.valorMedia99Grafico2H}).` 
    };
  }

  // 2. VALIDAÇÕES DE CANDLE, RESPIRO E TOQUE
  if (!dados.candleFechado) {
    return { valido: false, motivo: "Aguardando fechamento do candle." };
  }

  if (!dados.respiroCandleOk) {
    return { valido: false, motivo: "Inválido: O candle violou a regra de respiro da média 99 (tocou ou fechou onde não devia)." };
  }

  if (!dados.teveToqueNa99) {
    return { valido: false, motivo: "Sem toque válido registrado na média 99." };
  }

  // 3. CLASSIFICAÇÃO AUTOMÁTICA NAS REGIÕES DE ATR
  // Suas faixas: 0.510, 0.500, 0.400, 0.350, 0.310
  let regiaoAtr = "ABAIXO_DO_MINIMO";

  if (dados.atrAtual >= 0.510) {
    regiaoAtr = "REGIAO_0_510";
  } else if (dados.atrAtual >= 0.500) {
    regiaoAtr = "REGIAO_0_500";
  } else if (dados.atrAtual >= 0.400) {
    regiaoAtr = "REGIAO_0_400";
  } else if (dados.atrAtual >= 0.350) {
    regiaoAtr = "REGIAO_0_350";
  } else if (dados.atrAtual >= 0.310) {
    regiaoAtr = "REGIAO_0_310";
  }

  // Se o ATR estiver abaixo da menor região aceitável, barra o sinal
  if (regiaoAtr === "ABAIXO_DO_MINIMO") {
    return { 
      valido: false, 
      motivo: `Inválido: ATR atual (${dados.atrAtual}) está abaixo da menor região mapeada (0.310).` 
    };
  }

  // 4. APROVAÇÃO FINAL COM A DIREÇÃO MAPEADA E A FAIXA DE ATR CORRETA
  const direcaoMapeada = dados.corFundoMedia20Grafico2H === "VERMELHO" ? "VEM_DE_BAIXO" : "VEM_DE_CIMA";

  return {
    valido: true,
    direcao: direcaoMapeada,
    atrCapturado: dados.atrAtual,
    regiaoAtr: regiaoAtr, 
    motivo: `Toque 100% validado! Direção: ${direcaoMapeada} | Preço: ${dados.precoAtualMercado} vs Média 99: ${dados.valorMedia99Grafico2H} | ATR: ${dados.atrAtual} (${regiaoAtr})`
  };
}