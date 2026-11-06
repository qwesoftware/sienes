# Documento maestro del asistente de resumen de historia clínica de Sienes

Versión inicial del 6 de noviembre de 2026. Estado: decisiones funcionales confirmadas; stack de aplicación aprobado; API directa confirmada, OpenAI como proveedor preferido sujeto a validación; parámetros operativos iniciales aprobados y configurables; modelo de producción pendiente de evaluación. Documento dirigido al developer. Los formularios externos pendientes limitan el cierre de los mapeos de las otras coberturas.

El proyecto prepara resúmenes de historia clínica y datos estructurados para que el personal de Sienes los revise y copie manualmente en los portales de las coberturas. Este documento es la referencia principal de implementación; ante diferencias con notas de investigación o propuestas anteriores, prevalecen sus decisiones confirmadas. La revisión integral del 6 de noviembre precisó el flujo técnico en el apartado Detalles de implementación y corrigió referencias desactualizadas en los documentos complementarios.

## Alcance y condiciones

- Aplicación web de acceso restringido para Sienes, basada en la opción 1 del presupuesto.
- Importación manual de exports de Medexis, generación de un borrador de RHC, edición, revisión y preparación de campos para copiar o descargar.
- Única salida clínica: RHC. Los planes de tratamiento e informes iniciales o semestrales son fuentes o referencias; no se contrata su generación como documentos adicionales.
- Coberturas identificadas en los modelos: PAMI, OSDE, Swiss Medical, Unión Personal y OSTVLA. Los campos finales de las cuatro últimas requieren los formularios ya solicitados.
- Usuarios estándar y un administrador inicial. Ambos pueden generar, corregir y descargar. La única capacidad adicional del administrador es dar de alta y de baja usuarios. Sin registro público ni privilegios adicionales sobre datos clínicos. Dar de baja significa deshabilitar el acceso y revocar sesiones; no borrar la auditoría de usuarios.
- Carga individual y por lote. Volumen de referencia indicado: aproximadamente 800 casos por mes. Límites iniciales: 10 MB y 300 páginas por PDF, 20 pacientes por lote y 2 pacientes simultáneos; configurables según el apartado operativo.
- Revisión profesional del contenido médico antes de su uso. La igualdad de permisos no acredita habilitación clínica del usuario.
- Sin conexión directa a Medexis, precarga de portales, emisión o descarga automática de OME, envío de correos, gestión de OP ni seguimiento de vencimientos.
- La prohibición de conservar datos de pacientes reemplaza el guardado de documentación clínica previsto en el presupuesto original. El alcance de varias coberturas y lotes debe quedar reflejado en el acuerdo final.

## Entradas

### PDF como única entrada de producción

Se validó un PDF nativo de la impresión de historia clínica de Medexis que reúne datos administrativos y evoluciones. La muestra tiene 91 páginas con texto extraíble en todas ellas, pesa aproximadamente 0,47 MB y contiene encabezados de notas entre febrero de 2025 y noviembre de 2026. No requiere OCR para leer su texto. Se confirma este formato como única entrada de producción en la primera versión: un archivo por paciente, sin TXT, Excel ni capturas como entradas adicionales. Los faltantes se completan manualmente durante la sesión.

El encabezado observado contiene apellido y nombre, DNI, nacimiento, edad, cobertura, plan y afiliación. Las notas incluyen fecha, profesional, especialidad, matrícula y texto. La matrícula corresponde al autor de la nota, no necesariamente al emisor de la futura OME. No se comprobó un campo de CUD en el encabezado.

El lector debe reconocer bloques por posición y reconstruir notas que continúan entre páginas. La extracción lineal puede ubicar el encabezado después de algunas evoluciones aunque visualmente aparezca al principio. Debe distinguir edad al exportar de edad histórica de la nota, así como especialidad del profesional de área descrita en el contenido.

La identidad se obtiene del encabezado y se muestra para confirmación. Si falta identificación o existen encabezados de pacientes diferentes, se debe resolver la asociación antes de generar. Los nombres mencionados dentro de evoluciones no identifican al titular.

El formato soportado es exclusivamente el PDF nativo descargado de Medexis que el usuario compartió. Se recibe exactamente un PDF por paciente; no se implementa combinación de fuentes adicionales, lectores de otros diseños ni OCR. La compatibilidad verificada corresponde a la muestra recibida; las variaciones de campos y adjuntos del mismo formato deben verificarse técnicamente. Que una página tenga texto no demuestra que todas sus imágenes o documentos adjuntos sean legibles. Los PDFs escaneados, protegidos o sin texto suficiente deben rechazarse con una explicación y la indicación de volver a exportar desde Medexis; no se genera silenciosamente un RHC con extracción incompleta.

### Material para desarrollo y pruebas

