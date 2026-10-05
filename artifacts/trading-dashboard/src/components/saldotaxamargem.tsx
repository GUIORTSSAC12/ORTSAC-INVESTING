import React, { useState, useEffect } from 'react';

export default function SaldoTaxaMargem() {
  const [slDinamico, setSlDinamico] = useState<string>('0.00');
  const [taxaDinamica, setTaxaDinamica] = useState<string>('0.00');

  // Sincroniza os valores em tempo real com os cálculos da Gestão de Risco
  useEffect(() => {
    const atualizarValoresGestao = () => {
      try {
        const slSalvo = localStorage.getItem('gestao_sl_atual');
        const taxaSalva = localStorage.getItem('gestao_taxa_atual');

        if (slSalvo) setSlDinamico(slSalvo);
        if (taxaSalva) setTaxaDinamica(taxaSalva);
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

  // Calcula o Stop Total automaticamente somando o SL e a Taxa em tempo real
  const calcularStopTotal = () => {
    try {
      const limpaSL = parseFloat(slDinamico.replace(/[^\d.-]/g, '')) || 0;
      const limpaTaxa = parseFloat(taxaDinamica.replace(/[^\d.-]/g, '')) || 0;
      
      const soma = limpaSL + limpaTaxa;
      return soma.toFixed(2);
    } catch {
      return '0.00';
    }
  };

  const stopTotal = calcularStopTotal();

  return (
    <div className="relative border border-[#4a4a4a] bg-black rounded-xl p-2.5 flex flex-col items-center justify-between shadow-lg text-white font-mono w-full h-full min-h-[80px]">

      {/* Grid de 3 colunas sem as bordinhas internas e com os números em 24px */}
      <div className="relative w-full grid grid-cols-3 items-center gap-2">

        {/* 1. BLOCO DA ESQUERDA: SL */}
        <div className="flex flex-col items-center">
          <span className="text-cyan-300 font-bold text-[16px] tracking-wider uppercase mb-1">
            SL
          </span>
          <div 
            className="w-full text-center font-extrabold text-red-600 font-mono text-[24px]"
            title="Stop Loss Financeiro"
          >
            {slDinamico}
          </div>
        </div>

        {/* 2. BLOCO DO MEIO: TAXA */}
        <div className="flex flex-col items-center">
          <span className="text-cyan-300 font-bold text-[16px] tracking-wider uppercase mb-1">
            TAXA
          </span>
          <div 
            className="w-full text-center font-extrabold text-red-600 font-mono text-[24px]"
            title="Taxa Total Calculada"
          >
            {taxaDinamica}
          </div>
        </div>

        {/* 3. BLOCO DA DIREITA: STOP CALCULADO */}
        <div className="flex flex-col items-center">
          <span className="text-cyan-300 font-bold text-[16px] tracking-wider uppercase mb-1">
            STOP
          </span>
          <div 
            className="w-full text-center font-extrabold text-red-600 font-mono text-[24px]"
            title="Stop Total (SL + Taxa)"
          >
            {stopTotal.startsWith('-') ? stopTotal : `-${stopTotal}`}
          </div>
        </div>

      </div>
    </div>
  );
}