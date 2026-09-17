# REDES · Dashboard de Inversión Pública V4

Versión preparada para GitHub Pages.

## Cambios principales de V4

- Gráficos históricos interactivos: al pasar el mouse o tocar/clic en un año se muestran PIM, Devengado y Avance.
- Selector de periodo en la ficha regional: **Todo 2017–2026** o un año específico (2017…2026).
- Al elegir un año, los KPI de GORE, municipalidades, municipalidad seleccionada y las tablas cambian al año elegido; el gráfico histórico 2017–2026 permanece visible.
- En **Mapa del Perú**, la región elegida se resalta, el GeoJSON hace una transición de zoom y mueve el foco hacia la izquierda.
- La ficha lateral del Mapa del Perú muestra la silueta correspondiente a cada departamento.
- Se incorporaron siluetas locales para todos los departamentos como respaldo visual, incluida la nueva imagen de Lambayeque.
- Si una capa GeoJSON tarda o no está disponible, nunca queda un espacio vacío: se mantiene la silueta local y los selectores siguen funcionando.

## Datos

Fuente presupuestal: MEF – Consulta Amigable (Mensual), corte 31 de agosto de 2026.

- Histórico: `historico_2017_2025_consulta_amigable.csv`
- 2026: `historico_2026_consulta_amigable.csv`
- Funciones REDES 2026: `funcion_municipalidades_redes_2026.csv`
- Proyectos REDES 2026: `proyectos_municipalidades_2026.csv`

La auditoría V4 está en `data/audit_v4.json`. Se contrastaron 19,089 filas presupuestales contra los datos que alimentan el dashboard: 18,839 registros municipio-año y 250 registros GORE-año, con **0 diferencias**. Los 250 agregados departamento-año de gobiernos locales también tienen **0 diferencias**. Los 19,089 registros tienen `Validacion_avance = OK`. El control histórico 2026 está completo y los controles de funciones/proyectos de las entidades REDES usadas por el dashboard no presentan pendientes.

## Cartografía

La navegación interactiva usa GeoJSON administrativo por UBIGEO. Las siluetas PNG son respaldo visual y no reemplazan al GeoJSON interactivo.

## Publicar en GitHub Pages

1. Subir **el contenido descomprimido** de este ZIP a la raíz del repositorio.
2. GitHub → **Settings** → **Pages**.
3. `Deploy from a branch` → `main` → `/(root)` → **Save**.

No subir el ZIP como único archivo: GitHub Pages necesita `index.html` y las carpetas del proyecto en la raíz.


## V5
- Selector de año sin la opción "Todo 2017–2026".
- Año predeterminado: **2026 · hasta agosto**.
- La serie gráfica histórica 2017–2026 se mantiene siempre visible y resalta el año seleccionado.
- Corrección del centro de la rueda (logo Rd).
- Exportación PNG corregida con estilos SVG embebidos.
- Lima se separa en **GORE Lima / Lima Provincias** y **Lima Metropolitana**.
- Auditoría contra `MEF_INVERSION_PUBLICA_CONSOLIDADO_2017_2026.xlsx`: 260 registros GORE-año y 18 839 registros municipalidad-año, sin diferencias en PIM, Devengado, Avance y Por ejecutar.
