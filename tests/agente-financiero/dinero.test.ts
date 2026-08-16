import { describe, expect, it } from 'vitest';
import {
  agruparImportesPorMoneda,
  centavosATexto,
  convertirACentavos,
  normalizarMoneda,
} from '@/lib/agente-financiero/dinero';

describe('dinero del agente financiero', () => {
  it('convierte importes decimales a centavos exactos', () => {
    expect(convertirACentavos('0.10')).toBe(10);
    expect(convertirACentavos('0,20')).toBe(20);
    expect(convertirACentavos(1250.5)).toBe(125050);
  });

  it('rechaza importes negativos, no finitos o con más de dos decimales', () => {
    expect(() => convertirACentavos('-1.00')).toThrow();
    expect(() => convertirACentavos(Number.POSITIVE_INFINITY)).toThrow();
    expect(() => convertirACentavos('10.999')).toThrow();
    expect(() => convertirACentavos('90071992547410.00')).toThrow();
  });

  it('serializa centavos como decimal sin perder precisión', () => {
    expect(centavosATexto(30)).toBe('0.30');
    expect(centavosATexto(-125050)).toBe('-1250.50');
  });

  it('normaliza códigos de moneda ISO', () => {
    expect(normalizarMoneda(' ars ')).toBe('ARS');
    expect(() => normalizarMoneda('pesos')).toThrow();
  });

  it('agrupa por moneda sin sumar ARS y USD entre sí', () => {
    expect(
      agruparImportesPorMoneda([
        { importe: '100.10', moneda: 'ARS' },
        { importe: '0.20', moneda: 'ars' },
        { importe: '12.50', moneda: 'USD' },
      ])
    ).toEqual([
      { moneda: 'ARS', total: '100.30' },
      { moneda: 'USD', total: '12.50' },
    ]);
  });
});
