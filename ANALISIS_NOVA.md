# Análisis Estratégico del Sistema Nova
## Estado Actual, Automatización y Hoja de Ruta

**Fecha:** Abril 2026  
**Versión analizada:** Nova CRM v2 (en producción en Railway)  
**Elaborado para:** Prolig Propiedades / Broker Inmobiliaria

---

# PARTE 1 — QUÉ ES NOVA Y QUÉ HACE HOY

## 1.1 Descripción General

Nova es un sistema de gestión inmobiliaria con inteligencia artificial integrada, desarrollado específicamente para corredoras de propiedades en Chile. Opera en producción 24 horas al día, 7 días a la semana, y funciona como una capa inteligente entre los clientes que llegan por distintos canales digitales y el equipo humano de ventas.

El sistema tiene dos grandes dimensiones:

- **Dimensión pública (cara al cliente):** el asistente Nova, que conversa con los clientes por WhatsApp, Web, Facebook Messenger e Instagram, captura leads, califica su interés, muestra propiedades y agenda visitas de forma autónoma.
- **Dimensión interna (cara al equipo):** el panel CRM, que centraliza todos los leads, permite hacer seguimiento, gestionar el catálogo de propiedades, registrar cierres, administrar documentos y automatizar comunicaciones.

## 1.2 Inventario Completo de Funcionalidades

### MÓDULO 1 — Asistente Nova (IA Conversacional)

El asistente está construido sobre el modelo de lenguaje Claude de Anthropic y opera con un sistema de instrucciones que define su comportamiento en cada situación posible.

**Flujo de calificación de clientes:**

El asistente ejecuta automáticamente un proceso de 5 preguntas que va de lo general a lo específico, de forma conversacional:

1. Detectar si el cliente quiere comprar o arrendar
2. Preguntar el plazo para determinar urgencia (caliente/tibio/frío)
3. Consultar el presupuesto disponible
4. Indagar sobre zona o tipo de propiedad preferida
5. Capturar nombre y teléfono antes de mostrar el catálogo

Esta secuencia garantiza que el sistema nunca muestre propiedades sin haber capturado al menos el nombre y contacto del cliente.

**Calificación automática de temperatura:**

Basándose en señales extraídas de la conversación, Nova clasifica cada lead en tres categorías:

| Temperatura | Criterios de clasificación |
|---|---|
| Caliente | Plazo menor a 3 meses, tiene financiamiento definido, da sus datos voluntariamente, pregunta detalles concretos (gastos notariales, garantía), quiere visitar esta semana |
| Tibio | Plazo de 3 a 6 meses, hace preguntas sobre propiedades específicas, compara opciones, sin presión de tiempo |
| Frío | Plazo mayor a 6 meses, solo está mirando, pregunta cosas generales como leyes o precios de mercado, no confirma interés |

**Presentación de propiedades:**

Nova consulta en tiempo real la base de datos de propiedades disponibles y las presenta al cliente filtrando por tipo, operación, precio y zona según lo que el cliente expresó. Incluye precio formateado, características, link a Google Maps y link a la ficha con fotos.

**Flujo de compra con información de financiamiento:**

Cuando un cliente muestra interés en comprar, Nova informa automáticamente la comisión de corretaje del 2% y luego ofrece un menú de 7 opciones de financiamiento. Según la opción elegida, entrega los documentos requeridos para ese camino específico (crédito hipotecario empleado o independiente, DS1, DS49, DS19, Leasing, contado).

**Flujo de arriendo con requisitos:**

Cuando un cliente consulta por arriendo, Nova entrega automáticamente todos los requisitos (persona natural o empresa), la garantía requerida y la comisión de corretaje del 50% del arriendo mensual con ejemplo de monto.

**Agendamiento de visitas:**

Nova gestiona la agenda de forma completamente autónoma. Recopila nombre, teléfono, propiedad, fecha y hora, verifica disponibilidad en el calendario, crea el evento en Google Calendar y confirma la visita al cliente. Todo sin intervención humana.

**Información legal y subsidios:**

Nova maneja información de Ley 18.101 (arrendamiento urbano), DFL-2, Ley 19.537 (copropiedad), y los subsidios habitacionales vigentes en 2025 (DS1, DS49, DS19, Subsidio al Crédito Hipotecario 2025, Leasing Habitacional).

### MÓDULO 2 — CRM (Gestión de Leads)

El CRM centraliza todos los contactos captados desde cualquier canal.

**Datos almacenados por lead:**

- Nombre, teléfono, correo, canal de origen
- Propiedad de interés y tipo de cliente (comprador, arrendatario, inversor, comercial)
- Estado en el proceso (nuevo, tibio, caliente, visita agendada, post-visita, cancelado)
- Temperatura, prioridad, notas personales del agente
- Fecha y descripción del próximo seguimiento programado
- Historial de actividad e interacciones
- Fecha de visita, asistencia confirmada, token de cancelación