Los TXT y capturas ya entregados pueden usarse para construir datos de prueba sin pedir todos los PDFs nuevamente. Las pruebas de selección y generación utilizarán fixtures con el mismo esquema normalizado al que llega el lector PDF. Se crearán variantes sintéticas para probar faltantes, contradicciones y separación entre pacientes.

Los seis TXT recibidos contienen JSON UTF-8 con las claves Fecha, Texto, Tipo y Profesional: 1006 registros en total, entre 2 y 659 por archivo. Son características de las muestras, no límites del producto. Texto contiene HTML que debe convertirse a texto o sanearse para las pruebas. Tipo no identifica de manera fiable la naturaleza clínica ni la especialidad; estas aparecen también en encabezados y contenido. No hay campos administrativos estructurados que permitan asociar por sí solos cada TXT con un paciente. Las capturas sirven de referencia local para esos datos; contacto, domicilio y saldos no son necesarios para la finalidad del sistema.

Hay notas con enlaces o imágenes cuyo contenido no está incluido en el TXT. No se consideran adjuntos leídos ni se abren automáticamente. Tampoco se presume que PDF y TXT del mismo paciente contengan idénticas notas: deben coincidir período y opciones de exportación para compararlos. El caso adicional de adultos sin apellido identificado es opcional para ampliar las pruebas y no bloquea el desarrollo.

Los archivos originales siguen siendo sensibles y se utilizan localmente en el entorno autorizado. Los fixtures versionados, los logs y los artefactos de CI no contendrán datos reales de pacientes. Las pruebas reales contra un proveedor de IA requieren resolver antes sus condiciones de tratamiento. Convertir TXT y captura en un PDF sintético sirve para probar el flujo, pero no sustituye validar el parser con PDFs nativos reales. Ya hay uno disponible. Se prueban variaciones del mismo diseño de Medexis; no se presupone que cada cobertura tenga un diseño distinto ni se implementan otros lectores.

### Datos administrativos

Los datos se extraen del encabezado del PDF y se muestran para revisión. El ingreso manual cubre faltantes y correcciones. TXT, capturas y el Excel administrativo verificado quedan como material de investigación y pruebas, sin lectores de producción en la primera versión. Ver [ruta del export administrativo de referencia](exportacion-datos-administrativos.md).

La aplicación pedirá solo los datos necesarios para los campos del destino. Afiliación, documentos y códigos se tratarán como cadenas para preservar ceros iniciales y evitar pérdida de precisión. La fecha de nacimiento permitirá calcular edad al corte, señalando contradicciones con edades narrativas. Un CUD no especificado no se interpretará como ausencia de CUD.

En lotes, cada caso debe tener una asociación explícita entre su único PDF, datos administrativos y resultado. La aplicación no inferirá identidad a partir de nombres mencionados en notas ni de la proximidad de archivos en una lista.

### Contexto del trámite

El usuario indicará cobertura, fecha de corte y, cuando corresponda, prestación y tipo de trámite. Se incluyen admisiones y renovaciones, siguiendo los modelos recibidos. CUD se representa como sí, no o sin información. La respuesta preliminar del cliente indica que las coberturas son similares y la diferencia es CUD, pero todavía espera confirmación interna: se implementa una estructura clínica común sin inventar secciones o exigencias diferentes por CUD. Se permite completar el estado manualmente y se conserva sin información cuando no esté documentado. El período histórico aportado y todas las especialidades detectadas se mostrarán antes de generar.

## Flujo individual

1. Ingresar a la aplicación con un usuario autorizado.
2. Cargar el PDF nativo de un paciente y confirmar o completar los datos de su encabezado.
3. Elegir contexto del trámite y fecha de corte.
4. Validar los archivos, reconocer notas y proponer clasificación por especialidad y naturaleza.
5. Mostrar qué fuentes se utilizarán y advertir ambigüedades, faltantes, adjuntos no leídos y contradicciones.
6. Generar un borrador estructurado de RHC respaldado por las fuentes disponibles.
7. Permitir correcciones y revisión de fuentes, con fechas y autores visibles durante la sesión.
8. Confirmar la revisión del contenido y copiar campos o descargar el resultado en Word editable. En lotes, descargar un ZIP con un Word por paciente revisado.
9. Liberar los datos transitorios al finalizar o vencer la sesión, cancelando solicitudes, vaciando el estado clínico y liberando workers y URLs de objetos del navegador.

La plantilla Word es sencilla y consistente con los modelos, sin reproducir firmas ni sellos.

La regeneración avisa antes de reemplazar correcciones manuales. Se requiere marcar Revisé el contenido antes de copiar o descargar. Toda edición o regeneración posterior invalida esa confirmación. No constituye firma digital ni emisión de una orden. Se registra cada corrección mediante metadatos sin contenido de pacientes, según el apartado de feedback.

