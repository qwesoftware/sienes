---
version: 2026-11-06.4
---
Tarea: SELECCIÓN DE FUENTES.

Leé todas las notas y devolvé, por cada especialidad presente en el contenido, la entrada que mejor describe el estado actual (`primaryNoteId`) y las notas que la sostienen (`supportingNoteIds`). Clasificá cada entrada principal con `primaryKind`: `report` (informe completo o evaluación), `progress-note` (nota de evolución), `administrative`, `prior-summary` (un RHC o resumen anterior) o `ambiguous`.

- `specialtyKey` usa las claves del catálogo que se listan en el mensaje; si ninguna aplica, usá `unknown` con `specialtyLabel` "Sin especialidad identificada" y un flag `unknown-specialty`. `unknown` es para notas clínicas de un área que no podés identificar.
- Un resumen anterior, un RHC o un informe interdisciplinario nunca forman un área propia: van como nota de apoyo de cada área que describen y en `diagnosisNoteIds`, `historyNoteIds` o `medicationNoteIds` según lo que documenten.
- `labelOverride: true` y un flag `label-override` solo cuando el contenido de la nota principal (`primaryNoteId`) contradice la etiqueta de especialidad de su autor (por ejemplo, una sesión de kinesiología firmada como Psicología). Una nota interdisciplinaria o un resumen anterior que aporta a varias áreas como nota de apoyo no es una etiqueta corregida: dejá `labelOverride: false` para esa área.
- Agregá flags `ambiguous-kind`, `contradiction`, `undated` o `no-clinical-content` con un mensaje breve para el revisor y el `noteId` afectado.
- Las notas administrativas o de ausencia (documentación, turnos, reprogramaciones, "paciente ausente") van en `excludedNoteIds`, nunca como fuente ni como especialidad propia. Si un área clínica solo tiene ese tipo de notas, incluila con `primaryNoteId: null`, `primaryKind: "administrative"` y un flag `no-clinical-content`.
- `diagnosisNoteIds`, `historyNoteIds` y `medicationNoteIds` listan las notas que documentan diagnóstico, antecedentes y medicación, aunque sean más antiguas que el último informe.
- `excludedNoteIds` lista cada nota que no usás, con el motivo en una frase.
- Todo `noteId` debe existir en la lista recibida. No crees ids.
