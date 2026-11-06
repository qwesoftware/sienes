# Sienes Clinical History Summary Assistant: Master Document

Initial version dated November 6, 2026. Status: functional decisions confirmed; application stack and AI layer decided (ADR-0001, ADR-0002; see stack-recomendado.md), with OpenAI as the preferred candidate provider subject to validation; initial operational parameters recommended, not yet decided, and configurable; production model pending evaluation. Intended for developers. Pending external forms prevent finalizing the field mappings for the other insurers.

The project prepares clinical history summaries (RHC, from the Spanish resumen de historia clínica) and structured data for Sienes staff to review and manually copy into insurer portals. This document is the primary implementation reference; its confirmed decisions take precedence over earlier proposals or research notes. The comprehensive November 6 review clarified the technical workflow in Implementation Details and corrected outdated references in the supporting documents.

## Scope and conditions

- A restricted-access web application for Sienes, based on option 1 of the quote.
- Manual import of Medexis exports, generation of a draft RHC, editing, review, and preparation of fields for copying or downloading.
- Only clinical output: RHC. Treatment plans and initial or semiannual reports are sources or references; generating them as additional documents is outside the contracted scope.
- Insurers identified in the supplied examples: PAMI, OSDE, Swiss Medical, Unión Personal, and OSTVLA. Final fields for the latter four require the forms already requested.
- Standard users and one initial administrator. Both can generate, correct, and download. The administrator's only additional capability is creating and disabling users. No public signup or additional privileges over clinical data. Disabling means preventing access and revoking sessions, not deleting user audit records.
- Individual and batch uploads. Stated reference volume: approximately 800 cases per month. Initial limits: 10 MB and 300 pages per PDF, 20 patients per batch, and 2 concurrent patients; configurable as specified in the operational section.
- Professional review of medical content before use. Equal permissions do not establish a user's clinical qualifications.
- No direct Medexis connection, portal pre-filling, automatic issuance or download of electronic medical orders (OME), email sending, OP management, or expiration tracking.
- The prohibition on retaining patient data supersedes the clinical-document storage included in the original quote. The scope covering multiple insurers and batches must be reflected in the final agreement.

## Inputs

### PDF as the only production input

A native PDF from Medexis medical-history printing was validated; it combines administrative data and clinical progress notes. The sample has 91 pages, with extractable text on every page, weighs approximately 0.47 MB, and contains note headers dated between February 2025 and November 2026. OCR is not required to read its text. This format is confirmed as the only production input in the first version: one file per patient, without TXT, Excel, or screenshots as additional inputs. Missing information is entered manually during the session.

The observed header contains last and first names, DNI (national identity document number), date of birth, age, coverage, plan, and membership details. Notes include date, clinician, specialty, professional registration number, and text. The registration number belongs to the note's author, who is not necessarily the issuer of the future OME. No CUD (disability certificate) field was verified in the header.

The reader must recognize blocks by position and reconstruct notes continuing across pages. Linear extraction may place the header after some progress notes even when it appears first visually. It must distinguish age at export from historical age in a note, and the author's specialty from the clinical area described in the content.

Identity is obtained from the header and displayed for confirmation. If identification is missing or headers identify different patients, the association must be resolved before generation. Names mentioned inside progress notes do not identify the record holder.

The supported format is exclusively the native Medexis PDF shared by the user. Exactly one PDF is accepted per patient; combining additional sources, readers for other layouts, and OCR are not implemented. Verified compatibility applies to the supplied sample; variations in fields and attachments within the same format require technical verification. Text on a page does not prove that all its images or attachments are readable. Scanned, protected, or insufficiently readable PDFs must be rejected with an explanation and instructions to export again from Medexis; an RHC must not be silently generated from incomplete extraction.

### Development and testing materials

The TXT files and screenshots already supplied can be used to build test data without requesting all PDFs again. Selection and generation tests will use fixtures with the same normalized schema produced by the PDF reader. Synthetic variants will test missing information, contradictions, and patient separation.

