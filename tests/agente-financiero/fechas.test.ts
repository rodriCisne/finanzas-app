import { describe, expect, it } from 'vitest';
import {
  contarDiasInclusivos,
  esFechaISOReal,
  esquemaPeriodo,
  obtenerFechaEnZonaHoraria,
} from '@/lib/agente-financiero/fechas';

describe('fechas del agente financiero', () => {
  it('acepta una fecha real, incluido un día bisiesto', () => {
    expect(esFechaISOReal('2024-02-29')).toBe(true);
  });

  it('rechaza fechas inexistentes y formatos ambiguos', () => {
    expect(esFechaISOReal('2026-02-29')).toBe(false);
    expect(esFechaISOReal('15/08/2026')).toBe(false);
  });

  it('cuenta ambos extremos del período', () => {
    expect(contarDiasInclusivos('2026-08-15', '2026-08-15')).toBe(1);
    expect(contarDiasInclusivos('2026-08-01', '2026-08-15')).toBe(15);
  });

  it('acepta hasta 366 días inclusivos', () => {
    expect(() =>
      esquemaPeriodo.parse({ desde: '2024-01-01', hasta: '2024-12-31' })
    ).not.toThrow();
  });

  it('rechaza períodos invertidos o mayores a 366 días', () => {
    expect(() =>
      esquemaPeriodo.parse({ desde: '2026-08-16', hasta: '2026-08-15' })
    ).toThrow();

    expect(() =>
      esquemaPeriodo.parse({ desde: '2023-01-01', hasta: '2024-01-02' })
    ).toThrow();
  });

  it('rechaza propiedades adicionales', () => {
    expect(() =>
      esquemaPeriodo.parse({
        desde: '2026-08-01',
        hasta: '2026-08-15',
        walletId: 'no-permitido',
      })
    ).toThrow();
  });

  it('calcula hoy en Buenos Aires aunque UTC ya esté en el día siguiente', () => {
    const fechaUTC = new Date('2026-08-16T01:30:00.000Z');
    expect(obtenerFechaEnZonaHoraria(fechaUTC)).toBe('2026-08-15');
  });
});
