import { createHash } from 'node:crypto';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

const BUCKET = 'fotosRodricu';
const CARPETA_ORIGEN = 'random-moments';
const CARPETA_DESTINO = 'random-moments-optimized';
const CACHE_CONTROL = '31536000';
const MAX_BYTES = 750 * 1024;
const TAMANOS = [1600, 1440, 1280, 1120, 960, 800];
const CALIDADES = [72, 67, 62, 57, 52, 47, 42];
const TAMANO_PAGINA = 100;
const EXTENSIONES_DE_IMAGEN = new Set([
  'avif',
  'bmp',
  'gif',
  'heic',
  'ico',
  'jpeg',
  'jpg',
  'png',
  'svg',
  'tif',
  'tiff',
  'webp',
]);

const argumentos = new Set(process.argv.slice(2));
const aplicar = argumentos.has('--apply');
const previsualizar = argumentos.has('--preview');
const auditar = argumentos.has('--audit');
const seleccionarMayor = argumentos.has('--largest');
const forzar = argumentos.has('--force');
const limiteArgumento = process.argv.find((argumento) => argumento.startsWith('--limit='));
const archivoArgumento = process.argv.find((argumento) => argumento.startsWith('--file='));
const archivoSolicitado = archivoArgumento?.slice('--file='.length);
const limite = limiteArgumento
  ? Number.parseInt(limiteArgumento.split('=')[1] ?? '', 10)
  : previsualizar
    ? 1
  : Number.POSITIVE_INFINITY;

function exigirVariable(nombre) {
  const valor = process.env[nombre]?.trim();
  if (!valor) {
    throw new Error(`Falta la variable de entorno ${nombre}.`);
  }
  return valor;
}

function validarUrlSupabase(valor) {
  const url = new URL(valor);
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.supabase.co')) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL debe ser una URL HTTPS de Supabase.');
  }
  return url.origin;
}

function formatearBytes(bytes) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  return `${Math.round(bytes / 1024)} KB`;
}

function nombreDestino(nombreOriginal) {
  const base = nombreOriginal
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 100);
  const hash = createHash('sha256').update(nombreOriginal).digest('hex').slice(0, 12);
  return `${base || 'foto'}-${hash}.webp`;
}

function esImagen(archivo) {
  const tipo = String(archivo.metadata?.mimetype ?? '').toLowerCase();
  if (tipo.startsWith('image/')) {
    return true;
  }

  const extension = archivo.name.split('.').pop()?.toLowerCase() ?? '';
  return EXTENSIONES_DE_IMAGEN.has(extension);
}

async function listarTodos(cliente, carpeta) {
  const archivos = [];
  let offset = 0;

  while (true) {
    const { data, error } = await cliente.storage.from(BUCKET).list(carpeta, {
      limit: TAMANO_PAGINA,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });

    if (error) {
      throw new Error(`No se pudo listar ${carpeta}: ${error.message}`);
    }

    const pagina = (data ?? []).filter(
      (archivo) => archivo.name && !archivo.name.startsWith('.') && archivo.metadata?.size,
    );
    archivos.push(...pagina);

    if ((data ?? []).length < TAMANO_PAGINA) {
      return archivos;
    }
    offset += TAMANO_PAGINA;
  }
}

async function optimizarImagen(bufferOriginal) {
  for (const tamano of TAMANOS) {
    for (const calidad of CALIDADES) {
      const resultado = await sharp(bufferOriginal, { failOn: 'warning' })
        .rotate()
        .resize({
          width: tamano,
          height: tamano,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: calidad, effort: 5 })
        .toBuffer();

      if (resultado.length <= MAX_BYTES) {
        return { buffer: resultado, calidad, tamano };
      }
    }
  }

  throw new Error('No fue posible reducir la imagen por debajo de 750 KB.');
}

