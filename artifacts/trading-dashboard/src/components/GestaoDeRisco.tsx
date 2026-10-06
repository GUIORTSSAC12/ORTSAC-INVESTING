import React, { useState, useEffect } from "react";

export function GestaoDeRisco() {
  const [gbpPrice, setGbpPrice] = useState<number | null>(null);
  const [usdjpyPrice, setUsdjpyPrice] = useState<number | null>(null);
  const [pips, setPips] = useState<string>("—");
  const [margemCalculada, setMargemCalculada] = useState<string>("—"); 

  const [saldoManual, setSaldoManual] = useState<string>(() => {
    return localStorage.getItem("gestao_saldo_interno") || "100.00";
  });

  const [saldoOculto, setSaldoOculto] = useState<boolean>(() => {
    return localStorage.getItem("gestao_saldo_oculto") === "true";
  });

  const [saldoAtual, setSaldoAtual] = useState<string>("—");
  const [stopLossFinanceiro, setStopLossFinanceiro] = useState<string>("—"); 
  const [taxaTotalCard, setTaxaTotalCard] = useState<string>("—"); 
  const [stopTotalCard, setStopTotalCard] = useState<string>("—"); 
  const [gainCard, setGainCard] = useState<string>("—"); 

  const handleSaldoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSaldoManual(val);
    localStorage.setItem("gestao_saldo_interno", val);
  };

  // Escuta alterações do localStorage caso outra parte do app altere o estado oculto
  useEffect(() => {
    const handleStorageChange = () => {
      const ocultoStorage = localStorage.getItem("gestao_saldo_oculto") === "true";
      setSaldoOculto(ocultoStorage);
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // 1. Puxa os preços da API (GBP/USD e USD/JPY com o padrão NCFX)
  useEffect(() => {
    let cancelled = false;

    const fetchPrices = async () => {
      try {
        const resGbp = await fetch(
          `/api/ticker?symbol=${encodeURIComponent("NCFXGBP2USD-USDT")}`,
          { cache: "no-store" }
        );
        if (resGbp.ok) {
          const jsonGbp = await resGbp.json();
          if (!jsonGbp?.code || jsonGbp.code === 0) {
            const rawGbp = jsonGbp?.data?.price ?? jsonGbp?.data?.lastPrice ?? jsonGbp?.data?.close;
            const priceGbp = Number(rawGbp);
            if (!cancelled && Number.isFinite(priceGbp)) setGbpPrice(priceGbp);
          }
        }

        const resJpy = await fetch(
          `/api/ticker?symbol=${encodeURIComponent("NCFXUSD2JPY-USDT")}`,
          { cache: "no-store" }
        );
        if (resJpy.ok) {
          const jsonJpy = await resJpy.json();
          if (!jsonJpy?.code || jsonJpy.code === 0) {
            const rawJpy = jsonJpy?.data?.price ?? jsonJpy?.data?.lastPrice ?? jsonJpy?.data?.close;
            const priceJpy = Number(rawJpy);
            if (!cancelled && Number.isFinite(priceJpy)) setUsdjpyPrice(priceJpy);
          }
        }
      } catch (err) {
        if (!cancelled) console.error("Erro ao buscar cotações:", err);
      }
    };

    fetchPrices();
    const intervalId = setInterval(fetchPrices, 3000);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, []);

  // 2. Engenharia Reversa baseada no Saldo interno e Strategy Target
  useEffect(() => {
    const calcularGestao = () => {
      try {
        const targetSaved = localStorage.getItem("scanner_target_value");

        const saldo = parseFloat(saldoManual);
        if (!Number.isFinite(saldo) || saldo <= 0) return;

        setSaldoAtual(saldo.toFixed(2));

        // Teto de risco dinâmico: 1 centavo para contas menores, ou uma margem maior proporcional para contas gigantes
        const tetoRiscoMaximo = saldo > 10000 ? (saldo / 13) - 1.00 : (saldo / 13) - 0.02;

        if (targetSaved) {
          const valorBaseTarget = parseFloat(targetSaved); 
          if (!Number.isFinite(valorBaseTarget) || valorBaseTarget <= 0) return;

          const variacaoPontos = valorBaseTarget * (0.20 / 100); 
          const totalPips = (variacaoPontos * 10000) / 100; 
          setPips(totalPips.toFixed(1));

          const cotacaoJpyAtual = usdjpyPrice ?? 157.0; 

          let melhorNocional = 1; 
          let melhorSlCalculado = 0;
          let melhorTaxa = 0;

          // PASSO DINÂMICO: Até $1.000 vai de 1 em 1 (precisão total); acima de $1.000 pula de 50 em 50 (sem lag)
          const passoLoop = saldo > 1000 ? 50 : 1;

          for (let nocionalTestado = 1; nocionalTestado <= 100000000; nocionalTestado += passoLoop) {
            const taxaTestada = nocionalTestado * 0.000938;

            const perdaIenes = nocionalTestado * (totalPips * 0.01);
            const slTestado = perdaIenes / cotacaoJpyAtual;

            const riscoTotal = slTestado + taxaTestada;

            if (riscoTotal <= tetoRiscoMaximo) {
              melhorNocional = nocionalTestado;
              melhorSlCalculado = slTestado;
              melhorTaxa = taxaTestada;
            } else {
              break;
            }
          }

          // Função auxiliar para padronizar todos os números com ponto de milhar e vírgula decimal (PT-BR)
          const formatarBr = (valor: number) => {
            return valor.toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            });
          };

          const valSlNum = melhorSlCalculado > 0 ? melhorSlCalculado : (tetoRiscoMaximo * 0.75);
          const valTaxaNum = melhorTaxa;

          const strSlFinal = `-${formatarBr(valSlNum)}`; 
          const strTaxaFinal = `-${formatarBr(valTaxaNum)}`;
          const strMargem = formatarBr(melhorNocional);

          setStopLossFinanceiro(strSlFinal); 
          setTaxaTotalCard(strTaxaFinal);        
          setMargemCalculada(strMargem); 

          const somaStopTotal = valSlNum + valTaxaNum;
          const strStopTotal = `-${formatarBr(somaStopTotal)}`;
          setStopTotalCard(strStopTotal);

          const gainBruto = Number((valSlNum * 3).toFixed(2));
          const gainLiquido = gainBruto - valTaxaNum;
          const gainFinalFormatado = gainLiquido > 0 ? formatarBr(gainLiquido) : "0,00";
          setGainCard(gainFinalFormatado);

          // SALVA TUDO NO LOCALSTORAGE PARA OS OUTROS COMPONENTES LEREM COM OS PONTOS CERTINHOS
          localStorage.setItem("gestao_sl_atual", strSlFinal); 
          localStorage.setItem("gestao_taxa_atual", strTaxaFinal);
          localStorage.setItem("gestao_margem_atual", strMargem);
          localStorage.setItem("gestao_stop_atual", strStopTotal);
          localStorage.setItem("gestao_gain_atual", gainFinalFormatado);
          window.dispatchEvent(new Event("storage"));
        }
      } catch (e) {
        console.error("Erro ao calcular gestão de risco:", e);
      }
    };

    calcularGestao();
    const intervalCalc = setInterval(calcularGestao, 300);
    window.addEventListener("storage", calcularGestao);

    return () => {
      clearInterval(intervalCalc);
      window.removeEventListener("storage", calcularGestao);
    };
  }, [usdjpyPrice, saldoManual]);

  return (
    <div className="w-full h-full flex flex-col justify-between font-mono text-xs p-1">
      <div className="grid grid-cols-3 gap-2 w-full">

        {/* Card 1: GBP/USD */}
        <div className="flex flex-col items-center">
          <span style={{ fontSize: "14px" }} className="text-cyan-300 font-bold uppercase tracking-wider mb-1 text-center">
            GBP/USD
          </span>
          <div className="w-full bg-black/80 border border-[#4a4a4a] rounded-xl p-2 flex items-center justify-center text-center shadow">
            <span style={{ fontSize: "24px" }} className="font-bold text-emerald-600 tracking-wide tabular-nums">
              {gbpPrice !== null ? gbpPrice.toFixed(4) : "—"}
            </span>
          </div>
        </div>

        {/* Card 2: USD/JPY */}
        <div className="flex flex-col items-center">
          <span style={{ fontSize: "14px" }} className="text-cyan-300 font-bold uppercase tracking-wider mb-1 text-center">
            USD/JPY
          </span>
          <div className="w-full bg-black/80 border border-[#4a4a4a] rounded-xl p-2 flex items-center justify-center text-center shadow">
            <span style={{ fontSize: "24px" }} className="font-bold text-emerald-600 tracking-wide tabular-nums">
              {usdjpyPrice !== null ? usdjpyPrice.toFixed(2) : "—"}
            </span>
          </div>
        </div>

        {/* Card 3: PIPS */}
        <div className="flex flex-col items-center">
          <span style={{ fontSize: "14px" }} className="text-cyan-300 font-bold uppercase tracking-wider mb-1 text-center">
            PIPS
          </span>
          <div className="w-full bg-black/80 border border-[#4a4a4a] rounded-xl p-2 flex items-center justify-center text-center shadow">
            <span style={{ fontSize: "24px" }} className="font-bold text-emerald-600 tracking-wide tabular-nums">
              {pips}
            </span>
          </div>
        </div>

        {/* Card 4: MARGEM */}
        <div className="flex flex-col items-center">
          <span style={{ fontSize: "14px" }} className="text-cyan-300 font-bold uppercase tracking-wider mb-1 text-center">
            MARGEM
          </span>
          <div className="w-full bg-black/80 border border-[#4a4a4a] rounded-xl p-2 flex items-center justify-center text-center shadow">
            <span style={{ fontSize: "24px" }} className="font-bold text-emerald-600 tracking-wide tabular-nums">
              {margemCalculada}
            </span>
          </div>
        </div>

        {/* Card 5: SALDO */}
        <div className="flex flex-col items-center">
          <span style={{ fontSize: "14px" }} className="text-cyan-300 font-bold uppercase tracking-wider mb-1 text-center">
            SALDO
          </span>
          <div className="w-full bg-black/80 border border-[#4a4a4a] rounded-xl p-1.5 flex items-center justify-center text-center shadow">
            {saldoOculto ? (
              <span style={{ fontSize: "24px", fontFamily: "monospace" }} className="font-bold text-emerald-600 tracking-widest tabular-nums select-none">
                ****
              </span>
            ) : (
              <input
                type="number"
                value={saldoManual}
                onChange={handleSaldoChange}
                className="w-full bg-transparent text-emerald-600 font-bold text-center focus:outline-none focus:ring-0 focus:border-transparent tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                style={{ fontSize: "24px" }}
                placeholder="0.00"
              />
            )}
          </div>
        </div>

        {/* Card 6: SL */}
        <div className="flex flex-col items-center">
          <span style={{ fontSize: "14px" }} className="text-cyan-300 font-bold uppercase tracking-wider mb-1 text-center">
            SL
          </span>
          <div className="w-full bg-black/80 border border-[#4a4a4a] rounded-xl p-2 flex items-center justify-center text-center shadow">
            <span style={{ fontSize: "24px" }} className="font-bold text-red-600 tracking-wide tabular-nums">
              {stopLossFinanceiro}
            </span>
          </div>
        </div>

        {/* Card 7: TAXA */}
        <div className="flex flex-col items-center">
          <span style={{ fontSize: "14px" }} className="text-cyan-300 font-bold uppercase tracking-wider mb-1 text-center">
            TAXA
          </span>
          <div className="w-full bg-black/80 border border-[#4a4a4a] rounded-xl p-2 flex items-center justify-center text-center shadow">
            <span style={{ fontSize: "24px" }} className="font-bold text-red-600 tracking-wide tabular-nums">
              {taxaTotalCard}
            </span>
          </div>
        </div>

        {/* Card 8: STOP */}
        <div className="flex flex-col items-center">
          <span style={{ fontSize: "14px" }} className="text-cyan-300 font-bold uppercase tracking-wider mb-1 text-center">
            STOP
          </span>
          <div className="w-full bg-black/80 border border-[#4a4a4a] rounded-xl p-2 flex items-center justify-center text-center shadow">
            <span style={{ fontSize: "24px" }} className="font-bold text-red-600 tracking-wide tabular-nums">
              {stopTotalCard}
            </span>
          </div>
        </div>

        {/* Card 9: GAIN */}
        <div className="flex flex-col items-center">
          <span style={{ fontSize: "14px" }} className="text-cyan-300 font-bold uppercase tracking-wider mb-1 text-center">
            GAIN
          </span>
          <div className="w-full bg-black/80 border border-[#4a4a4a] rounded-xl p-2 flex items-center justify-center text-center shadow">
            <span style={{ fontSize: "24px" }} className="font-bold text-emerald-600 tracking-wide tabular-nums">
              {gainCard}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}