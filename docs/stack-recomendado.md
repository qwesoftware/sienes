# Stack recomendado para el asistente de RHC

Estado: stack de aplicación aprobado por el equipo del proyecto. API directa confirmada; OpenAI preferido sujeto a validación. Modelo de producción pendiente. Fecha: 6 de noviembre de 2026. Audiencia: developer.

## Recomendación

Una aplicación Next.js con TypeScript, React, Tailwind CSS y shadcn/ui. Frontend y API en el mismo proyecto, desplegado en Vercel. PostgreSQL en Neon para usuarios, sesiones, auditoría técnica y feedback sin datos de pacientes. Drizzle para esquema y migraciones. Neon Auth con Managed Better Auth para autenticación; la aplicación limita las operaciones administrativas a alta y deshabilitación de usuarios. Debe impedir el alta pública en servidor y revocar sesiones al deshabilitar una cuenta. No basta ocultar el formulario de registro. Verificar la configuración de cierre de altas y permisos en la integración antes de cerrar su elección.

La elección evita un backend Python separado para un flujo de aproximadamente 800 casos mensuales y conserva contratos de datos compartidos entre interfaz, parser y servidor. Se fijarán versiones estables compatibles y lockfile al iniciar implementación, sin depender de la etiqueta latest en producción.

| Capa | Tecnología propuesta | Responsabilidad |
| --- | --- | --- |
| Aplicación y API | Next.js App Router, TypeScript, runtime Node.js | Pantallas, autenticación, autorización, generación y feedback. |
| Interfaz | React, Tailwind CSS, shadcn/ui | Importación, revisión de fuentes, edición por secciones y administración de usuarios. |
| Lectura PDF | PDF.js, distribuido como pdfjs-dist, en worker del navegador | Extraer texto y posiciones, reconstruir encabezados y notas, mantener referencias a páginas. |
| Validación | Zod | Esquema de fuentes y resultado; validación obligatoria también en servidor. |
| IA | Adaptador de proveedor con SDK oficial; OpenAI API como proveedor preferido condicionado a validación; GPT-6 Luna como primer candidato de modelo | Síntesis estructurada, sin herramientas ni búsqueda externa. El modelo concreto se elige con evaluación, no queda fijado en esta propuesta. |
| Persistencia permitida | PostgreSQL en Neon y Drizzle | Usuarios/perfiles, eventos técnicos, feedback categorizado y versiones. Sin tablas de pacientes, documentos ni resúmenes. |
| Autenticación | Neon Auth, integración Next.js | Identidad y sesiones, con autorización de aplicación en cada endpoint. |
| Descargas | docx y JSZip en navegador | Word por paciente y ZIP del lote, sin guardar archivos en servidor. |
| Pruebas | Vitest y Playwright | Parser, reglas, contratos, autorización, revisión, descarga, lotes y controles de no persistencia. |
| Hosting | Vercel | Web y endpoints; configuración explícita de no cache y registros sin cuerpos clínicos. |

## Flujo de datos

1. El navegador lee el PDF local. No se sube el archivo original a almacenamiento ni al proveedor de IA.
2. PDF.js extrae bloques y posiciones en un worker. La aplicación reconoce al paciente del encabezado y separa las notas. El usuario confirma identidad y cobertura.
3. Se separan los campos administrativos del contenido clínico y se filtra por fecha de corte. Una primera llamada estructurada clasifica las notas y sus áreas; la aplicación aplica la selección temporal y permite revisar ambigüedades. No se usa solo longitud o última fecha para determinar un informe completo.
4. Una segunda llamada genera el RHC desde las fuentes seleccionadas y el contexto clínico relevante. En cada endpoint la API autentica, verifica usuario habilitado, contratos y límites, procesa en memoria y llama al proveedor. La clave nunca se expone al navegador. No hay una llamada por especialidad.
5. Se validan esquema, existencia de referencias y consistencia de cifras; estos controles no certifican fidelidad semántica. La interfaz muestra borrador y alertas; los datos identificatorios se incorporan en el navegador. La revisión humana sigue siendo necesaria.
6. La edición, confirmación de revisión y descarga se ejecutan en la pestaña. No se guardan documentos ni borradores en PostgreSQL, localStorage, sessionStorage, IndexedDB o un service worker.
7. Los eventos de edición y errores pasan por contratos separados que solo admiten metadatos predefinidos; no reciben el objeto clínico completo ni campos libres.

