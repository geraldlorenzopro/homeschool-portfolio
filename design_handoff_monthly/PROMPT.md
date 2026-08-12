# Prompt para Claude Code

> Pega esto tal cual en Claude Code, dentro de una carpeta vacía, junto con esta carpeta de handoff.

---

Vas a construir una aplicación web que reemplaza un portafolio de educación en casa de Florida que
hoy existe como HTML imprimible. Todo el material está en la carpeta `design_handoff_portfolio_app/`:
lee **`README.md` completo antes de escribir código** — ahí están las pantallas, los tokens de
diseño, las reglas legales y el modelo de datos.

## Contexto

- Usuaria: Ana Ramírez, madre. Educa en casa a Sofía Ramírez, condado de Broward, Florida.
- El portafolio es un **documento legal** exigido por el Estatuto 1002.41 de Florida. No puede
  perderse información: prioriza durabilidad de los datos sobre cualquier otra cosa.
- La usuaria no es técnica y su idioma es el español. **Toda la interfaz va en español**, pero los
  documentos que se imprimen y se envían al distrito van **en inglés** (así están hoy y así deben
  quedar).

## Objetivo

Una app donde ella entre con su correo, vea a sus hijos, y para cada año escolar pueda:

1. Marcar en una cuadrícula mensual qué materias se cubrieron cada día (1–31).
2. Escribir los títulos de materiales de lectura de cada mes.
3. Anotar excursiones, eventos y logros de cada mes.
4. Subir fotos y archivos como muestras de trabajo, etiquetados por materia y mes.
5. Llenar y generar en PDF los tres formularios legales (Notice of Intent, Transfer Request,
   Notice of Termination) con sus datos ya cargados.
6. Importar un reporte de Time4Learning y que las casillas, los títulos y los logros se llenen solos.
7. Exportar el año completo en PDF, idéntico al diseño actual, para entregarlo al evaluador.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind CSS v4
- Supabase: Postgres, Auth (magic link), Storage, RLS
- `@supabase/ssr` para la sesión

## Pasos

1. **Lee** `design_handoff_portfolio_app/README.md` y abre los dos `.dc.html` en el navegador para
   ver el diseño. Son referencia visual: **recréalos, no los copies**. No portes `support.js`,
   `doc-page.js` ni `image-slot.js`.
2. **Crea el proyecto** Next.js y configura Supabase local (`supabase init`, `supabase start`).
3. **Aplica** `supabase/schema.sql` como primera migración. Verifica que RLS bloquea el acceso
   entre cuentas — escribe un test que lo pruebe.
4. **Construye las pantallas** en el orden del README. La cuadrícula mensual es la pantalla central:
   empieza por ella y hazla perfecta antes de seguir.
5. **Autosave** con debounce de 400ms, UI optimista e indicador "Guardando… / Guardado HH:MM".
   Cola offline en IndexedDB que sincroniza al volver la conexión.
6. **Impresión**: una ruta `/print/[schoolYearId]` que renderiza las 31 hojas con `@page { margin: 0 }`,
   una hoja por página, sin la interfaz. Debe verse igual que el HTML de referencia.
7. **Importador de Time4Learning**: acepta el PDF, extrae las filas, muestra una previsualización
   editable y solo entonces escribe en la base. Usa un reporte de la plataforma como fixture (fuera del repositorio) y los
   datos ya extraídos de la tabla del README como test de regresión.
8. **Siembra** la base con los datos reales de la familia (están en el README y en el HTML) para que
   ella entre y ya vea su año 2025–2026 con enero a junio llenos.

## Detalles que no puedes perder

- Los formularios legales llevan **texto legal exacto**: cópialo carácter por carácter del HTML de
  referencia. Es lo que se envía al superintendente.
- La fecha del Letter of Intent define el vencimiento anual de la evaluación. Muéstralo siempre
  visible y avisa con 60 y 30 días de anticipación.
- Un mes de 30 días debe mostrar la columna 31 tachada y deshabilitada; febrero, las tres últimas.
- El diseño es editorial: color como trazo, nunca rellenos grandes; botones con borde de 1px;
  itálicas en vez de negritas. Los tokens exactos están en el README.
- Un portafolio puede tener **varios hijos** en la misma familia.

## Entregables

- Repo funcionando con `npm run dev` y `supabase start`.
- Migraciones en `supabase/migrations/`.
- Un `README.md` en español explicando a una persona no técnica cómo entrar, llenar el mes y
  exportar el PDF.
- Tests: RLS entre cuentas, el importador de Time4Learning, y el cálculo de la fecha de evaluación.

Empieza leyendo el README del handoff y dime tu plan antes de escribir código.
