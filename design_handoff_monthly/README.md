# Handoff: Portafolio de Educación en Casa (Florida) — versión app

## Qué es esto

Un portafolio de home education de Florida (Estatuto 1002.41) para **Sofía Ramírez**,
madre **Ana Ramírez**, condado de **Broward**, año escolar **2025–2026**.

Hoy existe como dos documentos HTML imprimibles que se llenan en el navegador y se guardan en
`localStorage`. El objetivo de este handoff es **convertirlo en una app real con Supabase**:
login, base de datos, varios hijos, varios años escolares, subida de muestras de trabajo,
y exportación a PDF para entregar al distrito o al evaluador.

## Importante sobre los archivos de diseño

Los archivos dentro de `design/` son **referencias de diseño hechas en HTML** — prototipos que
muestran el aspecto y el comportamiento buscados. **No son código de producción para copiar tal cual.**
La tarea es **recrear estos diseños en un stack real** siguiendo sus patrones. Si no hay codebase
previo, usa el stack recomendado más abajo.

Los `.dc.html` son componentes de un runtime propietario (`support.js`): ábrelos en el navegador
para ver el diseño, y lee el marcado para sacar estructura, medidas y textos exactos. **No portes
`support.js` ni `doc-page.js` al proyecto nuevo** — reimplementa la paginación con CSS de impresión.

## Fidelidad

**Alta fidelidad (hifi).** Colores, tipografía, espaciados y textos son definitivos. Recréalo
pixel a pixel. Todos los valores están en la sección Design Tokens.

## Stack recomendado

- **Next.js 15 (App Router) + TypeScript**
- **Supabase**: Postgres + Auth (magic link) + Storage + RLS
- **Tailwind CSS v4** con los tokens de la sección Design Tokens mapeados a variables CSS
- `@supabase/ssr` para sesión en server components
- Impresión: CSS `@page` + una ruta `/print/[schoolYearId]` que renderiza el año completo
- Sin librería de estado global; server components + server actions bastan

## Pantallas

### 1. Cover / Portada (`/students/[id]/years/[year]`)
Retrato tamaño carta. Fondo rosa pálido `oklch(0.955 0.028 350)`; dentro, marco redondeado de
10px con borde 1px `oklch(0.72 0.115 352)`; dentro de ese, un segundo marco 6px con borde
`color-mix(in srgb, oklch(0.72 0.115 352) 38%, transparent)` y fondo `#f3f2f2`. Todo centrado.

- Kicker: `Florida Statute 1002.41 · Broward County` — 9.5px, letter-spacing 0.24em, uppercase, rosa.
- H1: "Home Education Portfolio" — Cormorant Garamond **italic** 400, 60px, line-height 1.02.
- Ornamento: dos filas hairline rosa con dos rombos (7px rotados 45°) y un punto (5px) al centro.
- "School Year 2025–2026" — Cormorant 27px, color `oklch(0.5 0.115 352)`, cifras tabulares.
- **Foto del estudiante**: círculo de 2.5in con padding 9px y anillo rosa; subida de imagen
  (en la app: Supabase Storage bucket `portfolio-photos`, recorte cuadrado, drag & drop).
- Campos Student y Parent: input centrado, Cormorant italic 24px (student) y 16px (parent),
  borde inferior 1px.
- Nota legal: "One portfolio may be used for more than one child in the same family…" 11.5px.
- Caja "This book belongs to me" — textarea de 1.15in, borde rosa 40%, radio 8px, fondo rosa pálido.

### 2. Portada del expediente (`checklist`)
Campos From / To / For student(s) y dos listas de checkboxes:
- **Obligatorio por ley**: log of educational activities · titles of materials · samples of work ·
  evidence of educational progress commensurate with ability.
- **Recomendado por el FL DOE (no obligatorio)**: Letter of Intent · annual evaluation.
Pie: aclaración de que el Letter of Intent se hace una sola vez y que los distritos no pueden
añadir requisitos.

### 3. Datos del niño
Nombre completo, fecha de nacimiento, fecha del Letter of Intent (+ nota explicando que su mes y
día marcan el vencimiento anual de la evaluación), nombre del padre, dirección, ciudad, FL, ZIP,
y un área opcional de notas (necesidades especiales) con fondo de renglones.

### 4. Log mensual — ×12 (agosto 2025 → julio 2026) — **la pantalla central**
Encabezado: kicker "Log of Educational Activities", "School year 2025–2026", H2 con el mes en
Cormorant italic 36px, input Student, input "Hours or notes".

