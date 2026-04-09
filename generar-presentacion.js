const {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, BorderStyle, ShadingType, Table, TableRow,
  TableCell, WidthType, VerticalAlign, PageBreak, Spacing
} = require('/Users/thebigshow/Desktop/robot-inmobiliario/node_modules/docx')
const fs = require('fs')

const AZUL = '1A3A5C'
const DORADO = 'C9A96E'
const GRIS = 'F5F5F5'
const GRIS_TEXTO = '555555'
const BLANCO = 'FFFFFF'

const titulo = (texto) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 400, after: 200 },
  children: [new TextRun({
    text: texto, bold: true, size: 36, color: AZUL,
    font: 'Calibri'
  })]
})

const subtitulo = (texto) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 320, after: 160 },
  children: [new TextRun({
    text: texto, bold: true, size: 26, color: AZUL,
    font: 'Calibri'
  })]
})

const seccion = (texto) => new Paragraph({
  heading: HeadingLevel.HEADING_3,
  spacing: { before: 240, after: 120 },
  children: [new TextRun({
    text: texto, bold: true, size: 22, color: DORADO,
    font: 'Calibri'
  })]
})

const parrafo = (texto, opciones = {}) => new Paragraph({
  spacing: { before: 80, after: 80 },
  children: [new TextRun({
    text: texto, size: 20, color: opciones.color || '333333',
    bold: opciones.bold || false, italics: opciones.italics || false,
    font: 'Calibri'
  })]
})

const bullet = (texto, negrita = '') => new Paragraph({
  bullet: { level: 0 },
  spacing: { before: 60, after: 60 },
  children: [
    negrita ? new TextRun({ text: negrita + ' ', bold: true, size: 20, color: AZUL, font: 'Calibri' }) : null,
    new TextRun({ text: negrita ? texto : texto, size: 20, color: '444444', font: 'Calibri' })
  ].filter(Boolean)
})

const separador = () => new Paragraph({
  spacing: { before: 200, after: 200 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E0E0E0' } },
  children: [new TextRun({ text: '' })]
})

const salto = () => new Paragraph({ children: [new TextRun({ text: '' })] })

const tablaCaracteristicas = (filas) => new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  rows: [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          width: { size: 40, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.SOLID, color: AZUL },
          children: [new Paragraph({ children: [new TextRun({ text: 'Característica', bold: true, color: BLANCO, size: 20, font: 'Calibri' })] })]
        }),
        new TableCell({
          width: { size: 60, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.SOLID, color: AZUL },
          children: [new Paragraph({ children: [new TextRun({ text: 'Descripción', bold: true, color: BLANCO, size: 20, font: 'Calibri' })] })]
        })
      ]
    }),
    ...filas.map(([col1, col2], i) => new TableRow({
      children: [
        new TableCell({
          shading: { type: ShadingType.SOLID, color: i % 2 === 0 ? GRIS : BLANCO },
          children: [new Paragraph({ children: [new TextRun({ text: col1, bold: true, size: 19, color: AZUL, font: 'Calibri' })] })]
        }),
        new TableCell({
          shading: { type: ShadingType.SOLID, color: i % 2 === 0 ? GRIS : BLANCO },
          children: [new Paragraph({ children: [new TextRun({ text: col2, size: 19, color: '333333', font: 'Calibri' })] })]
        })
      ]
    }))
  ]
})

