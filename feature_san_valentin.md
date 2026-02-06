Especificación: “San Valentín Recap” (6 Stories)
Objetivo

El 14 de febrero, al abrir la app, cada usuario que pertenezca a una billetera compartida verá automáticamente un recap de 6 pantallas con fotos + frases románticas estilo “Spotify Wrapped”.
Ese recap:

se muestra automáticamente solo la primera vez que el usuario abre la app ese día,

y queda accesible para replay durante ese mismo día.

1) Alcance y reglas de activación
1.1 ¿Cuándo se muestra?

Fecha: 14/02, según hora local del dispositivo (o la zona configurada en la app, si existiera).

Se dispara al abrir la app y llegar a la zona autenticada (Home o primer screen post-login).

1.2 ¿A quién se le muestra?

Solo a billeteras que tengan activado el San Valentín en la tabla de billeteras. 

Solo si el usuario tiene al menos una billetera compartida (wallet con miembros ≥ 2).

Versión MVP: usar la billetera activa (currentWallet).

1.3 “Primera vez del día”

Cada usuario debe verlo automáticamente 1 sola vez el 14/02 hora local del dispositivo.

Si cierra y vuelve a abrir, no debe volver a interrumpirlo.

2) Contenido del recap (6 pantallas)
2.1 Estructura visual

Formato “story” fullscreen.

Avance:

Tap derecha: siguiente.

Tap izquierda: anterior.

Swipe opcional (nice-to-have).

Indicador de progreso: 6 barras arriba.

2.2 Pantallas

Son 6 pantallas con:

Imagen (foto del álbum, random o preseleccionada)

Título corto

Frase (romántica, estilo recap)

Ejemplo de guión (editable):

“Nuestro año en 6 momentos 💘”

“Lo mejor que hicimos juntos fue… seguir eligiéndonos”

“Y sí… también compartimos gastos 😅”

“Pero lo que más sumó fue… vos”

“Este año quiero más: viajes, cenas y abrazos”

“Fin. Replay disponible hoy. Te amo ❤️”

Importante: el equipo debe poder modificar textos sin tocar mucho código (ideal: config JSON / tabla).

2.3 Selección de imágenes

El recap usa 6 imágenes.

Seran imagenes que estarán en un storage de supabase.


3) Fuente de imágenes
MVP recomendado (simple y seguro)

Las fotos vienen de un storage de supabase, se seleccionan con una tabla que será creada en supabase con id, nombre_foto, frase foto, url_foto.

Requisitos:

Que sea lindo, de un diseño romántico, con animaciones y transiciones suaves pero que le agreguen un detalle hermoso. Que las frases aparezcan con un movimiento suave y que la imagen se vea bien. 


4) Lógica de “mostrar 1 vez por usuario” y “replay”
4.1 Primera vez (auto-show)

El sistema debe registrar un flag por usuario:

valentines_recap_seen_YYYY (ej: 2026)

Guardar en supabase para que sea consistente entre dispositivos.

luego quiero tener un boton en home para ver el recap manualmente.

Regla exacta:

Si hoy es 14/02 y seen es false → mostrar recap automáticamente y setear seen=true.

Si seen es true → no mostrar automáticamente.

4.2 Replay (ver de nuevo ese día)

Durante el 14/02, debe existir un lugar para reabrirlo:

En Home: un botón “💘 Ver recap” o una card “Modo San Valentín”.

Reglas:

Replay disponible solo el 14/02.

Fuera de esa fecha, el entrypoint no aparece.

5) UX / No funcionales
5.1 No interrumpir el uso normal

El recap se muestra “full screen” con opción de:

“Cerrar” (X) para salir.

Si lo cierra, se considera “visto” igualmente (MVP) o se considera “visto” solo si llega al final (decisión).

Recomiendo: visto al cerrarlo o completarlo, para evitar loops.

5.2 Rendimiento

Cargar imágenes con:

prefetch / preload de las siguientes (ideal).

tamaño optimizado.

Si la red es mala:

mostrar skeleton/loader por slide.

si falla una imagen, fallback a placeholder.

5.3 Accesibilidad básica

Texto legible.

Botones “Siguiente / Anterior” no solo por gestos (aunque sea invisibles, deben existir por accesibilidad).

6) Pantallas/Componentes impactados (a nivel funcional)
6.1 Punto de entrada

Se ejecuta un “chequeo de San Valentín” al entrar al área autenticada (Home o layout app).

Si se cumple condición → abre el modal/route del recap.

6.2 Pantalla del recap

Nueva ruta o modal:

ejemplo: /(app)/valentines-recap

Debe poder abrirse:

automáticamente (primera vez)

manualmente (replay)

6.3 Home

Solo el 14/02, mostrar:

Card/botón: “💘 Ver recap”

Solo para billeteras compartidas (o para todos, según decisión).

7) Datos y configuración (para que evolucione fácil)
MVP configurable

Definir un objeto de configuración con:

year: 2026

enabled: true/false

date window: 14/02

copy/textos de los 6 slides

fuente de imágenes (album/bucket)

reglas: “mark seen on close” vs “on complete”

8) Criterios de aceptación (QA)

 El 14/02, primer ingreso del usuario → recap se abre solo.

 El mismo día, si refresca o vuelve a abrir → recap NO se abre solo.

 El mismo día, el usuario puede entrar manualmente desde Home → replay OK.

 El 13/02 o 15/02 → no aparece ni auto-show ni botón replay.

 Solo usuarios con billetera compartida lo ven.

 Son 6 pantallas, con progreso, navegación y cierre.

 Si faltan fotos o fallan, no rompe: hay fallback.

 El “seen” persiste (al menos en el mismo dispositivo).