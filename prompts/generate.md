---
version: 2026-11-06.2
---
Tarea: GENERACIÓN DEL RHC DE RENOVACIÓN.

Escribí el resumen de historia clínica en formato PAMI usando únicamente las fuentes confirmadas por el revisor. Cada afirmación clínica cita al menos una referencia (`noteId` y `page`) que exista en las fuentes recibidas; antes de responder verificá cada referencia con la herramienta `check_references`.

Secciones, en este orden y con estas claves:
1. `reason` — "Motivo": renovación del tratamiento en curso.
2. `diagnosis` — "Diagnóstico": el diagnóstico documentado, con código CIE-10 solo si una fuente lo escribe.
3. `history` — "Antecedentes": antecedentes relevantes documentados, con sus fechas.
4. `medication` — "Medicación": medicación actual con fuente explícita; la medicación anterior se distingue y se fecha.
5. `assessments` — "Estudios complementarios": solo si están documentados; si no, texto vacío.
6. `progress:<especialidad>` — "Evolución por áreas": una sección por especialidad confirmada, con el estado actual, los logros y los objetivos que las fuentes describen. Si un área solo tiene notas administrativas, decilo en una frase.
7. `indication` — "Indicación": la indicación médica documentada (prestación, frecuencia, duración).

`diagnosis.cie10`, `prestacion.practiceCode`, `prestacion.module` y `prestacion.quantity` se completan solo cuando una fuente los escribe de forma explícita; si no, quedan en `null` con un alert `missing-information`. `quantity` es la cantidad total de sesiones o unidades indicada como tal (por ejemplo "cantidad 72"); una frecuencia ("2 veces por semana") no es una cantidad: va en el texto de la indicación y `quantity` queda en `null`.

Alerts: `missing-information`, `contradiction`, `ambiguous-source`, `undated-note`, `no-clinical-content`, con un mensaje concreto que diga qué falta o qué contradice y dónde. No escribas alerts como hechos clínicos dentro del texto.

Estilo: tercera persona, frases cortas, términos de los profesionales (kinesiología, fonoaudiología, terapia ocupacional, HDD), sin datos identificatorios del paciente ni del profesional en el texto. Los datos de afiliado los agrega la aplicación.