## Revisión y edición para usuarios no técnicos

La interfaz presenta tres pasos principales: Cargar PDF, Revisar resumen y Copiar o descargar. El estado de lectura y generación usa mensajes breves en español, con progreso visible y acciones claras para recuperarse de errores. Los detalles de JSON, tokens, proveedores y clasificación interna no aparecen en el flujo de trabajo.

El resumen se edita con campos de texto por sección, títulos clínicos comprensibles y una acción visible para consultar el texto y la página de origen. Las fuentes aparecen en un panel desplegable o lateral; no se obliga a interpretar referencias técnicas. La navegación permite revisar todas las especialidades sin perder las correcciones.

Las alertas explican qué falta o qué contradicción revisar y dónde se encontró. Se distinguen de los errores que impiden continuar, como un PDF ilegible o identidad ambigua. La confirmación Revisé el contenido habilita copiar y descargar; si se modifica algo, se muestra que hace falta revisar nuevamente. El motivo de corrección es opcional, con selección sencilla; nunca se bloquea la tarea por clasificar feedback.

Los controles deben ser accesibles por teclado, con etiquetas, foco visible y estados que no dependan solo del color. Validar la facilidad de uso con tareas completas durante el piloto, sin exigir conocimientos técnicos.

## Flujo por lote

Cada caso mantiene estado, fuentes, alertas y resultado independientes. El usuario podrá revisar los casos por separado y reintentar solo los que fallen. El error de un archivo no debe mezclar ni descartar los resultados válidos de otros casos.

La pantalla indica progreso y permite revisión individual antes del uso. La descarga conjunta es un ZIP con un Word por paciente revisado. Cancelar detiene casos pendientes y solicita abortar solicitudes en curso; no se promete revertir consumo ya realizado. Una arquitectura con colas, archivos temporales o reintentos no puede introducir persistencia clínica incompatible con la restricción del proyecto.

## Selección y generación clínica

Regla confirmada para renovaciones: por cada especialidad presente en la documentación hasta el corte se toma el último informe completo como base y se complementa con la última evolución posterior que aporte información clínica, si existe, respetando la fecha de corte. Una nota de ausencia o administrativa no reemplaza el informe ni cuenta como actualización clínica. Si una nota posterior contradice al informe, se muestran ambas fuentes y una alerta para revisión; el sistema no resuelve la contradicción por su cuenta. Si no hay informe completo, se utilizan las evoluciones disponibles y se advierte la falta del informe.

La historia médica de base debe aportar antecedentes, diagnóstico e indicación cuando correspondan; seleccionar solo las últimas notas terapéuticas no garantiza disponer de esos datos. No se inventarán diagnósticos, dosis, puntajes, frecuencias, códigos ni planes para completar faltantes.

La estructura común inicial del RHC incluye motivo de consulta, diagnóstico documentado, enfermedad actual y antecedentes relevantes, medicación, estudios y evaluaciones, evolución por todas las especialidades documentadas e indicación documentada. La redacción y extensión siguen los modelos buenos recibidos. Los formularios pendientes podrán ajustar la presentación y campos de destino; no bloquean esta estructura ni justifican inventar requisitos clínicos.

El borrador se genera con lo disponible y muestra alertas específicas para que el usuario solicite información. Las contradicciones se presentan con sus fuentes para resolución manual. Una falta de información clínica permite un borrador parcial; un archivo ilegible o una asociación ambigua de pacientes requiere corrección antes de procesar el caso.

Regla confirmada: se incluyen todas las especialidades presentes en la documentación hasta la fecha de corte. La omisión de una especialidad en un modelo histórico no se replica como filtro. Se mantiene visible la fecha de las fuentes antiguas y no se infiere que una prestación siga activa ni se prescribe su continuidad por incluir su evolución. Si un área solo tiene notas administrativas o de ausencia, se señala que no hay contenido clínico disponible para resumir.

Las diferencias no confirmadas entre modelos no se convierten en reglas normativas de una cobertura. No se impone un umbral de antigüedad clínica que no haya sido indicado; se muestran las fechas para revisión.

Para admisiones se utiliza la documentación clínica disponible hasta el corte para describir motivo de ingreso, antecedentes, situación inicial y evaluaciones documentadas, siguiendo los modelos de admisión recibidos. No se exige una evolución de renovación ni se inventan objetivos o planes faltantes. Se conserva la misma estructura común; el tipo de trámite cambia la selección y redacción, no habilita documentos adicionales.

## Datos de salida y PAMI

Durante la sesión, el resultado debe separar datos del paciente y cobertura, diagnóstico textual y código si está documentado, prestación si está documentada, RHC organizado por secciones, alertas y referencias a las fuentes utilizadas. La representación interna debe distinguir faltante, ambiguo, extraído y corregido por el usuario.