The six TXT files received contain UTF-8 JSON with the keys Fecha, Texto, Tipo, and Profesional: 1006 records in total, between 2 and 659 per file. These describe the samples, not product limits. Texto contains HTML that must be converted to text or sanitized for testing. Tipo does not reliably identify clinical note type or specialty; these also appear in headers and content. There are no structured administrative fields sufficient to associate each TXT with a patient on their own. Screenshots provide a local reference for that data; contact details, address, and balances are unnecessary for the system's purpose.

Some notes contain links or images whose content is absent from the TXT. These are not treated as read attachments and are not opened automatically. Nor is it assumed that a PDF and TXT for the same patient contain identical notes: period and export settings must match for comparison. The additional adult case without an identified last name is optional for expanding tests and does not block development.

Original files remain sensitive and are used locally in the authorized environment. Versioned fixtures, logs, and CI artifacts must not contain real patient data. Real tests against an AI provider require its data-processing conditions to be resolved first. Converting a TXT and screenshot into a synthetic PDF can test the workflow but does not replace parser validation on real native PDFs. One is already available. Test variations of the same Medexis layout; do not assume each insurer has a different layout or implement additional readers.

### Administrative data

Data is extracted from the PDF header and displayed for review. Manual entry covers missing information and corrections. TXT files, screenshots, and the verified administrative Excel remain research and testing materials, without production readers in the first version. See the [reference administrative export procedure](exportacion-datos-administrativos.md).

The application requests only the data needed for destination fields. Member numbers, identity document numbers, and codes are treated as strings to preserve leading zeros and avoid precision loss. Date of birth allows age to be calculated at the cutoff date, flagging contradictions with ages stated in narrative text. An unspecified CUD status must not be interpreted as no CUD.

In batches, every case must have an explicit association between its sole PDF, administrative data, and result. The application must not infer identity from names mentioned in notes or from files appearing next to each other in a list.

### Request context

The user specifies coverage, cutoff date, and, where applicable, service and request type. Admissions and renewals are included, following the supplied examples. CUD is represented as yes, no, or no information. The client's preliminary response states that insurers are similar and the difference is CUD, but internal confirmation is still pending: implement a common clinical structure without inventing different sections or requirements based on CUD. Its status can be entered manually and remains no information when undocumented. The supplied historical period and all detected specialties are shown before generation.

## Individual workflow

1. Sign in with an authorized account.
2. Upload one patient's native PDF and confirm or complete its header data.
3. Select request context and cutoff date.
4. Validate the files, recognize notes, and propose classification by specialty and note type.
5. Show the sources to be used and flag ambiguities, missing information, unread attachments, and contradictions.
6. Generate a structured draft RHC supported by the available sources.
7. Allow corrections and source review, with dates and authors visible during the session.
8. Confirm the content review and copy fields or download the result as editable Word. For batches, download a ZIP with one Word document per reviewed patient.
9. Release transient data when the session ends or expires by canceling requests, clearing clinical state, and releasing workers and browser object URLs.

The Word template is simple and consistent with the examples, without reproducing signatures or stamps.

Regeneration warns before replacing manual corrections. Users must select Revisé el contenido (I reviewed the content) before copying or downloading. Any subsequent edit or regeneration invalidates that confirmation. It is not a digital signature or issuance of an order. Every correction is recorded through metadata without patient content, as specified in the feedback section.

## Review and editing for nontechnical users

The interface presents three main steps: Cargar PDF (Upload PDF), Revisar resumen (Review summary), and Copiar o descargar (Copy or download). Reading and generation states use brief Spanish messages, visible progress, and clear recovery actions. JSON, tokens, providers, and internal classification details do not appear in the main workflow.

The summary is edited in text fields by section, with understandable clinical headings and a visible action to consult source text and page. Sources appear in an expandable or side panel; users are not required to interpret technical references. Navigation allows reviewing all specialties without losing corrections.

Alerts explain what is missing or which contradiction needs review and where it was found. They are distinct from blocking errors, such as an unreadable PDF or ambiguous identity. The Revisé el contenido confirmation enables copying and downloading; if anything changes, the interface indicates that another review is required. The correction reason is optional and uses a simple selection; categorizing feedback never blocks the task.