**Cuatro vistas de trabajo:**

1. **Lista:** tabla filtrable por estado, canal y texto libre
2. **Pipeline Kanban:** columnas visuales por etapa del proceso
3. **Seguimientos:** lista priorizada por fecha con indicadores de vencido/hoy/futuro
4. **Automatizaciones:** historial de envíos automáticos y herramienta de campaña masiva

**Degradación automática de score:**

El sistema revisa diariamente los leads y degrada su temperatura automáticamente si no tienen actividad: un lead caliente sin contacto en 7 días pasa a tibio; un tibio sin contacto en 14 días pasa a frío.

### MÓDULO 3 — Gestión de Propiedades

Panel completo de administración del catálogo:

- Creación y edición de propiedades con hasta 10 campos (tipo, operación, dirección, comuna, precio, moneda, dormitorios, baños, metros, descripción)
- Carga de foto principal y galería adicional con almacenamiento en Supabase Storage
- Ficha pública individual con galería, mapa Google Maps y metadatos OG para compartir en redes sociales
- Importación masiva desde Excel con plantilla descargable
- Filtros por tipo, operación, disponibilidad y búsqueda de texto
- Al marcar una propiedad como no disponible, el asistente Nova deja de mostrarla automáticamente

### MÓDULO 4 — Automatizaciones de Seguimiento

El sistema ejecuta 8 tipos de mensajes automáticos por WhatsApp sin intervención humana:

| Automatización | Cuándo se ejecuta | Mensaje |
|---|---|---|
| Post-visita | 1 hora después de la visita | Pregunta cómo estuvo la visita |
| Recordatorio 24h | 24 horas antes de visita | Recuerda la visita con opción de cancelar |
| Recordatorio 1h | 1 hora antes de visita | Recordatorio final con hora exacta |
| Secuencia día 1 | 2 días después del primer contacto | "¿Pudiste ver las opciones?" |
| Secuencia día 2 | 5 días después | Pregunta sobre financiamiento |
| Secuencia día 3 | 9 días después | Último follow-up de la secuencia |
| Reactivación fríos | Cada 4 días para leads fríos | Novedades del catálogo |
| Matching propiedad | Al publicar propiedad nueva | Alerta a leads con perfil compatible |

### MÓDULO 5 — Finanzas

Registro y consulta de operaciones cerradas:

- Historial de ventas y arriendos con filtros por mes y tipo
- Cálculo automático de comisiones (parte compradora y parte vendedora)
- Estadísticas del mes: total ventas, arriendos, comisiones, acumulado histórico
- Resumen filtrable por mes para consulta rápida
- Envío de reporte mensual por correo electrónico en formato HTML

### MÓDULO 6 — Administraciones

Gestión de propiedades que la corredora administra para propietarios:

- Registro de contratos de administración con datos de propietario, arrendatario y cuenta bancaria
- Seguimiento del estado de pago mensual (pendiente / pagado)
- Cálculo automático de comisión por administración según porcentaje configurado
- Filtros por estado y búsqueda por propietario o dirección

### MÓDULO 7 — Generador de Documentos

Generación de contratos legales en PDF con logo de la empresa:

- Contrato de administración de propiedad
- Contrato de arriendo (propietario-arrendatario)
- Orden de visita

### MÓDULO 8 — Gestión de Usuarios

Sistema multi-usuario con dos roles:

- **Admin:** acceso completo a todos los módulos
- **Agente:** acceso al CRM (solo sus leads) y al panel de propiedades

Creación, edición, activación/desactivación de usuarios desde el panel.

### MÓDULO 9 — Comunicaciones Multicanal

El sistema opera en cuatro canales de forma simultánea y con la misma lógica de respuesta:

- **WhatsApp** (Twilio Sandbox)
- **Web** (chat embebido en la URL)
- **Facebook Messenger**
- **Instagram Direct**

Cada canal registra el origen del lead para análisis de fuente de captación.

### MÓDULO 10 — Informes Automáticos

Informe semanal automático enviado todos los lunes a las 8am con:

- Total de leads captados en la semana
- Leads calientes, visitas agendadas, distribución por canal
- Tabla HTML de todos los leads de la semana
- Estadísticas de comisiones

### MÓDULO 11 — Instalación como Aplicación (PWA)

El sistema puede instalarse como app nativa en iPhone, Android y escritorio de Mac/Windows desde Chrome, sin necesidad de pasar por App Store ni Play Store.

### MÓDULO 12 — Arquitectura Multi-Tenant

El mismo código base opera para múltiples clientes (Prolig Propiedades y Broker Inmobiliaria) con adaptación dinámica del nombre, colores, íconos y comportamiento según la variable de entorno `SITE_NAME`.

---

# PARTE 2 — PORCENTAJE DE AUTOMATIZACIÓN

## 2.1 Mapa de Procesos del Negocio Inmobiliario

