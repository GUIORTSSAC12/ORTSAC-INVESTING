// ==========================================================
// MOTOR DE DADOS CENTRALIZADO DO DASHBOARD
// ==========================================================

export interface CandleAPI {
  high: number;
  low: number;
  open: number;  // Removido o '?' para garantir obrigatoriedade
  close: number; // Removido o '?' para garantir obrigatoriedade
  time?: number; 
  atr?: number;  // Aproveita e já deixa o atr mapeável direto no candle se a API mandar
}

export interface EntradaGraficoDashboard {
  precoAtual: number;
  maximaCandle: number;
  minimaCandle: number;
  grafico2H: {
    media99: number;
    media20: number;
    atrAtual: number;
    atrAnterior: number;
  };
  grafico4H: {
    media99: number;
    media20: number;
  };
  // Configuração opcional de fuso do Dashboard
  fusoAtivo?: "UTC_0" | "UTC_PLUS_1";
  candleFechado?: boolean;
}

// Extrai topo e fundo dos 200 candles direto do histórico da API
const extrairExtremosDosCandles = (historicoCandlesAPI: CandleAPI[]) => {
  if (!historicoCandlesAPI || historicoCandlesAPI.length === 0) {
    return { maxima200: 0, minima200: 0 };
  }

  const ultimos200 = historicoCandlesAPI.slice(-200);

  return {
    maxima200: Math.max(...ultimos200.map((c) => c.high)),
    minima200: Math.min(...ultimos200.map((c) => c.low)),
  };
};

/**
 * Localiza o último candle institucional com base no fuso ativo (UTC 0 = 08:00 | UTC +1 = 07:00)
 * e avalia as regras geométricas da Média 20 e 99 (Estratégia 2 - Vem de Baixo)
 */
export const analisarFiltroInstitucionalEstrategia2 = (dados: {
  historicoAPI: CandleAPI[];
  media20_2H: number;
  media99_2H: number;
  fusoAtivo?: "UTC_0" | "UTC_PLUS_1";
  candleFechado?: boolean;
}) => {
  const fuso = dados.fusoAtivo ?? "UTC_PLUS_1";
  const horaGatilhoLondres = fuso === "UTC_0" ? 8 : 7; // UTC 0 -> 08:00 | UTC +1 -> 07:00
  const historico = dados.historicoAPI || [];

  if (historico.length === 0) {
    return {
      corpoInstitucionalInteiroAcimaDa20: false,
      corpoInstitucionalAbaixoDa99: false,
      media20TocouCorpoInstitucional: true,
      corInstitucional: "INDEFINIDO",
    };
  }

  // Se o candle atual estiver aberto, ignora ele e busca no histórico o último institucional fechado
  let candleInstitucional: CandleAPI | null = null;

  for (let i = historico.length - 1; i >= 0; i--) {
    const c = historico[i];
    if (c.time) {
      const data = new Date(c.time * (c.time > 10000000000 ? 1 : 1000));
      const horaUTC = data.getUTCHours();

      if (horaUTC === horaGatilhoLondres) {
        candleInstitucional = c;
        break;
      }
    }
  }

  // Fallback: se não encontrar pelo timestamp, pega o último candle fechado válido
  if (!candleInstitucional) {
    const indiceFallback = dados.candleFechado === false ? historico.length - 2 : historico.length - 1;
    candleInstitucional = historico[Math.max(0, indiceFallback)] || historico[historico.length - 1];
  }

 const open = candleInstitucional.open;
  const close = candleInstitucional.close;

  const topoCorpo = Math.max(open, close);
  const fundoCorpo = Math.min(open, close);
  const corInstitucional = close >= open ? "AZUL" : "VERMELHO";

  // 1. Corpo inteiro acima da Média 20
  const corpoInstitucionalInteiroAcimaDa20 = fundoCorpo > dados.media20_2H;

  // 2. Corpo inteiro abaixo da Média 99
  const corpoInstitucionalAbaixoDa99 = topoCorpo < dados.media99_2H;

  // 3. Média 20 tocou/cruzou o corpo? (Pavio é permitido)
  const media20TocouCorpoInstitucional =
    dados.media20_2H >= fundoCorpo && dados.media20_2H <= topoCorpo;

  return {
    corpoInstitucionalInteiroAcimaDa20,
    corpoInstitucionalAbaixoDa99,
    media20TocouCorpoInstitucional,
    corInstitucional,
  };
};