| Campo de PAMI | Fuente prevista y estado |
| --- | --- |
| Número de afiliado | Encabezado del PDF o carga manual. |
| Nombre, documento y edad | Encabezado del PDF y nacimiento al corte; el portal puede resolverlos a partir del afiliado. |
| Diagnóstico CIE-10 | Fuente clínica explícita y selección revisada; no inferir un código desde síntomas. |
| Práctica, módulo y cantidad | Indicación o selección validada por el usuario; no generalizar los valores del ejemplo. |
| Indicaciones | RHC y evolución de todas las especialidades documentadas; límites de extensión pendientes. |
| Profesional y matrículas | Contexto del prescriptor en el portal. El autor de una evolución no equivale al emisor de la OME. |

La OME completa de referencia confirma una disposición de salida, pero no aporta un catálogo general de códigos, cantidades o prestaciones. Las otras coberturas no tendrán un mapeo declarado como definitivo hasta recibir sus formularios.

La primera versión no incluye buscadores de nomencladores ni validación de afiliación contra portales. Los códigos y cantidades son campos editables: solo se proponen si aparecen explícitos en una fuente. Si faltan, quedan vacíos con alerta; el usuario puede completarlos sin que la aplicación certifique su validez administrativa. El prescriptor y sus matrículas no son campos obligatorios del RHC ni se completan a partir del autor de una evolución. No se genera una OME lista para emitir.

La copia de Indicaciones reúne el RHC y sus apartados de evolución, evitando duplicar el mismo texto. Sin un límite del portal verificado no se promete que cualquier longitud sea admitida, no se corta contenido automáticamente y se muestra el conteo de caracteres. Para las otras coberturas puede generarse el RHC común; sus campos exclusivos no se presentan como un formulario validado.

Formato confirmado: Word editable y copia por campo. Para lotes, ZIP de documentos Word revisados. JSON se utiliza como representación interna y contrato de API, sin descarga de JSON en la primera versión.

## Privacidad y trazabilidad

No se conservarán archivos clínicos, capturas administrativas, texto extraído, identificadores ni resultados clínicos en la base de datos o almacenamiento persistente de la aplicación. La condición también debe revisarse en registros, colas, monitoreo, errores, cachés y proveedores de procesamiento. No alcanza con borrar el archivo de entrada si otra capa retiene contenido.

Los datos se utilizarán de forma transitoria durante el procesamiento y revisión. El trabajo clínico vive solo en memoria de la pestaña: al cerrar o recargar se requiere reimportar. Se avisa antes de salir cuando el navegador lo permita y se ofrece finalizar y limpiar. La sesión clínica vence tras 30 minutos de inactividad del usuario. Se avisa 5 minutos antes y se ofrece Continuar trabajando. La cuenta regresiva se pausa durante una generación iniciada por el usuario; al expirar se cancela trabajo pendiente y se limpia el contenido transitorio. La sesión de autenticación es independiente y puede persistir sin contenido clínico. La retención de proveedores, la limpieza de referencias y el comportamiento de solicitudes en vuelo deben verificarse antes de operar con pacientes reales; no se promete borrado forense de memoria ni cancelación instantánea en terceros.

La instrumentación usa una lista explícita de campos permitidos. Se desactivan captura de cuerpos de petición/respuesta, nombres de archivos y grabaciones de pantalla o session replay.

Se podrán guardar métricas técnicas, categorías de errores y mejoras sin referencia al paciente. No se guardarán por defecto pares de texto clínico original y corregido. Cualquier ejemplo para mejora deberá ser sintético o cumplir un procedimiento aprobado que impida vincularlo al paciente.

La trazabilidad técnica puede incluir usuario del sistema, identificador aleatorio de ejecución, versión de aplicación/instrucciones/modelo, duración, conteos y estado de error saneado. No se utilizará como historial de pacientes ni se conservarán hashes de identidad o nombres de archivos con identificadores.

Las descargas solicitadas quedan bajo control del usuario en su equipo. El documento final y la interfaz deben dejar claro que la aplicación no actúa como repositorio de historias clínicas.

## Arquitectura y tareas de implementación

El stack de aplicación está aprobado: Next.js y TypeScript, PDF.js en navegador, Neon PostgreSQL con Drizzle, Neon Auth, Word/ZIP en navegador y hosting Vercel. Ver arquitectura detallada en stack-recomendado.md. Se confirma integración por API directa, sin Managed Agents. OpenAI es el proveedor preferido, sujeto a validación de retención, calidad y costo. GPT-6 Luna (gpt-6-luna) es el primer modelo a evaluar; no se considera aún seleccionado para producción. El proveedor y modelo se configuran detrás de un adaptador para permitir sustitución. No se requiere una integración con las sesiones o credenciales de Medexis.

