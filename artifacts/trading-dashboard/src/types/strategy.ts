export type StrategyDirection = "VEM DE CIMA" | "VEM DE BAIXO";

export type StrategyId = 1 | 2 | 3 | 4 | 5 | 6;

export interface StrategySignal {
  report: string;
  direction: StrategyDirection;
  strategyId: StrategyId;
  action: string;
  stopLoss?: number;
  takeProfit?: number;
  minimaFundoMarcada?: number;
}