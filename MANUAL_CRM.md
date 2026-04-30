# Manual de Usuario — Sistema Nova
## Plataforma de Gestión Inmobiliaria con Inteligencia Artificial

---

**Versión:** 2.0  
**Fecha:** Abril 2026  
**Preparado para:** Prolig Propiedades

---

## Acceso al Sistema

### Cómo ingresar

1. Abrir el navegador (preferentemente Chrome o Safari)
2. Ingresar la dirección del sistema: `robot-inmobiliario-production.up.railway.app`
3. Ingresar usuario y contraseña entregados por el administrador
4. Hacer clic en **Ingresar**

> La sesión se mantiene activa mientras el navegador esté abierto. Al cerrar el navegador completamente, el sistema pedirá iniciar sesión nuevamente la próxima vez.

### Instalación como aplicación (PWA)

El sistema puede instalarse en el celular o computador como una aplicación, sin necesidad de App Store ni Play Store.

**En Chrome (computador):**
1. Abrir el sistema en Chrome
2. Hacer clic en el ícono que aparece a la derecha de la barra de direcciones (ícono de descarga o pantalla)
3. Seleccionar "Instalar"

**En iPhone/iPad:**
1. Abrir el sistema en Safari
2. Tocar el botón de compartir (cuadrado con flecha hacia arriba)
3. Seleccionar "Agregar a pantalla de inicio"

---

## Navegación Principal

En la parte superior de cada pantalla hay un menú con las secciones del sistema:

| Sección | Qué contiene |
|---|---|
| **Propiedades** | Catálogo de propiedades disponibles para venta y arriendo |
| **CRM** | Base de leads, pipeline de ventas y seguimientos |
| **Administraciones** | Control de arriendos activos y pagos de arriendo |
| **Documentos** | Generación automática de contratos y documentos |
| **Salir** | Cerrar sesión |

---

## 1. Propiedades

Esta sección muestra todas las propiedades registradas en el sistema.

### Indicadores superiores

Al ingresar se muestran 4 tarjetas con:
- **Total de propiedades** en el sistema
- **En venta** actualmente disponibles
- **En arriendo** actualmente disponibles
- **No disponibles** (vendidas o arrendadas)

### Ver propiedades

La tabla muestra por cada propiedad:
- Foto en miniatura
- Tipo (casa, departamento, local, etc.)
- Operación (venta o arriendo)
- Dirección y comuna
- Precio y moneda (CLP o UF)
- Dormitorios, baños y metros cuadrados
- Estado (disponible / no disponible)
- Acciones disponibles

### Filtrar propiedades

En la parte superior de la tabla hay filtros para encontrar propiedades rápidamente:
- **Tipo de operación:** Venta o Arriendo
- **Estado:** Disponible o No disponible
- **Búsqueda de texto:** busca por dirección, comuna o descripción

### Agregar una propiedad nueva

1. Hacer clic en el botón **+ Nueva Propiedad** (esquina superior derecha)
2. Completar el formulario:
   - Tipo de propiedad (casa, departamento, local, oficina, bodega, terreno, parcela)
   - Tipo de operación (venta o arriendo)
   - Dirección completa
   - Comuna
   - Precio y moneda
   - Dormitorios, baños, metros cuadrados
   - Descripción detallada
   - Imagen principal (URL de la foto)
3. Hacer clic en **Guardar**

> Una vez guardada, la propiedad queda disponible automáticamente para que el chatbot Nova la muestre a los clientes que consulten.

### Editar una propiedad

1. Hacer clic en el botón **Editar** de la propiedad correspondiente
2. Modificar los campos necesarios
3. Hacer clic en **Guardar**

### Marcar como no disponible

Cuando una propiedad se vende o arrienda:
1. Hacer clic en **Editar**
2. Cambiar el estado a **No disponible**
3. Guardar

> El chatbot deja de mostrar automáticamente las propiedades marcadas como no disponibles.

### Agregar fotos adicionales

Cada propiedad puede tener una galería de fotos además de la imagen principal:
1. Hacer clic en el ícono de **fotos** (cámara) en la fila de la propiedad
2. Seleccionar las fotos desde el dispositivo
3. Las fotos se suben automáticamente y quedan disponibles en la ficha de la propiedad

### Publicar en portales (Webhook)

Si el sistema está conectado a Make o Zapier, al hacer clic en **Publicar** la propiedad se envía automáticamente al portal configurado.

### Exportar a Excel

Hacer clic en **Exportar Excel** para descargar la lista completa de propiedades en formato .xlsx.

---

## 2. CRM — Gestión de Leads