La separación administrativa reduce los datos enviados, pero no convierte automáticamente el texto clínico en anónimo. Se deben eliminar identificadores incidentales y contenido innecesario, sin prometer anonimización infalible. El proveedor de IA seguirá siendo un encargado de procesamiento de contenido clínico.

No se declara que PDF.js nunca ejecute en servidor en pruebas, pero la ruta de producción recomendada realiza la extracción en el navegador. El parser usa posiciones para evitar depender del orden lineal de extracción. Debe tratar documentos y texto como datos no confiables.

## Lotes y ausencia de persistencia

La cola de casos reside en memoria de la pestaña. Cada petición procesa un paciente. La concurrencia inicial aprobada es dos casos por pestaña, configurable y sujeta a límites del proveedor y pruebas. El servidor aplica también límites por usuario y globales, porque el control del navegador se puede eludir.

No se emplean colas durables, almacenes de objetos, vector databases, file search ni trabajos de IA en background que retengan contenido. Cerrar o recargar pierde el trabajo. La cancelación usa AbortController y señales de cancelación, pero no promete detener instantáneamente al proveedor ni evitar costos de solicitudes ya enviadas.

El tamaño del PDF local y el payload enviado al servidor son límites distintos. Vercel documenta un máximo de 4,5 MB para cuerpos de petición/respuesta de Functions. Se fijará un máximo menor para el payload estructurado y límites de tokens; no se enviará el lote completo en una sola petición. Documentos excesivos se rechazan con un mensaje claro, sin recortar la historia silenciosamente. La extracción local evita subir el binario, pero no elimina la necesidad de limitar texto y duración.

Análisis y generación se ejecutan como peticiones separadas. El navegador coordina el único reintento temporal permitido por llamada, con los reintentos automáticos del SDK desactivados. Los 120 segundos son por intento de cada etapa; el caso completo puede durar más. La respuesta debe coincidir con el intento y revisión vigentes del caso para poder aplicarse. El master doc define los estados y su invalidación tras ediciones, cancelación o vencimiento.

## Autorización y persistencia

Usuario estándar y administrador comparten el flujo clínico. El administrador solo tiene adicionalmente alta y baja de usuarios. La UI no expone otras capacidades del proveedor de identidad. El primer administrador se provisiona fuera del alta pública, con un procedimiento de despliegue documentado. Proteger al último administrador contra deshabilitación accidental y verificar estado activo en cada solicitud sensible.

Entidades permitidas propuestas: perfil de usuario (rol y estado), auditoría de usuarios, eventos técnicos, eventos de edición, feedback categorizado y versión de evaluación. Las credenciales y sesiones las administra el proveedor de identidad. Ninguna de estas tablas recibe campos de paciente ni texto clínico. El developer debe concretar el esquema y las políticas de autorización antes de migrar. El master doc especifica límites iniciales configurables, edición simple por secciones y vencimiento de la sesión clínica.

Los prompts y esquemas se versionan en el repositorio. Los eventos guardan esa versión y el identificador de modelo empleado. La revisión de métricas permite proponer cambios y comprobarlos con fixtures; no se reentrena ni se modifica el prompt automáticamente con cada edición.

## Retención del proveedor de IA

Se confirma API directa, sin Managed Agents. OpenAI es el proveedor preferido para la generación mediante una API sin estado y salida estructurada. GPT-6 Luna (gpt-6-luna) es el primer modelo a evaluar, sin dar por aprobada su calidad ni fijarlo aún para producción. No se aprueba todavía su uso con pacientes reales. Debe verificarse el modelo, endpoint y configuración concretos frente al requisito de retención del proyecto.

