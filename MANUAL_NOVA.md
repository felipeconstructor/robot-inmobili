# Manual de Usuario — Sistema Nova CRM

**Versión:** Abril 2026  
**Para:** Equipos de ventas y administración inmobiliaria  
**Soporte:** Sistema disponible 24/7 en producción

---

# Introducción

Nova es un sistema de gestión inmobiliaria con inteligencia artificial integrada. Permite administrar propiedades, capturar y hacer seguimiento de leads (clientes potenciales), registrar cierres de venta y arriendo, gestionar administraciones de propiedades, y generar documentos legales, todo desde un navegador web o como aplicación instalada en el celular.

El sistema tiene dos tipos de usuarios:

- **Admin:** acceso completo a todos los módulos, incluyendo Finanzas, Administraciones, Usuarios y Contenido.
- **Agente:** acceso al CRM y Propiedades. Solo ve los leads que él mismo gestionó.

---

# 1. Acceso al Sistema

## Cómo ingresar

1. Abrir el navegador (Chrome recomendado) e ir a la URL del sistema.
2. Ingresar el correo electrónico y la contraseña asignados.
3. Presionar **Ingresar** o la tecla Enter.

Si las credenciales son correctas, el sistema redirige automáticamente:

- **Admin** → Panel de Propiedades
- **Agente** → CRM

## Cierre de sesión

La sesión se cierra en tres situaciones:

- Al hacer clic en el botón **Salir** del menú de navegación.
- Al cerrar completamente el navegador (todas las pestañas y ventanas).
- En caso de inactividad prolongada o redeploy del servidor.

Para volver a ingresar, simplemente abre la URL del sistema y escribe tus credenciales.

## Instalación como aplicación (PWA)

El sistema se puede instalar en el celular o escritorio para abrirlo como una app, sin necesidad del navegador:

1. Abrir la URL del sistema en Chrome.
2. En la barra de direcciones aparece un ícono de instalación (pantalla con flecha).
3. Hacer clic en ese ícono y confirmar la instalación.
4. El sistema se agrega al escritorio o pantalla de inicio del celular.

Una vez instalado, se abre directamente y funciona igual que en el navegador.

---

# 2. Panel de Propiedades

**Ruta:** /admin.html  
**Acceso:** Admin y Agente

Este panel muestra todas las propiedades del catálogo y permite agregar, editar, importar y filtrar propiedades.

## Indicadores superiores

Al ingresar, se muestran cuatro tarjetas de resumen:

| Indicador | Descripción |
|---|---|
| Total propiedades | Cantidad total registrada en el sistema |
| Disponibles | Propiedades marcadas como disponibles |
| En venta | Propiedades con operación de venta |
| En arriendo | Propiedades con operación de arriendo |

## Tabla de propiedades

Muestra todas las propiedades con los siguientes campos:

- **Foto:** miniatura de la imagen principal (si tiene).
- **Tipo:** Casa, Departamento, Oficina, Local, Terreno o Bodega.
- **Operación:** Venta o Arriendo.
- **Dirección:** dirección exacta de la propiedad.
- **Comuna:** comuna donde se ubica.
- **Precio:** valor en CLP o UF.
- **Detalle:** dormitorios, baños y metros cuadrados.
- **Estado:** Disponible o No disponible.
- **Acciones:** botones para editar, ver ficha y eliminar.

## Filtros

Encima de la tabla hay cuatro opciones de filtro que se aplican en tiempo real:

- **Buscar:** filtra por texto libre (dirección, comuna, descripción).
- **Tipo:** filtra por tipo de propiedad.
- **Operación:** muestra solo ventas o solo arriendos.
- **Estado:** muestra solo disponibles, solo no disponibles, o todos.

## Agregar una propiedad nueva

Solo disponible para Admin.

1. Hacer clic en el botón **+ Nueva propiedad** (esquina superior derecha).
2. Se abre un formulario con los siguientes campos:

| Campo | Obligatorio | Descripción |
|---|---|---|
| Tipo | No | Casa, Departamento, Oficina, Local, Terreno, Bodega |
| Operación | No | Venta o Arriendo |
| Dirección | Sí | Dirección completa |
| Comuna | Sí | Nombre de la comuna |
| Precio | Sí | Valor numérico |
| Moneda | No | CLP (pesos) o UF |
| Dormitorios | No | Número |
| Baños | No | Número |
| Metros cuadrados | No | Número |
| Estado | No | Disponible o No disponible |
| Descripción | No | Texto libre sobre la propiedad |

3. Para agregar una foto principal, hacer clic en **Seleccionar foto principal** y elegir una imagen desde el dispositivo. La foto se sube automáticamente.
4. Hacer clic en **Guardar propiedad**.

## Editar una propiedad existente

1. En la tabla, hacer clic en el botón **Editar** de la propiedad correspondiente.
2. Se abre el mismo formulario con los datos actuales.
3. Al editar una propiedad existente, aparece además la sección **Fotos adicionales para la ficha**, donde se pueden agregar más imágenes a la galería. Se pueden seleccionar varias fotos a la vez.
4. Hacer clic en **Guardar propiedad** para confirmar los cambios.

## Marcar como no disponible

Si una propiedad ya fue vendida o arrendada, edítala y cambia el campo **Estado** a **No disponible**. El asistente Nova dejará de mostrarla a los clientes automáticamente.

## Importar propiedades desde Excel

Solo disponible para Admin.

1. Hacer clic en **Importar Excel**.
2. En el modal que se abre, descargar primero la plantilla haciendo clic en **Descargar plantilla**.
3. Completar el archivo Excel con las columnas requeridas:
   - tipo, operacion, direccion, comuna, precio, moneda, dormitorios, banos, metros, descripcion, disponible
4. Valores válidos por columna:
   - tipo: Casa / Departamento / Oficina / Local / Terreno / Bodega
   - operacion: venta / arriendo
   - moneda: CLP / UF
   - disponible: si / no / true / false / 1 / 0
5. Seleccionar el archivo Excel y hacer clic en **Importar**.
6. El sistema muestra una vista previa antes de confirmar.

## Ficha pública de la propiedad

Cada propiedad tiene una ficha pública accesible en /propiedad/[ID]. Esta ficha muestra las fotos, descripción, precio y mapa de ubicación. El asistente Nova envía el link de esta ficha a los clientes que consultan por una propiedad específica.

---

# 3. CRM — Gestión de Leads

**Ruta:** /crm.html  
**Acceso:** Admin y Agente

El CRM es el módulo central del sistema. Aquí se gestionan todos los contactos (leads) que interactuaron con Nova por WhatsApp, web, Messenger o Instagram.

## Indicadores superiores

| Indicador | Descripción |
|---|---|
| Total leads este mes | Contactos captados desde el día 1 del mes actual |
| Leads calientes | Leads con interés confirmado y alta probabilidad de cierre |
| Visitas agendadas | Visitas confirmadas en el calendario este mes |
| Seguimientos hoy | Leads que requieren contacto hoy según su programación |

## Estados de los leads

Cada lead tiene un estado que indica en qué etapa del proceso se encuentra:

| Estado | Color | Descripción |
|---|---|---|
| Nuevo | Azul | Acaba de llegar, aún no fue calificado |
| Caliente | Verde | Interés confirmado, listo para avanzar |
| Tibio | Naranja | Interés real pero sin urgencia |
| Frío | Rojo | Sin interés activo, en espera |
| Visita agendada | Morado | Tiene visita confirmada en el calendario |

## Vista Lista

Vista predeterminada. Muestra los leads en una tabla con los siguientes campos:

- **Nombre:** nombre completo del cliente.
- **Teléfono:** número con link directo a WhatsApp.
- **Propiedad:** propiedad por la que consultó.
- **Canal:** de dónde llegó (WhatsApp, Web, Messenger, Instagram).
- **Estado:** estado actual del lead.
- **Seguimiento:** fecha programada para contactar.
- **Ingreso:** fecha en que llegó al sistema.
- **Acción:** botones para ver detalle, abrir WhatsApp y agregar notas.