Para entender qué automatiza Nova y qué sigue siendo trabajo humano, primero es necesario mapear todos los procesos que existen en una corredora de propiedades.

## 2.2 Tareas 100% Automatizadas por Nova

Estas tareas ocurren sin intervención humana, las 24 horas:

| Tarea | Automatización |
|---|---|
| Responder consultas de clientes (precio, disponibilidad, requisitos) | 100% |
| Calificar el nivel de interés del cliente (caliente/tibio/frío) | 100% |
| Capturar nombre y teléfono del cliente | 100% |
| Mostrar propiedades disponibles según perfil | 100% |
| Entregar requisitos de arriendo (persona natural y empresa) | 100% |
| Informar comisiones de corretaje (arriendo y venta) | 100% |
| Informar opciones de financiamiento y sus requisitos | 100% |
| Informar sobre subsidios habitacionales vigentes | 100% |
| Crear lead en el CRM con datos completos | 100% |
| Agendar visita en Google Calendar | 100% |
| Enviar confirmación de visita al cliente | 100% |
| Enviar recordatorio de visita 24h antes | 100% |
| Enviar recordatorio de visita 1h antes | 100% |
| Gestionar cancelaciones de visita (link automático) | 100% |
| Enviar mensaje post-visita 1h después | 100% |
| Ejecutar secuencia de follow-up de 3 mensajes (días 2, 5, 9) | 100% |
| Reactivar leads fríos cada 4 días | 100% |
| Notificar al agente cuando un lead es caliente | 100% |
| Alertar leads con perfil compatible al publicar propiedad nueva | 100% |
| Degradar temperatura de leads sin actividad (7 y 14 días) | 100% |
| Enviar informe semanal por email los lunes 8am | 100% |
| Calcular comisiones en módulo de finanzas | 100% |

## 2.3 Tareas Semi-Automatizadas (Humano + Sistema)

Nova prepara el terreno pero el humano toma la decisión final:

| Tarea | Automatización | Trabajo Humano |
|---|---|---|
| Calificación de leads | Nova clasifica automáticamente | El agente puede ajustar el estado manualmente |
| Seguimiento programado | Nova ejecuta la secuencia | El agente define acciones adicionales y notas |
| Publicación en redes sociales | Make.com recibe los datos y publica | El agente activa la publicación y revisa el resultado |
| Campaña masiva WhatsApp | El sistema envía el mensaje | El agente define el texto y el segmento |
| Gestión de administraciones | El sistema calcula montos | El agente registra cada pago mensual |
| Generación de documentos | El sistema genera el PDF | El agente revisa y ajusta los datos antes de generar |

## 2.4 Tareas Exclusivamente Humanas

Estas tareas no están automatizadas en la versión actual y requieren trabajo humano completo:

| Tarea | Razón no automatizada |
|---|---|
| Conducir la visita a la propiedad | Requiere presencia física |
| Negociar precio entre comprador y vendedor | Requiere juicio, relación y comunicación compleja |
| Redactar y firmar contratos | Requiere firma notarial y revisión legal |
| Coordinación con notaría y banco en cierre de venta | Proceso legal y financiero con múltiples partes |
| Fotografiar y preparar una propiedad para publicar | Requiere visita física y criterio estético |
| Evaluar si un arrendatario es confiable | Requiere análisis de antecedentes y criterio humano |
| Resolver conflictos entre propietario e inquilino | Requiere mediación interpersonal |
| Gestionar mantenciones y reparaciones | Requiere coordinación con proveedores físicos |
| Prospección activa en terreno | Requiere presencia física en el mercado |
| Asesoría legal personalizada | Requiere un abogado especialista |

## 2.5 Porcentaje Global de Automatización

Con base en el análisis anterior, se estima que Nova automatiza entre el **65% y el 70% del trabajo operativo total** de una corredora de propiedades moderna.

| Área de trabajo | % Automatizado por Nova |
|---|---|
| Atención al cliente (respuestas, horarios, consultas) | 95% |
| Captación y registro de leads | 90% |
| Calificación y priorización de leads | 85% |
| Seguimiento y nurturing de leads | 75% |
| Agendamiento de visitas | 100% |
| Presentación de propiedades y fichas | 80% |
| Información de financiamiento y requisitos | 100% |
| Generación de reportes e informes | 70% |
| Gestión de documentos legales | 40% |
| Administración de propiedades (arriendos) | 30% |
| Cierre de operaciones y negociación | 5% |
| Visitas físicas y coordinación en terreno | 0% |
| **PROMEDIO GENERAL** | **~67%** |

**Lo que Nova hace en términos de tiempo equivalente:**

En una corredora pequeña sin Nova, se estima que la atención de clientes, el registro de leads y el seguimiento consumen entre 4 y 6 horas diarias de trabajo humano. Nova absorbe ese trabajo de forma continua, dejando al equipo humano para tareas de mayor valor como la negociación, las visitas y el cierre de operaciones.

---

