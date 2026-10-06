import React, { useState, useEffect } from 'react';

export default function SaldoTaxaMargem() {
  const [slDinamico, setSlDinamico] = useState<string>('0,00');
  const [taxaDinamica, setTaxaDinamica] = useState<string>('0,00');
  const [gainDinamico, setGainDinamico] = useState<string>('0,00');
  const [margemDinamica, setMargemDinamica] = useState<string>('0,00');
  const [stopTotalDinamico, setStopTotalDinamico] = useState<string>('0,00');

  // Sincroniza os valores em tempo real com os cálculos da Gestão de Risco e calcula o Stop Total corretamente
  useEffect(() => {
    const atualizarValoresGestao = () => {
      try {
        const slSalvo = localStorage.getItem('gestao_sl_atual');
        const taxaSalva = localStorage.getItem('gestao_taxa_atual');
        const gainSalvo = localStorage.getItem('gestao_gain_atual');
        const margemSalva = localStorage.getItem('gestao_margem_atual');
        const stopSalvo = localStorage.getItem('gestao_stop_atual');

        if (slSalvo) setSlDinamico(slSalvo);
        if (taxaSalva) setTaxaDinamica(taxaSalva);
        if (gainSalvo) setGainDinamico(gainSalvo);
        if (margemSalva) setMargemDinamica(margemSalva);
        if (stopSalvo) {
          setStopTotalDinamico(stopSalvo);
        } else if (slSalvo && taxaSalva) {
          const limpaSL = parseFloat(slSalvo.replace(/\./g, '').replace(',', '.')) || 0;
          const limpaTaxa = parseFloat(taxaSalva.replace(/\./g, '').replace(',', '.')) || 0;
          const soma = Math.abs(limpaSL) + Math.abs(limpaTaxa);
          setStopTotalDinamico(`-${soma.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
        }
      } catch (e) {
        console.error('Erro ao ler dados da gestão de risco', e);
      }
    };

    atualizarValoresGestao();

    window.addEventListener('storage', atualizarValoresGestao);
    const interval = setInterval(atualizarValoresGestao, 200);

    return () => {
      window.removeEventListener('storage', atualizarValoresGestao);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="relative border border-[#4a4a4a] bg-black rounded-xl px-2 py-2 flex flex-col justify-center shadow-lg text-white font-mono w-full">

      {/* Trocado justify-between por justify-around com gap controlado para aproximar os blocos */}
      <div className="w-full flex items-center justify-around gap-1">

        {/* 1. SL (26px) */}
        <div className="flex flex-col items-center text-center px-1">
          <span className="text-cyan-300 font-bold text-[15px] tracking-tight uppercase mb-0.5">
            SL
          </span>
          <div className="font-extrabold text-red-600 font-mono text-[30px] tracking-tighter whitespace-nowrap" title="Stop Loss Financeiro">
            {slDinamico}
          </div>
        </div>

        {/* 2. TAXA (26px) */}
        <div className="flex flex-col items-center text-center px-1">
          <span className="text-cyan-300 font-bold text-[15px] tracking-tight uppercase mb-0.5">
            TAXA
          </span>
          <div className="font-extrabold text-red-600 font-mono text-[30px] tracking-tighter whitespace-nowrap" title="Taxa Total Calculada">
            {taxaDinamica}
          </div>
        </div>

        {/* 3. STOP (26px) */}
        <div className="flex flex-col items-center text-center px-1">
          <span className="text-cyan-300 font-bold text-[15px] tracking-tight uppercase mb-0.5">
            STOP
          </span>
          <div className="font-extrabold text-red-600 font-mono text-[30px] tracking-tighter whitespace-nowrap" title="Stop Total (SL + Taxa)">
            {stopTotalDinamico}
          </div>
        </div>

        {/* 4. GAIN (26px) */}
        <div className="flex flex-col items-center text-center px-1">
          <span className="text-cyan-300 font-bold text-[15px] tracking-tight uppercase mb-0.5">
            GAIN
          </span>
          <div className="font-extrabold text-emerald-600 font-mono text-[30px] tracking-tighter whitespace-nowrap" title="Gain Esperado">
            {gainDinamico}
          </div>
        </div>

        {/* 5. MARGEM (30px) */}
        <div className="flex flex-col items-center text-center px-1">
          <span className="text-cyan-300 font-bold text-[15px] tracking-tight uppercase mb-0.5">
            MARGEM
          </span>
          <div className="font-extrabold text-emerald-600 font-mono text-[30px] tracking-tighter whitespace-nowrap" title="Margem Atual">
            {margemDinamica}
          </div>
        </div>

      </div>
    </div>
  );
}