### Filtros disponibles

- **Buscar:** filtra por nombre o propiedad.
- **Estado:** filtra por estado del lead.
- **Canal:** filtra por canal de origen.
- **Actualizar:** recarga los datos desde la base de datos.

## Vista Pipeline (Kanban)

Muestra los leads organizados en columnas por estado. Permite tener una visión rápida de cuántos leads hay en cada etapa.

Para cambiar el estado de un lead desde el Pipeline:

1. En la tarjeta del lead, buscar el selector de estado.
2. Cambiar al estado deseado y el cambio se guarda automáticamente.

Desde cada tarjeta también se puede:

- Llamar o escribir por WhatsApp haciendo clic en el botón verde.
- Agregar o ver notas haciendo clic en **Nota**.

## Vista Seguimientos

Muestra los leads que tienen un seguimiento programado, ordenados por fecha:

- **Vencido** (rojo): el seguimiento era antes de hoy y no se realizó.
- **Hoy** (naranja): seguimiento programado para hoy.
- **Futuro** (azul): seguimiento programado para los próximos días.

El contador en el botón **Seguimientos** indica cuántos seguimientos están pendientes para hoy o vencidos.

## Vista Automatizaciones

Muestra el historial y estado de los mensajes automáticos que Nova envía por WhatsApp. Incluye:

### Indicadores

- **Enviados este mes:** total de follow-ups automáticos enviados.
- **Visitas próximas 48h:** leads con visita en las próximas 48 horas (recibirán recordatorio).
- **Último envío:** hora del último mensaje automático.

### Mensajes automáticos que Nova envía

El sistema envía mensajes automáticos en los siguientes momentos:

| Momento | Mensaje |
|---|---|
| 1 hora después de la visita | Mensaje de seguimiento post-visita preguntando cómo estuvo |
| 24 horas antes de la visita | Recordatorio de visita con opción de cancelar |
| 1 hora antes de la visita | Recordatorio final con hora exacta |
| Leads fríos (cada 4 días) | Reactivación con novedades del catálogo |
| Nueva propiedad ingresada | Alerta a leads que coincidan con el perfil de esa propiedad |

### Campaña WhatsApp masiva

Permite enviar un mensaje personalizado a un grupo de leads filtrados:

1. Seleccionar el **estado** del grupo (todos, calientes, tibios, fríos, nuevos).
2. Seleccionar el **tipo de cliente** (compradores, arrendatarios, inversores).
3. Escribir el mensaje en el cuadro de texto. Usar `{nombre}` para personalizar con el nombre de cada cliente.
4. Hacer clic en **Enviar campaña**.

Ejemplo de mensaje: *"Hola {nombre}, tenemos una nueva propiedad que podría interesarte. ¿Te puedo contar más detalles?"*

## Detalle de un lead

Al hacer clic en el botón de detalle (ícono de lápiz o nombre del lead), se abre un panel lateral con toda la información del lead:

- **Datos de contacto:** nombre, teléfono, correo, canal de origen.
- **Clasificación:** tipo de cliente (comprador, arrendatario, inversor, comercial) y temperatura (caliente, tibio, frío).
- **Propiedad de interés:** por qué propiedad consultó.
- **Notas:** campo libre para registrar observaciones del agente.
- **Seguimiento:** fecha y acción programada para el próximo contacto.
- **Actividad:** historial de interacciones con el lead.

### Programar un seguimiento

1. En el detalle del lead, ir a la sección **Seguimiento**.
2. Ingresar la fecha y una descripción breve de la acción (ej: "Llamar para confirmar interés").
3. Guardar. El lead aparecerá en la Vista Seguimientos en la fecha indicada.

---

# 4. Finanzas

**Ruta:** /finanzas.html  
**Acceso:** Solo Admin

Módulo para registrar y consultar los cierres de operaciones (ventas y arriendos) y calcular las comisiones generadas.