Controls must be keyboard accessible, labeled, have visible focus, and use states that do not rely solely on color. Validate ease of use through complete tasks during the pilot, without requiring technical knowledge.

## Batch workflow

Each case maintains independent state, sources, alerts, and results. Users can review cases separately and retry only failed cases. An error in one file must not mix or discard valid results from other cases.

The screen shows progress and allows individual review before use. The combined download is a ZIP with one Word document per reviewed patient. Cancellation stops pending cases and requests abortion of in-flight requests; it does not promise to reverse usage already incurred. Queues, temporary files, or retries must not introduce clinical persistence incompatible with the project's restriction.

## Clinical selection and generation

Confirmed renewal rule: for each specialty present in the documentation up to the cutoff, use the latest complete report as the baseline and supplement it with the latest subsequent note contributing clinical information, if available, respecting the cutoff date. An absence or administrative note does not replace the report or count as a clinical update. If a later note contradicts the report, show both sources and a review alert; the system must not resolve the contradiction independently. If no complete report exists, use the available progress notes and flag the missing report.

The underlying medical history must supply relevant history, diagnosis, and medical indication where applicable; selecting only the latest therapy notes does not guarantee that these data are available. Do not invent diagnoses, doses, scores, frequencies, codes, or plans to fill gaps.

The initial common RHC structure includes reason for consultation, documented diagnosis, current illness and relevant history, medication, tests and assessments, progress across all documented specialties, and documented medical indication. Wording and length follow the supplied examples of good outputs. Pending forms may adjust presentation and destination fields; they do not block this structure or justify inventing clinical requirements.

Generate the draft from available information and show specific alerts so the user can request missing information. Contradictions are presented with their sources for manual resolution. Missing clinical information allows a partial draft; an unreadable file or ambiguous patient association requires correction before processing the case.

Confirmed rule: include all specialties present in documentation up to the cutoff date. A specialty omitted from a historical example is not used as an exclusion filter. Keep older source dates visible, and do not infer that a service remains active or prescribe its continuation merely because its progress is included. If an area has only administrative or absence notes, indicate that no clinical content is available to summarize.

Unconfirmed differences between examples must not become insurer-specific mandatory rules. Do not impose an unspecified clinical age-of-information threshold; show dates for review.

For admissions, use clinical documentation available up to the cutoff to describe the reason for admission, history, initial status, and documented assessments, following the admission examples received. Do not require a renewal progress note or invent missing objectives or plans. Keep the same common structure; request type changes selection and wording, not the set of documents produced.

## Output data and PAMI

During the session, the result must separate patient and coverage data, textual diagnosis and code if documented, service if documented, RHC organized by section, alerts, and references to sources used. The internal representation must distinguish missing, ambiguous, extracted, and user-corrected data.

| PAMI field | Expected source and status |
| --- | --- |
| Member number | PDF header or manual entry. |
| Name, document number, and age | PDF header and date of birth at cutoff; the portal may resolve these from the member number. |
| ICD-10 diagnosis (Diagnóstico CIE-10) | Explicit clinical source and reviewed selection; do not infer a code from symptoms. |
| Procedure, module, and quantity | Medical indication or user-validated selection; do not generalize values from the example. |
| Indicaciones | RHC and progress across all documented specialties; length limits pending. |
| Clinician and registration numbers | Prescriber's context in the portal. A progress note's author is not equivalent to the OME issuer. |

The complete reference OME confirms an output arrangement but does not supply a general catalog of codes, quantities, or services. Mappings for other insurers must not be declared final until their forms are received.

The first version does not include nomenclature catalog search or membership validation against portals. Codes and quantities are editable fields: they are proposed only when explicitly present in a source. If missing, leave them blank with an alert; users may complete them without the application certifying their administrative validity. The prescriber and registration numbers are not required RHC fields and must not be populated from a progress note's author. No ready-to-issue OME is generated.

Copying Indicaciones combines the RHC and its specialty progress sections without repeating the same text. Without a verified portal limit, do not promise that any length will be accepted, do not truncate automatically, and display a character count. Other insurers can receive the common RHC; their exclusive fields must not be presented as a validated form.