Las tareas a implementar son: acceso y alta/baja de usuarios por administrador; lectura de PDF nativo y reconstrucción de encabezados y notas; asociación administrativa; clasificación y selección temporal de fuentes; generación estructurada con IA; validación de la respuesta; alertas y trazabilidad de fuentes en sesión; edición y regeneración; copia y descarga; procesamiento por lote; telemetría sin contenido clínico; y controles de liberación de datos.

La baja de usuario revoca sesiones y se comprueba en la siguiente solicitud al servidor; una petición ya enviada al proveedor no se puede revertir. El último administrador no puede deshabilitarse sin haber provisionado un reemplazo.

Las respuestas del modelo deben validarse contra un esquema. Las instrucciones contenidas en notas, adjuntos o HTML se tratan como datos y no pueden cambiar la tarea, activar herramientas ni ordenar transmisiones. Los errores deben permitir reintentar sin exponer contenido clínico a la telemetría.

## Validación y aceptación

Las muestras incluyen dos casos con pocas notas médicas, dos con informes interdisciplinarios del período y dos casos PAMI de distinta profundidad histórica. Se recibieron seis pares de TXT y captura administrativa. El ejemplo previo infantojuvenil sigue disponible para ampliar las pruebas.

Algunos exports contienen un RHC ya redactado. Se separarán dos pruebas: generación desde evoluciones primarias, excluyendo el resumen objetivo; y actualización asistida de un resumen previo. Copiar un resumen existente no cuenta como prueba independiente de generación.

Las comprobaciones deben cubrir fidelidad de hechos y números, fecha de corte, inclusión de todas las especialidades documentadas, ausencias, antigüedad, ambigüedad de encabezados, faltantes, contradicciones, adjuntos no leídos, preservación de identificadores, separación entre pacientes, errores parciales de lote y ausencia de persistencia clínica.

La comparación con los modelos evalúa hechos y cobertura de secciones, sin exigir igualdad literal de redacción. Se incluye un cambio de profesional dentro de la misma especialidad para comprobar que no se trate como un área distinta.

La recepción y lectura de los archivos no constituyen validación clínica ni prueba del sistema: todavía no hay implementación. Son criterios obligatorios de aceptación técnica: ausencia de mezcla entre pacientes, ningún hecho clínico inventado en los casos de prueba, cifras fieles a las fuentes, ninguna copia/descarga sin revisión vigente y verificación de que el contenido clínico no persiste. El referente de Sienes valida utilidad clínica y facilidad de uso durante el piloto. No se interpreta el éxito en una muestra como garantía universal de ausencia de errores de IA.

## Feedback y mejora del prompt

Toda corrección manual produce un evento lógico de edición, sin persistir texto clínico original, nuevo, diff, identificadores o nombres de archivos. Para no registrar cada pulsación se agrupan cambios por campo al salir de él o confirmar la revisión, con deduplicación e identificadores aleatorios de sesión de trabajo sin identidad de paciente.

Se guarda sección/campo, tipo de cambio (agregado, eliminación o modificación), versión de prompt, versión de modelo/esquema y momento. Se distingue el ámbito mediante enums: datos administrativos, contexto, selección de fuentes o contenido generado, para no atribuir al prompt una corrección del encabezado. Las versiones de IA quedan no aplicables si todavía no hubo una llamada. Se ofrece clasificar el motivo con opciones como omisión, dato incorrecto, formato, redacción o selección de fuente. Si no se selecciona motivo, queda sin clasificar; el sistema no inventa la razón de una edición. No hay campo libre persistente para pegar texto clínico.

Esto permite detectar qué secciones fallan y por qué, pero no reconstruir una corrección clínica concreta. Para mejorar las instrucciones se revisan los agregados y se redactan reglas generales o ejemplos sintéticos. Las propuestas se prueban con fixtures y se publican mediante una nueva versión de prompt; los cambios del usuario no modifican automáticamente el prompt global. La administración de prompts corresponde al proceso de desarrollo, no amplía los permisos del administrador de usuarios de Sienes.

## Período de prueba con Sienes

Después de la entrega inicial habrá un período de prueba de dos semanas, con una revisión intermedia y otra al cierre. El referente y las fechas se coordinan antes de empezar el piloto. Se documentan defectos, cambios de prompt y verificaciones, sin conservar contenido de pacientes. Se revisarán métricas de correcciones, fallas de extracción, información faltante y feedback funcional sin capturar contenido clínico. El piloto no sustituye los controles técnicos ni autoriza procesamiento externo sin condiciones de privacidad verificadas.

## Configuración operativa aprobada