El CRM registra automáticamente todos los contactos que llegan a través del chatbot Nova (web, WhatsApp, Messenger e Instagram). También permite agregar leads manualmente.

### Indicadores superiores

- **Total de leads** registrados
- **Leads calientes** (alta probabilidad de cierre)
- **Visitas agendadas** pendientes
- **Nuevos esta semana**

### Estados de los leads

Cada lead tiene un estado que indica en qué etapa del proceso está:

| Estado | Significado |
|---|---|
| **Nuevo** | Lead recién ingresado, aún no calificado |
| **Tibio** | Interesado pero sin urgencia definida |
| **Caliente** | Alta urgencia, listo para visitar o cerrar |
| **Visita** | Visita agendada en Google Calendar |
| **Frío** | Sin interés activo, en seguimiento a largo plazo |

### Vistas disponibles

El CRM tiene dos formas de ver los leads:

**Vista tabla:** muestra todos los leads en una lista con sus datos principales.

**Vista Pipeline (Kanban):** muestra los leads organizados por columnas según su estado, igual que un tablero de ventas. Permite ver el avance de cada lead de forma visual.

Para cambiar entre vistas, usar los botones **Tabla / Pipeline** en la esquina superior derecha.

### Filtrar leads

Encima de la tabla hay filtros para encontrar leads específicos:
- **Estado:** Nuevo, Tibio, Caliente, Visita, Frío
- **Canal:** WhatsApp, Web, Messenger, Instagram
- **Búsqueda:** por nombre, teléfono o propiedad de interés

### Cambiar el estado de un lead

**Desde la tabla:**
1. Hacer clic en el badge de estado del lead
2. Seleccionar el nuevo estado en el menú que aparece

**Desde la vista Pipeline:**
1. Cada tarjeta tiene un selector de estado
2. Cambiar el estado desde el desplegable dentro de la tarjeta

### Agregar o editar notas de un lead

Las notas permiten registrar información importante sobre cada lead (conversaciones, acuerdos, condiciones especiales, etc.).

1. Hacer clic en el botón **Nota** (o en el texto de la nota si ya tiene una)
2. Escribir o editar la nota en el cuadro de texto
3. Hacer clic en **Guardar nota**

> Las notas también se generan automáticamente cuando el sistema ejecuta acciones (cambios de estado automáticos, recordatorios enviados, etc.).

### Contactar por WhatsApp

Desde cualquier lead que tenga teléfono registrado:
- En la tabla: hacer clic en el número de teléfono
- En el Pipeline: hacer clic en el botón verde **WhatsApp** de la tarjeta

Esto abre WhatsApp directamente con ese número.

### Agregar un lead manualmente

Si un cliente llama por teléfono o llega en persona y no usó el chatbot:
1. Hacer clic en **+ Nuevo Lead**
2. Completar: nombre, teléfono, propiedad de interés, canal, estado inicial
3. Hacer clic en **Guardar**

### Seguimientos programados

La pestaña **Seguimientos** dentro del CRM muestra los leads que tienen una fecha de seguimiento asignada, ordenados por urgencia:

- **Rojo / Vencido:** el seguimiento ya pasó y no se realizó
- **Naranja / Hoy:** debe realizarse hoy
- **Azul / Próximo:** programado para los próximos días

Para asignar un seguimiento a un lead:
1. Abrir el detalle del lead (hacer clic en su nombre)
2. En la sección **Seguimiento**, ingresar la fecha y hora
3. Escribir la acción programada (llamar, enviar propuesta, confirmar visita, etc.)
4. Guardar

### Feed de actividad reciente

En la parte inferior del CRM hay un registro de las últimas acciones realizadas en el sistema (leads nuevos, cambios de estado, mensajes automáticos enviados, etc.).

---

## 3. Administraciones

Esta sección gestiona las propiedades que están actualmente arrendadas y el control de sus pagos mensuales.

### Indicadores superiores

- **Total de administraciones** activas
- **Pagos al día** del mes actual
- **Pagos pendientes** del mes actual
- **Monto total administrado** (suma de arriendos mensuales)

### Registrar una administración nueva

Cuando se firma un contrato de arriendo y la propiedad queda bajo administración:
1. Hacer clic en **+ Nueva Administración**
2. Completar:
   - Nombre del propietario
   - Nombre del arrendatario
   - Dirección de la propiedad
   - Valor del arriendo mensual
   - Día de pago (ej: día 5 de cada mes)
   - Fecha de inicio del contrato
3. Guardar

### Registrar pago de arriendo

Cuando el arrendatario paga el arriendo del mes:
1. Ubicar la administración en la tabla
2. Hacer clic en el badge **Pendiente** de la columna del mes correspondiente
3. El sistema lo cambia a **Pagado** automáticamente