export const montarMotorDashboard = (
  dadosGrafico: EntradaGraficoDashboard,
  historicoAPI: CandleAPI[]
) => {
  const { maxima200, minima200 } = extrairExtremosDosCandles(historicoAPI);

  // Análise em tempo real do filtro institucional para a Estratégia 2
  const analiseInstitucional = analisarFiltroInstitucionalEstrategia2({
    historicoAPI,
    media20_2H: dadosGrafico.grafico2H.media20,
    media99_2H: dadosGrafico.grafico2H.media99,
    fusoAtivo: dadosGrafico.fusoAtivo,
    candleFechado: dadosGrafico.candleFechado,
  });

  return {
    // 1. PREÇO EM TEMPO REAL (Loop de 2s)
    precoAtual: dadosGrafico.precoAtual,

    // 2. CANDLE ATUAL DO GRÁFICO
    maximaCandleAtual: dadosGrafico.maximaCandle,
    minimaCandleAtual: dadosGrafico.minimaCandle,

    // 3. EXTREMOS DOS 200 CANDLES (API)
    maxima200Candles2H: maxima200,
    minima200Candles2H: minima200,

    // 4. MÉDIAS MÓVEIS (Puxadas direto de dentro do Card GRÁFICO 2H)
    media99_2H: dadosGrafico.grafico2H.media99,
    media20_2H: dadosGrafico.grafico2H.media20,

    // 5. MÉDIAS MÓVEIS (Puxadas direto de dentro do Card GRÁFICO 4H)
    media99_4H: dadosGrafico.grafico4H.media99,
    media20_4H: dadosGrafico.grafico4H.media20,

    // 6. ATR 2H (Puxado direto de dentro do Card GRÁFICO 2H)
    atr2H_Atual: dadosGrafico.grafico2H.atrAtual,
    atr2H_Anterior: dadosGrafico.grafico2H.atrAnterior,

    // 7. DADOS INSTITUCIONAIS AUTOMÁTICOS (Londres UTC 0 / UTC +1)
    filtroEstrategia2Baixo: analiseInstitucional,
  };
};

// gerenciamento.ts - Motor e Gerenciador de Operações

export type GrupoEstrategia = 'GRUPO_A' | 'GRUPO_B';
export type TipoEstrutura = 'TOPO' | 'FUNDO';
export type TipoOperacao = 'COMPRA' | 'VENDA';

export interface Ordem {
  id: string;
  estrategia: string;               // Ex: "VEM_BAIXO_1", "VEM_BAIXO_3", "VEM_BAIXO_4", "VEM_CIMA_6"
  grupo: GrupoEstrategia;
  tipoEstrutura?: TipoEstrutura;      // Define se a ordem protege/depende de um TOPO ou FUNDO
  tipo?: TipoOperacao;                // COMPRA ou VENDA
  precoEntrada: number;
  stopLoss: number;
  takeProfit: number;
  minimaFixa?: number;                // Utilizado na Estratégia 6 e Estratégia 4
  limiteInvalidação?: number;        // Ex: Região de 0.62% da Estratégia 6
  atingiuAreaRenovacao?: boolean;    // Flag para verificar se atingiu +0.45% (Estratégia 6)
  isStopProtected?: boolean;         // Flag centralizada de proteção (+0.50%)
}

export interface SlotsEstado {
  principal: Ordem | null;
  pendente: Ordem | null;
  scannerBloqueado: boolean;
}

export interface ResultadoProcessamento {
  aceito: boolean;
  acao: 'EXECUTAR_A_MERCADO' | 'SALVAR_PENDENTE' | 'SOBRESCREVER_TOPO' | 'REJEITAR';
  motivo: string;
}

export const PROTECTION_TRIGGER_PCT = 0.50;
export const PROTECTED_STOP_PCT = 0.10;