Los valores son iniciales, no constantes repartidas por el código. Se definen en un módulo tipado de configuración, alimentado por variables del entorno y validado al iniciar. Cambiarlos no requiere editar lógica; según el hosting puede requerir un nuevo despliegue. Se publican al navegador solo los valores no sensibles y el servidor aplica sus propios límites autoritativos. El administrador de Sienes no obtiene una pantalla de ajustes técnicos.

| Parámetro | Valor inicial | Comportamiento |
| --- | --- | --- |
| PDF_MAX_BYTES | 10000000 | 10 MB decimales por PDF; rechazo antes de leer un archivo excesivo. |
| PDF_MAX_PAGES | 300 | Máximo por PDF; no recortar páginas silenciosamente. |
| BATCH_MAX_PATIENTS | 20 | Un PDF por paciente. Los duplicados detectados se revisan, no se fusionan. |
| BATCH_CONCURRENCY | 2 | Casos simultáneos por pestaña; servidor limita también abuso y concurrencia agregada. |
| GENERATION_TIMEOUT_MS | 120000 | Tiempo máximo por intento de generación. El timeout efectivo del hosting debe permitirlo y ajustarse junto a este valor. |
| GENERATION_MAX_RETRIES | 1 | Un reintento automático adicional al intento inicial, solo para fallas temporales. |
| CLINICAL_IDLE_TIMEOUT_MS | 1800000 | 30 minutos de inactividad; distinto de la sesión de login. |
| CLINICAL_IDLE_WARNING_MS | 300000 | Aviso 5 minutos antes del vencimiento. |

El reintento temporal utiliza backoff, respeta Retry-After cuando exista y se cancela al salir o cancelar. No se reintentan archivos inválidos, exceso de límites ni errores permanentes. La duración máxima de un caso puede incluir dos intentos y espera de backoff; no presentar 120 segundos como límite total del caso. Las respuestas tardías de intentos cancelados se descartan y no sobreescriben una edición o revisión más nueva.

El modelo se configura en servidor, inicialmente GPT-6 Luna para evaluación. Se registran modelo y versión de prompt realmente usados. No hay cambio automático a otro modelo como fallback. Los límites de payload y tokens requieren un límite propio validado contra hosting y modelo, sin equiparar los 10 MB del archivo local con el tamaño permitido de una petición de API.

## Contratos y ambientes

Los contratos se implementarán con esquemas Zod separados para fuentes, resultado y telemetría. Fuentes incluye identidad administrativa en memoria, cobertura/CUD y notas con fechas, autor, especialidad, tipo y páginas; resultado incluye secciones y todas las áreas documentadas, campos de portal, referencias, alertas y estado de revisión; telemetría admite únicamente los metadatos predefinidos. No se reutiliza el objeto clínico como cuerpo de un evento técnico.

Se separan desarrollo, pruebas y producción, con credenciales independientes y secretos solo en servidor. CI y fixtures versionados usan datos sintéticos; los archivos reales recibidos permanecen fuera del repositorio y artefactos automáticos. Al inicializar el repositorio se excluyen explícitamente los directorios actuales de documentación clínica y exports, además de temporales y secretos; no se incluye todo el workspace por defecto. El primer administrador se provisiona mediante un procedimiento de despliegue sin registro público. El developer concreta endpoints, migraciones y límites de tokens al implementar estos contratos, respetando la prohibición de persistir datos clínicos.

## Detalles de implementación

### Lectura, clasificación y selección de fuentes

El PDF se reconstruye localmente en notas con identificador aleatorio de sesión, fecha registrada, fecha narrada si existe, autor, especialidad, texto y páginas. Un encabezado repetido del mismo titular no crea otro paciente. Los encabezados incompatibles bloquean el caso; una corrección manual de nombre no permite ignorar automáticamente una mezcla real. La pertenencia de cada nota al archivo queda fija. No se hacen búsquedas externas ni se abren enlaces de adjuntos.

La clasificación precede a la selección temporal. El parser identifica las notas por el diseño de Medexis y normaliza encabezados mediante un catálogo versionado de nombres y alias de especialidades. No determina por longitud que una nota es un informe completo. Una primera llamada estructurada al adaptador de IA clasifica las notas en informe completo, evolución clínica, administrativa/ausencia, resumen previo u otra/ambigua, y asigna las áreas descritas. Informe completo significa un informe o evaluación que describe la situación clínica del área o período, siguiendo los ejemplos recibidos, y no una anotación aislada de una sesión; si no puede distinguirse se marca ambiguo. Esa llamada también procesa datos clínicos y está sujeta a las mismas restricciones de retención. Una nota interdisciplinaria puede aportar a varias áreas mediante referencias al mismo texto, sin duplicarse como documento.