# PARTE 3 — BRECHAS ACTUALES Y OPORTUNIDADES DE MEJORA

## 3.1 Brechas Identificadas en el Sistema Actual

Antes de hablar de nuevas funcionalidades, es importante reconocer lo que el sistema actual no hace del todo bien:

| Brecha | Descripción | Impacto |
|---|---|---|
| Historial de conversación en memoria | Se pierde cuando el servidor reinicia. El cliente siente que Nova "no recuerda" | Medio |
| Sin búsqueda semántica de propiedades | Nova filtra por campos exactos; no entiende "algo tranquilo cerca del mar" | Alto |
| Sin confirmación de lectura | No se sabe si el cliente leyó el mensaje de WhatsApp | Bajo |
| Sin análisis de sentimiento | No detecta si el cliente está frustrado o muy emocionado | Medio |
| Sin dashboard de análisis de rendimiento | No hay métricas de tasa de conversión, tiempo de respuesta, etc. | Alto |
| Sin integración con portal de propiedades | Portal Inmobiliario, Yapo, Mercado Libre no están conectados | Alto |
| Catálogo de WhatsApp no sincronizado | Las propiedades del sistema no se publican en el catálogo de Meta automáticamente | Medio |

---

# PARTE 4 — ROADMAP DE UPGRADES

A continuación se presentan todas las mejoras posibles, organizadas en tres horizontes de implementación según su complejidad, costo y valor estratégico.

---

## HORIZONTE 1 — MEJORAS INMEDIATAS (1 a 4 semanas)

Cambios de bajo costo y alta implementación que no requieren nuevas integraciones.

### H1.1 — Persistencia del Historial de Conversación

**Qué es:** Guardar el historial de conversación de cada cliente en Supabase en lugar de en memoria del servidor.

**Por qué importa:** Hoy, si el servidor de Railway reinicia, Nova olvida completamente la conversación en curso. Esto es especialmente problemático en conversaciones largas o en WhatsApp donde el cliente puede tardar horas en responder.

**Cómo funciona:** Al recibir cada mensaje, guardar los últimos 20 mensajes del historial en la tabla de leads en Supabase. Al responder, leer ese historial. Si el servidor reinicia, la conversación continúa donde quedó.

**Esfuerzo estimado:** 3-5 días de desarrollo. **Valor:** Alto.

---

### H1.2 — Exportación de Leads a Excel/CSV

**Qué es:** Botón en el CRM para descargar todos los leads (o los filtrados) en formato Excel.

**Por qué importa:** Permite al equipo hacer análisis en Excel, entregar reportes a dirección, importar a otras herramientas, o hacer respaldos manuales.

**Esfuerzo estimado:** 1-2 días. **Valor:** Medio.

---

### H1.3 — Panel de Métricas de Conversión

**Qué es:** Dashboard con indicadores clave del negocio:

- Tasa de conversión de lead a visita (cuántos leads terminan agendando)
- Tasa de conversión de visita a cierre
- Canal con mayor conversión (WhatsApp vs web vs Instagram)
- Tiempo promedio desde primer contacto hasta cierre
- Costo de captación por canal
- Leads por agente (para equipos con múltiples agentes)

**Por qué importa:** Hoy no se puede medir el rendimiento del sistema de forma visual. Sin métricas, no se puede mejorar ni presentar resultados al cliente.

**Esfuerzo estimado:** 1-2 semanas. **Valor:** Alto.

---

### H1.4 — Recordatorios por Correo Electrónico

**Qué es:** Además de los recordatorios por WhatsApp, enviar recordatorio de visita por correo electrónico como canal de respaldo.

**Por qué importa:** No todos los clientes tienen WhatsApp activo. El correo es más formal y tiene mejor entregabilidad en algunos contextos.

**Esfuerzo estimado:** 1-2 días. **Valor:** Bajo.

---

### H1.5 — Sincronización del Catálogo de WhatsApp con Meta

**Qué es:** Cuando se agrega o edita una propiedad en el panel de administración, el sistema envía automáticamente los datos a la API de Meta para actualizar el catálogo de WhatsApp Business.

**Por qué importa:** Hoy el catálogo de WhatsApp se actualiza manualmente. Si hay 50 propiedades, mantener ambos sistemas sincronizados requiere trabajo duplicado.

**Requisito:** Tener el número de WhatsApp aprobado directamente con Meta (no el sandbox de Twilio).

**Esfuerzo estimado:** 1-2 semanas. **Valor:** Medio-Alto.

---

### H1.6 — Plantillas de WhatsApp Aprobadas (HSM)

**Qué es:** Crear plantillas de mensajes aprobadas por Meta para poder contactar clientes que no han escrito primero en las últimas 24 horas.

**Por qué importa:** La política de WhatsApp Business solo permite enviar mensajes libremente dentro de 24 horas después de que el cliente escribió. Pasado ese tiempo, se necesitan plantillas aprobadas (llamadas HSM). Hoy el sistema puede tener problemas para enviar follow-ups a leads que no responden.