Confirmed format: editable Word and per-field copying. For batches, a ZIP of reviewed Word documents. JSON is used internally and as the API contract, without JSON downloads in the first version.

## Privacy and traceability

Clinical files, administrative screenshots, extracted text, identifiers, and clinical results must not be retained in the application's database or persistent storage. This condition must also be checked across logs, queues, monitoring, errors, caches, and processing providers. Deleting the input file is insufficient if another layer retains content.

Data is used transiently during processing and review. Clinical work lives only in tab memory: closing or reloading requires reimporting. Warn before leaving when the browser permits and offer an action to finish and clear the session. The clinical session expires after 30 minutes of user inactivity. Warn 5 minutes before expiration and offer Continuar trabajando (Continue working). Pause the countdown during user-initiated generation; on expiration, cancel pending work and clear transient content. The authentication session is independent and may persist without clinical content. Provider retention, reference cleanup, and in-flight request behavior must be verified before using real patient data; forensic memory erasure or immediate third-party cancellation is not promised.

Instrumentation uses an explicit allowlist of fields. Disable request/response body capture, file-name capture, screen recordings, and session replay.

Technical metrics, error categories, and improvements without patient references may be stored. Do not store original/corrected clinical text pairs by default. Any improvement example must be synthetic or follow an approved procedure that prevents linkage to a patient.

Technical traceability may include application user, random execution identifier, application/instruction/model version, duration, counts, and sanitized error status. It must not serve as a patient history, and identity hashes or file names containing identifiers must not be retained.

Requested downloads remain under the user's control on their device. The final document and interface must make clear that the application is not a medical-record repository.

## Architecture and implementation tasks

The application stack is decided in [ADR-0002](adr/0002-application-stack.md): Next.js and TypeScript, PDF.js in the browser, Neon PostgreSQL with Drizzle, Neon Auth, browser-based Word/ZIP generation, and Vercel hosting. See the detailed architecture in stack-recomendado.md. Direct API integration without Managed Agents; the SDK and agent design are in [ADR-0001](adr/0001-ai-layer-agent-loop.md). OpenAI is the preferred candidate provider, subject to retention, quality, and cost validation. GPT-6 Luna (gpt-6-luna) is the first model to evaluate; it is not yet selected for production. Provider and model are configured behind an adapter so they can be replaced. Integration with Medexis sessions or credentials is not required.

Implementation tasks are: access and administrator-managed user creation/disabling; native PDF reading and header/note reconstruction; administrative association; source classification and temporal selection; structured AI generation; response validation; in-session alerts and source traceability; editing and regeneration; copying and downloads; batch processing; telemetry without clinical content; and data-release controls.

Disabling a user revokes sessions and is checked on the next server request; a request already sent to the provider cannot be reversed. The last administrator cannot be disabled without provisioning a replacement.

Model responses must be validated against a schema. Instructions within notes, attachments, or HTML are treated as data and cannot change the task, activate tools, or order transmissions. Errors must allow retries without exposing clinical content to telemetry.

## Validation and acceptance

Samples include two cases with few medical notes, two with interdisciplinary reports for the period, and two PAMI cases with different historical depth. Six TXT/screenshot pairs were received. The earlier child/adolescent example remains available to expand tests.

Some exports contain an already-written RHC. Separate two tests: generation from primary progress notes, excluding the target summary; and assisted updating of a prior summary. Copying an existing summary does not count as an independent generation test.

Checks must cover factual and numerical fidelity, cutoff date, inclusion of all documented specialties, absences, source age, header ambiguity, missing information, contradictions, unread attachments, identifier preservation, patient separation, partial batch errors, and clinical non-persistence.

Comparison against examples evaluates facts and section coverage without requiring identical wording. Include a change of clinician within the same specialty to verify that it is not treated as a different area.