## Indicadores superiores

| Indicador | Descripción |
|---|---|
| Ventas este mes | Número de ventas cerradas en el mes actual |
| Arriendos este mes | Número de arriendos cerrados en el mes actual |
| Comisiones este mes | Total de comisiones ingresadas en el mes actual |
| Total acumulado | Suma de todas las comisiones registradas en el historial |

## Historial de cierres

Tabla con todas las operaciones registradas. Columnas:

- **Fecha cierre:** día en que se realizó la operación.
- **Tipo:** Venta o Arriendo.
- **Propiedad:** dirección o nombre de la propiedad.
- **Precio:** valor de la operación.
- **Comisión parte 1:** monto cobrado a una de las partes.
- **Comisión parte 2:** monto cobrado a la otra parte (si aplica).
- **Total comisión:** suma de ambas partes.
- **Agente:** agente que gestionó la operación.
- **Cliente:** nombre del cliente comprador o arrendatario.

## Filtros

- **Mes:** filtra por mes y año (selector tipo calendario).
- **Tipo:** muestra solo ventas, solo arriendos, o ambos.

## Registrar un nuevo cierre

1. Hacer clic en **+ Nuevo cierre** (botón en la esquina superior derecha del panel).
2. Completar el formulario:
   - Tipo de operación (Venta / Arriendo)
   - Fecha de cierre
   - Propiedad
   - Precio de la operación
   - Porcentaje o monto de comisión parte 1 y parte 2
   - Agente responsable
   - Nombre del cliente
3. Hacer clic en **Guardar**.

## Reporte por correo

El botón **Enviar reporte por email** genera y envía un resumen del mes seleccionado directamente al correo configurado en el sistema. Incluye estadísticas de leads, cierres y comisiones.

---

# 5. Administraciones

**Ruta:** /administraciones.html  
**Acceso:** Solo Admin (no disponible en versión Broker)

Módulo para registrar y gestionar propiedades que la inmobiliaria administra en nombre de propietarios. Controla el cobro mensual de arriendo y las comisiones por administración.

## Indicadores superiores

| Indicador | Descripción |
|---|---|
| Propiedades en administración | Cantidad de contratos activos |
| Arriendo total mensual | Suma de todos los arriendos administrados |
| Comisiones pendientes | Comisiones por cobrar del mes actual |
| Comisiones pagadas | Comisiones ya cobradas y registradas |

## Tabla de administraciones

Columnas:

- **Propietario:** nombre del dueño de la propiedad.
- **Dirección:** ubicación de la propiedad administrada.
- **Arrendatario:** nombre del inquilino actual.
- **Mes:** mes al que corresponde el registro.
- **Arriendo:** monto mensual del arriendo.
- **% Comisión:** porcentaje cobrado por administración.
- **Monto comisión:** valor calculado automáticamente.
- **Estado:** Pendiente (por cobrar) o Pagado (ya cobrado).
- **Cuenta pago:** datos bancarios del propietario para transferir.
- **Acciones:** editar, marcar como pagado o eliminar.

## Registrar una nueva administración

1. Hacer clic en **+ Nueva administración**.
2. Completar el formulario con los datos del propietario, arrendatario, monto y porcentaje de comisión.
3. Ingresar la cuenta bancaria del propietario (banco, tipo de cuenta, número de cuenta, RUT).
4. Hacer clic en **Guardar**.

## Cambiar estado a Pagado

Cuando se transfiere el arriendo al propietario:

1. En la fila correspondiente, hacer clic en **Marcar pagado**.
2. El estado cambia a **Pagado** y se registra la fecha.

## Filtros

- **Estado:** muestra solo pendientes, solo pagados, o todos.
- **Buscar:** filtra por nombre de propietario o dirección.

---

# 6. Documentos

**Ruta:** /documentos.html  
**Acceso:** Admin y Agente

Módulo para generar documentos legales en formato PDF listos para imprimir y firmar. Todos los documentos incluyen el logo de la empresa si está cargado.

## Documentos disponibles

