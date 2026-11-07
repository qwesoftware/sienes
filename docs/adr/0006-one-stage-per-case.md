---
status: accepted
---

# Workspace: a queue of cases, one stage at a time

On November 7, 2026 the owner rejected the workspace as unintuitive: every step stacked on one long page, two upload buttons, an always-visible batch panel and a "Casos" tab with nothing behind it. We decided on a left queue of patients, each showing what it needs next, and one stage per case on the right (Datos, Fuentes, Revisar, Copiar), with the main action always in a bar at the bottom. Confirming the data now starts the next thing: the next case to confirm, the batch when it was the last one, or the analysis of a lone case, and the button says which (`afterConfirm` in `src/case/stage.ts`). The separate "Analizar fuentes" click only remains as the retry after a failure or cancellation. The sources of the section being reviewed show in a side panel, with its 1 to 5 rating, instead of chips and a rating row per section.

## Consequences

- An AI call now starts from "Confirmar y analizar" or "Confirmar y procesar N"; no call starts before the data is confirmed, and it can be canceled.
- The combined Indicaciones text appears only in the Copiar stage: it repeats the sections, so reviewing it twice adds nothing.
- Usuarios and Cambiar contraseña live in the account menu as full navigations, so leaving a tab with cases goes through the browser's warning instead of dropping them silently.
- The ZIP is offered from two reviewed cases; one reviewed case is the Word its own Copiar stage already offers.