Receiving and reading files does not constitute clinical validation or a system test: there is no implementation yet. Mandatory technical acceptance criteria are: no patient mixing, no invented clinical facts in test cases, numbers faithful to sources, no copying/downloading without current review confirmation, and verified clinical non-persistence. The Sienes contact validates clinical usefulness and ease of use during the pilot. Success on a sample is not a universal guarantee that AI errors cannot occur.

## Feedback and prompt improvement

Every manual correction produces a logical edit event without persisting original clinical text, new text, diffs, identifiers, or file names. To avoid recording every keystroke, group changes by field on blur or review confirmation, with deduplication and random work-session identifiers that do not identify the patient.

Store section/field, change type (addition, deletion, or modification), prompt version, model/schema version, and timestamp. Distinguish scope using enums: administrative data, context, source selection, or generated content, so a header correction is not attributed to the prompt. AI versions are not applicable if no call has occurred yet. Offer optional reason categories such as omission, incorrect fact, format, wording, or source selection. Without a selected reason, keep the event uncategorized; the system must not invent the reason for an edit. There is no persistent free-text field for pasting clinical text.

This identifies which sections fail and why, but cannot reconstruct a specific clinical correction. To improve instructions, review aggregates and write general rules or synthetic examples. Test proposals against fixtures and publish a new prompt version; user changes do not automatically modify the global prompt. Prompt administration belongs to the development process and does not expand the permissions of the Sienes user administrator.

## Sienes pilot period

After the initial delivery, run a two-week pilot with a midpoint review and a closing review. Coordinate the contact person and dates before the pilot begins. Record defects, prompt changes, and checks without retaining patient content. Review correction metrics, extraction failures, missing information, and functional feedback without capturing clinical content. The pilot does not replace technical controls or authorize external processing without verified privacy conditions.

## Recommended operational configuration

These are initial values, not constants scattered throughout the code. Define them in a typed configuration module, populated from environment variables and validated at startup. Changing them must not require logic changes; depending on hosting, a new deployment may be required. Publish only nonsensitive values to the browser, and enforce authoritative limits on the server. The Sienes administrator does not receive a technical settings screen.

| Parameter | Initial value | Behavior |
| --- | --- | --- |
| PDF_MAX_BYTES | 10000000 | 10 decimal MB per PDF; reject an oversized file before reading it. |
| PDF_MAX_PAGES | 300 | Maximum per PDF; do not silently trim pages. |
| BATCH_MAX_PATIENTS | 20 | One PDF per patient. Detected duplicates are reviewed, not merged. |
| BATCH_CONCURRENCY | 2 | Concurrent cases per tab; the server also limits abuse and aggregate concurrency. |
| GENERATION_TIMEOUT_MS | 120000 | Maximum time per generation attempt. The hosting timeout must allow it and be adjusted alongside this value. |
| GENERATION_MAX_RETRIES | 1 | One automatic retry in addition to the initial attempt, only for transient failures. |
| CLINICAL_IDLE_TIMEOUT_MS | 1800000 | 30 minutes of inactivity; distinct from the login session. |
| CLINICAL_IDLE_WARNING_MS | 300000 | Warning 5 minutes before expiration. |

Transient-error retries use backoff, respect Retry-After when present, and are canceled when leaving or canceling. Do not retry invalid files, exceeded limits, or permanent errors. A case's maximum duration may include two attempts and backoff; do not present 120 seconds as a total case limit. Discard late responses from canceled attempts so they cannot overwrite newer edits or review confirmation.

The model is configured on the server, initially GPT-6 Luna for evaluation. Record the actual model and prompt version used. There is no automatic model fallback. Payload and token limits need their own limits validated against the hosting platform and model; the local file's 10 MB limit is not the permitted API request size.

## Contracts and environments

Implement separate Zod contracts for sources, results, and telemetry. Sources include administrative identity in memory, coverage/CUD, and notes with dates, author, specialty, type, and pages; results include sections and all documented areas, portal fields, references, alerts, and review state; telemetry accepts only predefined metadata. Do not reuse the clinical object as a technical event body.

