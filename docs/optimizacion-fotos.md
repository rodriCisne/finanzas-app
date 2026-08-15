# Optimización de fotos de confirmación

La aplicación utiliza copias WebP del bucket `fotosRodricu`, ubicadas en
`random-moments-optimized`. Los originales de `random-moments` son de solo
lectura y no deben eliminarse ni reemplazarse.

## Modos seguros

Inventariar los objetos sin descargar ni subir archivos:

```powershell
npm run photos:optimize -- --dry-run
```

Procesar una imagen en memoria sin subirla:

```powershell
npm run photos:optimize -- --preview
```

Procesar la imagen más pesada en memoria:

```powershell
npm run photos:optimize -- --preview --largest
```

## Migración

La carga requiere una clave `service_role` local. Debe agregarse a
`.env.local` y nunca debe llevar el prefijo `NEXT_PUBLIC_`:

```dotenv
SUPABASE_SERVICE_ROLE_KEY=<valor-configurado-localmente>
```

No pegues la clave en tickets, conversaciones, commits ni logs. `.env.local`
está excluido por `.gitignore`.

Primero se recomienda cargar una sola imagen:

```powershell
npm run photos:optimize -- --apply --limit=1
```

Después de comprobar en Supabase que el objeto es WebP, pesa como máximo
750 KB y tiene `cache-control: max-age=31536000`, ejecutar el lote completo:

```powershell
npm run photos:optimize -- --apply
```

El proceso es reanudable: omite derivados existentes. `--force` permite
reescribirlos de forma explícita, pero no se usa en la migración normal.

## Verificación

Al finalizar, repetir el inventario:

```powershell
npm run photos:optimize -- --audit
```

La auditoría compara los nombres esperados y reales, valida WebP y el límite de
750 KB, calcula la reducción total y comprueba por HTTP la caché anual. Debe
informar 201 imágenes originales, dos objetos no imagen ignorados y 201
derivados existentes. La aplicación nunca debe solicitar `/render/image/` ni
volver a `random-moments` durante la confirmación.

### Resultado de la migración del 15 de agosto de 2026

- 203 objetos originales conservados: 201 imágenes y dos videos ignorados.
- 201 derivados WebP verificados; cero faltantes, huérfanos o inválidos.
- 27,18 MB totales frente a 775,33 MB de imágenes originales: 96,5 % menos.
- 498 KB para el derivado más pesado, por debajo del máximo de 750 KB.
- Caché pública anual verificada mediante una solicitud HTTP real.
- `npm run lint`, `npm run build` y `tali validate --strict` aprobados.
