# ADR-0002: Paleta de colores «Volt»

**Estado:** Aceptada
**Fecha:** 2026-10-23
**Decide:** Ángel

## Contexto

La app necesita una identidad visual que funcione:

- En **modo claro y oscuro**, porque iOS los alterna según la hora o los ajustes.
- **Al sol y en movimiento**: datos legibles de un vistazo, en el manillar o en la mano corriendo.
- **Sobre el mapa**: la ruta tiene que destacar sobre un mapa topográfico claro u oscuro.
- Con un **color por actividad** (carretera, BTT, correr y caminar) para listas, mapa y gráficas, que se distingan también con daltonismo.

Se compararon 10 paletas y 4 variantes de acento en maquetas de iPhone. La página de comparación está en [`docs/diseno/paletas-propuestas.html`](../diseno/paletas-propuestas.html) y se puede abrir con el navegador.

## Decisión

Se elige **Volt (propuesta 07)**: blanco y negro con un único acento amarillo flúor, `#D4F53C`.

- **En claro:** botones negros con texto blanco. El amarillo se reserva para destacados: récords, insignias y el dato importante del momento.
- **En oscuro:** fondo negro puro, con el amarillo como color principal (botón de empezar y posición actual) y texto negro encima.

Los tokens viven en [`src/constants/theme.ts`](../../src/constants/theme.ts) (`Colors` y `ActivityColors`). Ese archivo es la fuente de verdad; esta tabla es su explicación.

### Colores de la interfaz

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `tint` | `#111111` | `#D4F53C` | Botón principal, posición actual en el mapa, elemento activo |
| `onTint` | `#FFFFFF` | `#0A0A0A` | Texto e iconos sobre `tint` |
| `accent` | `#D4F53C` | `#D4F53C` | Destacados: récords, insignias, mejor marca |
| `onAccent` | `#0A0A0A` | `#0A0A0A` | Texto sobre `accent` |
| `background` | `#FFFFFF` | `#000000` | Fondo de pantalla |
| `backgroundElement` | `#F2F2F2` | `#141414` | Tarjetas y paneles |
| `backgroundSelected` | `#E2E2E2` | `#262626` | Elemento pulsado o seleccionado |
| `border` | `#E2E2E2` | `#262626` | Separadores |
| `text` | `#0A0A0A` | `#FFFFFF` | Texto principal y cifras |
| `textSecondary` | `#616161` | `#A3A3A3` | Etiquetas, unidades, fechas |
| `danger` | `#D93025` | `#D93025` | Terminar, descartar, borrar e indicador de grabando |
| `onDanger` | `#FFFFFF` | `#FFFFFF` | Texto sobre `danger` |
| `warning` | `#F5A623` | `#F5A623` | Indicador «en pausa» |
| `routeCasing` | `#FFFFFF` | `#0E1012` | Borde de la ruta y de los marcadores del mapa |
| `overlay` | negro al 45 % | negro al 60 % | Velo detrás de las hojas de confirmación |

### Colores de actividad

| Actividad | Claro | Oscuro |
|---|---|---|
| Bici de carretera (`road_bike`) | `#FD2E22` | `#FB4B11` |
| Bici de montaña (`mtb`) | `#2D924C` | `#35A766` |
| Correr (`run`) | `#3965AA` | `#2178B2` |
| Caminar (`walk`) | `#9B55E8` | `#A671EC` |

## Reglas de uso

1. **El amarillo nunca va como texto ni como línea sobre fondo claro**: su contraste sobre blanco es 1,24:1 y no se ve. En claro solo se usa como relleno, con texto negro encima. Sobre negro se puede usar libremente (16,9:1).
2. **Un solo acento.** No se añaden otros colores de marca. El color fuera del blanco y negro lo ponen las actividades y los estados.
3. **Las actividades siempre llevan su icono y su nombre**, nunca solo el color.
4. **La ruta en el mapa** usa el color de su actividad, con un borde blanco en claro y casi negro (`#0E1012`) en oscuro.
5. **`danger` y `warning` tienen significado fijo** (terminar o borrar, y en pausa) y no se usan como decoración. `warning` sobre blanco tiene 2,0:1, así que siempre va junto a su texto («En pausa»).

## Comprobaciones

Calculadas con el validador de color (contraste WCAG; separación ΔE en OKLab, con protanopia y deuteranopia simuladas):

| Comprobación | Claro | Oscuro | Mínimo |
|---|---|---|---|
| Texto del botón principal | 18,9:1 | 16,0:1 | 4,5:1 |
| Texto principal sobre fondo | 19,8:1 | 21,0:1 | 4,5:1 |
| Texto secundario sobre fondo / tarjeta | 6,2:1 / 5,5:1 | 8,3:1 / 7,3:1 | 4,5:1 |
| Texto blanco sobre `danger` | 4,8:1 | 4,8:1 | 4,5:1 |
| `danger` como relleno sobre el fondo | 4,8:1 | 4,4:1 | 3:1 |
| Colores de actividad sobre la app y sobre el mapa | ≥ 3:1 | ≥ 3:1 | 3:1 |
| Separación entre actividades con daltonismo (todas las parejas) | ΔE 10,1 | ΔE 9,3 | ΔE 8 |

## Alternativas consideradas

- **Las otras 9 paletas:** Asfalto, Bosque, Glaciar, Atardecer, Nocturno, Tierra, Océano, Balizas y Violeta. Todas están en la página de comparación.
- **Volt con otro acento**, para alejarla de Nike:
  - V1 baliza `#FFD000`
  - V2 rosa flúor `#FF2E88`
  - V3 cian `#00D9FF`
  - V4 naranja reflectante `#FF5A1F`

  Con el rosa y sobre todo con el naranja, el botón principal se confunde con el rojo de «Terminar».

## Consecuencias

- **A favor:** máximo contraste al sol, aspecto deportivo y técnico, y un modo oscuro con fondo negro puro que ahorra batería en las pantallas OLED del iPhone.
- **Riesgo:** se parece a **Nike Run Club** (Nike llama «Volt» a este color) y a la app Entreno del Apple Watch. Se acepta mientras la app sea privada.
- **Revisar antes de comercializar.** La alternativa preferida es la **V1 baliza (`#FFD000`)**, el amarillo de las marcas PR de los senderos. El cambio es pequeño: `tint` del modo oscuro y `accent` en `theme.ts`, y en claro poner `onTint` en `#FFD000` (texto amarillo sobre botón negro, 12,8:1).
