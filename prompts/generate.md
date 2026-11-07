---
version: 2026-11-06.3
---
Tarea: GENERACIÓN DEL RHC DE RENOVACIÓN.

Escribí el resumen de historia clínica en formato PAMI usando únicamente las fuentes confirmadas por el revisor. Cada afirmación clínica cita al menos una referencia (`noteId` y `page`) que exista en las fuentes recibidas; antes de responder verificá cada referencia con la herramienta `check_references`.

Secciones, en este orden y con estas claves:
1. `reason` — "Motivo": renovación del tratamiento en curso o, si las fuentes describen un ingreso o una indicación de iniciar, el inicio del tratamiento; decilo tal como está documentado.
2. `diagnosis` — "Diagnóstico": el diagnóstico documentado (líneas "Dx", "Diagnóstico" o la conclusión de una evaluación), con código CIE-10 solo si una fuente lo escribe. El motivo de consulta ("MC") no es el diagnóstico.
3. `history` — "Antecedentes": antecedentes relevantes documentados, con sus fechas.
4. `medication` — "Medicación": medicación actual según la fuente más reciente que la consigne; si una nota anterior indicaba otra dosis o frecuencia, se menciona como anterior con su fecha, sin alert. El alert `contradiction` es para fuentes que se contradicen sin que una sea claramente posterior.
5. `assessments` — "Estudios complementarios": solo si están documentados; si no, texto vacío.
6. `progress:<especialidad>` — "Evolución por áreas": una sección por especialidad confirmada, con el estado actual, los logros y los objetivos que las fuentes describen. Si un área solo tiene notas administrativas, decilo en una frase.
7. `indication` — "Indicación": la indicación médica documentada (prestación, frecuencia, duración).

`diagnosis.cie10`, `prestacion.practiceCode`, `prestacion.module` y `prestacion.quantity` se completan solo cuando una fuente los escribe de forma explícita; si no, quedan en `null` con un alert `missing-information`. `quantity` es la cantidad total de sesiones o unidades indicada como tal (por ejemplo "cantidad 72"); una frecuencia ("2 veces por semana") no es una cantidad: va en el texto de la indicación y `quantity` queda en `null`.

Alerts: `missing-information`, `contradiction`, `ambiguous-source`, `undated-note`, `no-clinical-content`, con un mensaje concreto que diga qué falta o qué contradice y dónde. No escribas alerts como hechos clínicos dentro del texto. Una sección sin contenido documentado queda con texto vacío y un alert `missing-information`; nunca escribas frases como "no consta" o "no se documenta" dentro del texto de una sección (la única excepción es el área con solo notas administrativas del punto 6).

Estilo: tercera persona, frases cortas, términos de los profesionales (kinesiología, fonoaudiología, terapia ocupacional, HDD), sin datos identificatorios del paciente ni del profesional en el texto. Los datos de afiliado los agrega la aplicación.
