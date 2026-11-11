# Sienes RHC assistant

Terms used by Sienes staff, the documentation and the code. Spanish originals are given where staff use them; the English term is the canonical one in code and docs.

## Inputs

**Medexis export**:
The native PDF printed from Medexis for one patient: a header plus the patient's notes for the period the staff member chose, usually about two months. The only production input. Scanned pages inside it are ignored.
_Avoid_: history file, upload, TXT export

**Header**:
The administrative block of the export: identity, date of birth, coverage, plan, membership.
_Avoid_: patient data, admin block

**Note**:
One dated entry in the history with an author, the author's specialty and free text. Its kind is decided from its content; the Medexis type and the author label are hints only.
_Avoid_: record, entry, item

**Report** (informe):
A complete periodic or initial report for a specialty or program, such as an initial report or a semester report.
_Avoid_: summary, evaluation, assessment

**Progress note** (nota de evolución):
A dated clinical update written by a clinician between reports.
_Avoid_: evolution, nota, update

**Administrative note**:
A note without clinical content: scheduling, absence, paperwork. Never a source.
_Avoid_: absence note (it is one kind of administrative note)

**Specialty**:
The clinical area a note's content belongs to, which may differ from the author's profession.
_Avoid_: area, discipline, service

## Request

**Case**:
One patient's Medexis export together with its confirmed header data, insurer, selected sources and draft, living in one tab.
_Avoid_: patient, job, document

**Batch**:
A set of cases processed in one tab, one export per patient.

**Renewal** (renovación):
The periodic request to an insurer to continue a patient's program. The only request type the app produces.
_Avoid_: admission (out of scope), request type

**Insurer** (obra social, prepaga):
The organization whose portal receives the output: PAMI, OSDE, Swiss Medical, Unión Personal, OSTVLA. All receive the PAMI format.
_Avoid_: coverage (that is the patient's affiliation), payer

**Coverage**:
The insurer and plan a patient is affiliated with, as shown in the header.

**CUD**:
Certificado Único de Discapacidad. Recorded as yes, no or no information; never inferred.

## Output

**RHC** (resumen de historia clínica):
The draft the app produces for one case in PAMI format: Indicaciones text by specialty, documented diagnosis, documented prestación, references and alerts. Reviewed and corrected by staff before use.
_Avoid_: summary, report (a report is an input)

**Insurer form** (formulario de obra social):
The portal screen where the RHC is entered: member data, CIE-10 diagnosis, prestación and the Indicaciones box. The PAMI OME form is the general format.
_Avoid_: portal fields, template

**Indicaciones**:
The free-text box of the insurer form that holds the RHC narrative: history, medication, status and progress per specialty.

**Prestación**:
The practice code, module and quantity requested on the insurer form. Proposed only when documented in a source.
_Avoid_: service, procedure

**Source**:
A note selected as evidence for a case's RHC.
_Avoid_: context, input note

**Reference**:
A pointer from RHC content to a source note and page.
_Avoid_: citation, link

**Alert**:
A message to the reviewer about missing, contradictory or ambiguous information, shown with its location. Not an error. Two kinds: a **gap** says the history lacks something (missing information, no clinical content, no sources) and is shown quietly as "No figura en la historia"; a **check** asks the reviewer to verify something (contradiction, number without a source, corrected label, ambiguous source) and is listed under "Para revisar". Only checks ask before confirming the review.
_Avoid_: warning, issue

**Review confirmation** (Revisé el contenido):
The reviewer's explicit statement that enables copying and downloading. Bound to one revision.
_Avoid_: approval, sign-off, signature

**OME** (orden médica electrónica):
The electronic medical order the insurer's portal issues from the form. Out of scope.

**HDD** (hospital de día):
A Sienes day-hospital program, for adults or for children and adolescents (infantojuvenil).

## AI layer

**Select**:
The first AI step: read every note and propose, per specialty, the entry that best describes current status plus supporting notes, with flags for ambiguity and label overrides.
_Avoid_: classify, triage

**Generate**:
The second AI step: produce the RHC from the confirmed sources.

**Prompt module**:
A versioned instruction file the app selects for a case by insurer, assembled into the system prompt.
_Avoid_: skill, rule set, template

**Attempt**:
One request to the AI provider for one step of one case. Retries are new attempts.

**Case runner**:
The module that runs one case's clinical steps (analyze, generate) as attempts through a transport and keeps the stored feedback in sync; the browser store and the local scripts are its adapters.
_Avoid_: orchestrator, service

**Revision**:
The version counter of a case's content. Edits, source changes and regeneration advance it; late responses from older revisions are discarded.

**Clinical session**:
The period during which clinical data lives in the tab, ended by finishing, sign-out, reload or closing the tab. After 30 minutes of inactivity the tab locks and keeps the cases until the password is entered again.
_Avoid_: login session (managed by the identity provider)

**Case id**:
A random identifier under which a case's draft, corrected text and ratings are stored, with nothing that identifies the patient.
_Avoid_: patient id, record id

**Rating**:
The reviewer's judgement of one section of the draft on a 1 to 5 scale (1 unusable, 3 needed corrections, 5 usable as is), stored with the case id.
_Avoid_: feedback (the optional reason category attached to an edit)
