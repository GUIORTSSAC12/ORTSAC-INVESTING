import React, { useState, useRef, useEffect } from 'react';
import type { TradeStrategy as MinigraficoTrade } from './TradingCard';

interface Candle4H {
  timestamp?: number;
  time?: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface MinigraficoProps {
  precoAtual?: number | null;
  candles4h?: Candle4H[];
  candles5h?: Candle4H[];
  is5H?: boolean;
  setIs5H?: (value: boolean) => void;
  tradeAtivo?: MinigraficoTrade | null; 
  media99?: number | null;
  media20?: number | null;
}

export default function Minigrafico({
  precoAtual = null,
  candles4h = [],
  candles5h = [],
  is5H = false,
  setIs5H,
  tradeAtivo = null,
  media99 = null,
  media20 = null,
}: MinigraficoProps) {
  const allCandles = is5H ? candles5h : candles4h;

  const [zoom, setZoom] = useState<number>(1);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);
  const [priceScale, setPriceScale] = useState<number>(1);

  const isDragging = useRef<boolean>(false);
  const isScalingPrice = useRef<boolean>(false);
  const startMouse = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.price-box-container')) {
      isScalingPrice.current = true;
      startMouse.current = { x: e.clientX, y: e.clientY };
      return;
    }

    isDragging.current = true;
    startMouse.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isScalingPrice.current) {
      const deltaY = e.clientY - startMouse.current.y;
      setPriceScale((prev) => Math.min(Math.max(0.2, prev - deltaY * 0.005), 5));
      startMouse.current.y = e.clientY;
      return;
    }

    if (!isDragging.current) return;

    const movementX = e.clientX - startMouse.current.x;
    const movementY = e.clientY - startMouse.current.y;

    setPanX((prev) => prev + movementX);
    setPanY((prev) => prev - movementY);

    startMouse.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    isScalingPrice.current = false;
  };

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
      setZoom((prev) => Math.min(Math.max(prev * zoomFactor, 0.3), 6));
    };

    element.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      element.removeEventListener('wheel', onWheel);
    };
  }, []);

  const baseCount = 72;
  const visibleCount = Math.max(10, Math.min(allCandles.length * 3, Math.round(baseCount / zoom)));

  const maxPanOffset = allCandles.length + visibleCount;
  const minPanOffset = -visibleCount;

  const calculatedOffset = Math.round((-panX / 12)) + (allCandles.length - visibleCount);
  const startIndex = Math.min(Math.max(minPanOffset, calculatedOffset), maxPanOffset);

  const candlesParaExibir: { candle: Candle4H | null; virtual: boolean }[] = [];
  for (let i = 0; i < visibleCount; i++) {
    const candleIndex = startIndex + i;
    if (candleIndex >= 0 && candleIndex < allCandles.length) {
      candlesParaExibir.push({ candle: allCandles[candleIndex], virtual: false });
    } else {
      candlesParaExibir.push({ candle: null, virtual: true });
    }
  }

  let minPrice = Infinity;
  let maxPrice = -Infinity;

  allCandles.forEach((c) => {
    if (c.low < minPrice) minPrice = c.low;
    if (c.high > maxPrice) maxPrice = c.high;
  });

  if (precoAtual != null && Number.isFinite(precoAtual) && precoAtual > 0) {
    if (precoAtual < minPrice) minPrice = precoAtual;
    if (precoAtual > maxPrice) maxPrice = precoAtual;
  }

  if (tradeAtivo != null && Number.isFinite(tradeAtivo?.entry)) {
    if (tradeAtivo.entry < minPrice) minPrice = tradeAtivo.entry;
    if (tradeAtivo.entry > maxPrice) maxPrice = tradeAtivo.entry;
  }

  if (media99 != null && Number.isFinite(media99)) {
    if (media99 < minPrice) minPrice = media99;
    if (media99 > maxPrice) maxPrice = media99;
  }

  if (media20 != null && Number.isFinite(media20)) {
    if (media20 < minPrice) minPrice = media20;
    if (media20 > maxPrice) maxPrice = media20;
  }

  const rawPriceRange = maxPrice - minPrice || 1;
  const priceRange = rawPriceRange / priceScale;
  const svgHeight = 180;
  const svgWidth = 600;

  const currentPriceForY = precoAtual != null ? precoAtual : (allCandles.at(-1)?.close ?? minPrice);

  const basePriceY = svgHeight - ((currentPriceForY - minPrice) / priceRange) * (svgHeight - 40) - 20;
  const yCurrentPrice = basePriceY - panY;

  const lastRealIndex = candlesParaExibir.findLastIndex(item => !item.virtual);
  const candleWidth = svgWidth / candlesParaExibir.length;
  const xLastCandle = lastRealIndex !== -1 ? lastRealIndex * candleWidth + candleWidth / 2 : svgWidth;

  const baseTradeY = tradeAtivo != null && Number.isFinite(tradeAtivo?.entry)
    ? svgHeight - ((tradeAtivo.entry - minPrice) / priceRange) * (svgHeight - 40) - 20
    : 0;
  const yTrade = baseTradeY - panY;

  const baseMedia99Y = media99 != null && Number.isFinite(media99)
    ? svgHeight - ((media99 - minPrice) / priceRange) * (svgHeight - 40) - 20
    : 0;
  const yMedia99 = baseMedia99Y - panY;

  const baseMedia20Y = media20 != null && Number.isFinite(media20)
    ? svgHeight - ((media20 - minPrice) / priceRange) * (svgHeight - 40) - 20
    : 0;
  const yMedia20 = baseMedia20Y - panY;

  const tradeLineColor = tradeAtivo?.type === 'COMPRA' ? '#3b82f6' : '#ef4444';

  return (
    <div className="relative w-full h-full flex flex-col justify-between overflow-hidden bg-black select-none">
      {/* Botão compacto 4H/5H no canto superior direito do minigráfico */}
      {setIs5H && (
        <button
          type="button"
          onClick={() => setIs5H(!is5H)}
          className="absolute top-2 right-2 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded border border-cyan-400/60 bg-cyan-950/40 text-cyan-400 hover:bg-cyan-500 hover:text-gray-950 transition-all cursor-pointer shadow z-30"
          title="Alternar entre 4H e 5H"
        >
          {is5H ? '5H' : '4H'}
        </button>
      )}

      <div 
        ref={containerRef}
        className="relative w-full flex-1 min-h-[140px] my-auto cursor-grab active:cursor-grabbing overflow-hidden"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {allCandles.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[11px] font-mono text-cyan-700 uppercase">
              Aguardando candles...
            </span>
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            preserveAspectRatio="none"
            className="w-full h-full overflow-visible"
          >
            {media99 != null && Number.isFinite(media99) && lastRealIndex !== -1 && (
              <line
                x1={0}
                y1={yMedia99}
                x2={xLastCandle}
                y2={yMedia99}
                stroke="#eab308"
                strokeWidth="1.5"
                strokeOpacity="0.85"
              />
            )}

            {media20 != null && Number.isFinite(media20) && lastRealIndex !== -1 && (
              <line
                x1={0}
                y1={yMedia20}
                x2={xLastCandle}
                y2={yMedia20}
                stroke="#ef4444"
                strokeWidth="1.5"
                strokeOpacity="0.85"
              />
            )}

            {precoAtual != null && lastRealIndex !== -1 && (
              <line
                x1={xLastCandle}
                y1={yCurrentPrice}
                x2={svgWidth}
                y2={yCurrentPrice}
                stroke="#06b6d4"
                strokeWidth="1.2"
                strokeDasharray="3,3"
                strokeOpacity="0.9"
              />
            )}

            {tradeAtivo != null && lastRealIndex !== -1 && Number.isFinite(tradeAtivo?.entry) && (
              <line
                x1={xLastCandle}
                y1={yTrade}
                x2={svgWidth}
                y2={yTrade}
                stroke={tradeLineColor}
                strokeWidth="1.5"
                strokeOpacity="0.95"
              />
            )}

            {candlesParaExibir.map((item, i) => {
              if (item.virtual || !item.candle) return null;
              const c = item.candle;
              const x = i * candleWidth + candleWidth / 2;
              const isGreen = c.close >= c.open;

              const fillColor = isGreen ? "#3b82f6" : "#ef4444"; 
              const wickColor = "#ffffff";

              const yHigh = (svgHeight - ((c.high - minPrice) / priceRange) * (svgHeight - 40) - 20) - panY;
              const yLow = (svgHeight - ((c.low - minPrice) / priceRange) * (svgHeight - 40) - 20) - panY;
              const yOpen = (svgHeight - ((c.open - minPrice) / priceRange) * (svgHeight - 40) - 20) - panY;
              const yClose = (svgHeight - ((c.close - minPrice) / priceRange) * (svgHeight - 40) - 20) - panY;

              const bodyTop = Math.min(yOpen, yClose);
              const bodyHeight = Math.max(Math.abs(yOpen - yClose), 1.5);
              const barWidth = Math.max(candleWidth * 0.7, 1);

              return (
                <g key={i}>
                  <line
                    x1={x}
                    y1={yHigh}
                    x2={x}
                    y2={yLow}
                    stroke={wickColor}
                    strokeWidth="1.2"
                  />
                  <rect
                    x={x - barWidth / 2}
                    y={bodyTop}
                    width={barWidth}
                    height={bodyHeight}
                    fill={fillColor}
                    stroke={fillColor}
                    strokeWidth="1"
                    rx="0.5"
                  />
                </g>
              );
            })}
          </svg>
        )}

        {precoAtual != null &&
          Number.isFinite(precoAtual) &&
          precoAtual > 0 && (
            <div 
              className="price-box-container absolute right-0 z-20 shadow-lg -translate-y-1/2 cursor-ns-resize"
              style={{
                top: `${Math.max(10, Math.min(90, (yCurrentPrice / svgHeight) * 100))}%`
              }}
            >
              <div className="bg-[#1e293b] border-y border-l border-cyan-500 text-cyan-300 font-mono font-bold text-[13px] px-2 py-1 rounded-l rounded-r-none select-none hover:border-cyan-300 transition-colors">
                {precoAtual.toFixed(3)}
              </div>
            </div>
          )}
      </div>

      <div className="flex items-center justify-between px-2 pt-1 border-t border-[#222] text-[11px] font-mono">
        <span className="text-cyan-400 font-bold tracking-wider">
          {allCandles.length} CANDLES
        </span>
        <button
          onClick={() => { setZoom(1); setPanX(0); setPanY(0); setPriceScale(1); }}
          className="text-[10px] text-muted-foreground hover:text-cyan-300 transition-colors underline"
        >
          Resetar Visão
        </button>
      </div>
    </div>
  );
}