**Plantillas sugeridas:**
- Recordatorio de visita (ya en uso, necesita aprobación formal)
- Reactivación de lead frío
- Notificación de nueva propiedad compatible
- Seguimiento post-visita

**Esfuerzo estimado:** 1 semana (el proceso de aprobación en Meta tarda 1-3 días). **Valor:** Alto.

---

## HORIZONTE 2 — MEJORAS ESTRATÉGICAS (1 a 3 meses)

Funcionalidades que agregan diferenciación significativa al sistema y requieren trabajo de desarrollo más profundo.

### H2.1 — Búsqueda Semántica de Propiedades (IA Vectorial)

**Qué es:** Actualmente Nova filtra propiedades por campos exactos (tipo, precio, comuna). Con búsqueda semántica, podría entender frases como "algo tranquilo con jardín para mis hijos" o "departamento moderno con buena vista cerca del trabajo" y encontrar propiedades que encajan aunque el cliente no use las palabras exactas del catálogo.

**Cómo funciona:** Cada propiedad se convierte en un vector numérico usando modelos de embeddings (como text-embedding-ada-002 de OpenAI o los propios embeddings de Anthropic). Cuando el cliente describe lo que busca, su descripción también se convierte en vector. El sistema busca las propiedades con mayor similitud matemática.

**Por qué importa:** Es el salto más importante en calidad de la experiencia del cliente. Los portales inmobiliarios líderes del mundo (Zillow, Rightmove) están implementando esto activamente.

**Esfuerzo estimado:** 3-4 semanas. Requiere activar extensión pgvector en Supabase. **Valor:** Muy alto.

---

### H2.2 — Integración con Portales Inmobiliarios

**Qué es:** Conexión con los portales más usados en Chile (Portal Inmobiliario, Yapo, Mercado Libre Inmuebles) para:

1. **Publicación automática:** al agregar una propiedad en el sistema, publicarla automáticamente en todos los portales configurados.
2. **Captura de leads:** cuando alguien consulta por un portal, el lead entra directamente al CRM sin tener que copiarlo manualmente.

**Portales con API disponible:**
- Portal Inmobiliario: API disponible para empresas
- Mercado Libre: API abierta con documentación pública
- Yapo: integración vía feed XML o API

**Por qué importa:** Elimina el trabajo duplicado de publicar la misma propiedad en 4 plataformas distintas. En muchas corredoras, esto consume 1-2 horas diarias de trabajo manual.

**Esfuerzo estimado:** 4-6 semanas (por portal). **Valor:** Alto.

---

### H2.3 — Módulo de Tasación Automática con IA

**Qué es:** Herramienta interna que estima el valor de una propiedad basándose en las propiedades del catálogo y en datos de transacciones históricas.

**Cómo funciona:**
- El agente ingresa dirección, tipo, metros, dormitorios y baños de una propiedad a tasar.
- El sistema compara con propiedades similares vendidas o arrendadas recientemente en la misma comuna.
- Entrega un rango de precio estimado con fundamento.

**Referencia en la industria:** Zillow (USA) tiene el "Zestimate" que hace exactamente esto. En Chile, Portal Inmobiliario ofrece estimaciones básicas. Nova podría tener su propia herramienta alimentada con los datos del catálogo propio.

**Por qué importa:** Le da al agente argumentos objetivos para discutir el precio con el propietario. Aumenta la credibilidad de la corredora.

**Esfuerzo estimado:** 3-4 semanas. **Valor:** Alto.

---

### H2.4 — Tour Virtual 360° Integrado

**Qué es:** Posibilidad de agregar un tour virtual 360° a la ficha de cada propiedad. El cliente puede recorrer la propiedad desde el celular o computador antes de ir físicamente.

**Cómo funciona:**
- El agente sube fotos 360° (tomadas con cámara o con el modo 360 del celular).
- El sistema genera una vista interactiva embebida en la ficha.
- Nova puede enviar el link del tour al cliente durante la conversación.

**Opciones técnicas:**
- Integración con Matterport (líder mundial, genera tours en minutos)
- Integración con Kuula o Tour.Builder (opciones más económicas)
- Solución propia con Pannellum (código abierto)

**Por qué importa:** Reduce visitas físicas innecesarias. El cliente ya llega a la visita convencido. Aumenta la tasa de cierre. En mercados como España y USA, el 60% de los compradores internacionales compra sin visitar físicamente gracias a los tours 360°.

**Esfuerzo estimado:** 2-3 semanas (con integración externa). **Valor:** Alto.

---

### H2.5 — Valoración Automática de Rentabilidad para Inversores

**Qué es:** Cuando un cliente indica que es inversor, Nova calcula automáticamente indicadores de rentabilidad de cada propiedad:

- Rentabilidad bruta anual (arriendo mensual x 12 / precio de compra)
- Retorno neto estimado (descontando gastos de administración, contribuciones, mantención)
- Precio por metro cuadrado comparado con el promedio de la comuna
- Tiempo de recuperación de la inversión

**Por qué importa:** Los inversores toman decisiones basadas en números. Nova hoy no tiene capacidad de calcular esto. Una herramienta así diferencia completamente la experiencia para este segmento de alto valor.

**Esfuerzo estimado:** 1-2 semanas. **Valor:** Alto para segmento inversor.

---

### H2.6 — Firma Digital de Documentos

**Qué es:** Integración con un servicio de firma electrónica (como FirmaVirtual, DocuSign o Acepta) para que los contratos generados en el módulo de documentos puedan ser firmados digitalmente por todas las partes sin necesidad de imprimirlos.

**Ventajas:**
- El contrato se envía por correo al firmante.
- El firmante firma desde el celular o computador.
- El documento firmado queda con validez legal en Chile.
- Todo queda registrado con fecha, IP y identidad.

**Marco legal:** En Chile, la Ley 19.799 reconoce la validez de la firma electrónica avanzada. Los contratos de arriendo pueden firmarse electrónicamente.

**Por qué importa:** Elimina la necesidad de imprimir, firmar físicamente, escanear y enviar. Ahorra 1-2 días en cada proceso de firma de contrato.

**Esfuerzo estimado:** 2-3 semanas. **Valor:** Alto.

---

### H2.7 — App Móvil Nativa (iOS / Android)

**Qué es:** Versión nativa de la aplicación para iPhone y Android con notificaciones push, acceso offline a leads y propiedades, y gestión del CRM desde el celular.

**Diferencia con la PWA actual:** La PWA ya permite instalar el sistema como app en el celular, pero tiene limitaciones (no recibe notificaciones push en iOS, no tiene acceso offline). Una app nativa resuelve ambos problemas.

**Tecnología sugerida:** React Native (un solo código para iOS y Android) o Expo.

**Por qué importa:** El 80% de los agentes inmobiliarios trabajan principalmente desde el celular. Una app nativa mejora significativamente la experiencia de uso en movilidad.

**Esfuerzo estimado:** 2-3 meses. **Valor:** Alto.

---

### H2.8 — Video-llamadas Integradas

**Qué es:** Posibilidad de iniciar una videollamada directamente desde el CRM o desde la conversación de WhatsApp para hacer un tour virtual "en vivo" de una propiedad con el cliente.

**Cómo funciona:**
- Desde el CRM, el agente hace clic en "Tour en vivo" en la ficha del lead.
- El sistema genera un link de videollamada y se lo envía por WhatsApp al cliente.
- El cliente entra con un clic, sin instalar nada.

**Tecnologías disponibles:**
- Daily.co (API de video, muy fácil de integrar)
- Whereby (link directo sin instalación)
- Jitsi (código abierto)

**Por qué importa:** Muy usado en mercados de alta demanda de inversores extranjeros. Permite mostrar una propiedad en tiempo real a alguien que está en otra ciudad o país.

**Esfuerzo estimado:** 2-3 semanas. **Valor:** Medio-Alto.

---

## HORIZONTE 3 — INNOVACIÓN AVANZADA (3 a 12 meses)

Funcionalidades que representan la vanguardia tecnológica en el sector inmobiliario a nivel global.

### H3.1 — Análisis Predictivo de Cierre

**Qué es:** Un modelo de inteligencia artificial entrenado con los datos históricos de leads del CRM que predice la probabilidad de cierre de cada lead activo.

**Cómo funciona:** El modelo analiza variables como canal de origen, temperatura inicial, número de interacciones, tiempo desde el primer contacto, tipo de propiedad de interés, rango de presupuesto y comportamiento en la conversación. Asigna un score de 0 a 100 a cada lead indicando la probabilidad de que cierre en los próximos 30 días.

**Referencia:** Esta tecnología es estándar en los CRMs de grandes inmobiliarias en USA (Salesforce con Einstein, HubSpot con IA, Follow Up Boss). Empresas como Compass y Redfin la usan masivamente.

**Por qué importa:** Permite al agente saber en qué leads vale la pena invertir tiempo y en cuáles no. Mejora la productividad significativamente cuando hay muchos leads.

**Esfuerzo estimado:** 2-3 meses. Requiere volumen de datos históricos. **Valor:** Muy alto (con escala).

---

### H3.2 — Reconocimiento de Voz en WhatsApp

**Qué es:** Nova puede procesar mensajes de voz enviados por WhatsApp. Los transcribe automáticamente, entiende el contenido y responde de forma apropiada.

**Por qué importa:** Un porcentaje alto de usuarios de WhatsApp en Chile y Latinoamérica prefiere enviar mensajes de voz. Hoy Nova no puede responder a estos mensajes. La integración de speech-to-text (Whisper de OpenAI, por ejemplo) resuelve este problema.