Separate development, testing, and production, with independent credentials and server-only secrets. CI and versioned fixtures use synthetic data; the supplied real files remain outside the repository and automated artifacts. When initializing the repository, explicitly exclude the existing clinical-documentation and export directories, temporary files, and secrets; do not add the entire workspace by default. Provision the first administrator through a deployment procedure without public signup. The developer specifies endpoints, migrations, and token limits when implementing these contracts, respecting the prohibition on persisting clinical data.

## Implementation details

### Reading, classification, and source selection

Reconstruct the PDF locally into notes with a random session identifier, recorded date, narrative date if present, author, specialty, text, and pages. A repeated header for the same record holder does not create another patient. Incompatible headers block the case; a manual name correction must not automatically bypass actual patient mixing. Each note's membership in its file remains fixed. Do not perform external searches or open attachment links.

Classification precedes temporal selection. The parser identifies notes using the Medexis layout and normalizes headers through a versioned catalog of specialty names and aliases. It must not determine that a note is a complete report based on length. A first structured call to the AI adapter classifies notes as complete report, clinical progress note, administrative/absence, prior summary, or other/ambiguous, and assigns the described areas. A complete report is a report or assessment describing the clinical status of an area or period, following the supplied examples, rather than an isolated session note; if the distinction cannot be made, mark it ambiguous. This call also processes clinical data and is subject to the same retention restrictions. An interdisciplinary note may contribute to multiple areas through references to the same text, without being duplicated as a document.

Distinguish the author's area from areas described in the content. If an area cannot be resolved, retain it as Sin especialidad identificada (No specialty identified) with an alert; do not discard it or assign one arbitrarily. Users can correct classification or selection in the optional source panel using understandable labels. Show ambiguous types before generation, without automatically converting a progress note into a complete report. Users are not required to manually reclassify every note.

The application applies the confirmed temporal rule to that classification and displays proposed sources. A second call generates the RHC using only selected sources and relevant clinical context. The contract separates these steps so the AI does not silently decide which history to ignore. Do not add a call per specialty or split the history into chunks without an additional evaluated strategy. Count both calls and their retries when measuring cost and latency.

Interpret the cutoff as an inclusive calendar date in America/Argentina/Buenos_Aires; default to the current day and allow changes. Use the recorded date for sorting and filtering; if the text states another date, retain it and flag the discrepancy. Do not automatically include a note without a reliable date in a historical reconstruction. Use document order as a technical tiebreaker; if it changes clinical selection and no reliable time is available, show both sources and the ambiguity.

History and diagnoses may come from notes older than the latest report. Preserve their dates. Do not present older medication as current treatment without support; distinguish previously documented medication from current medication supported by an explicit source, and alert when current status is unknown. The latest progress note does not erase incompatible report data or become a new prescription on its own.

### Result validation and edits

The generated result contains sections with references to source identifiers and pages that exist in the case. The server checks the schema, valid identifiers, and mandatory references for clinical statements. Numerical checks compare values against referenced sources but do not by themselves certify clinical meaning: semantic fidelity is evaluated through cases and human review. An invalid response must not be presented as a validated draft or repaired by inventing data; allow an explicit new attempt. There is no automatic retry for semantic or schema errors.

Each case has a content revision that changes when administrative data, context, sources, or clinical text is edited. Changing context or sources invalidates the draft for copying/downloading until regeneration; confirm before discarding edits. Changing only the text allows it to be kept and reviewed again. Confirmation is tied to the current revision, and every application copy and download button checks this condition. This does not attempt to prevent manual text selection or control the operating system clipboard.

Automatic references for an edited section remain available as draft sources but are shown as supporting evidence pending review; user-added text is not automatically attributed to them. Confirming review accepts edited content under the reviewer's responsibility, without presenting it as reverified by AI. Alerts are not inserted as clinical facts in Word: they appear in the interface and, when information is missing, in a separate pending-review section of the document.

Review is managed per case. The ZIP includes only cases with current review confirmation, identifies excluded cases, and does not confirm the others in bulk. Downloaded file names may identify patients for local use; they are not sent to telemetry. Empty sections are not automatically filled with statements asserting normal findings or no relevant history.

### Requests, states, and cancellation

