import assert from "node:assert/strict";
import test from "node:test";
import {
  avaliarRetesteMinimaEstrategia4,
  processarEstrategia4VemDeBaixo,
} from "./vem-de-baixo";

const minimaFundoMarcada = 99.5;

test("cancela a Estratégia 4 ao tocar a mínima com ATR exatamente em 0.310", () => {
  const resultado = avaliarRetesteMinimaEstrategia4({
    precoAtual: minimaFundoMarcada,
    atrAtual: 0.310,
    minimaFundoMarcada,
  });

  assert.equal(resultado.acao, "CANCELAR");
  assert.match(resultado.status, />= 0\.310/);
});

test("cancela a Estratégia 4 ao romper a mínima com ATR acima de 0.310", () => {
  const resultado = avaliarRetesteMinimaEstrategia4({
    precoAtual: minimaFundoMarcada - 0.01,
    atrAtual: 0.45,
    minimaFundoMarcada,
  });

  assert.equal(resultado.acao, "CANCELAR");
});

test("mantém a compra ao tocar a mínima com ATR abaixo de 0.310", () => {
  const resultado = avaliarRetesteMinimaEstrategia4({
    precoAtual: minimaFundoMarcada,
    atrAtual: 0.309,
    minimaFundoMarcada,
  });

  assert.equal(resultado.acao, "MANTER_COMPRA");
  assert.match(resultado.status, /Compra mantida/);
});

test("a engine transporta a mínima marcada na confirmação da compra", () => {
  const resultado = processarEstrategia4VemDeBaixo({
    teveToqueNa99DeBaixo: true,
    atrAtual: 0.25,
    precoAtual: 100,
    minimaCandleAnterior: minimaFundoMarcada,
    media20AbaixoDoCorpo: true,
    media20TocouApenasPavio: false,
    estadoAtual: { fase: "MONITORANDO_FUNDO" },
  });

  assert.equal(resultado.acao, "COMPRA");
  assert.equal(resultado.minimaFundoMarcada, minimaFundoMarcada);
});