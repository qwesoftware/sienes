# Medexis Administrative Data Export

Verified on November 6, 2026 using the account authorized for the review. This note records the navigation path and schema without copying patient data. It is a research record: the only approved production input is one native Medexis PDF per patient, as specified in the master document. No XLSX reader will be implemented.

## Verified procedure

Medexis interface labels are preserved in Spanish so the steps match the actual application.

1. From the Medexis home screen, open the module with the bar chart icon: Estadísticas - Reportes.
2. In the REPORTES tab, select the Pacientes module.
3. Under Concepto, select LISTADO PACIENTES.
4. Select Solo under Cobertura and choose the desired insurer. Todas is also available but was not used for this test.
5. Click Procesar and wait for the download. The application displays Consulta finalizada exitosamente and Archivo generado exitosamente.

The test filtered by PAMI downloaded an XLSX file named ListadoPacientes, with a worksheet named Listado pacientes. The actual file was inspected, rather than relying solely on the success message. Row 4 identifies the selected coverage and row 5 contains the headers.

## Observed columns

Original headers are preserved below, with English meanings for reference.

| Column | Original header | Meaning |
| --- | --- | --- |
| A | Tipo documento | Document type |
| B | Documento | Document number |
| C | Número historia clínica | Medical record number |
| D | Apellido | Last name |
| E | Nombre | First name |
| F | Sexo | Sex |
| G | Fecha nacimiento | Date of birth |
| H | Domicilio | Address |
| I | Localidad | City/locality |
| J | Celular | Mobile phone |
| K | Teléfono fijo | Landline |
| L | Email | Email |
| M | Cobertura | Insurer/coverage |
| N | Plan | Plan |
| O | Numero de afiliado | Member number |
| P | Tipo IVA | VAT category |
| Q | Fecha carga | Entry date |
| R | Usuario carga | User who entered the record |

Both PAMI reference cases were found with document number, medical record number, name, date of birth, coverage, and membership details. The member number is stored as text in those rows. Not every row in the list has complete membership details: missing-information alerts remain necessary.

## Application to this project

After validating the native PDF supplied by the user, one PDF per patient containing the administrative header and progress notes was confirmed as the sole input. Combining clinical TXT and administrative XLSX was investigated and excluded from the production workflow to simplify operation and avoid associations between files. The clinical JSON reviewed has no document-number or medical-record-number keys. These materials are reused only locally for authorized research and testing.

The filtered list contains historical patients and does not automatically represent the active population due for renewal. Only the necessary cases and columns should be processed. Address, contact, VAT, and audit fields are not needed for the currently identified PAMI fields and should not be sent to AI.

The XLSX has no columns for CUD (disability certificate), ICD-10 diagnosis, procedure, module, or quantity. These values must come from other documented sources or a selection reviewed by the user.

The file and its rows are not imported into the application or turned into a persistent patient directory. The local download used for this check remains in Downloads; the directory was not copied into the project.

## Alternatives and review limitations

The same selector includes PACIENTES EN TRATAMIENTO, but that export was not generated and its schema was not verified. It can be investigated if filtering activity by period becomes necessary.

The medical history print function has a Unico encabezado option, but an attempted sample print returned Ha ocurrido un error al imprimir la historia clínica. That attempt did not validate printing in the browser. The user subsequently supplied a native PDF generated through that workflow, and it was confirmed to contain an administrative header and progress notes with extractable text across its 91 pages. The PDF was confirmed as the sole input; variations of the same layout and attachment coverage remain to be checked.

Only the PAMI administrative download was verified. The filter allows other insurers, but their files and contents must be checked before claiming full compatibility.
