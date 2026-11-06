# Exportación de datos administrativos de Medexis

Verificado el 6 de noviembre de 2026 mediante el perfil autorizado para la revisión. Esta nota documenta la ruta y el esquema sin copiar datos de pacientes. Es un registro de investigación: la única entrada de producción aprobada es un PDF nativo de Medexis por paciente, según el master doc. No se implementa un lector XLSX.

## Procedimiento comprobado

1. Desde el inicio de Medexis, abrir el módulo con el icono de barras: Estadísticas - Reportes.
2. En la pestaña REPORTES, elegir el módulo Pacientes.
3. En Concepto, elegir LISTADO PACIENTES.
4. Seleccionar Solo en Cobertura y elegir la cobertura deseada. También existe Todas, que no fue la opción usada para la prueba.
5. Pulsar Procesar y esperar la descarga. La aplicación muestra Consulta finalizada exitosamente y Archivo generado exitosamente.

La prueba filtrada por PAMI descargó un archivo XLSX denominado ListadoPacientes, con una hoja Listado pacientes. Se inspeccionó el archivo real, no solamente el mensaje de éxito. La fila 4 indica la cobertura seleccionada y la fila 5 contiene los encabezados.

## Columnas observadas

| Columna | Encabezado |
| --- | --- |
| A | Tipo documento |
| B | Documento |
| C | Número historia clínica |
| D | Apellido |
| E | Nombre |
| F | Sexo |
| G | Fecha nacimiento |
| H | Domicilio |
| I | Localidad |
| J | Celular |
| K | Teléfono fijo |
| L | Email |
| M | Cobertura |
| N | Plan |
| O | Numero de afiliado |
| P | Tipo IVA |
| Q | Fecha carga |
| R | Usuario carga |

Se comprobó que los dos casos PAMI de referencia están presentes con documento, HC, nombre, nacimiento, cobertura y afiliación. El número de afiliado se almacena como texto en esas filas. No todas las filas del listado tienen afiliación completa: deberán conservarse las alertas de información faltante.

## Aplicación al proyecto

Tras validar el PDF nativo aportado por el usuario, se confirmó un PDF por paciente con encabezado administrativo y evoluciones como única entrada. La combinación de TXT clínico y XLSX administrativo fue una alternativa investigada, descartada del flujo de producción para simplificar la operación y evitar asociaciones entre archivos. El JSON clínico revisado no contiene claves de documento ni HC. Estos materiales solo se reutilizan localmente para investigación y pruebas autorizadas.

El listado filtrado contiene pacientes históricos y no representa automáticamente el conjunto activo a renovar. Se debe procesar únicamente la selección de casos y columnas necesarias. Los campos de domicilio, contacto, IVA y auditoría no se necesitan para los campos actualmente identificados de PAMI y no deberían enviarse a la IA.

El XLSX no contiene columnas de CUD, diagnóstico CIE-10, práctica, módulo o cantidad. Estos datos deberán provenir de otras fuentes documentadas o de una selección revisada por el usuario.

El archivo y sus filas no se incorporan a la aplicación ni se convierten en un padrón persistente. La descarga local realizada para esta comprobación permanece en Descargas; no se copió el padrón al proyecto.

## Alternativas y límites de la revisión

En el mismo selector existe PACIENTES EN TRATAMIENTO, pero no se generó ni se verificó su esquema. Puede investigarse si se necesita acotar a actividad por período.

La impresión de historia clínica dispone de la opción Unico encabezado, pero el intento de impresión de una muestra devolvió Ha ocurrido un error al imprimir la historia clínica. Ese intento no permitió validar la impresión en el navegador. Posteriormente, el usuario aportó un PDF nativo generado desde ese circuito y se confirmó que reúne encabezado administrativo y evoluciones con texto extraíble en sus 91 páginas. El PDF se confirmó como única entrada; quedan por comprobar variaciones del mismo diseño y la cobertura de adjuntos.

Solo se comprobó la descarga administrativa de PAMI. El filtro permite elegir otras coberturas, pero sus archivos y contenido deben verificarse antes de declarar compatibilidad completa.
