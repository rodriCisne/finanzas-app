'use client';

import { supabase } from '@/lib/supabaseClient';

const BUCKET_FOTOS = 'fotosRodricu';
const CARPETA_OPTIMIZADA = 'random-moments-optimized';
const LIMITE_LISTADO = 1000;
const TIEMPO_MAXIMO_MS = 4000;

let archivosOptimizadosPromise: Promise<string[]> | null = null;

function listarArchivosOptimizados(): Promise<string[]> {
  if (!archivosOptimizadosPromise) {
    archivosOptimizadosPromise = supabase.storage
      .from(BUCKET_FOTOS)
      .list(CARPETA_OPTIMIZADA, {
        limit: LIMITE_LISTADO,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' },
      })
      .then(({ data, error }) => {
        if (error) {
          throw error;
        }

        const nombres = (data ?? [])
          .filter(
            (archivo) =>
              archivo.name.toLowerCase().endsWith('.webp') &&
              !archivo.name.startsWith('.'),
          )
          .map((archivo) => archivo.name);

        if (nombres.length === 0) {
          throw new Error('No hay fotos optimizadas disponibles.');
        }

        return nombres;
      })
      .catch((error) => {
        archivosOptimizadosPromise = null;
        throw error;
      });
  }

  return archivosOptimizadosPromise;
}

function conTiempoMaximo<T>(promesa: Promise<T>, mensaje: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const temporizador = window.setTimeout(() => reject(new Error(mensaje)), TIEMPO_MAXIMO_MS);

    promesa.then(
      (resultado) => {
        window.clearTimeout(temporizador);
        resolve(resultado);
      },
      (error) => {
        window.clearTimeout(temporizador);
        reject(error);
      },
    );
  });
}

function precargarImagen(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const imagen = new Image();
    imagen.decoding = 'async';
    imagen.onload = () => resolve();
    imagen.onerror = () => reject(new Error('No se pudo precargar la foto optimizada.'));
    imagen.src = url;
  });
}

export async function prepararFotoAleatoriaOptimizada(): Promise<string> {
  const archivos = await conTiempoMaximo(
    listarArchivosOptimizados(),
    'La lista de fotos optimizadas demoró demasiado.',
  );

  const nombre = archivos[Math.floor(Math.random() * archivos.length)];
  const ruta = `${CARPETA_OPTIMIZADA}/${nombre}`;
  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET_FOTOS).getPublicUrl(ruta);

  await conTiempoMaximo(
    precargarImagen(publicUrl),
    'La precarga de la foto optimizada demoró demasiado.',
  );
  return publicUrl;
}
