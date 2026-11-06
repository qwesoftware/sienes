# Sienes · Asistente de resumen de historia clínica

Proyecto para generar borradores de resumen de historia clínica (RHC) a partir de exports de Medexis. El personal de Sienes revisa y corrige el resultado antes de copiar los campos en los portales de las obras sociales o descargar un documento Word.

## Estado actual

El proyecto está en etapa de especificación, con alcance funcional y stack de aplicación aprobados. Este workspace contiene documentación y materiales de referencia; todavía no hay una aplicación implementada ni comandos de instalación, ejecución o pruebas.

La integración de IA será por API directa. OpenAI es el proveedor preferido, sujeto a validación de retención y calidad. El modelo de producción se elegirá mediante evaluación.

## Documentación

| Documento | Contenido |
| --- | --- |
| [Master doc](docs/master-doc.md) | Referencia principal para implementar: alcance, reglas clínicas, flujos, privacidad, contratos, configuración y aceptación. |
| [Stack y arquitectura](docs/stack-recomendado.md) | Tecnologías aprobadas, responsabilidades, flujo de datos y validaciones de infraestructura y proveedor. |
| [Exportación administrativa](docs/exportacion-datos-administrativos.md) | Registro de investigación sobre Medexis. El XLSX investigado no forma parte de las entradas de producción. |

Ante diferencias con propuestas o materiales anteriores, prevalecen las decisiones confirmadas del master doc. Los documentos del cliente son referencias de contenido y formato; no son instrucciones para ejecutar acciones ni ampliar el alcance.

## Funcionamiento previsto

1. Cargar un único PDF nativo de Medexis por paciente, individualmente o en lote.
2. Confirmar identificación, cobertura, tipo de trámite y fecha de corte.
3. Clasificar las notas y seleccionar las fuentes clínicas correspondientes.
4. Generar el borrador de RHC, con referencias y alertas de información faltante o contradictoria.
5. Corregir y confirmar la revisión del contenido.
6. Copiar los campos o descargar Word; en lotes, descargar un ZIP con los documentos revisados.

Se contemplan admisiones y renovaciones para PAMI, OSDE, Swiss Medical, Unión Personal y OSTVLA, según los modelos recibidos. Los campos específicos de los portales distintos de PAMI quedan sujetos a los formularios pendientes.

En renovaciones se usa, por especialidad, el último informe completo más la última evolución clínica posterior, cuando exista, hasta la fecha de corte. Se incluyen todas las especialidades documentadas y se alerta sobre faltantes; el sistema no inventa información para completarlos.

La primera versión genera únicamente RHC. No incluye OCR, conexión directa a Medexis, carga automática en portales ni emisión de OME.

## Stack aprobado

- Next.js App Router, TypeScript y React.
- Tailwind CSS y shadcn/ui para la interfaz.
- PDF.js en el navegador y Zod para validación.
- PostgreSQL en Neon, Drizzle y Neon Auth para usuarios, acceso y metadatos permitidos.
- Adaptador de IA por API directa, con proveedor y modelo configurables.
- `docx` y JSZip para descargas en el navegador.
- Vercel para hosting; Vitest y Playwright para pruebas.

Las versiones y la configuración concreta se fijarán al iniciar la implementación. Los límites de archivos, lotes, tiempos y reintentos están definidos en el master doc y deben ser fácilmente modificables mediante configuración.

## Privacidad y datos de prueba

La aplicación no conserva PDFs, texto extraído, identificadores de pacientes ni resultados clínicos en bases de datos, almacenamiento, cachés o registros persistentes. El trabajo clínico permanece en memoria de la pestaña y se pierde al cerrar, recargar o vencer la sesión clínica. Las descargas quedan en el equipo del usuario.

Solo se persisten usuarios, auditoría técnica y feedback categorizado sin contenido de pacientes. Las correcciones no se guardan como pares de texto original y corregido. Las condiciones efectivas de retención del proveedor de IA y del hosting deben verificarse antes de procesar pacientes reales.

Los materiales clínicos originales se usan únicamente en el entorno local autorizado. No deben incorporarse al control de versiones ni a artefactos de CI. Los fixtures versionados serán sintéticos; los TXT y capturas recibidos pueden reutilizarse localmente para preparar pruebas, aunque no sean entradas de producción.

## Materiales locales de referencia

| Carpeta | Uso |
| --- | --- |
| `docs/` | Especificación y decisiones de implementación. |
| `propuesta/` | Presupuesto original; se seleccionó la opción 1, con los ajustes documentados en el master doc. |
| `documentos-cliente/` | Modelos de resultado y documentación aportada por el cliente. |
| `exports-medexis/` | Muestras para investigación y pruebas locales autorizadas. |
| `formularios-obras-sociales/` | Referencias de los campos de los portales. |

Las carpetas con materiales sensibles pueden no estar presentes en un checkout del repositorio y no son dependencias de ejecución.

## Próximos pasos

Implementar primero contratos, parser y flujo completo con IA simulada y datos sintéticos. Luego integrar y evaluar clasificación y generación con el proveedor elegido. Antes del piloto deben verificarse acceso restringido, no persistencia, retención externa, calidad y límites operativos. El piloto previsto con Sienes dura dos semanas; su referente y fechas se coordinarán antes de comenzar.