Separate clinical analysis and generation operations, technical events, and user administration. Clinical endpoints receive a single case, return its result in the same request, and never offer subsequent server-side recovery. The server-bound contract contains necessary text and references, context without administrative identifiers, and versions; administrative identity stays in the browser. The local state schema is broader than the AI-bound schema and must not be serialized wholesale for convenience.

Per-case states are reading, confirmation required, analyzing, ready to generate, generating, draft, reviewed, error, or canceled. Each case maintains a revision and each request an attempt identifier. Canceling, deleting, clearing, expiring, or regenerating invalidates the previous attempt. Only a response matching the current attempt and revision can update the case. Feedback failures do not delete the draft or block downloads; notify the user if an event could not be recorded and retry only the sanitized event.

The 120-second limit and transient-error retry apply to each analysis or generation call, not the complete two-stage workflow. The browser coordinates the retry through a new HTTP attempt so a function is not kept open across two timeouts and backoff. Disable hidden SDK retries. Concurrency is counted by case throughout the workflow; the server also limits calls at each endpoint. A timeout does not prove the provider stopped execution; single billing or exactly-once processing is not promised.

Configuration adds separate limits for HTTP body size, input/output tokens, rate, and per-user/global concurrency. Document and test effective values before the pilot, accounting for both stages and the selected model. If text exceeds the budget, explain the limit and request an export for a shorter period; do not silently summarize or truncate it to make it fit. Preliminary analysis must not receive content after the cutoff. Clinical requests and responses use Cache-Control: no-store; they are not stored in persistent query caches or included in URLs, traces, or error messages.

Clinical-session expiration applies to the entire tab, including reviewed cases and the queue. Only user activity resets the timer; polling, progress, and telemetry do not. The pause for automatic processing lasts while clinical calls or bounded retries remain active; a hung request must not pause it indefinitely. Signing out cancels and clears local work. A disabled account is detected when checking the session and before each sensitive request; notify and clear on detection without promising immediate remote clearing of another disconnected tab.

Administration uses individual invitation or activation and the identity provider's account-recovery flow, without shared credentials. No role with special clinical permissions is added. Administrative endpoints enforce server-side authorization and validation; feedback endpoints accept only enums and bounded metadata, without free-text specialty names or unsanitized provider error messages.

### Build order and release conditions

First implement contracts, the parser, and the complete workflow with mocked AI and synthetic fixtures. Then integrate the adapter and evaluate classification and generation separately. A pilot using real patients requires compatible AI and hosting retention conditions, tested restricted access, effective limits, non-persistence controls, and technical acceptance on available samples beforehand. Model selection is not based solely on price.

Required tests include incorrect or ambiguous classification, interdisciplinary notes, admission versus renewal, inclusive cutoff date, undated notes, historical medication, AI responses with nonexistent references, administrative corrections after review, late responses after cancellation, timeout at each stage, rejection of disabled users, and feedback-recording failures without loss of work. These are checks to implement, not results already obtained.

## Remaining technical checks

1. Implement the stack in the [detailed architecture](stack-recomendado.md), validate OpenAI as the preferred candidate provider, and evaluate GPT-6 Luna first, measuring quality, latency, retention, and cost before fixing the production model. The Anthropic Managed Agents evaluation is documented there; it is not recommended under the current policy.
2. Resolve AI provider retention conditions and configure hosting without request/response bodies or clinical content in logs.
3. Measure behavior under the recommended initial limits and adjust their configuration if required by samples.
4. Specify the API contract, normalized schema, persistent schema without patients, and session/authorization policy.
5. Verify representative native PDFs and attachment coverage. Downloading every history again is not required to begin testing.

## External dependencies

- Client confirmation about insurer similarity and CUD differences. Forms remain pending for specific fields; proceed with the common structure and verified PAMI mapping, without inventing specific requirements.
- Contact person and dates for the two-week pilot, with midpoint and closing reviews.

The clinical structure preserves documented diagnosis, history, medication, and medical indication, updates all specialties, and follows the supplied examples as the expected-output reference. These decisions do not need to be asked again. Historical test cutoff dates, source handling, and note classification are engineering specifications, not additional client questions.