const doc = new Document({
  sections: [{
    properties: {
      page: {
        margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 }
      }
    },
    children: [

      // ── PORTADA ──────────────────────────────────────────────────────
      salto(), salto(), salto(),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 100 },
        children: [new TextRun({ text: 'NOVA', bold: true, size: 80, color: AZUL, font: 'Calibri' })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 200 },
        children: [new TextRun({ text: 'Asistente Inmobiliario con Inteligencia Artificial', size: 28, color: GRIS_TEXTO, font: 'Calibri' })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 600 },
        children: [new TextRun({ text: 'Presentación Comercial — Prolig Propiedades', size: 22, color: DORADO, italics: true, font: 'Calibri' })]
      }),
      separador(),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 100 },
        children: [new TextRun({ text: 'Sistema CRM + IA para Corredoras de Propiedades', size: 24, bold: true, color: AZUL, font: 'Calibri' })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 100 },
        children: [new TextRun({ text: 'Desarrollado exclusivamente para el mercado inmobiliario chileno', size: 20, color: GRIS_TEXTO, font: 'Calibri' })]
      }),
      salto(), salto(), salto(),
      new Paragraph({ children: [new PageBreak()] }),

      // ── QUÉ ES NOVA ──────────────────────────────────────────────────
      titulo('¿Qué es Nova?'),
      parrafo('Nova es un sistema de inteligencia artificial diseñado específicamente para corredoras de propiedades en Chile. Combina un asistente virtual disponible las 24 horas con un panel de administración completo, permitiendo automatizar la atención de clientes, gestionar propiedades y hacer seguimiento de leads desde un solo lugar.'),
      salto(),
      parrafo('Nova atiende a sus clientes automáticamente por WhatsApp, Instagram, Facebook Messenger y la web — sin que usted tenga que estar presente. Cuando un cliente tiene interés, Nova captura sus datos, agenda visitas y le notifica en tiempo real.'),
      separador(),

      // ── CANALES ──────────────────────────────────────────────────────
      subtitulo('1. Atención Automática 24/7'),
      parrafo('Nova responde a sus clientes de forma inmediata, en cualquier horario, por todos los canales digitales:'),
      salto(),
      tablaCaracteristicas([
        ['WhatsApp', 'Responde mensajes automáticamente. El cliente escribe y Nova contesta al instante con información de propiedades, precios y disponibilidad.'],
        ['Instagram DM', 'Atiende mensajes directos de Instagram. Los interesados en sus publicaciones reciben respuesta inmediata.'],
        ['Facebook Messenger', 'Integrado con su página de Facebook. Nova responde consultas directamente desde Messenger.'],
        ['Chat Web', 'Widget de chat en su sitio web. Los visitantes pueden consultar propiedades sin llamar ni escribir por WhatsApp.'],
      ]),
      separador(),

      // ── CHATBOT ──────────────────────────────────────────────────────
      subtitulo('2. Inteligencia Artificial Inmobiliaria'),
      parrafo('Nova no es un chatbot básico con respuestas predefinidas. Usa inteligencia artificial avanzada (Claude AI) entrenada con el conocimiento inmobiliario chileno:'),
      salto(),
      bullet('Conoce todas sus propiedades disponibles y las muestra según lo que busca el cliente'),
      bullet('Responde preguntas sobre leyes de arriendo (Ley 18.101), créditos hipotecarios, DFL-2 y más'),
      bullet('Explica condiciones de compra, venta y arriendo con precisión'),
      bullet('Calcula aproximaciones de dividendos, arriendos y cap rates'),
      bullet('Siempre recomienda asesoría profesional en temas legales complejos'),
      bullet('Responde en español, con tono profesional y cercano'),
      bullet('Nunca inventa información — solo comparte datos reales de sus propiedades'),
      separador(),

      // ── AGENDA ───────────────────────────────────────────────────────
      subtitulo('3. Agendamiento Automático de Visitas'),
      parrafo('Cuando un cliente quiere ver una propiedad, Nova gestiona todo el proceso sin intervención humana:'),
      salto(),
      bullet('Nova solicita nombre, teléfono, propiedad de interés, fecha y hora preferida'),
      bullet('Verifica disponibilidad en Google Calendar en tiempo real'),
      bullet('Si el horario está ocupado, ofrece alternativas automáticamente'),
      bullet('Crea el evento en Google Calendar con todos los datos del cliente'),
      bullet('Horarios disponibles: lunes a sábado, 9:00 am a 7:00 pm'),
      bullet('Usted recibe la visita directamente en su calendario — sin intervención'),
      separador(),

      // ── LEADS ────────────────────────────────────────────────────────
      subtitulo('4. Captura y Gestión de Leads'),
      parrafo('Todo cliente que interactúa con Nova queda registrado automáticamente en el CRM:'),
      salto(),
      tablaCaracteristicas([
        ['Captura automática', 'Nombre, teléfono, propiedad de interés y canal de contacto (WhatsApp, web, Instagram, etc.)'],
        ['Estados del lead', 'Nuevo → Tibio → Caliente → Visita agendada → Frío. Usted actualiza el estado con un click.'],
        ['Notificación inmediata', 'Cuando un lead se marca como "caliente", Nova le notifica por WhatsApp y correo electrónico al instante.'],
        ['Sin duplicados', 'Nova identifica a cada cliente por su número de teléfono, evitando registros repetidos.'],
      ]),
      separador(),

      // ── CRM ──────────────────────────────────────────────────────────
      subtitulo('5. Panel CRM — Gestión de Clientes'),
      parrafo('El CRM de Nova está diseñado para que usted y su equipo trabajen de forma organizada y profesional:'),
      salto(),
      seccion('Vista Lista'),
      bullet('Todos los leads en una tabla ordenada por fecha de ingreso'),
      bullet('Filtros por estado, canal de contacto y búsqueda por nombre o propiedad'),
      bullet('Cambio de estado con un click desde la misma tabla'),
      bullet('Indicador de prioridad (alta, media, baja) con punto de color'),
      salto(),
      seccion('Vista Pipeline (Kanban)'),
      bullet('Visualización de leads organizados por etapa: Nuevo, Tibio, Caliente, Visita, Frío'),
      bullet('Cada card muestra nombre, teléfono, propiedad de interés y fecha de contacto'),
      bullet('Botón directo de WhatsApp para contactar al cliente desde el panel'),
      salto(),
      seccion('Vista Seguimientos'),
      bullet('Lista de leads con fechas de seguimiento programadas'),
      bullet('Indicador de seguimientos vencidos, de hoy y futuros'),
      bullet('Badge de alerta cuando hay seguimientos pendientes ese día'),
      salto(),
      seccion('Detalle de cada Lead'),
      bullet('Próxima acción programada (ej: llamar, enviar fotos, hacer oferta)'),
      bullet('Fecha de seguimiento con recordatorio visual'),
      bullet('Notas internas del agente'),
      bullet('Historial completo de actividad — cada cambio queda registrado con fecha y hora'),
      bullet('Asignación de agente responsable'),
      separador(),

      // ── ADMIN ────────────────────────────────────────────────────────
      subtitulo('6. Panel de Propiedades'),
      parrafo('Gestione su cartera de propiedades de forma completa desde el panel de administración:'),
      salto(),
      tablaCaracteristicas([
        ['Agregar propiedades', 'Ingrese dirección, tipo, operación (venta/arriendo), precio, dormitorios, baños, metros y descripción.'],
        ['Foto principal', 'Suba una imagen destacada para cada propiedad. Nova la muestra al chatbot y en la ficha pública.'],
        ['Galería múltiple', 'Agregue hasta 10 fotos por propiedad. El cliente puede ver todas las imágenes desde el chat.'],
        ['Ficha pública', 'Cada propiedad tiene su propia URL con diseño profesional y fotos para compartir por WhatsApp o redes.'],
        ['Disponibilidad', 'Active o desactive una propiedad con un click. Nova automáticamente deja de mostrarla cuando no está disponible.'],
        ['Importar Excel', 'Cargue múltiples propiedades a la vez desde un archivo Excel. Ideal para ingresar toda su cartera de una vez.'],
      ]),
      separador(),

      // ── SISTEMA MULTIAGENTE ──────────────────────────────────────────
      subtitulo('7. Sistema Multi-Agente con Roles'),
      parrafo('Nova permite que todo su equipo trabaje en la plataforma con accesos diferenciados:'),
      salto(),
      tablaCaracteristicas([
        ['Administrador', 'Acceso total: propiedades, CRM completo, administraciones, finanzas, documentos y gestión de usuarios.'],
        ['Agente', 'Ve solo sus propios leads asignados, propiedades en modo lectura y documentos. No puede ver finanzas ni administraciones.'],
        ['Acceso seguro', 'Cada usuario tiene correo y contraseña propios. No se comparten credenciales.'],
        ['Usuarios ilimitados', 'Cree tantos agentes como necesite sin costo adicional.'],
      ]),
      separador(),

      // ── ADMINISTRACIONES ─────────────────────────────────────────────
      subtitulo('8. Panel de Administraciones'),
      parrafo('Para corredoras que administran propiedades en arriendo, Nova incluye un módulo completo:'),
      salto(),
      bullet('Registro de propietarios con datos bancarios para transferencias'),
      bullet('Control de arrendatarios y contratos activos'),
      bullet('Seguimiento de arriendos mensuales — pagados y pendientes'),
      bullet('Cálculo automático de comisiones por porcentaje definido'),
      bullet('Resumen financiero: arriendo total mensual y comisiones por cobrar'),
      bullet('Estado de pago por propiedad: pagado o pendiente'),
      separador(),

      // ── DOCUMENTOS ───────────────────────────────────────────────────
      subtitulo('9. Generador de Documentos Legales'),
      parrafo('Nova genera documentos profesionales listos para imprimir o enviar en segundos:'),
      salto(),
      tablaCaracteristicas([
        ['Contrato de Arrendamiento', 'Generado con los datos del propietario, arrendatario, propiedad, monto y condiciones. Listo para firmar.'],
        ['Orden de Visita', 'Documento formal para cada visita agendada. Incluye datos del cliente y la propiedad.'],
        ['Acuerdo de Administración', 'Contrato entre la corredora y el propietario para servicios de administración.'],
        ['Logo personalizado', 'Suba el logo de su corredora y aparece automáticamente en todos los documentos.'],
      ]),
      separador(),

      // ── REPORTES ─────────────────────────────────────────────────────
      subtitulo('10. Reportes y Automatizaciones'),
      parrafo('Nova trabaja de forma autónoma para mantenerlo informado y activo en redes sociales:'),
      salto(),
      seccion('Reporte Semanal Automático'),
      bullet('Todos los lunes a las 8:00 am recibe un resumen por correo electrónico'),
      bullet('Incluye: total de leads del mes, leads por estado, tabla completa y link al CRM'),
      bullet('Sin configuración adicional — funciona solo'),
      salto(),
      seccion('Publicación Automática en Redes Sociales'),
      bullet('Cada propiedad nueva puede publicarse automáticamente en Facebook e Instagram'),
      bullet('Nova genera el post con la foto y descripción de la propiedad'),
      bullet('Integrado con sus cuentas de redes sociales'),
      salto(),
      seccion('Notificaciones en Tiempo Real'),
      bullet('Cuando un lead se marca como "caliente" → recibe WhatsApp y correo inmediato'),
      bullet('Incluye nombre, teléfono y propiedad de interés del cliente'),
      separador(),

      // ── PWA ──────────────────────────────────────────────────────────
      subtitulo('11. Aplicación Instalable (sin App Store)'),
      parrafo('Nova funciona como una aplicación profesional instalable en cualquier dispositivo, sin necesidad de pasar por la App Store o Google Play:'),
      salto(),
      bullet('iPhone y iPad: instalar desde Safari en 2 pasos'),
      bullet('Android: instalar desde Chrome automáticamente'),
      bullet('Mac y PC: instalar desde Chrome como app de escritorio'),
      bullet('Se ve y funciona como una app nativa — sin barra de navegador'),
      bullet('Acceso directo desde el Dock, escritorio o pantalla de inicio del celular'),
      separador(),

      // ── FINANZAS ─────────────────────────────────────────────────────
      subtitulo('12. Panel de Finanzas'),
      parrafo('Módulo de control financiero para llevar un registro ordenado de las operaciones de la corredora:'),
      salto(),
      bullet('Registro de ingresos por comisiones de venta y arriendo'),
      bullet('Control de gastos operacionales'),
      bullet('Balance mensual y anual'),
      bullet('Acceso exclusivo para administradores'),
      separador(),

      // ── FICHA PÚBLICA ─────────────────────────────────────────────────
      subtitulo('13. Ficha Pública de Propiedades'),
      parrafo('Cada propiedad tiene su propia página web profesional para compartir con clientes:'),
      salto(),
      bullet('URL única por propiedad — compártala por WhatsApp, correo o redes sociales'),
      bullet('Galería de fotos con diseño elegante'),
      bullet('Información completa: precio, dormitorios, baños, metros cuadrados y descripción'),
      bullet('Vista previa optimizada para redes sociales (OG tags) — cuando alguien comparte el link, se muestra la foto y datos de la propiedad automáticamente'),
      separador(),

      // ── SEGURIDAD ────────────────────────────────────────────────────
      subtitulo('14. Seguridad y Privacidad'),
      parrafo('Sus datos y los de sus clientes están protegidos con estándares profesionales:'),
      salto(),
      tablaCaracteristicas([
        ['Base de datos exclusiva', 'Cada cliente tiene su propia base de datos separada. Sus datos nunca se mezclan con los de otras corredoras.'],
        ['Acceso por contraseña', 'El panel requiere correo y contraseña. Las sesiones expiran automáticamente.'],
        ['Servidor dedicado', 'Nova corre en un servidor propio en la nube, disponible las 24 horas los 365 días del año.'],
        ['HTTPS', 'Toda la comunicación está cifrada. Los datos viajan de forma segura.'],
      ]),
      separador(),

      // ── RESUMEN ──────────────────────────────────────────────────────
      new Paragraph({ children: [new PageBreak()] }),
      titulo('Resumen de Funcionalidades'),
      salto(),
      tablaCaracteristicas([
        ['Asistente IA 24/7', 'WhatsApp, Instagram, Messenger y Web'],
        ['Agendamiento automático', 'Visitas directas a Google Calendar'],
        ['CRM de leads', 'Lista, Pipeline Kanban y Seguimientos'],
        ['Gestión de propiedades', 'CRUD completo, galería y ficha pública'],
        ['Multi-agente', 'Roles diferenciados admin y agente'],
        ['Administraciones', 'Control de arriendos y comisiones'],
        ['Documentos legales', 'Contratos generados automáticamente'],
        ['Reporte semanal', 'Email automático cada lunes 8am'],
        ['Publicación en redes', 'Facebook e Instagram automático'],
        ['Notificaciones', 'WhatsApp y email por leads calientes'],
        ['App instalable (PWA)', 'Sin App Store, en cualquier dispositivo'],
        ['Panel de finanzas', 'Control de ingresos y gastos'],
        ['Ficha pública', 'URL única por propiedad con galería'],
        ['Seguridad', 'Base de datos exclusiva y HTTPS'],
      ]),
      separador(),

      // ── PRECIOS ──────────────────────────────────────────────────────
      subtitulo('Inversión'),
      salto(),
      tablaCaracteristicas([
        ['Instalación y configuración', '$150.000 CLP — pago único'],
        ['Mensualidad', '$49.000 CLP/mes — todo incluido'],
        ['Facebook e Instagram', '+$40.000 CLP/mes'],
        ['Galería de fotos premium', '+$20.000 CLP'],
        ['Publicación automática en redes', '+$20.000 CLP/mes'],
      ]),
      salto(),
      parrafo('La mensualidad incluye: hosting del servidor, base de datos, asistente IA, actualizaciones y soporte técnico.', { color: GRIS_TEXTO, italics: true }),
      separador(),

      // ── CIERRE ───────────────────────────────────────────────────────
      salto(),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 200 },
        children: [new TextRun({ text: 'Nova — Prolig Propiedades', bold: true, size: 28, color: AZUL, font: 'Calibri' })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'felipec.constructor@gmail.com  ·  +56 9 2055 3288', size: 20, color: GRIS_TEXTO, font: 'Calibri' })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 100 },
        children: [new TextRun({ text: 'robot-inmobiliario-production.up.railway.app', size: 20, color: DORADO, font: 'Calibri' })]
      }),
    ]
  }]
})

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync('/Users/thebigshow/robot-inmobiliario/Nova_Presentacion_Cliente.docx', buffer)
  console.log('✓ Documento generado: Nova_Presentacion_Cliente.docx')
})