La documentación de OpenAI distingue almacenamiento de respuestas, registros de abuso y caché. store:false por sí solo no garantiza retención cero. Los controles Zero Data Retention requieren elegibilidad/aprobación y tienen excepciones por capacidades. Esta condición debe resolverse con la cuenta y el contrato efectivos antes de producción. Si no se consigue una configuración compatible, se debe evaluar otro proveedor o acordar explícitamente una política diferente; el diseño no puede prometer retención cero solo por no escribir en PostgreSQL.

No se agrega un gateway de IA por defecto: introduciría otro servicio cuyas condiciones de retención habría que verificar. El adaptador de proveedor permite cambiar de API sin modificar la interfaz y el contrato del RHC.

## Validación y costos

Reutilizar los TXT y capturas recibidos para desarrollar fixtures normalizados y pruebas locales autorizadas. Versionar únicamente variantes sintéticas. Crear PDFs sintéticos para pruebas de integración sin confundirlos con evidencia de compatibilidad con Medexis. Mantener al menos pruebas de parser sobre PDFs nativos reales representativos en un entorno restringido, fuera de CI pública y sin artefactos clínicos retenidos.

Seleccionar modelo y ajustar límites después de medir fidelidad, cobertura de áreas, correcciones, latencia y costo por caso. Evaluar por separado parser, clasificación, selección temporal y generación. No dar por probado el parser porque la síntesis funciona sobre un TXT.

El presupuesto de servicios no se considera validado por esta recomendación. Medir tokens de entrada/salida y reintentos en ambas etapas, proyectar 800 casos mensuales y sumar hosting, identidad y base. Los ejemplos económicos previos de una sola llamada por caso no constituyen un presupuesto de esta arquitectura. El período de prueba con Sienes medirá calidad y uso real, sin capturar historias clínicas en telemetría.

## Fuentes técnicas verificadas

- Next.js Route Handlers: https://nextjs.org/docs/app/getting-started/route-handlers
- PDF.js API y extracción de texto: https://mozilla.github.io/pdf.js/api/draft/api.js.html
- Neon Auth Admin: https://neon.com/docs/auth/guides/plugins/admin
- Vercel Functions y límites: https://vercel.com/docs/functions/limitations
- Generación de Word con JavaScript: https://docx.js.org/
- OpenAI y controles de datos: https://developers.openai.com/api/docs/guides/your-data

## Evaluación de Anthropic Managed Agents

Se evaluó a pedido del equipo después de aprobar el stack de aplicación. La recomendación es no utilizar Managed Agents para el RHC bajo la política actual de no persistencia clínica. El servicio está orientado a tareas autónomas prolongadas, con sesiones y herramientas administradas. La documentación indica que el historial persiste hasta eliminar la sesión y que Managed Agents no es elegible para Zero Data Retention, incluso con sandbox propio. Borrar al terminar no equivale a no persistir.

El flujo del RHC requiere selección controlada de fuentes, síntesis estructurada y revisión humana; no requiere un agente que ejecute comandos, navegue o mantenga sesiones durables. Claude mediante Messages API sí es un candidato para el adaptador directo de IA. Deben comprobarse condiciones efectivas de retención de la cuenta, modelo y funciones seleccionadas; la elegibilidad del endpoint no garantiza retención cero para cualquier modelo o configuración. No se ha seleccionado aún Anthropic ni un modelo concreto.

Fuentes verificadas: https://platform.claude.com/docs/en/managed-agents/overview , https://platform.claude.com/docs/en/managed-agents/secure-deployment-monitoring y https://platform.claude.com/docs/en/manage-claude/api-and-data-retention .

## Decisiones operativas aprobadas

Solo un PDF nativo de Medexis por paciente. Límites iniciales configurables: 10 MB, 300 páginas por PDF, 20 pacientes por lote y 2 casos simultáneos por pestaña. Timeout de 120 segundos por intento de cada etapa y un reintento temporal adicional por llamada. Ningún fallback automático de modelo. Sesión clínica de 30 minutos de inactividad con aviso previo. Los detalles y criterios de revisión, facilidad de uso, telemetría y piloto de dos semanas están definidos en master-doc.md y son la referencia de implementación.