Se distingue el área del autor de las áreas descritas en el contenido. Cuando no se puede resolver un área, se conserva como Sin especialidad identificada con alerta; no se descarta ni se asigna al azar. El usuario puede corregir la clasificación o selección desde el panel opcional de fuentes con etiquetas comprensibles. Los tipos ambiguos se muestran antes de generar, sin convertir automáticamente una evolución en informe completo. No se exige reclasificar manualmente todas las notas.

La aplicación aplica la regla temporal confirmada sobre esa clasificación y presenta las fuentes propuestas. Una segunda llamada genera el RHC usando solo las fuentes seleccionadas y el contexto clínico relevante. El contrato separa estos dos pasos para que la IA no seleccione silenciosamente qué historia ignorar. No se agrega una llamada por especialidad ni se divide la historia en fragmentos sin una estrategia adicional evaluada. Se contabilizan ambas llamadas y sus reintentos al medir costo y latencia.

La fecha de corte se interpreta como fecha calendario inclusiva en America/Argentina/Buenos_Aires; inicialmente propone el día actual y permite cambiarlo. Se usa la fecha registrada para ordenar y filtrar; si el texto declara otra fecha, se conserva y se alerta la discrepancia. Una nota sin fecha fiable no se incorpora automáticamente a una reconstrucción histórica. En empates se conserva el orden del documento como desempate técnico; si cambia la elección clínica y no hay hora fiable, se muestran ambas fuentes y la ambigüedad.

Antecedentes y diagnósticos pueden venir de notas más antiguas que el último informe. Se conserva su fecha. La medicación antigua no se presenta como tratamiento actual sin respaldo; se distingue documentada previamente de vigente según una fuente explícita, y se alerta cuando su vigencia es desconocida. La última evolución no borra datos incompatibles del informe ni se convierte por sí sola en una nueva prescripción.

### Validación del resultado y ediciones

El resultado generado contiene secciones con referencias a identificadores de fuentes y páginas que existen en el caso. El servidor comprueba esquema, identificadores válidos y referencias obligatorias para afirmaciones clínicas. Los controles de cifras contrastan valores contra las fuentes referidas, pero no certifican por sí solos el significado clínico: la fidelidad semántica se evalúa con casos y revisión humana. Una respuesta inválida no se presenta como un borrador validado ni se corrige inventando datos; se permite un nuevo intento explícito. No hay reintento automático por errores semánticos o de esquema.

Cada caso tiene una revisión de contenido que cambia al editar datos administrativos, contexto, fuentes o texto clínico. Cambiar contexto o fuentes invalida el borrador para copiar/descargar hasta regenerarlo; se confirma antes de descartar ediciones. Cambiar solo el texto permite conservarlo y volver a revisar. La confirmación se vincula a la revisión actual y todos los botones de copia y descarga de la aplicación verifican esa condición. No se pretende impedir la selección manual de texto ni controlar el portapapeles del sistema operativo.

Las referencias automáticas de una sección editada permanecen disponibles como fuentes del borrador, pero se muestran como respaldo pendiente de revisar; no se atribuye automáticamente a esas fuentes el texto añadido por el usuario. Al confirmar revisión se acepta el contenido editado bajo responsabilidad del revisor, sin presentarlo como verificado nuevamente por IA. Las alertas no se insertan como hechos clínicos en el Word: se muestran en la interfaz y, si hay faltantes, en un apartado separado de pendientes de revisión del documento.

La revisión se gestiona por caso. El ZIP contiene únicamente casos con revisión vigente, indica cuáles se excluyen y no confirma los demás en bloque. Los nombres de los archivos descargados pueden identificar al paciente para su uso local; no se envían a telemetría. Las secciones vacías no se rellenan automáticamente con frases que afirmen normalidad o ausencia de antecedentes.

### Peticiones, estados y cancelación

Se separan las operaciones clínicas de análisis y generación, los eventos técnicos y la administración de usuarios. Los endpoints clínicos reciben un único caso, devuelven su resultado en la misma petición y nunca ofrecen recuperación posterior desde el servidor. El contrato que viaja al servidor contiene texto y referencias necesarios, contexto sin identificadores administrativos y versiones; la identidad administrativa permanece en el navegador. El esquema de estado local es más amplio que el esquema enviado a IA y no se serializa entero por conveniencia.

Los estados por caso son leyendo, requiere confirmación, analizando, listo para generar, generando, borrador, revisado, error o cancelado. El caso mantiene una revisión y cada solicitud un identificador de intento. Al cancelar, eliminar, limpiar, expirar o regenerar se invalida el intento anterior. Solo una respuesta con intento y revisión vigentes puede modificar el caso. Los fallos de feedback no eliminan el borrador ni impiden descargar; se avisa si no pudo registrarse el evento y se reintenta únicamente el evento saneado.

