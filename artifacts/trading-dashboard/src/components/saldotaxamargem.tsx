import React, { useState, useEffect } from 'react';

export default function SaldoTaxaMargem() {
  // Estados para capturar os valores dinâmicos vindos da Gestão de Risco
  const [slDinamico, setSlDinamico] = useState<string>('0.00');
  const [taxaDinamica, setTaxaDinamica] = useState<string>('0.00');
  const [margemDinamica, setMargemDinamica] = useState<string>('0.00');

  // Sincroniza os valores em tempo real com os cálculos da Gestão de Risco
  useEffect(() => {
    const atualizarValoresGestao = () => {
      try {
        const slSalvo = localStorage.getItem('gestao_sl_atual'); // Pega o SL salvo
        const taxaSalva = localStorage.getItem('gestao_taxa_atual');
        const margemSalva = localStorage.getItem('gestao_margem_atual');

        if (slSalvo) setSlDinamico(slSalvo);
        if (taxaSalva) setTaxaDinamica(taxaSalva);
        if (margemSalva) setMargemDinamica(margemSalva);
      } catch (e) {
        console.error('Erro ao ler dados da gestão de risco', e);
      }
    };

    atualizarValoresGestao();

    // Ouve alterações feitas por outros componentes ou disparos de storage
    window.addEventListener('storage', atualizarValoresGestao);
    const interval = setInterval(atualizarValoresGestao, 200);

    return () => {
      window.removeEventListener('storage', atualizarValoresGestao);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="relative border border-[#4a4a4a] bg-black rounded-xl p-2.5 flex flex-col items-center justify-between shadow-lg text-white font-mono w-full h-full min-h-[80px]">

      {/* Grid de 3 colunas para alinhar perfeitamente título + valor em cada bloco */}
      <div className="relative w-full grid grid-cols-3 items-center gap-2">

        {/* 1. BLOCO DA ESQUERDA: SL */}
        <div className="flex flex-col items-center">
          <span className="text-cyan-300 font-bold text-[11px] tracking-wider uppercase mb-1">
            SL
          </span>
          <div 
            className="w-full bg-black border border-[#4a4a4a] rounded-lg py-1 text-[22px] text-center font-extrabold text-red-600 font-mono flex items-center justify-center shadow"
            title="Stop Loss Financeiro"
          >
            {slDinamico}
          </div>
        </div>

        {/* 2. BLOCO DO MEIO: TAXA */}
        <div className="flex flex-col items-center">
          <span className="text-cyan-300 font-bold text-[11px] tracking-wider uppercase mb-1">
            TAXA
          </span>
          <div 
            className="w-full bg-black border border-[#4a4a4a] rounded-lg py-1 text-[22px] text-center font-extrabold text-red-600 font-mono flex items-center justify-center shadow"
            title="Taxa Total Calculada"
          >
            {taxaDinamica}
          </div>
        </div>

        {/* 3. BLOCO DA DIREITA: MARGEM */}
        <div className="flex flex-col items-center">
          <span className="text-cyan-300 font-bold text-[11px] tracking-wider uppercase mb-1">
            MARGEM
          </span>
          <div 
            className="w-full bg-black border border-[#4a4a4a] rounded-lg py-1 text-[22px] text-center font-extrabold text-emerald-600 font-mono flex items-center justify-center shadow"
            title="Nocional em GBP Otimizado"
          >
            {margemDinamica}
          </div>
        </div>

      </div>
    </div>
  );
}