**Esfuerzo estimado:** 2-3 semanas. **Valor:** Alto para el mercado latinoamericano.

---

### H3.3 — Generación Automática de Descripciones con IA

**Qué es:** Al subir las fotos de una propiedad, la IA analiza las imágenes y genera automáticamente una descripción atractiva para la publicación en portales y para la ficha.

**Cómo funciona:** Se usa un modelo multimodal (como Claude que ya tiene el sistema) para analizar las imágenes de la propiedad y redactar una descripción profesional, destacando los atributos visibles (luminosidad, acabados, vista, distribución).

**Por qué importa:** Redactar descripciones atractivas para cada propiedad toma entre 15 y 30 minutos por propiedad. Con un catálogo de 50 propiedades, eso son más de 20 horas de trabajo que se pueden eliminar.

**Esfuerzo estimado:** 1-2 semanas. **Valor:** Alto.

---

### H3.4 — Integración con SII y Registro de Propiedades

**Qué es:** Conexión con los servicios del Servicio de Impuestos Internos de Chile y el Conservador de Bienes Raíces para:

- Verificar automáticamente que la propiedad existe y tiene los datos correctos
- Consultar el avalúo fiscal
- Verificar que no tiene hipotecas ni gravámenes pendientes
- Obtener el rol de la propiedad

**Por qué importa:** Hoy el agente debe verificar estos datos manualmente consultando el SII y el CBR. Automatizarlo reduce el tiempo de due diligence y evita errores.

**Esfuerzo estimado:** 2-3 meses (dependiendo de disponibilidad de APIs del SII). **Valor:** Muy alto.

---

### H3.5 — Recomendación Personalizada de Propiedades con IA

**Qué es:** Sistema que aprende las preferencias de cada lead a partir de su comportamiento (qué propiedades vio, cuáles rechazó, cuánto tiempo pasó en cada ficha) y genera recomendaciones personalizadas.

**Cómo funciona similar a Netflix o Spotify:** El sistema registra cada interacción del cliente con el catálogo y construye un perfil de preferencias. Cuando llega una propiedad nueva que encaja con ese perfil, el sistema le avisa proactivamente.

**Esfuerzo estimado:** 2-3 meses. Requiere tracking de comportamiento en la ficha. **Valor:** Muy alto.

---

### H3.6 — Agente de Compra Autónomo (Multi-Agent AI)

**Qué es:** La evolución natural de Nova: en lugar de ser solo un asistente conversacional reactivo, convertirlo en un agente proactivo que:

1. Monitorea el mercado constantemente
2. Detecta cuando una nueva propiedad encaja con el perfil exacto de un lead activo
3. Contacta proactivamente al lead (sin que este haya escrito primero) con la propiedad específica
4. Puede hacer comparativas de precio entre propiedades similares en la misma zona
5. Alerta al agente humano cuando detecta oportunidades de cierre inminente

**Tecnología:** Multi-agent AI frameworks como LangChain, AutoGen o los propios agentes de Claude.

**Por qué importa:** Hoy Nova es reactivo (espera que el cliente escriba). Un agente proactivo puede generar oportunidades de cierre sin que el equipo humano haga nada.

**Esfuerzo estimado:** 3-6 meses. **Valor:** Transformacional.

---

### H3.7 — Plataforma Blanca para Replicar a Otros Clientes

**Qué es:** Convertir el sistema Nova en un producto SaaS (Software como Servicio) que se pueda vender a otras corredoras de propiedades de Chile y Latinoamérica.

**La arquitectura multi-tenant ya existe:** el sistema ya soporta múltiples clientes (Prolig y Broker) desde el mismo código base usando variables de entorno. El siguiente paso es:

1. Panel de administración para crear y configurar nuevos "tenants" sin tocar código
2. Sistema de cobro mensual (integración con Stripe o Transbank)
3. Onboarding automatizado para nuevos clientes
4. Documentación y soporte escalable

**Por qué importa:** El costo marginal de agregar un nuevo cliente al sistema es casi cero. El valor que entrega es muy alto. El modelo SaaS tiene márgenes del 80% o más.

**Referencia:** Plataformas como Lofty (antes Chime) en USA hacen exactamente esto con un CRM inmobiliario más básico y facturan millones de dólares anuales.

**Esfuerzo estimado:** 3-6 meses. **Valor:** Transformacional (modelo de negocio nuevo).

---

# PARTE 5 — COMPARACIÓN CON TECNOLOGÍAS LÍDERES MUNDIALES

## 5.1 Principales Plataformas Inmobiliarias con IA en el Mundo

A continuación se compara Nova con las plataformas más avanzadas del mercado global:

### Zillow (USA) — Líder de mercado

**Lo que tienen que Nova no tiene:**
- Zestimate: algoritmo de tasación automática para cualquier propiedad en USA (H2.3)
- Búsqueda por lenguaje natural: "casa con jardín para perros en barrio tranquilo" (H2.1)
- Tiempo estimado de venta según el mercado local
- Visualización de tendencias de precio por zona en mapa interactivo
- Integración con agentes: el lead llega directamente al agente correcto según zona