El límite de 120 segundos y el reintento temporal se aplican a cada llamada de análisis o generación, no al flujo completo de dos etapas. El reintento lo coordina el navegador con un nuevo intento HTTP, para no mantener una función abierta durante dos timeouts y backoff. Se desactivan los reintentos ocultos del SDK. La concurrencia se cuenta por caso durante todo el flujo; el servidor limita también las llamadas en cada endpoint. Un timeout no prueba que el proveedor haya detenido su ejecución; no se promete consumo único ni procesamiento exactamente una vez.

La configuración agrega límites separados de cuerpo HTTP, tokens de entrada/salida, tasa y concurrencia por usuario/global. Se documentan y prueban los valores efectivos antes del piloto, considerando ambas etapas y el modelo seleccionado. Si el texto excede el presupuesto se explica el límite y se pide reexportar un período menor; no se resume ni trunca silenciosamente para hacerlo entrar. El análisis previo no recibe contenido posterior al corte. Las peticiones y respuestas clínicas llevan Cache-Control: no-store; no se guardan en cachés de consultas persistentes ni aparecen en URLs, trazas o mensajes de error.

El vencimiento de la sesión clínica se aplica a toda la pestaña, incluidos los casos revisados y la cola. Solo actividad de usuario reinicia el contador; polling, progreso y telemetría no lo hacen. La pausa por procesamiento automático dura mientras queden llamadas clínicas activas o reintentos acotados; no se pausa indefinidamente por una petición colgada. Al cerrar sesión se cancela y limpia el trabajo local. Una baja de cuenta se detecta al consultar la sesión y antes de cada solicitud sensible; se informa y limpia al detectarla, sin prometer un borrado remoto inmediato de otra pestaña desconectada.

La administración usa invitación o activación individual y recuperación de acceso del proveedor de identidad, sin credenciales compartidas. No se agrega un rol con permisos clínicos especiales. Los endpoints administrativos aplican autorización y validación en servidor; los de feedback aceptan exclusivamente enums y metadatos limitados, sin nombres de especialidades de texto libre ni mensajes de error del proveedor sin sanear.

### Orden de construcción y condiciones de salida

Primero se implementan contratos, parser y flujo completo con IA simulada y fixtures sintéticos. Después se integra el adaptador y se evalúan clasificación y generación por separado. El piloto con pacientes reales requiere previamente condiciones compatibles de retención para IA y hosting, acceso cerrado probado, límites efectivos, controles de no persistencia y aceptación técnica sobre las muestras disponibles. La selección del modelo no se decide solo por precio.

Las pruebas obligatorias incluyen clasificación equivocada o ambigua, notas interdisciplinarias, admisión frente a renovación, fecha de corte inclusiva, nota sin fecha, medicación histórica, respuesta de IA con referencia inexistente, corrección administrativa posterior a revisión, respuesta tardía tras cancelar, timeout en cada etapa, rechazo de usuarios deshabilitados y fallo del registro de feedback sin pérdida del trabajo. Son verificaciones a implementar, no resultados ya obtenidos.

## Verificaciones técnicas restantes

1. Concretar el stack aprobado en [arquitectura detallada](stack-recomendado.md) y validar OpenAI como proveedor preferido y evaluar primero GPT-6 Luna, midiendo calidad, latencia, retención y costo antes de fijar el modelo de producción. La evaluación de Managed Agents de Anthropic está documentada allí; no se recomienda bajo la política actual.
2. Resolver condiciones de retención del proveedor de IA y configurar el alojamiento sin cuerpos de solicitudes, respuestas ni contenido clínico en registros.
3. Medir el funcionamiento con los límites iniciales aprobados y ajustar su configuración si las muestras lo requieren.
4. Precisar el contrato de API, esquema normalizado, esquema persistente sin pacientes y política de sesiones/autorización.
5. Verificar PDFs nativos representativos y la cobertura de adjuntos. No se requiere bajar nuevamente todas las historias para comenzar las pruebas.

## Dependencias externas

- Confirmación del cliente sobre similitud entre coberturas y diferencias por CUD. Los formularios siguen pendientes para fijar campos específicos; avanzar con estructura común y mapeo comprobado de PAMI, sin inventar requisitos específicos.
- Referente y fechas del piloto de dos semanas, con revisión intermedia y de cierre.

La estructura clínica conserva diagnóstico, antecedentes, medicación e indicación documentados, actualiza todas las especialidades y sigue los modelos entregados como referencia del resultado esperado. No es necesario volver a preguntar estas definiciones. Las fechas de corte de pruebas históricas, tratamiento de fuentes y clasificación de notas son especificaciones de ingeniería, no preguntas adicionales al cliente.
