# Sienes RHC assistant

Terms used by Sienes staff, the documentation and the code. Spanish originals are given where staff use them; the English term is the canonical one in code and docs.

## Inputs

**Medexis export**:
The native PDF printed from Medexis for one patient: a header plus the patient's notes. The only production input.
_Avoid_: history file, upload, TXT export

**Header**:
The administrative block of the export: identity, date of birth, coverage, plan, membership.
_Avoid_: patient data, admin block

**Note**:
One dated entry in the history with an author, the author's specialty and free text. Every note is one of: report, progress note, administrative note.
_Avoid_: record, entry, item

**Report** (informe):
A complete periodic or initial report for a specialty or program, such as an initial report or a semester report. The baseline source for a renewal.
_Avoid_: summary, evaluation, assessment

**Progress note** (nota de evolución):
A dated clinical update written by a clinician between reports. Supplements the latest report, never replaces it.
_Avoid_: evolution, nota, update

**Administrative note**:
A note without clinical content: scheduling, absence, paperwork. Never a baseline and never a clinical update.
_Avoid_: absence note (it is one kind of administrative note)

**Specialty**:
The clinical area a note's content belongs to, which may differ from the author's profession.
_Avoid_: area, discipline, service

## Request

**Case**:
One patient's Medexis export together with its confirmed header data, request context, selected sources and draft, living in one tab.
_Avoid_: patient, job, document

**Batch**:
A set of cases processed in one tab, one export per patient.

**Request type**:
Admission or renewal. Changes source selection and wording, not the set of documents produced.
_Avoid_: mode, flow

**Insurer** (obra social, prepaga):
The organization whose portal receives the RHC: PAMI, OSDE, Swiss Medical, Unión Personal, OSTVLA.
_Avoid_: coverage (that is the patient's affiliation), payer

**Coverage**:
The insurer and plan a patient is affiliated with, as shown in the header.

**Cutoff date**:
The latest date, inclusive, whose notes are considered for a case.
_Avoid_: end date, period

**CUD**:
Certificado Único de Discapacidad. Recorded as yes, no or no information; never inferred.

## Output

**RHC** (resumen de historia clínica):
The draft clinical history summary the app produces for one case: sections, portal fields, references and alerts. Reviewed and corrected by staff before use.
_Avoid_: summary, report (a report is an input)

**Source**:
A note selected as evidence for a case's RHC.
_Avoid_: context, input note

**Reference**:
A pointer from RHC content to a source note and page.
_Avoid_: citation, link

**Alert**:
A message to the reviewer about missing, contradictory or ambiguous information, shown with its location. Not an error.
_Avoid_: warning, issue

**Portal fields**:
Insurer-specific values the reviewer copies into the insurer's portal. Only PAMI's are verified.

**Review confirmation** (Revisé el contenido):
The reviewer's explicit statement that enables copying and downloading. Bound to one revision.
_Avoid_: approval, sign-off, signature

**OME** (orden médica electrónica):
The electronic medical order issued later in an insurer's portal. Out of scope for version one.

**HDD** (hospital de día):
A Sienes day-hospital program, for adults or for children and adolescents (infantojuvenil).

## AI layer

**Classify**:
The first AI step: label every note with its kind, specialty and date and flag ambiguities. Selection of sources is then applied by the app.

**Generate**:
The second AI step: produce the RHC from the selected sources and context.

**Prompt module**:
A versioned instruction file the app selects for a case by request type and insurer, assembled into the system prompt.
_Avoid_: skill, rule set, template

**Attempt**:
One request to the AI provider for one step of one case. Retries are new attempts.

**Revision**:
The version counter of a case's content. Edits, context changes and regeneration advance it; late responses from older revisions are discarded.

**Clinical session**:
The period during which clinical data lives in the tab, ended by 30 minutes of inactivity, sign-out, reload or closing the tab.
_Avoid_: login session (managed by the identity provider)

**Edit event**:
Metadata about a manual correction, recorded without clinical content.
_Avoid_: feedback (the optional reason category attached to an edit event)
