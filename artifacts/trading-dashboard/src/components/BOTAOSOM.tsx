import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import msnSound from "../assets/MSN.mp3";

export function BotaoSomVix() {
  const [soundOn, setSoundOn] = useState(() => {
    try {
      return localStorage.getItem("SOUND_KEY") !== "0";
    } catch {
      return true;
    }
  });

  const [ultimoEstagio, setUltimoEstagio] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      try {
        // Se o som estiver desativado globalmente pelo botão, nem processa
        if (!soundOn) return;

        const vixElement = document.querySelector('.vix-value') || document.querySelector('.text-2xl.font-bold.tabular-nums');
        if (!vixElement) return;

        const numVix = parseFloat(vixElement.textContent?.replace(',', '.') || '0');
        if (isNaN(numVix)) return;

        let estagioAtual = "verde";
        if (numVix >= 30) {
          estagioAtual = "vermelho";
        } else if (numVix >= 20) {
          estagioAtual = "amarelo";
        }

        if (ultimoEstagio !== null && ultimoEstagio !== estagioAtual) {
          const audio = new Audio(msnSound);
          audio.volume = 1.0;
          audio.play().catch(err => console.log("Erro ao tocar áudio:", err));
        }

        setUltimoEstagio(estagioAtual);
      } catch (e) {
        // ignora erros de leitura temporários
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [ultimoEstagio, soundOn]);

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => {
          setSoundOn((v) => {
            const next = !v;
            try {
              localStorage.setItem("SOUND_KEY", next ? "1" : "0");
            } catch {
              /* ignore */
            }
            return next;
          });
        }}
        title={soundOn ? "Som ativado" : "Som desativado"}
        className={`flex items-center justify-center rounded-lg px-3 py-2 text-xs font-semibold leading-tight transition-colors ${
          soundOn ? "bg-blue-600 text-white" : "bg-red-600 text-white"
        }`}
      >
        {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
      </button>
    </div>
  );
}