### Filtros

- Filtrar por estado de pago (pagado / pendiente)
- Buscar por nombre de propietario o arrendatario

---

## 4. Documentos

Esta sección genera automáticamente los documentos más utilizados en la corredora, con los datos del cliente y la propiedad ya completados.

### Documentos disponibles

- **Contrato de Arriendo** — genera el contrato completo según Ley 18.101
- **Mandato de Administración** — para propiedades bajo administración de la corredora
- **Promesa de Compraventa** — borrador de promesa para operaciones de compra
- **Recibo de Garantía** — comprobante de recepción de garantía de arriendo
- **Carta de Desahucio** — notificación formal al arrendatario
- **Liquidación de Arriendo** — resumen mensual para el propietario

### Cómo generar un documento

1. Hacer clic en la tarjeta del documento que se necesita
2. Completar el formulario con los datos del cliente y la propiedad
3. Hacer clic en **Generar documento**
4. El documento se descarga automáticamente en formato Word o PDF

### Logo de la corredora

En la parte superior de la sección Documentos hay una opción para subir el logo de la corredora. Este logo se incluye automáticamente en todos los documentos generados.

1. Hacer clic en **Subir logo**
2. Seleccionar el archivo de imagen (PNG o JPG recomendado)
3. El logo queda guardado para todos los documentos futuros

---

## 5. Automatizaciones activas

El sistema ejecuta las siguientes acciones de forma completamente automática, sin que el agente tenga que hacer nada:

| Automatización | Cuándo ocurre |
|---|---|
| Notificación de lead caliente | En el momento en que Nova detecta un lead con alta urgencia |
| Agendamiento en Google Calendar | Cuando el cliente confirma una visita en el chat |
| Recordatorio 24h antes de visita | El día anterior a la visita agendada |
| Confirmación de asistencia | 22 horas antes de la visita ("¿Confirmas SI o NO?") |
| Recordatorio 1h antes de visita | Una hora antes de la visita |
| Mensaje post-visita | Automáticamente después de la hora de la visita |
| Seguimiento drip días 2, 5 y 9 | Para leads que no agendan visita de inmediato |
| Reactivación de leads fríos | Cada 4 días para leads sin actividad (máx. 2 veces) |
| Degradación de temperatura | Caliente → Tibio a los 7 días sin actividad; Tibio → Frío a los 14 días |
| Notificación nueva propiedad | Al publicar una propiedad, avisa a leads calientes y tibios compatibles |
| Informe semanal | Cada lunes a las 8:00 AM con resumen de la semana |

---

## 6. Informe Semanal

Cada lunes a las 8:00 AM el sistema envía automáticamente al correo del agente un informe con:

- Leads nuevos de la semana
- Visitas realizadas
- Leads calientes activos
- Propiedades con mayor consulta
- Resumen de actividad por canal (WhatsApp, web, Instagram, Messenger)

Para recibir el informe, el correo del agente debe estar configurado en las variables de entorno del sistema (campo GMAIL_USER).

---

## 7. Preguntas frecuentes

**¿Qué pasa si el chatbot habla con un cliente mientras yo estoy dormido?**
Nova atiende 24/7. Si detecta un lead caliente en cualquier hora del día o la noche, envía una notificación de WhatsApp al agente de inmediato.

**¿Puedo agregar más de un usuario al sistema?**
Sí. El administrador puede crear usuarios adicionales desde la sección de Usuarios (accesible desde el menú del sistema).

**¿Se pierden las conversaciones si el servidor se reinicia?**
No. El historial de conversaciones de WhatsApp se guarda en la base de datos y se recupera automáticamente cuando el cliente vuelve a escribir.

**¿Cómo sé si una visita fue efectivamente asistida?**
El sistema envía una alerta al agente cuando una visita programada pasa sin confirmar asistencia. El agente debe marcar en el CRM si el cliente asistió o no, lo que activa el seguimiento correspondiente.

**¿El chatbot puede mostrar propiedades que no están en el sistema?**
No. Nova solo muestra propiedades que están registradas y marcadas como disponibles en la sección Propiedades.

**¿Cómo actualizo el precio de una propiedad?**
Ir a Propiedades, hacer clic en Editar en la propiedad correspondiente, cambiar el precio y guardar. El chatbot usa el precio actualizado de inmediato.

**¿Qué pasa si un cliente pide hablar con una persona real?**
Nova le avisa al agente por WhatsApp de inmediato e indica que el cliente quiere contacto directo. El lead queda marcado como caliente en el CRM.

---

*Sistema Nova — Desarrollado para Prolig Propiedades*  
*Soporte técnico: contactar al administrador del sistema*
