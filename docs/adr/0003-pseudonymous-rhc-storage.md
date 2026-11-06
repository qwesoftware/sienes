---
status: accepted
---

# Store generated and corrected RHC text pseudonymously for feedback

The master document of November 6, 2026 forbade persisting any clinical text, so corrections could only be recorded as metadata, which cannot explain a recurring generation error. We decided on the same day, for the pilot, to store per case the generated draft, the reviewer's final text, per-section and per-field ratings, and the prompt module and model versions, under a random case id with no name, document number, member number, birth date or file name, kept for 12 months and used only to improve prompts and measure quality. The PDF, the extracted notes and the header are never stored, and the working session still lives only in the tab: there is no case history or resume.

## Consequences

- The privacy section of the master document is amended; "no clinical text in the database" becomes "no identifiers and no source material in the database".
- Before real patient data: written confirmation from Sienes, a check of Ley 25.326 obligations for sensitive health data held by a processor, and of the cross-border transfer to Neon's São Paulo region.
- Stored text is reachable only through the development process, not through the application's user interface.