export class GerenciamentoMotor {
  private slotPrincipal: Ordem | null = null;
  private slotPendente: Ordem | null = null;
  private scannerBloqueado: boolean = false;

  /**
   * Processa novos sinais recebidos do Scanner e da Validação.
   */
  public processarSinal(sinal: Ordem): ResultadoProcessamento {

    // ==========================================
    // 1. REGRAS DO GRUPO A (Ordens a Mercado)
    // ==========================================
    if (sinal.grupo === 'GRUPO_A') {
      if (this.slotPrincipal === null) {
        this.slotPrincipal = { ...sinal, isStopProtected: false };
        this.scannerBloqueado = true;
        return {
          aceito: true,
          acao: 'EXECUTAR_A_MERCADO',
          motivo: 'Ordem do Grupo A executada a mercado. Scanner BLOQUEADO até término da operação.'
        };
      }
      return {
        aceito: false,
        acao: 'REJEITAR',
        motivo: 'Rejeitado: Já existe uma operação ativa a mercado (Grupo A).'
      };
    }

    // ==========================================
    // 2. REGRAS DO GRUPO B (Ordens Limite / Pendentes)
    // ==========================================
    if (sinal.grupo === 'GRUPO_B') {

      // Se o scanner estiver travado por conta de trade ativo a mercado do Grupo A
      if (this.scannerBloqueado && this.slotPrincipal?.grupo === 'GRUPO_A') {
        return {
          aceito: false,
          acao: 'REJEITAR',
          motivo: 'Rejeitado: Scanner bloqueado por operação em andamento do Grupo A.'
        };
      }

      // ----------------------------------------------------
      // Caso Especial: Atualização de Topo da Estratégia 6 (+0.45%)
      // ----------------------------------------------------
      if (sinal.estrategia === 'VEM_CIMA_6') {
        const ordemExistenteE6 = this.buscarOrdemPorEstrategia('VEM_CIMA_6');

        if (ordemExistenteE6) {
          // Só permite atualizar o topo se o mercado previamente bateu na região de +0.45%
          if (ordemExistenteE6.atingiuAreaRenovacao) {
            ordemExistenteE6.precoEntrada = sinal.precoEntrada; // Sobrescreve com o novo topo
            ordemExistenteE6.atingiuAreaRenovacao = false;       // Reseta a flag para o próximo ciclo

            return {
              aceito: true,
              acao: 'SOBRESCREVER_TOPO',
              motivo: 'Estratégia 6 atingiu +0.45% e renovou topo. Topo anterior substituído sem gastar slot extra.'
            };
          } else {
            return {
              aceito: false,
              acao: 'REJEITAR',
              motivo: 'Rejeitado: Re-toque na Média 99 ignorado pois o preço não atingiu +0.45% para renovar o topo.'
            };
          }
        }
      }

      // ----------------------------------------------------
      // Filtro Anti-Ruído: Trava por Tipo de Estrutura (Topo vs Fundo)
      // ----------------------------------------------------
      const jaExisteEstruturaIgual =
        this.slotPrincipal?.tipoEstrutura === sinal.tipoEstrutura ||
        this.slotPendente?.tipoEstrutura === sinal.tipoEstrutura;

      if (jaExisteEstruturaIgual) {
        return {
          aceito: false,
          acao: 'REJEITAR',
          motivo: `Micro-toque/Ruído ignorado: Já existe uma estrutura pendente do tipo ${sinal.tipoEstrutura}.`
        };
      }

      // ----------------------------------------------------
      // Acomodação nos Slots (Máximo 2: 1 Topo + 1 Fundo)
      // ----------------------------------------------------
      if (this.slotPrincipal === null) {
        this.slotPrincipal = { ...sinal, isStopProtected: false };
      } else if (this.slotPendente === null) {
        // Envia a ordem do card principal para pendente e coloca a nova no principal
        this.slotPendente = this.slotPrincipal;
        this.slotPrincipal = { ...sinal, isStopProtected: false };
      } else {
        return {
          aceito: false,
          acao: 'REJEITAR',
          motivo: 'Rejeitado: Slots lotados (Principal e Pendente já ocupados).'
        };
      }

      return {
        aceito: true,
        acao: 'SALVAR_PENDENTE',
        motivo: `Estrutura de ${sinal.tipoEstrutura} (${sinal.estrategia}) salva no sistema.`
      };
    }

    return {
      aceito: false,
      acao: 'REJEITAR',
      motivo: 'Erro: Grupo de estratégia desconhecido.'
    };
  }