Cuadrícula: `grid-template-columns: 1.35in repeat(31, 1fr)`, borde 1px `--color-divider`,
radio 4px, overflow hidden.
- Fila de encabezado: fondo `var(--color-accent-100)`, números 1–31 a 8px, cifras tabulares.
- Filas (26px de alto): **Language Arts**, **Mathematics**, **Music**, y dos filas con input
  libre para otra materia. Cada celda: checkbox de 9px, `accent-color` dorado, clic para marcar.
- Debajo: "Titles of Reading Materials" + textarea con fondo de renglones (23px/24px).
Pie: "Home Education Portfolio · Broward County, Florida" y el mes.

### 5. Notas del mes — ×12
Dos textareas con renglones: "Field trips, special events & educational activities" y
"Accomplishments this month". Pie recordando guardar muestras de trabajo.

### 6–8. Formularios legales
**Notice of Intent**, **Home Education Program Transfer Request**, **Notice of Termination**.
Cada uno con su fecha efectiva, condado, datos del estudiante y del padre, el párrafo legal
justificado (texto exacto en el HTML), línea de firma y pie con la referencia al FL DOE.
En la app deben poder generarse en PDF por separado, ya rellenados desde la base de datos.

### 9. Notas adicionales
Una hoja con textarea a renglones.

## Interacciones

- **Autosave**: cada cambio de input/checkbox se guarda con debounce de 400ms; indicador
  "Guardando… / Guardado HH:MM". Optimistic UI: la marca se pinta al instante.
- **Offline**: cola en IndexedDB; al recuperar conexión se sincroniza. Es un registro legal —
  no se puede perder un mes por una caída de red.
- **Exportar / importar copia**: descarga JSON de todo el año e importación desde archivo.
- **Imprimir / PDF**: una página por hoja, sin cabecera del navegador (`@page { margin: 0 }`),
  los placeholders no se imprimen, la barra de herramientas se oculta.
- **Cruzar días inexistentes**: en meses de 30, 29 o 28 días, las columnas sobrantes se muestran
  tachadas y deshabilitadas (hoy se hace a mano).
- **Importar reporte de Time4Learning**: ver sección aparte.

## Modelo de datos (Supabase)

El esquema completo está en `supabase/schema.sql`, con RLS. Resumen:

- `profiles` — el padre/madre (1:1 con `auth.users`).
- `students` — un hijo. Varios por cuenta (el portafolio es familiar).
- `school_years` — año escolar por estudiante (`2025-2026`, fechas de inicio y fin).
- `subjects` — materias por año, ordenadas (Language Arts, Mathematics, Music, + libres).
- `activity_log` — **una fila por (materia, día marcado)**. Es el corazón del portafolio.
- `reading_materials` — títulos por mes.
- `monthly_notes` — excursiones y logros, uno por (año, mes).
- `work_samples` — muestras de trabajo: archivo en Storage + materia + mes + descripción.
- `legal_forms` — Notice of Intent / Transfer / Termination, con `data jsonb` y fechas de envío.
- `evaluations` — evaluación anual: evaluador, fecha, documento.
- `imports` — reportes de curriculum importados, con su JSON crudo para auditoría.

Reglas de negocio que la app debe respetar:
1. El vencimiento de la evaluación anual = mes y día del `letter_of_intent_date`, cada año.
2. El portafolio se conserva **2 años** y debe poder mostrarse con 15 días de aviso.
3. Un `Transfer Request` conserva la fecha aniversario original; no requiere evaluación.
4. Un `Notice of Termination` exige evaluación final dentro de los 30 días.
5. Mínimo **2 títulos de lectura** en el año para cumplir el requisito de "titles".

## Importador de Time4Learning

La madre exporta un PDF de reportes de Time4Learning. Es un PDF
**escaneado (imagen)**, sin capa de texto: hay que pasarlo por OCR o pedir el CSV/export de la
plataforma. Del reporte se sacan filas `{ actividad, fecha, hora, score, duración }` agrupadas por
`Chapter: … (Math, K)` / `(Language Arts, K)`.

El importador debe:
1. Mapear el curso del capítulo a una materia (`Math` → Mathematics, `Language Arts` → Language Arts).
2. Insertar una fila en `activity_log` por cada día distinto con actividad.
3. Proponer los títulos de capítulos e historias como `reading_materials` del mes.
4. Proponer un resumen de logros por mes en `monthly_notes.accomplishments`.
5. Guardar el crudo en `imports` y dejar todo **editable** antes de confirmar.