**Lo que Nova tiene que Zillow no tiene:** Un asistente conversacional que agenda directamente, automatizaciones de WhatsApp, y presencia en múltiples canales sociales.

---

### Compass (USA) — La plataforma más tecnológica para agentes

**Lo que tienen que Nova no tiene:**
- AI-powered lead scoring con probabilidad de cierre (H3.1)
- Análisis predictivo: "Este cliente probablemente comprará en los próximos 60 días"
- Herramientas de marketing automatizadas (campañas email, redes sociales)
- Análisis de mercado en tiempo real con datos del MLS
- Dashboard de rendimiento para cada agente

---

### Rex Homes (Australia/USA) — IA para agentes

**Lo que tienen que Nova no tiene:**
- Automated Valuation Model (AVM) con alta precisión
- Chatbot con reconocimiento de voz
- Análisis de sentimiento en conversaciones

---

### Properati (Latinoamérica) — El más cercano geográficamente

**Lo que tienen que Nova no tiene:**
- Datos de precios de mercado por zona (precio/m² promedio por barrio)
- Alertas de precio: cuando una propiedad similar baja de precio
- Comparativas automáticas entre propiedades similares

**Lo que Nova tiene que Properati no tiene:** CRM, automatizaciones WhatsApp, asistente IA conversacional, gestión de administraciones.

---

## 5.2 Tendencias Globales en Real Estate Tech (2025-2026)

Las siguientes tendencias están siendo adoptadas por las plataformas líderes y representan la dirección hacia la que se mueve la industria:

| Tendencia | Descripción | Estado en Nova |
|---|---|---|
| IA conversacional (Chatbots LLM) | Asistentes que entienden lenguaje natural | Implementado |
| Búsqueda semántica | Buscar propiedades con descripciones en lenguaje natural | Pendiente (H2.1) |
| Automatización de WhatsApp | Follow-ups automáticos vía mensajería | Implementado |
| Tours virtuales 360° | Recorrer propiedades desde el celular | Pendiente (H2.4) |
| Tasación automática con IA | Estimar precio basándose en comparables | Pendiente (H2.3) |
| Firma digital de contratos | Firmar documentos legales electrónicamente | Pendiente (H2.6) |
| Predicción de cierre (lead scoring) | Score de probabilidad de compra por lead | Pendiente (H3.1) |
| Reconocimiento de voz en WhatsApp | Procesar mensajes de voz | Pendiente (H3.2) |
| Análisis de imágenes con IA | Describir propiedades analizando fotos | Pendiente (H3.3) |
| Agentes autónomos (Agentic AI) | IA que actúa proactivamente sin ser instruida | Pendiente (H3.6) |
| Plataforma SaaS multi-tenant | Vender el sistema como servicio a otras corredoras | En parte implementado (H3.7) |

---

# PARTE 6 — RESUMEN EJECUTIVO

## Lo que Nova ya hace excepcionalmente bien

- Opera 24/7 sin costo incremental por hora adicional de trabajo
- Captura, califica y hace seguimiento de leads de forma completamente autónoma
- Integra 4 canales de comunicación en un solo sistema (WhatsApp, Web, Messenger, Instagram)
- Agenda visitas directamente en Google Calendar sin intervención humana
- Ejecuta 8 tipos de automatizaciones de seguimiento con lógica contextual
- Informa requisitos, comisiones y opciones de financiamiento de forma precisa y consistente
- Genera una experiencia de atención al cliente superior a la mayoría de corredoras en Chile

## El camino de crecimiento más lógico

**Corto plazo (próximas 4 semanas):** Persistencia del historial, métricas de conversión, plantillas HSM de WhatsApp y exportación de leads. Son mejoras de infraestructura que aumentan la confiabilidad y la visibilidad del sistema.

**Mediano plazo (1 a 3 meses):** Búsqueda semántica, integración con portales y módulo de rentabilidad para inversores. Son funcionalidades que diferencian significativamente el producto en el mercado.

**Largo plazo (3 a 12 meses):** Reconocimiento de voz, análisis predictivo, firma digital y plataforma SaaS. Son las apuestas de mayor impacto estratégico y comercial.

## Estimación de potencial con los upgrades implementados

Con todas las mejoras del Horizonte 1 y 2 implementadas, se estima que Nova podría automatizar entre el **80% y el 85%** del trabajo operativo de una corredora, dejando al equipo humano enfocado exclusivamente en visitas físicas, negociación y cierre de contratos.

Eso equivale, en una corredora de 3 personas, a liberar el trabajo equivalente de 1,5 personas que hoy hacen tareas administrativas y de seguimiento.

---

*Análisis elaborado en Abril 2026.*  
*Sistema Nova v2 — En producción 24/7 en Railway*