  /**
   * Monitoramento contínuo de preço: avalia se a ordem principal atingiu o gatilho de proteção (+0.50%).
   */
  public atualizarPreco(precoAtual: number): boolean {
    if (!this.slotPrincipal || !Number.isFinite(precoAtual) || precoAtual <= 0) {
      return false;
    }

    const ordem = this.slotPrincipal;
    if (ordem.isStopProtected) {
      return false; // Já está protegido
    }

    const tipo = ordem.tipo ?? 'COMPRA';
    const movimentoFavoravel =
      tipo === "COMPRA"
        ? ((precoAtual - ordem.precoEntrada) / ordem.precoEntrada) * 100
        : ((ordem.precoEntrada - precoAtual) / ordem.precoEntrada) * 100;

    if (movimentoFavoravel >= PROTECTION_TRIGGER_PCT) {
      ordem.isStopProtected = true;
      
      // Recalcula o Stop Loss para o patamar protegido (+0.10% ou protegido ajustado)
      ordem.stopLoss = Number(
        (
          ordem.precoEntrada *
          (tipo === "VENDA" ? (1 - PROTECTED_STOP_PCT / 100) : (1 + PROTECTED_STOP_PCT / 100))
        ).toFixed(3)
      );

      console.log(`[Gerenciamento] STOP PROTEGIDO ATIVADO para a ordem ${ordem.id}. Movimento favorável: ${movimentoFavoravel.toFixed(2)}%`);
      return true; // Retorna true indicando que houve mudança de estado (útil para disparar som/feedback)
    }

    return false;
  }

  /**
   * Marca a flag de renovação quando o preço atinge a região de +0.45% na Estratégia 6.
   */
  public notificarAlcanceAreaRenovacao(idEstrategia: string = 'VEM_CIMA_6') {
    const ordem = this.buscarOrdemPorEstrategia(idEstrategia);
    if (ordem) {
      ordem.atingiuAreaRenovacao = true;
      console.log(`[Gerenciamento] Flag de renovação ativada para ${idEstrategia}. Próximo toque na 99 validará novo topo.`);
    }
  }

  /**
   * Finaliza uma ordem (Stop Loss, Take Profit, Invalidação ou Cancelamento Manual).
   */
  public finalizarOrdem(idOrdem: string, motivo: string): void {
    if (this.slotPrincipal?.id === idOrdem) {
      // Promove a ordem pendente para o card principal
      this.slotPrincipal = this.slotPendente;
      this.slotPendente = null;
    } else if (this.slotPendente?.id === idOrdem) {
      this.slotPendente = null;
    }

    // Se não houver mais trades a mercado rodando, destrava o scanner
    if (!this.slotPrincipal || this.slotPrincipal.grupo === 'GRUPO_B') {
      this.scannerBloqueado = false;
    }

    console.log(`[Gerenciamento] Ordem ${idOrdem} encerrada. Motivo: ${motivo}.`);
  }

  /**
   * Retorna o estado atual dos slots e do bloqueio do scanner.
   */
  public obterEstadoSlots(): SlotsEstado {
    return {
      principal: this.slotPrincipal,
      pendente: this.slotPendente,
      scannerBloqueado: this.scannerBloqueado
    };
  }

  /**
   * Retorna se o Scanner pode enviar novos sinais.
   */
  public isScannerLiberado(): boolean {
    return !this.scannerBloqueado;
  }

  /**
   * Auxiliar interno para buscar ordens ativas.
   */
  private buscarOrdemPorEstrategia(nomeEstrategia: string): Ordem | null {
    if (this.slotPrincipal?.estrategia === nomeEstrategia) return this.slotPrincipal;
    if (this.slotPendente?.estrategia === nomeEstrategia) return this.slotPendente;
    return null;
  }
}