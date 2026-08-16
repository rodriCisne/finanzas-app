import { beforeEach, describe, expect, it, vi } from 'vitest';

const estado = vi.hoisted(() => ({
  usuarioValido: true,
  billeteraVisible: true,
  guardarInteraccion: vi
    .fn<(supabase: unknown, interaccion: unknown) => Promise<boolean>>()
    .mockResolvedValue(true),
}));

vi.mock('@/lib/agente-financiero/supabase-servidor', () => ({
  crearClienteSupabaseUsuario: () => {
    const consulta = {
      select() {
        return this;
      },
      eq() {
        return this;
      },
      abortSignal() {
        return this;
      },
      async maybeSingle() {
        return {
          data: estado.billeteraVisible
            ? {
                id: '9bd17799-f566-4b52-a08f-3ebd9a1040c8',
                name: 'Pruebas',
                default_currency_code: 'ARS',
              }
            : null,
          error: null,
        };
      },
    };

    return {
      auth: {
        getUser: async () => ({
          data: { user: estado.usuarioValido ? { id: 'usuario' } : null },
          error: estado.usuarioValido ? null : new Error('token inválido'),
        }),
      },
      from: () => consulta,
    };
  },
}));

vi.mock('@/lib/agente-financiero/openai', () => ({
  crearClienteRespuestasOpenAI: () => ({}),
  obtenerModeloAgente: () => 'gpt-5.6-luna',
  ejecutarAgenteFinanciero: async () => ({
    respuesta: 'Respuesta simulada',
    periodosConsultados: [],
  }),
}));

vi.mock('@/lib/agente-financiero/telemetria', async (importarOriginal) => {
  const original = await importarOriginal<
    typeof import('@/lib/agente-financiero/telemetria')
  >();
  return {
    ...original,
    guardarInteraccionAgente: estado.guardarInteraccion,
  };
});

vi.mock('@/lib/agente-financiero/repositorio-supabase', () => ({
  crearRepositorioFinancieroSupabase: () => ({}),
}));

import { POST } from '@/app/api/financial-agent/route';

function crearRequest() {
  return new Request('http://localhost/api/financial-agent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer token-de-prueba',
    },
    body: JSON.stringify({
      pregunta: '¿Cuánto gasté hoy?',
      walletId: '9bd17799-f566-4b52-a08f-3ebd9a1040c8',
      historial: [],
    }),
  });
}

describe('ruta del agente financiero', () => {
  beforeEach(() => {
    estado.usuarioValido = true;
    estado.billeteraVisible = true;
    estado.guardarInteraccion.mockClear();
  });

  it('devuelve 401 cuando Supabase rechaza el token', async () => {
    estado.usuarioValido = false;
    const respuesta = await POST(crearRequest());

    expect(respuesta.status).toBe(401);
    expect(respuesta.headers.get('cache-control')).toBe('private, no-store');
  });

  it('devuelve 403 cuando RLS oculta la billetera solicitada', async () => {
    estado.billeteraVisible = false;
    const respuesta = await POST(crearRequest());

    expect(respuesta.status).toBe(403);
    expect(respuesta.headers.get('cache-control')).toBe('private, no-store');
  });

  it('registra la interacción completada sin exponer la telemetría al cliente', async () => {
    const respuesta = await POST(crearRequest());
    const cuerpo = await respuesta.json();

    expect(respuesta.status).toBe(200);
    expect(cuerpo).toEqual({
      respuesta: 'Respuesta simulada',
      periodosConsultados: [],
    });
    expect(estado.guardarInteraccion).toHaveBeenCalledTimes(1);
    expect(estado.guardarInteraccion.mock.calls[0][1]).toMatchObject({
      usuarioId: 'usuario',
      billeteraId: '9bd17799-f566-4b52-a08f-3ebd9a1040c8',
      pregunta: '¿Cuánto gasté hoy?',
      respuesta: 'Respuesta simulada',
      estado: 'completada',
      codigoError: null,
    });
  });
});