Datos ya extraídos del reporte de ejemplo (01/01/2026 – 27/07/2026, Kindergarten), que sirven
de test fixture:

| Mes | Language Arts | Mathematics |
| --- | --- | --- |
| Enero 2026 | 8, 14, 18, 19, 22, 26, 28, 29 | 14, 18, 22, 26, 29 |
| Febrero 2026 | 2, 4, 5, 13, 18, 19, 23 | 2, 13 |
| Marzo 2026 | 2, 3, 18, 23, 24 | 2, 3, 18, 24 |
| Abril 2026 | 20 | — |
| Mayo 2026 | 4 | 4 |
| Junio 2026 | 2 | — |

Totales del año: 30 actividades calificadas (98% promedio), 5 quizzes (84%), 38 no calificadas.
Promedios por curso: Language Arts 98%, Math 88%.

## Design Tokens

Fuente completa: `design/_ds/classical-.../styles.css`. Los usados:

**Color**
- `--color-bg` #f3f2f2 · `--color-surface` #eae9e9 · `--color-text` #201f1d
- `--color-accent` #b68235 (dorado; se usa como **trazo**, nunca como relleno grande)
- `--color-accent-100` (tinte cálido claro) para encabezados de tabla y cajas
- `--color-accent-700` para texto en acento a tamaño de párrafo (contraste)
- `--color-divider` `color-mix(in srgb, #201f1d 16%, transparent)`
- **Rosa de la portada** (único lugar): fondo `oklch(0.955 0.028 350)`, trazo `oklch(0.72 0.115 352)`,
  texto `oklch(0.5 0.115 352)`

**Tipografía**
- Títulos: `"Cormorant Garamond"`, pesos 400 y 600. Los display van en 400 e **itálica**.
- Cuerpo: `"Lora"` 400/600. Nada de negritas fuertes; el énfasis es itálica.
- Escala usada: display 60 · H2 36–38 · H3 18–21 · cuerpo 12.5–14 · nota 10.5–11.5 · kicker 9–9.5
  (uppercase, letter-spacing 0.16–0.24em)
- Cifras tabulares (`font-variant-numeric: tabular-nums`) en fechas, números de día y tablas.
  El texto corrido conserva las cifras normales.

**Otros**
- Radio: 4px general; 8px en cajas de notas; 10px en el marco de la portada.
- Sombras: apenas perceptibles (`--shadow-sm`). Nada de sombras marcadas.
- Página: carta vertical. Márgenes 0.7in × 0.75in (0.5in × 0.45in en las hojas de log).
- Reglas hairline de 1px como separadores; **nunca** bloques de color rellenos.

**Reglas del sistema visual**: editorial, tipo libro. Color como trazo (bordes, reglas,
subrayados), no como relleno. Botones con borde de 1px sobre transparente, jamás rellenos.
Foco de teclado: `outline: 2px solid var(--color-accent); outline-offset: 2px`.

## Assets

- Foto de portada: la sube la usuaria (hoy es un placeholder). En la app va a Storage.
- Iconos: Lucide.
- Fuentes: Cormorant Garamond y Lora desde Google Fonts.
- El paquete original de FLHomeschoolEvaluations.com (fuera del repositorio, ver más abajo)
  del que salió la estructura. Sirve como referencia de contenido legal; **no copiar su diseño**.

## Archivos de este bundle

```
design/Home Education Portfolio 2025-2026.dc.html   El portafolio (31 páginas)
design/Guia para llenar el portafolio.dc.html       La guía en español (6 páginas)
design/_ds/classical-*/styles.css                   Tokens y clases del sistema visual
design/doc-page.js, image-slot.js, support.js       Runtime del prototipo — NO portar
supabase/schema.sql                                 Esquema + RLS listo para aplicar
PROMPT.md                                           El prompt para pegar en Claude Code
.env.example                                        Variables de entorno
```

## Los documentos reales

El reporte de Time4Learning y el paquete original del portafolio son documentos de una menor
y **no viven en este repositorio**, que es público. Están fuera de él, en la máquina de quien
lo mantiene, y `design_handoff_monthly/reference/` está en `.gitignore` para que no vuelvan a
entrar por descuido. Los datos reales viven en Supabase, detrás de RLS y en buckets privados.