### Contrato de Administración de Propiedad

Genera el contrato entre la inmobiliaria y el propietario para la administración de su propiedad.

Datos que solicita:
- Ciudad y fecha
- Datos del propietario (nombre, RUT, domicilio)
- Datos de la propiedad (dirección, tipo)
- Condiciones del contrato (porcentaje de administración, vigencia)
- Datos de la inmobiliaria

### Contrato de Arriendo

Genera el contrato de arrendamiento entre propietario e inquilino.

Datos que solicita:
- Datos del propietario
- Datos del arrendatario (nombre, RUT, domicilio)
- Datos de la propiedad
- Condiciones de arriendo (monto, garantía, fecha de inicio, vigencia)

### Orden de Visita

Documento que confirma y autoriza la visita de un cliente a una propiedad.

Datos que solicita:
- Datos del cliente
- Dirección de la propiedad
- Fecha y hora de la visita
- Nombre del agente responsable

## Cómo generar un documento

1. Hacer clic en la tarjeta del tipo de documento deseado.
2. Completar el formulario con los datos solicitados.
3. Hacer clic en **Generar PDF**.
4. El PDF se descarga automáticamente o se abre en una pestaña nueva para imprimir.

## Logo en documentos

Se puede cargar el logo de la empresa para que aparezca en la cabecera de todos los PDFs generados:

1. Hacer clic en **+ Subir logo de tu empresa**.
2. Seleccionar la imagen (JPG, PNG o WEBP).
3. El logo se guarda y se aplica a todos los documentos generados desde ese navegador.

Para quitar el logo, hacer clic en la **X** junto a la vista previa del logo.

---

# 7. Usuarios

**Ruta:** /usuarios.html  
**Acceso:** Solo Admin

Módulo para crear y gestionar los usuarios que tienen acceso al sistema.

## Roles disponibles

| Rol | Acceso |
|---|---|
| Admin | Acceso completo a todos los módulos del sistema |
| Agente | Solo CRM y Propiedades. Ve únicamente los leads que él gestionó |

## Crear un usuario nuevo

1. En la sección **Agregar usuario**, completar:
   - **Nombre:** nombre completo del usuario
   - **Correo:** dirección de correo con la que iniciará sesión
   - **Contraseña:** mínimo 6 caracteres
   - **Rol:** Agente o Admin
2. Hacer clic en **Crear usuario**.

El usuario puede iniciar sesión inmediatamente con las credenciales asignadas.

## Lista de usuarios activos

Tabla con todos los usuarios del sistema. Columnas:

- **Nombre:** nombre del usuario.
- **Correo:** correo con el que inicia sesión.
- **Rol:** Admin o Agente.
- **Estado:** Activo o Inactivo.
- **Creado:** fecha de creación.
- **Acciones:** botones para editar o desactivar/activar.

## Editar un usuario

1. Hacer clic en **Editar** en la fila del usuario.
2. Se puede cambiar el nombre, el rol y la contraseña.
3. Si no se quiere cambiar la contraseña, dejar el campo vacío.
4. Hacer clic en **Guardar**.

## Desactivar o activar un usuario

- **Desactivar:** el usuario ya no puede iniciar sesión pero sus datos se conservan.
- **Activar:** reactiva el acceso de un usuario previamente desactivado.

Para cambiar el estado, hacer clic en el botón **Desactivar** o **Activar** en la fila correspondiente.

---

# 8. Chat — Asistente Nova

**Ruta:** / (página principal)  
**Acceso:** Público (sin login)

Esta es la pantalla del asistente Nova que ven los clientes al ingresar a la URL del sistema. También es accesible desde el menú de navegación como **Chat**.

## Qué hace Nova automáticamente

Nova es un asistente de ventas con inteligencia artificial que trabaja 24/7 y realiza las siguientes acciones de forma autónoma:

1. **Saluda y califica al cliente:** pregunta si quiere comprar o arrendar, su plazo, presupuesto y zona de interés.
2. **Muestra propiedades disponibles:** busca en el catálogo según el perfil del cliente y muestra hasta 3 opciones con fotos, precio y link a la ficha.
3. **Captura el contacto:** solicita nombre y teléfono antes de mostrar el catálogo completo.
4. **Clasifica el lead:** analiza la conversación y asigna temperatura (caliente, tibio, frío).
5. **Agenda visitas:** cuando el cliente confirma interés, gestiona la fecha y hora y agenda en el calendario de Google automáticamente.
6. **Guarda el lead en el CRM:** todo cliente que deja su nombre y teléfono queda registrado en el CRM.
7. **Envía recordatorios:** 24 horas y 1 hora antes de la visita, envía recordatorio automático por WhatsApp.

## Canales donde opera Nova

- **Web:** chat embebido en la URL del sistema.
- **WhatsApp:** responde mensajes al número configurado en el sistema.
- **Messenger:** responde mensajes de Facebook Messenger si está conectado.
- **Instagram:** responde mensajes directos de Instagram si está conectado.

## Lo que Nova no hace

- Nova no inventa datos de propiedades. Solo muestra lo que está en el catálogo.
- No asesora en temas legales ni financieros (redirige a un especialista).
- No promete condiciones que no estén en el sistema.

---

# 9. Navegación del Sistema

## Menú principal (barra superior)

Todos los paneles comparten la misma barra de navegación en la parte superior:

| Botón | Destino |
|---|---|
| Propiedades | Panel de administración del catálogo |
| CRM | Gestión de leads |
| Administraciones | Propiedades administradas (solo Admin, no en Broker) |
| Finanzas | Registro de cierres y comisiones (solo Admin) |
| Documentos | Generador de contratos PDF |
| Contenido | Configuración del asistente (solo Admin) |
| Chat | Pantalla pública del asistente Nova |
| Salir | Cierra la sesión y regresa al login |

## Acceso según rol

| Módulo | Admin | Agente |
|---|---|---|
| Propiedades | Lectura y escritura | Lectura y escritura |
| CRM | Ve todos los leads | Ve solo sus leads |
| Administraciones | Sí | No |
| Finanzas | Sí | No |
| Documentos | Sí | Sí |
| Usuarios | Sí | No |
| Contenido | Sí | No |

---

# 10. Preguntas Frecuentes

**¿Qué pasa si cierro el navegador?**  
La sesión se cierra automáticamente. Al volver a abrir el sistema, deberás ingresar tus credenciales nuevamente.

**¿Nova guarda el historial de las conversaciones?**  
El historial de conversación se mantiene activo mientras la sesión del cliente no se interrumpa. Si el servidor reinicia, las conversaciones en curso se pierden, pero todos los leads capturados (nombre y teléfono) quedan guardados en el CRM.

**¿Por qué Nova no responde?**  
Puede deberse a que la clave de la API de inteligencia artificial no está configurada, o a un problema de conectividad. Verificar que el servidor esté activo.

**¿Cómo cambio mi contraseña?**  
Un usuario Admin debe editar tu usuario desde el panel Usuarios y asignarte una nueva contraseña.

**¿Se pueden cancelar visitas agendadas?**  
Sí. Cada visita tiene un link de cancelación que Nova envía automáticamente al cliente por WhatsApp. Al cancelar, se elimina el evento del calendario y se notifica al equipo.

**¿Los leads se eliminan automáticamente?**  
No. Los leads se conservan indefinidamente. Se pueden archivar o marcar como fríos, pero no se borran solos.

**¿Qué significa el indicador "Seguimientos hoy"?**  
Indica cuántos leads tienen programado un seguimiento para el día de hoy o tienen seguimientos vencidos sin realizar. Hacer clic en la Vista Seguimientos del CRM para verlos.

**¿Cómo agrego propiedades masivamente?**  
Desde el Panel de Propiedades, botón **Importar Excel**. Descargar la plantilla, completarla y subirla. El sistema procesa todas las filas e informa cuántas se importaron.

---

*Manual generado en Abril 2026.*