async function ejecutar() {
  if ([aplicar, previsualizar, auditar].filter(Boolean).length > 1) {
    throw new Error('Usa solamente uno de estos modos: --apply, --preview o --audit.');
  }
  if (limiteArgumento && (!Number.isInteger(limite) || limite <= 0)) {
    throw new Error('--limit debe ser un entero mayor a cero.');
  }
  if (forzar && !aplicar) {
    throw new Error('--force solo puede utilizarse junto con --apply.');
  }

  const supabaseUrl = validarUrlSupabase(exigirVariable('NEXT_PUBLIC_SUPABASE_URL'));
  const anonKey = exigirVariable('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  const clientePublico = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const inventarioCompleto = await listarTodos(clientePublico, CARPETA_ORIGEN);
  const inventarioOriginal = inventarioCompleto.filter(esImagen);
  const objetosIgnorados = inventarioCompleto.length - inventarioOriginal.length;
  const originales = archivoSolicitado
    ? inventarioOriginal.filter((archivo) => archivo.name === archivoSolicitado)
    : seleccionarMayor
      ? [...inventarioOriginal]
          .sort(
            (a, b) => Number(b.metadata?.size ?? 0) - Number(a.metadata?.size ?? 0),
          )
          .slice(0, 1)
      : inventarioOriginal.slice(0, limite);

  if (archivoSolicitado && originales.length === 0) {
    throw new Error(`No se encontró el archivo solicitado: ${archivoSolicitado}`);
  }
  const existentes = await listarTodos(clientePublico, CARPETA_DESTINO);
  const nombresExistentes = new Set(existentes.map((archivo) => archivo.name));
  const bytesOriginales = originales.reduce(
    (total, archivo) => total + Number(archivo.metadata?.size ?? 0),
    0,
  );
  const tamanosOrdenados = originales
    .map((archivo) => Number(archivo.metadata?.size ?? 0))
    .sort((a, b) => a - b);
  const indiceMedio = Math.floor(tamanosOrdenados.length / 2);
  const mediana = tamanosOrdenados.length === 0
    ? 0
    : tamanosOrdenados.length % 2 === 0
      ? (tamanosOrdenados[indiceMedio - 1] + tamanosOrdenados[indiceMedio]) / 2
      : tamanosOrdenados[indiceMedio];

  const modo = aplicar ? 'APLICAR' : previsualizar ? 'PREVIEW' : auditar ? 'AUDIT' : 'DRY-RUN';
  console.log(`Modo: ${modo}`);
  console.log(`Originales seleccionados: ${originales.length}`);
  console.log(`Objetos no imagen ignorados: ${objetosIgnorados}`);
  console.log(`Peso original estimado: ${formatearBytes(bytesOriginales)}`);
  console.log(
    `Promedio / mediana / máximo: ${formatearBytes(bytesOriginales / Math.max(originales.length, 1))} / ` +
      `${formatearBytes(mediana)} / ${formatearBytes(tamanosOrdenados.at(-1) ?? 0)}`,
  );
  console.log(`Imágenes mayores a 1 MB: ${tamanosOrdenados.filter((bytes) => bytes > 1024 * 1024).length}`);
  console.log(`Derivados existentes: ${existentes.length}`);

  if (auditar) {
    const nombresEsperados = new Set(inventarioOriginal.map((archivo) => nombreDestino(archivo.name)));
    const nombresDerivados = new Set(existentes.map((archivo) => archivo.name));
    const faltantes = [...nombresEsperados].filter((nombre) => !nombresDerivados.has(nombre));
    const huerfanos = [...nombresDerivados].filter((nombre) => !nombresEsperados.has(nombre));
    const invalidos = existentes.filter(
      (archivo) =>
        !archivo.name.endsWith('.webp') ||
        archivo.metadata?.mimetype !== 'image/webp' ||
        Number(archivo.metadata?.size ?? 0) > MAX_BYTES,
    );
    const bytesDerivados = existentes.reduce(
      (total, archivo) => total + Number(archivo.metadata?.size ?? 0),
      0,
    );
    const maximoDerivado = Math.max(
      0,
      ...existentes.map((archivo) => Number(archivo.metadata?.size ?? 0)),
    );

    let muestraHttpValida = false;
    let cacheMuestra = '';
    if (existentes.length > 0) {
      const muestra = existentes[Math.floor(existentes.length / 2)];
      const { data: { publicUrl } } = clientePublico.storage
        .from(BUCKET)
        .getPublicUrl(`${CARPETA_DESTINO}/${muestra.name}`);
      const respuesta = await fetch(publicUrl, {
        headers: { Range: 'bytes=0-0' },
      });
      cacheMuestra = respuesta.headers.get('cache-control') ?? '';
      muestraHttpValida =
        respuesta.ok &&
        respuesta.headers.get('content-type') === 'image/webp' &&
        cacheMuestra.includes('max-age=31536000');
      await respuesta.body?.cancel();
    }

    const reduccionTotal = bytesOriginales > 0
      ? (1 - bytesDerivados / bytesOriginales) * 100
      : 0;
    console.log(`Derivados faltantes: ${faltantes.length}`);
    console.log(`Derivados huérfanos: ${huerfanos.length}`);
    console.log(`Derivados inválidos: ${invalidos.length}`);
    console.log(`Peso total derivado: ${formatearBytes(bytesDerivados)}`);
    console.log(`Máximo derivado: ${formatearBytes(maximoDerivado)}`);
    console.log(`Reducción total: ${reduccionTotal.toFixed(1)} %`);
    console.log(`Muestra HTTP/caché válida: ${muestraHttpValida ? 'sí' : 'no'} (${cacheMuestra || 'sin caché'})`);

    if (
      faltantes.length > 0 ||
      huerfanos.length > 0 ||
      invalidos.length > 0 ||
      !muestraHttpValida ||
      reduccionTotal < 80
    ) {
      process.exitCode = 1;
    }
    return;
  }

  if (!aplicar && !previsualizar) {
    console.log('No se descargaron ni subieron archivos. Usa --apply para ejecutar la migración.');
    return;
  }

  const clienteAdmin = aplicar
    ? createClient(supabaseUrl, exigirVariable('SUPABASE_SERVICE_ROLE_KEY'), {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

  let procesadas = 0;
  let omitidas = 0;
  let fallidas = 0;
  let bytesDerivados = 0;

  for (const [indice, archivo] of originales.entries()) {
    const destino = nombreDestino(archivo.name);
    if (aplicar && !forzar && nombresExistentes.has(destino)) {
      omitidas += 1;
      console.log(`[${indice + 1}/${originales.length}] OMITIDA ${archivo.name}`);
      continue;
    }

    try {
      const { data: { publicUrl } } = clientePublico.storage
        .from(BUCKET)
        .getPublicUrl(`${CARPETA_ORIGEN}/${archivo.name}`);
      const respuesta = await fetch(publicUrl);
      if (!respuesta.ok) {
        throw new Error(`Descarga HTTP ${respuesta.status}`);
      }

      const original = Buffer.from(await respuesta.arrayBuffer());
      const optimizada = await optimizarImagen(original);
      if (clienteAdmin) {
        const { error } = await clienteAdmin.storage
          .from(BUCKET)
          .upload(`${CARPETA_DESTINO}/${destino}`, optimizada.buffer, {
            cacheControl: CACHE_CONTROL,
            contentType: 'image/webp',
            upsert: forzar,
          });

        if (error) {
          throw new Error(`Carga fallida: ${error.message}`);
        }
      }

      procesadas += 1;
      bytesDerivados += optimizada.buffer.length;
      console.log(
        `[${indice + 1}/${originales.length}] ${aplicar ? 'OK' : 'PREVIEW'} ${archivo.name} → ${destino} ` +
          `(${formatearBytes(original.length)} → ${formatearBytes(optimizada.buffer.length)}, ` +
          `${optimizada.tamano}px, q${optimizada.calidad})`,
      );
    } catch (error) {
      fallidas += 1;
      const mensaje = error instanceof Error ? error.message : String(error);
      console.error(`[${indice + 1}/${originales.length}] ERROR ${archivo.name}: ${mensaje}`);
    }
  }

  const reduccion = bytesOriginales > 0 && procesadas > 0
    ? (1 - bytesDerivados / bytesOriginales) * 100
    : 0;
  console.log('\nResumen');
  console.log(`Procesadas: ${procesadas}`);
  console.log(`Omitidas: ${omitidas}`);
  console.log(`Fallidas: ${fallidas}`);
  console.log(`Peso de nuevos derivados: ${formatearBytes(bytesDerivados)}`);
  console.log(`Reducción de nuevos derivados: ${reduccion.toFixed(1)} %`);

  if (fallidas > 0) {
    process.exitCode = 1;
  }
}

ejecutar().catch((error) => {
  const mensaje = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${mensaje}`);
  process.exitCode = 1;
});
