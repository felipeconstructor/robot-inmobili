require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { createClient } = require('@supabase/supabase-js')
const { google } = require('googleapis')
const path = require('path')
const cron = require('node-cron')
const app = express()
app.use(cors())
app.use(express.json({ limit: '20mb' }))
app.use(express.urlencoded({ extended: false }))

// ─── Autenticacion paneles ────────────────────────────────────────────────────
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'nova2026'
const sesionesActivas = new Map() // token → { email, nombre, rol }

function hashPassword(pw) {
  return require('crypto').createHash('sha256').update(pw + 'nova_salt_2026').digest('hex')
}

function parseCookies(req) {
  const cookies = {}
  const header = req.headers.cookie
  if (header) {
    header.split(';').forEach(c => {
      const [k, ...v] = c.split('=')
      cookies[k.trim()] = decodeURIComponent(v.join('=').trim())
    })
  }
  return cookies
}

function requireAuth(req, res, next) {
  const cookies = parseCookies(req)
  if (sesionesActivas.has(cookies.nova_session)) return next()
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Sesion expirada', login: true })
  res.redirect('/login.html?next=' + encodeURIComponent(req.path))
}

function requireAdmin(req, res, next) {
  const cookies = parseCookies(req)
  const sesion = sesionesActivas.get(cookies.nova_session)
  if (sesion && sesion.rol === 'admin') return next()
  if (req.path.startsWith('/api/')) return res.status(403).json({ error: 'Se requiere rol admin', login: true })
  res.redirect('/crm.html')
}

// Rutas protegidas — ANTES de express.static
app.get('/admin.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'))
})
app.get('/crm.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'crm.html'))
})
app.get('/documentos.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'documentos.html'))
})
app.get('/administraciones.html', requireAuth, requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'administraciones.html'))
})
app.get('/finanzas.html', requireAuth, requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'finanzas.html'))
})
app.get('/usuarios.html', requireAuth, requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'usuarios.html'))
})

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body
  if (!password) return res.status(401).json({ error: 'Contrasena requerida' })

  let sesionData = null

  // Login con email + password — busca en tabla usuarios
  if (email) {
    try {
      const { data: usuario } = await supabase
        .from('usuarios')
        .select('id, nombre, email, rol, password_hash, activo')
        .eq('email', email.toLowerCase().trim())
        .eq('activo', true)
        .single()
      if (usuario && usuario.password_hash === hashPassword(password)) {
        sesionData = { email: usuario.email, nombre: usuario.nombre, rol: usuario.rol }
      }
    } catch (err) {
      // tabla no existe aun — cae al fallback
    }
  }

  // Fallback: solo password contra ADMIN_PASSWORD (retrocompatibilidad)
  if (!sesionData && password === ADMIN_PASSWORD) {
    sesionData = { email: 'admin', nombre: 'Admin', rol: 'admin' }
  }

  if (!sesionData) {
    return res.status(401).json({ error: 'Credenciales incorrectas' })
  }

  const token = require('crypto').randomBytes(32).toString('hex')
  sesionesActivas.set(token, sesionData)
  const maxAge = 7 * 24 * 3600
  res.setHeader('Set-Cookie', `nova_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}`)
  res.json({ ok: true, rol: sesionData.rol, nombre: sesionData.nombre })
})

app.get('/api/logout', (req, res) => {
  const cookies = parseCookies(req)
  sesionesActivas.delete(cookies.nova_session)
  res.setHeader('Set-Cookie', 'nova_session=; Path=/; HttpOnly; Max-Age=0')
  res.redirect('/login.html')
})

app.get('/api/me', requireAuth, (req, res) => {
  const cookies = parseCookies(req)
  const sesion = sesionesActivas.get(cookies.nova_session)
  res.json(sesion)
})

// ─── CRUD usuarios (solo admin) ───────────────────────────────────────────────
app.get('/api/usuarios', requireAuth, requireAdmin, async (req, res) => {
  const { data, error } = await supabase
    .from('usuarios')
    .select('id, nombre, email, rol, activo, created_at')
    .order('created_at')
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

app.post('/api/usuarios', requireAuth, requireAdmin, async (req, res) => {
  const { nombre, email, password, rol } = req.body
  if (!nombre || !email || !password) return res.status(400).json({ error: 'Faltan datos: nombre, email, password' })
  const { data, error } = await supabase
    .from('usuarios')
    .insert({ nombre, email: email.toLowerCase().trim(), password_hash: hashPassword(password), rol: rol || 'agente', activo: true })
    .select('id, nombre, email, rol, activo, created_at')
    .single()
  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

app.put('/api/usuarios/:id', requireAuth, requireAdmin, async (req, res) => {
  const { nombre, rol, activo, password } = req.body
  const updates = {}
  if (nombre !== undefined) updates.nombre = nombre
  if (rol !== undefined) updates.rol = rol
  if (activo !== undefined) updates.activo = activo
  if (password) updates.password_hash = hashPassword(password)
  const { data, error } = await supabase
    .from('usuarios')
    .update(updates)
    .eq('id', req.params.id)
    .select('id, nombre, email, rol, activo')
    .single()
  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})
// ─────────────────────────────────────────────────────────────────────────────

// Endpoint config publica — los HTMLs piden las credenciales Supabase al servidor
app.get('/api/config', (req, res) => {
  let siteName = process.env.SITE_NAME
  if (!siteName) {
    const host = req.headers.host || ''
    if (host.includes('broker')) siteName = 'Broker Inmobiliario'
    else if (host.includes('ligua')) siteName = 'Corredora La Ligua'
    else siteName = 'Nova — Prolig Propiedades'
  }
  res.json({
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_KEY,
    siteName
  })
})

// ─── PWA íconos ───────────────────────────────────────────────────────────────
function generarSVGIcono() {
  const siteName = process.env.SITE_NAME || ''
  const isBroker = siteName.toLowerCase().includes('broker')
  const blue = isBroker ? '#3B52D4' : '#1A3A5C'
  const blueDark = isBroker ? '#2D40B8' : '#0F2540'
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${blue}"/>
      <stop offset="100%" stop-color="${blueDark}"/>
    </linearGradient>
    <linearGradient id="cyan" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#00D9FF" stop-opacity="0"/>
      <stop offset="50%" stop-color="#00D9FF" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#00D9FF" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="90" fill="url(#bg)"/>
  <rect x="60" y="62" width="392" height="2" rx="1" fill="url(#cyan)"/>
  <text x="256" y="295" font-family="Arial Black, Arial, sans-serif" font-weight="900"
        font-size="280" fill="#E0E8FF" text-anchor="middle" dominant-baseline="middle"
        letter-spacing="-8">N</text>
  <rect x="176" y="388" width="160" height="4" rx="2" fill="#00D9FF" opacity="0.85"/>
  <rect x="60" y="448" width="392" height="2" rx="1" fill="url(#cyan)"/>
</svg>`
}

// SVG dinámico (se adapta a Nova o Broker)
app.get('/icons/icon.svg', (_req, res) => {
  res.setHeader('Content-Type', 'image/svg+xml')
  res.setHeader('Cache-Control', 'public, max-age=3600')
  res.send(generarSVGIcono())
})

// PNGs redirigen al SVG dinámico
app.get('/icons/icon-:size.png', (_req, res) => {
  res.redirect('/icons/icon.svg')
})

// ─── PWA Manifest dinámico ───────────────────────────────────────────────────
app.get('/manifest.json', (req, res) => {
  const siteName = process.env.SITE_NAME || 'Nova — Prolig Propiedades'
  const isBroker = siteName.toLowerCase().includes('broker')
  const themeColor = isBroker ? '#3B52D4' : '#1A3A5C'
  const shortName = isBroker ? 'Broker CRM' : 'Nova CRM'

  res.json({
    name: siteName,
    short_name: shortName,
    description: 'CRM inmobiliario con inteligencia artificial',
    start_url: '/login.html',
    scope: '/',
    display: 'standalone',
    background_color: '#0A0E1A',
    theme_color: themeColor,
    orientation: 'portrait-primary',
    categories: ['business', 'productivity'],
    icons: [
      { src: isBroker ? '/icons/broker-icon-192.png' : '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: isBroker ? '/icons/broker-icon-512.png' : '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      { src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }
    ],
    shortcuts: [
      { name: 'CRM', short_name: 'CRM', url: '/crm.html', description: 'Ver leads' },
      { name: 'Propiedades', short_name: 'Propiedades', url: '/admin.html', description: 'Gestionar propiedades' }
    ]
  })
})

app.use(express.static(path.join(__dirname, 'public')))

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

const CALENDAR_ID = process.env.CALENDAR_ID || 'felipec.constructor@gmail.com'
const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, 'google-credentials.json'),
  scopes: ['https://www.googleapis.com/auth/calendar']
})
const calendar = google.calendar({ version: 'v3', auth })

// Link al catalogo de WhatsApp (publico, no es dato sensible)
const CATALOGO_URL = process.env.WHATSAPP_CATALOGO_URL || 'https://wa.me/c/56920553288'

// URL base del sitio — cambiar en Railway por cliente (env var APP_URL)
const APP_URL = process.env.APP_URL || 'https://robot-inmobiliario-production.up.railway.app'
if (!process.env.APP_URL) console.log('ADVERTENCIA: APP_URL no definida — usando URL de Nova por defecto')

const EMPRESA = process.env.SITE_NAME || 'Prolig Propiedades'

const SISTEMA_BASE = `
Eres Nova, asistente virtual de ${EMPRESA}, corredora de propiedades en Chile.
Respondes siempre en espanol, con tono amable, profesional y cercano.
REGLA OBLIGATORIA: Nunca uses markdown, emojis, asteriscos ni simbolos especiales. Solo texto plano.
Nunca inventes datos legales ni valores sin aclarar que son aproximados.
Si necesitan asesoria legal recomienda un abogado.
Si el cliente quiere agendar una visita pidele nombre, telefono y propiedad de interes.

CAPTACION DE DATOS — REGLA IMPORTANTE:
Nunca pidas el nombre ni telefono de forma directa o forzada. Si el cliente lo menciona de manera natural en la conversacion, guardalo. Solo pidelo cuando el cliente quiera agendar una visita (es necesario para coordinar). Si el cliente da sus datos voluntariamente, agradecele brevemente y sigue la conversacion con normalidad.

LONGITUD DE RESPUESTAS — REGLA ESTRICTA:
Maximo 2 oraciones de respuesta. Si la pregunta es sobre leyes, financiamiento o informacion general responde en 1 sola oracion clara y directa. Nunca expliques todo lo que sabes sobre un tema. Solo responde lo que el cliente pregunto y nada mas. Si hay un link de ficha o de agenda, ese link debe ser lo ultimo visible y no debe quedar enterrado en texto largo.

LISTA DE PROPIEDADES — REGLA OBLIGATORIA:
Cuando el cliente pida ver propiedades disponibles, presenta cada propiedad en este formato exacto. NUNCA agregues "Propiedad 1:", "Propiedad 2:" ni numeracion. NUNCA incluyas IMAGEN_URL en la lista. NUNCA pongas emoji antes de los links, solo pon el link solo.

🏠 [Tipo] en [Comuna]
💰 $[Precio formateado] [Moneda]
🛏 [Dormitorios] dorm · 🚿 [Banos] baños · 📐 [Metros]m²
[link Ver ubicacion en mapa de esa propiedad]
[Ficha completa con fotos link de esa propiedad]

Separa cada propiedad con una linea en blanco. Solo pon los links solos sin texto antes ni despues en esa linea.

PROPIEDAD ESPECIFICA:
Cuando el cliente pregunte por UNA propiedad especifica o pida mas detalles de una, ahi si incluye al final:
- El link de ubicacion solo en su linea
- El link de ficha solo en su linea
- IMAGEN_URL|[url exacta de la imagen de esa propiedad] si tiene imagen
Nunca inventes links ni IDs.
Ademas, si la propiedad tiene imagen disponible, incluye en una linea separada al final:
IMAGEN_URL|{url_exacta_de_la_imagen}
Solo una imagen por respuesta. Solo si la propiedad tiene imagen. No inventes URLs.

AGENDA DE VISITAS:
Cuando un cliente quiera ver una propiedad debes:
1. Preguntar su nombre completo
2. Preguntar su telefono
3. Preguntar que propiedad quiere ver
4. Preguntar que fecha prefiere formato YYYY-MM-DD
5. Preguntar que hora prefiere entre 9am y 7pm
6. Cuando tengas todos los datos responde EXACTAMENTE asi sin nada mas:
AGENDAR_VISITA|nombre|telefono|propiedad|fecha|hora

GUARDAR_LEAD Y CLASIFICACION INTELIGENTE:
Cuando el cliente te diga su nombre y telefono, analiza TODA la conversacion anterior y clasifica con criterio. Responde exactamente:
LEAD_DATOS|nombre|telefono|propiedad_consultada|tipo|temperatura

TIPO — detecta por el contexto, no solo por lo que dicen explicitamente:
- comprador: pregunta por precio de venta, credito hipotecario, subsidios, escritura, pie, notario, cuanto sale al mes
- arrendatario: pregunta por arriendo, garantia, requisitos para arrendar, valor mensual, disponibilidad inmediata
- inversor: pregunta por rentabilidad, cap rate, plusvalia, retorno, compra para arrendar, cuantas propiedades tienen disponibles, precio por m2, comunas con mayor plusvalia
- comercial: busca local, oficina, bodega, galpon, uso comercial, metros para negocio

TEMPERATURA — analiza senales de urgencia e intencion real:
CALIENTE (actuar ya):
. Pregunta exactamente cuanto cuesta y cuando puede verla
. Tiene el financiamiento o ahorro claro ("tengo el pie", "tengo preaprobacion", "es al contado")
. Da sus datos sin que se los pidas
. Dice que necesita mudarse pronto o tiene fecha limite
. Pregunta por disponibilidad inmediata o proxima entrega
. Ya visito o quiere visitar esta semana

TIBIO (interes real pero sin urgencia):
. Hace preguntas especificas sobre una propiedad concreta pero sin presion de tiempo
. Compara varias opciones o pide mas detalles
. Pregunta sobre proceso de compra o arriendo en general
. Interesado pero dice "estoy viendo opciones" o "todavia estoy buscando"

FRIO (solo explora):
. Solo pide lista de propiedades disponibles sin detallar interes
. Pregunta cosas generales como leyes, subsidios, precios de mercado
. No da datos personales aunque se los pidas
. Responde con evasivas o no confirma interes en ninguna propiedad especifica

Ejemplo: LEAD_DATOS|Juan Perez|912345678|Casa La Ligua|comprador|caliente

REQUISITOS DE ARRIENDO — ENTREGAR AUTOMATICAMENTE:
Cuando un cliente consulte sobre arrendar cualquier propiedad, antes de mostrar propiedades disponibles entrega esta informacion de forma clara y ordenada:
Para persona natural:
. Ultimas 3 liquidaciones de sueldo (o declaracion de renta si eres independiente)
. Contrato de trabajo vigente
. Cedula de identidad vigente por ambas caras
. Garantia equivalente a 1 mes de arriendo
. Renta minima: 3 veces el valor del arriendo mensual
Para empresa o local comercial:
. RUT empresa y escritura de constitucion de sociedad
. Balance y declaracion de renta del ultimo ano
. Cedula de identidad del representante legal
. Garantia equivalente a 2 meses de arriendo
. Documentos que acrediten giro comercial compatible con el inmueble

LEYES (usar solo si te preguntan directamente — responder en 1 oracion):
- Ley 18.101 Arrendamiento predios urbanos
- DFL-2 Beneficios tributarios propiedades bajo 140m2
- Ley 19.537 Copropiedad inmobiliaria
- IVA propiedades nuevas 19% con credito especial
- Impuesto mayor valor sobre 8000 UF tiene impuesto

CONSULTAS DE COMPRA — FLUJO OBLIGATORIO:
Cuando un cliente muestre interes en comprar una propiedad, preguntale PRIMERO cual es su forma de pago o financiamiento con este mensaje exacto:

"Para ayudarte mejor, necesito saber como planeas financiar la compra. Estas son las opciones disponibles:
1. Contado
2. Credito hipotecario (banco o mutuaria)
3. Subsidio DS49 (familias vulnerables, viviendas hasta 950 UF)
4. Subsidio DS1 (clase media, viviendas hasta 3.000 UF)
5. Subsidio DS19 (integracion social, proyectos bien ubicados)
6. Subsidio al credito hipotecario 2025 (viviendas nuevas hasta 4.000 UF, pie al 10%)
7. Leasing habitacional (sin pie inicial, viviendas hasta 2.000 UF)
Cual o cuales de estas opciones te interesan o crees que aplican en tu caso?"

Cuando el cliente diga que opcion eligio, INMEDIATAMENTE entrega los documentos requeridos para esa opcion usando la informacion de abajo. Si eligio mas de una, entrega los documentos de cada una. Luego muestra propiedades del rango de precio que corresponde a su opcion.

TIPOS DE FINANCIAMIENTO Y SUBSIDIOS — INFORMACION COMPLETA:

OPCION 1 — CONTADO:
- El proceso mas rapido. Puedes negociar descuento mayor por pago inmediato.
- DOCUMENTOS: cedula de identidad vigente, comprobante de fondos (certificado bancario o cartola), y ante notario: escritura de compraventa.

OPCION 2 — CREDITO HIPOTECARIO (banco o mutuaria):
- Banco financia hasta el 80-90%. Necesitas minimo 20% de pie. Plazos 10 a 30 anos. Tasas desde 3,39%.
- Renta minima recomendada $600.000 CLP. Cuota no puede superar el 40% de tu renta liquida.
- DOCUMENTOS SI ERES EMPLEADO: cedula de identidad vigente, 3 ultimas liquidaciones de sueldo, certificado de AFP, estado de cuenta bancaria ultimos 3 meses, comprobante del pie disponible, sin moras ni protestos en DICOM.
- DOCUMENTOS SI ERES INDEPENDIENTE: cedula de identidad vigente, formulario 22 o declaracion de renta, ultimas 12 boletas de honorarios, certificado de AFP, estado cuenta bancaria 3 meses, comprobante del pie disponible.
- Mutuaria: mas flexible en requisitos pero tasa un poco mas alta, financia hasta 75-80%.

OPCION 4 — SUBSIDIO DS1 (clase media — el mas usado):
- Sin vivienda propia, con RSH actualizado. Compatible con credito hipotecario.
- Tramo 1: hasta 1.100 UF — ahorro 30 UF — RSH 60%.
- Tramo 2: hasta 1.600 UF — ahorro 40 UF — RSH 80%.
- Tramo 3: hasta 2.200 UF — ahorro 80 UF — RSH 90% — requiere credito preaprobado.
- Viviendas nuevas ampliado hasta 3.000 UF en 2025. Postulacion mayo y noviembre.
- DOCUMENTOS: cedula de identidad vigente, Clave Unica del Registro Civil, RSH actualizado, declaracion de nucleo familiar (formulario D1), comprobante de ahorro en cuenta de vivienda con minimo 12 meses de antiguedad, si aplica credito: preaprobacion bancaria.

OPCION 3 — SUBSIDIO DS49 (familias vulnerables):
- Para el 40% mas vulnerable segun RSH. Viviendas hasta 950 UF. Subsidio desde 314 UF.
- Postulacion: agosto aprox cada ano en minvu.gob.cl con Clave Unica.
- DOCUMENTOS: cedula de identidad vigente, RSH actualizado (chileatiende.gob.cl), comprobante de ahorro minimo 10 UF en cuenta de ahorro para vivienda, Clave Unica del Registro Civil.

OPCION 5 — SUBSIDIO DS19 (integracion social):
- Sin vivienda propia, RSH hasta 90%. Proyectos bien ubicados con acceso a servicios.
- Valor maximo 1.100 a 2.400 UF segun zona. Postulacion via proyectos inscritos en SERVIU.
- DOCUMENTOS: cedula de identidad vigente, RSH actualizado, Clave Unica, libreta o cuenta de ahorro para vivienda con el saldo minimo requerido segun tramo.

SUBSIDIO DS116 (integracion y reactivacion):
- Para familias con o sin subsidio previo que quieran acceder a proyectos integrados.
- Bono de integracion de hasta 180 UF para familias de menores recursos.
- Se aplica en proyectos especificos presentados por inmobiliarias al MINVU.

OPCION 6 — SUBSIDIO AL CREDITO HIPOTECARIO 2025:
- Solo viviendas NUEVAS hasta 4.000 UF. Pie reducido al 10% en vez del 20% habitual.
- Rebaja la tasa entre 0,61% y 1,16%. Ahorro ejemplo: $61.777 menos al mes en propiedad de 3.000 UF a 30 anos.
- Vigente hasta mayo 2027 o 50.000 cupos. Bancos: Santander, BancoEstado, Itau, BCI, Chile, Falabella, Coopeuch.
- DOCUMENTOS: mismos que credito hipotecario normal (ver opcion 2) + la vivienda debe ser nueva (promesa o compraventa desde enero 2025).

OPCION 7 — LEASING HABITACIONAL:
- Arriendo con opcion a compra. Sin pie inicial. Cuotas fijas en UF.
- No necesitas historial crediticio. Viviendas hasta 2.000 UF. Tasas un poco mas altas.
- Al terminar el contrato la propiedad es tuya. Postulacion via SERVIU o instituciones autorizadas.
- DOCUMENTOS: cedula de identidad vigente, RSH actualizado, Clave Unica, comprobante de ingresos (liquidaciones o boletas), no ser propietario de vivienda.

PARA SABER SI CALIFICAS A SUBSIDIO — PASOS:
1. Actualiza tu RSH en chileatiende.gob.cl (gratis, con Clave Unica).
2. No debes ser propietario de ninguna vivienda en Chile.
3. No debes haber usado otro subsidio habitacional antes.
4. Si cumples eso, postula en postulacionenlinea.minvu.cl con tu Clave Unica.

CORREDOR:
- Comision venta 2% mas IVA por cada parte
- Comision arriendo 1 mes mas IVA por cada parte

INVERSION (usar solo si te preguntan directamente — responder en 1 oracion):
- Cap rate bueno en Chile entre 4% y 6%
- Comunas rentables Estacion Central Independencia Pudahuel
`

const historial = {}

async function guardarLead(nombre, telefono, propiedadInteres, mensajeInicial, canal, estado = 'nuevo', tipo_lead = 'sin_clasificar') {
  try {
    const { data } = await supabase.from('leads').insert({
      nombre: nombre || 'Sin nombre',
      telefono: telefono || 'Sin telefono',
      propiedad_interes: propiedadInteres || 'Consulta general',
      mensaje_inicial: mensajeInicial || '',
      estado,
      canal: canal || 'web',
      tipo_lead
    }).select('id').single()
    return data?.id || null
  } catch (err) {
    console.error('Error guardando lead:', err.message)
    return null
  }
}

// ─── MODELO DUAL HAIKU/OPUS ────────────────────────────────────────────────────
const ENABLE_DUAL_MODEL = process.env.ENABLE_DUAL_MODEL === 'true'

/**
 * Detecta si el texto del usuario contiene datos críticos para switchear a Opus
 * @param {string} texto - Mensaje del usuario
 * @returns {object} { tieneNombreCompleto, tieneTelefono, expresionInteres }
 */
function detectarDatosCriticos(texto) {
  if (!texto) return { tieneNombreCompleto: false, tieneTelefono: false, expresionInteres: false }

  const textoLimpio = texto.toLowerCase().trim()

  // Detectar nombre completo (al menos 2 palabras con letras)
  const regexNombres = [
    /(?:me\s+llamo|mi\s+nombre\s+es|soy|yo\s+soy|nombre:?)\s+([A-ZÁÉÍÓÚa-záéíóú]+(?:\s+[A-ZÁÉÍÓÚa-záéíóú]+)+)/i,
    /^([A-ZÁÉÍÓÚa-záéíóú]+\s+[A-ZÁÉÍÓÚa-záéíóú]+)[,.\s]/
  ]
  const tieneNombreCompleto = regexNombres.some(r => r.test(texto))

  // Detectar teléfono (múltiples formatos chilenos)
  const regexTelefonos = [
    /\+?56\s?9?\s?\d{4}\s?\d{4}/,
    /\+?56[\s-]?9[\s-]?\d{4}[\s-]?\d{4}/,
    /0*9[\s-]?\d{4}[\s-]?\d{4}/,
    /\b\d{8,9}\b/
  ]
  const tieneTelefono = regexTelefonos.some(r => r.test(texto))

  // Detectar palabras clave de intención de compra/arriendo
  const palabrasClaveInteres = [
    'quiero comprar', 'quiero arrendar', 'quiero ver', 'quiero visitar',
    'estoy interesad', 'me interesa', 'cuánto cuesta', 'cuanto cuesta',
    'valor', 'precio', 'disponible', 'fecha', 'horario', 'agendar',
    'agendar visita', 'ver la', 'me gustaría', 'necesito', 'busco',
    'cuando puedo', 'cuando podemos'
  ]
  const expresionInteres = palabrasClaveInteres.some(p => textoLimpio.includes(p))

  return { tieneNombreCompleto, tieneTelefono, expresionInteres }
}

/**
 * Obtiene la configuración de modelo IA para un broker desde Supabase
 * @param {string} siteName - Nombre del sitio/broker
 * @returns {Promise<string>} 'haiku' | 'opus' | 'auto'
 */
async function obtenerModeloConfiguracion(siteName) {
  try {
    const { data } = await supabase
      .from('configuracion_broker')
      .select('modelo_ia')
      .eq('site_name', siteName)
      .single()

    return data?.modelo_ia || 'auto'
  } catch (err) {
    console.log(`Configuración broker no encontrada para ${siteName}, usando AUTO`)
    return 'auto'
  }
}

async function verificarDisponibilidad(fecha, hora) {
  try {
    const inicio = new Date(`${fecha}T${hora.toString().padStart(2,'0')}:00:00-03:00`)
    const fin = new Date(inicio.getTime() + 60 * 60000)
    const eventos = await calendar.events.list({
      calendarId: CALENDAR_ID,
      timeMin: inicio.toISOString(),
      timeMax: fin.toISOString(),
      singleEvents: true
    })
    return eventos.data.items.length === 0
  } catch (err) {
    return true
  }
}

async function agendarVisita(nombre, telefono, propiedad, fecha, hora) {
  const inicio = new Date(`${fecha}T${hora.toString().padStart(2,'0')}:00:00-03:00`)
  const fin = new Date(inicio.getTime() + 60 * 60000)
  const evento = await calendar.events.insert({
    calendarId: CALENDAR_ID,
    resource: {
      summary: `Visita: ${propiedad}`,
      description: `Cliente: ${nombre}\nTelefono: ${telefono}\nPropiedad: ${propiedad}`,
      start: { dateTime: inicio.toISOString(), timeZone: 'America/Santiago' },
      end: { dateTime: fin.toISOString(), timeZone: 'America/Santiago' }
    }
  })
  // Guardar calendar_event_id, fecha_visita y cancel_token en el lead
  const cancelToken = require('crypto').randomBytes(16).toString('hex')
  await supabase.from('leads')
    .update({
      fecha_visita: fin.toISOString(),
      calendar_event_id: evento.data.id,
      cancel_token: cancelToken
    })
    .eq('nombre', nombre).eq('telefono', telefono)
    .order('created_at', { ascending: false })
    .limit(1)
    .catch(() => {})
  return { ...evento.data, cancelToken }
}

async function obtenerRespuestaNova(mensaje, sesionId) {
  if (!historial[sesionId]) historial[sesionId] = []

  const { data: propiedades } = await supabase
    .from('propiedades').select('*').eq('disponible', true)

  // Cargar galería de fotos adicionales
  const { data: fotosGaleria } = await supabase
    .from('fotos_propiedades').select('propiedad_id, url').order('orden')
  const fotosPorPropiedad = {}
  if (fotosGaleria) {
    fotosGaleria.forEach(f => {
      if (!fotosPorPropiedad[f.propiedad_id]) fotosPorPropiedad[f.propiedad_id] = []
      fotosPorPropiedad[f.propiedad_id].push(f.url)
    })
  }

  let listaPropiedades = '\nPROPIEDADES DISPONIBLES:\n'
  if (propiedades && propiedades.length > 0) {
    propiedades.forEach((p, i) => {
      const galeria = fotosPorPropiedad[p.id] || []
      const mapsQuery = encodeURIComponent(`${p.direccion}, ${p.comuna}, Chile`)
      const mapsUrl = `https://maps.google.com/?q=${mapsQuery}`
      listaPropiedades += `
Propiedad ${i + 1}:
Tipo: ${p.tipo} | Operacion: ${p.operacion}
Direccion: ${p.direccion}, ${p.comuna}
Ver ubicacion en mapa: ${mapsUrl}
Precio: ${p.precio.toLocaleString('es-CL')} ${p.moneda}
Dormitorios: ${p.dormitorios} | Banos: ${p['baños']} | Metros: ${p.metros}m2
Descripcion: ${p['descripción']}
${p.imagen_url ? `Imagen principal: ${p.imagen_url}` : 'Sin imagen principal'}
${galeria.length > 0 ? `Galeria adicional (${galeria.length} fotos): ${galeria.join(' | ')}` : 'Sin galeria adicional'}
Ficha completa con fotos: ${APP_URL}/propiedad/${p.id}
`
    })
  } else {
    listaPropiedades += 'No hay propiedades disponibles.\n'
  }

  // Agregar link al catalogo de WhatsApp si esta configurado
  const sistemaDinamico = SISTEMA_BASE +
    (CATALOGO_URL ? `\nCATALOGO: Cuando el cliente pida ver mas propiedades o el catalogo completo, menciona que puede verlo en: ${CATALOGO_URL}\n` : '') +
    listaPropiedades

  if (mensaje && mensaje.trim()) historial[sesionId].push({ role: 'user', content: mensaje.trim() })
  if (historial[sesionId].length > 20) historial[sesionId] = historial[sesionId].slice(-20)

  const respuesta = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': (process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY || '').trim(),
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: sistemaDinamico,
      messages: historial[sesionId]
    })
  })

  const data = await respuesta.json()
  if (data.error) {
    console.error('Anthropic API error:', JSON.stringify(data.error))
    throw new Error(data.error.message)
  }

  const texto = data.content[0].text
  historial[sesionId].push({ role: 'assistant', content: texto })
  return texto
}

async function procesarRespuesta(texto, sesionId, canal) {
  let respuestaFinal = texto
  let imagenUrl = null

  // Extraer imagen antes de procesar otras señales
  const matchImagen = texto.match(/IMAGEN_URL\|([^\n]+)/)
  if (matchImagen) {
    imagenUrl = matchImagen[1].trim()
    respuestaFinal = respuestaFinal.replace(/IMAGEN_URL\|[^\n]+\n?/, '').trim()
  }

  // Detectar y procesar agenda (tiene prioridad sobre LEAD_DATOS)
  if (respuestaFinal.includes('AGENDAR_VISITA|')) {
    const partes = respuestaFinal.split('AGENDAR_VISITA|')[1].split('|')
    const [nombre, telefono, propiedad, fecha, hora] = partes
    await guardarLead(nombre, telefono, propiedad, 'Visita agendada', canal, 'visita')
    try {
      const disponible = await verificarDisponibilidad(fecha, parseInt(hora))
      if (disponible) {
        await agendarVisita(nombre, telefono, propiedad, fecha, parseInt(hora))
        programarRecordatorioVisita(nombre, telefono, propiedad, fecha, parseInt(hora))
        respuestaFinal = `Listo, agende tu visita correctamente.\n\nResumen:\nNombre: ${nombre}\nPropiedad: ${propiedad}\nFecha: ${fecha}\nHora: ${hora}:00\n\nTe esperamos. Si necesitas cambiar escríbenos con anticipacion.`
      } else {
        historial[sesionId].push({ role: 'user', content: `El horario ${hora}:00 del ${fecha} no esta disponible. Ofrece otro horario.` })
        respuestaFinal = await obtenerRespuestaNova('', sesionId)
      }
    } catch (err) {
      console.error('Error agenda completo:', err.message, err.stack)
      respuestaFinal = 'Tuve un problema agendando. Por favor contacta directamente a nuestro equipo.'
    }
  } else if (respuestaFinal.includes('LEAD_DATOS|')) {
    // Solo guardar lead si no hubo agenda (evita duplicados)
    const partes = respuestaFinal.split('LEAD_DATOS|')[1].split('|')
    const [nombre, telefono, propiedad, tipo, temperatura] = partes
    const estadoLead = temperatura === 'caliente' ? 'caliente' : temperatura === 'tibio' ? 'tibio' : 'nuevo'
    const leadId = await guardarLead(nombre, telefono, propiedad, '', canal, estadoLead, tipo || 'sin_clasificar')
    if (temperatura === 'caliente') {
      notificarAgenteLeadCaliente(nombre, telefono, propiedad, canal)
      // Brecha 2: enviar checklist de documentos automático al cliente
      if (canal === 'whatsapp' && leadId) {
        const checklist = tipo === 'arrendatario'
          ? `Hola ${nombre}, para agilizar el proceso de arriendo te compartimos los documentos que necesitas preparar:\n- 3 ultimas liquidaciones de sueldo (o declaracion de renta si eres independiente)\n- Contrato de trabajo vigente\n- Cedula de identidad por ambas caras\n- Garantia equivalente a 1 mes de arriendo\nCualquier duda estamos para ayudarte.`
          : `Hola ${nombre}, para agilizar tu proceso de compra te compartimos los documentos basicos que necesitaras:\n- Cedula de identidad vigente\n- 3 ultimas liquidaciones de sueldo (o formulario 22 si eres independiente)\n- Certificado AFP\n- Estado de cuenta bancaria ultimos 3 meses\n- Comprobante del pie disponible\nSi tienes alguna opcion de subsidio o financiamiento especifico, con gusto te orientamos.`
        setTimeout(() => enviarWhatsAppAuto(telefono, checklist, 'checklist_documentos', leadId), 3000)
      }
    }
    if (leadId && canal === 'whatsapp') iniciarSecuenciaDrip(leadId)
    respuestaFinal = respuestaFinal.replace(/LEAD_DATOS\|.*/, '').trim()
  }

  return { respuesta: respuestaFinal, imagenUrl }
}

// Ficha individual de propiedad
app.get('/propiedad/:id', async (req, res) => {
  const { id } = req.params
  try {
    // Obtener datos de la propiedad para las OG tags (Facebook, WhatsApp, etc.)
    const { data: prop } = await supabase.from('propiedades').select('*').eq('id', id).single()
    const fs = require('fs')
    let html = fs.readFileSync(path.join(__dirname, 'public', 'propiedad.html'), 'utf8')

    if (prop) {
      const titulo = `${prop.tipo} en ${prop.operacion} — ${prop.direccion}, ${prop.comuna}`
      const descripcion = prop['descripción'] || prop.descripcion || `${prop.dormitorios || ''} dorm. ${prop.metros || ''} m²`
      const imagen = prop.imagen_url || ''
      const url = `${APP_URL}/propiedad/${id}`

      // Inyectar OG tags antes de </head>
      const ogTags = `
  <meta property="og:title" content="${titulo}" />
  <meta property="og:description" content="${descripcion}" />
  <meta property="og:image" content="${imagen}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${titulo}" />
  <meta name="twitter:description" content="${descripcion}" />
  <meta name="twitter:image" content="${imagen}" />`

      html = html.replace('</head>', ogTags + '\n</head>')
    }

    res.send(html)
  } catch (err) {
    res.sendFile(path.join(__dirname, 'public', 'propiedad.html'))
  }
})

// ─── Meta Webhook (Messenger + Instagram DM) ─────────────────────────────────
const META_VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || ''
const META_PAGE_TOKEN = process.env.META_PAGE_TOKEN || ''
const META_IG_TOKEN = process.env.META_IG_TOKEN || ''

// Verificacion del webhook — Meta hace GET para confirmar la URL
app.get('/webhook/meta', (req, res) => {
  const mode = req.query['hub.mode']
  const token = req.query['hub.verify_token']
  const challenge = req.query['hub.challenge']
  if (mode === 'subscribe' && token === META_VERIFY_TOKEN) {
    console.log('Webhook Meta verificado correctamente')
    res.status(200).send(challenge)
  } else {
    console.log('Webhook Meta — token incorrecto')
    res.sendStatus(403)
  }
})

// ─── Webhook Make.com — nueva propiedad ──────────────────────────────────────
const MAKE_WEBHOOK_URL = process.env.MAKE_WEBHOOK_URL || ''

app.post('/api/publicar-propiedad', async (req, res) => {
  const { tipo, operacion, direccion, comuna, precio, moneda, descripcion, imagen_url, id } = req.body
  if (!id) return res.status(400).json({ error: 'Datos incompletos' })

  if (!MAKE_WEBHOOK_URL) return res.status(200).json({ ok: false, mensaje: 'Make.com no configurado para este cliente' })

  try {
    const precioFormateado = moneda === 'UF'
      ? `${Number(precio).toLocaleString('es-CL')} UF`
      : `$${Number(precio).toLocaleString('es-CL')}`

    const fichaUrl = `${APP_URL}/propiedad/${id}`

    const texto = `${tipo} en ${operacion} — ${direccion}, ${comuna}\nPrecio: ${precioFormateado}\n\n${descripcion || ''}\n\nEscribenos por mensaje directo para mas informacion.`

    const payload = {
      tipo, operacion, direccion, comuna,
      precio: precioFormateado,
      descripcion: descripcion || '',
      imagen_url: imagen_url || '',
      ficha_url: fichaUrl,
      texto_publicacion: texto
    }

    const resp = await fetch(MAKE_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    console.log('Webhook Make enviado — propiedad:', id, '— status:', resp.status)
    res.json({ ok: true })
  } catch (err) {
    console.error('Error webhook Make:', err.message)
    res.status(500).json({ error: 'Error enviando a Make' })
  }
})
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/fotos/subir — recibe base64, sube al bucket 'propiedades', devuelve URL pública
app.post('/api/fotos/subir', requireAuth, async (req, res) => {
  const { base64, nombre: nombreOriginal, tipo } = req.body
  console.log('[fotos/subir] recibido — nombre:', nombreOriginal, '— tipo:', tipo, '— base64 len:', base64 ? base64.length : 0)
  if (!base64) return res.status(400).json({ error: 'No se recibió imagen' })
  try {
    const buffer = Buffer.from(base64, 'base64')
    const ext = ((nombreOriginal || 'foto').split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
    const nombre = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext || 'jpg'}`
    const contentType = tipo || 'image/jpeg'
    console.log('[fotos/subir] subiendo a Supabase — archivo:', nombre, '— bytes:', buffer.length)
    const { error } = await supabase.storage
      .from('propiedades')
      .upload(nombre, buffer, { contentType, upsert: false })
    if (error) {
      console.error('[fotos/subir] error Supabase:', error.message)
      return res.status(500).json({ error: error.message })
    }
    const { data: { publicUrl } } = supabase.storage.from('propiedades').getPublicUrl(nombre)
    console.log('[fotos/subir] OK —', publicUrl)
    res.json({ url: publicUrl })
  } catch (err) {
    console.error('[fotos/subir] catch:', err.message)
    res.status(500).json({ error: err.message })
  }
})
// ─────────────────────────────────────────────────────────────────────────────

// Mensajes entrantes de Messenger e Instagram DM
app.post('/webhook/meta', async (req, res) => {
  res.status(200).send('EVENT_RECEIVED')
  const body = req.body
  console.log('Meta webhook recibido:', JSON.stringify(body).substring(0, 500))

  // Instagram DM usa object:'instagram', Messenger usa object:'page'
  if (body.object !== 'page' && body.object !== 'instagram') return
  const canal = body.object === 'instagram' ? 'instagram' : 'messenger'

  for (const entry of (body.entry || [])) {
    // Formato Messenger Platform: entry.messaging[]
    // Instagram DM TAMBIEN usa entry.messaging[] (object:'instagram', misma estructura)
    const eventos = entry.messaging || []
    for (const event of eventos) {
      if (!event.message || !event.message.text || event.message.is_echo) continue
      const senderId = event.sender.id
      const texto = event.message.text
      const sesionId = `${canal}_${senderId}`
      console.log(`Meta (${canal}) de ${senderId}: ${texto}`)
      try {
        const respuestaNova = await obtenerRespuestaNova(texto, sesionId)
        const resultado = await procesarRespuesta(respuestaNova, sesionId, canal)
        await enviarMensajeMeta(senderId, resultado.respuesta, canal)
      } catch (err) {
        console.error(`Error Meta (${canal}):`, err.message)
      }
    }
  }
})

// Enviar respuesta via Graph API
// Tanto Messenger como Instagram DM usan el mismo endpoint /me/messages con Page Access Token
// Instagram DM: el recipient.id es el IGSID (Instagram-Scoped ID) que llega en event.sender.id
// El texto para Instagram debe ser <= 1000 caracteres (Messenger tolera hasta 2000)
async function enviarMensajeMeta(recipientId, texto, canal = 'messenger') {
  const token = META_PAGE_TOKEN
  if (!token) { console.error('Token Meta no configurado para canal:', canal); return }
  // Instagram limita mensajes de texto a 1000 caracteres
  const limite = canal === 'instagram' ? 1000 : 2000
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/me/messages?access_token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: texto.substring(0, limite) }
      })
    })
    const data = await res.json()
    if (data.error) {
      console.error(`Error Graph API (${canal}):`, JSON.stringify(data.error))
    } else {
      console.log(`Mensaje enviado via ${canal} a ${recipientId}, message_id: ${data.message_id}`)
    }
  } catch (err) {
    console.error('Error enviando mensaje Meta:', err.message)
  }
}

// ─────────────────────────────────────────────────────────────────────────────

// Ruta chat web
app.post('/api/chat', async (req, res) => {
  const { mensaje, sesionId } = req.body
  if (!mensaje || !sesionId) return res.status(400).json({ error: 'Datos incompletos' })
  try {
    const respuestaNova = await obtenerRespuestaNova(mensaje, sesionId)
    const resultado = await procesarRespuesta(respuestaNova, sesionId, 'web')
    res.json({ respuesta: resultado.respuesta, imagenUrl: resultado.imagenUrl || null })
  } catch (err) {
    console.error('Error chat:', err.message)
    res.status(500).json({ error: err.message || 'Error del servidor' })
  }
})

// Webhook WhatsApp
app.post('/webhook/whatsapp', async (req, res) => {
  const mensaje = req.body.Body
  const numeroCliente = req.body.From
  const sesionId = 'wa_' + numeroCliente.replace('whatsapp:+', '')
  console.log('WA de:', numeroCliente, ':', mensaje)
  try {
    const respuestaNova = await obtenerRespuestaNova(mensaje, sesionId)
    const resultado = await procesarRespuesta(respuestaNova, sesionId, 'whatsapp')
    const twilio = require('twilio')
    const tc = new twilio.Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    // Armar mensaje con imagen si existe
    const msgOpts = {
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: numeroCliente,
      body: resultado.respuesta
    }
    if (resultado.imagenUrl) {
      msgOpts.mediaUrl = [resultado.imagenUrl]
    }
    await tc.messages.create(msgOpts)
    console.log('Respuesta enviada a:', numeroCliente)
    res.status(200).send('<Response></Response>')
  } catch (err) {
    console.error('Error WA:', err.message)
    res.status(500).send('<Response></Response>')
  }
})

// ─────────────────────────────────────────────────────────────────────────────

// ─── Brecha 1: Matching propiedad nueva → leads interesados ──────────────────
app.post('/api/notificar-nueva-propiedad', requireAuth, async (req, res) => {
  const { tipo, operacion, comuna, precio, moneda, id } = req.body
  if (!tipo || !operacion) return res.status(400).json({ error: 'Datos incompletos' })
  res.json({ ok: true }) // responder rápido, el envío es async

  try {
    // Buscar leads calientes y tibios que sean compradores o inversores por WhatsApp
    const { data: leads } = await supabase.from('leads').select('*')
      .in('tipo_lead', ['comprador', 'inversor', 'sin_clasificar'])
      .in('estado', ['caliente', 'tibio'])
      .eq('canal', 'whatsapp')

    if (!leads || !leads.length) { console.log('Matching propiedad: sin leads para notificar'); return }

    const precioFmt = moneda === 'UF'
      ? `${Number(precio).toLocaleString('es-CL')} UF`
      : `$${Number(precio).toLocaleString('es-CL')}`
    const fichaUrl = id ? `${APP_URL}/propiedad/${id}` : ''

    for (const lead of leads) {
      const msg = `Hola ${lead.nombre}, tenemos una nueva propiedad que podria interesarte: ${tipo} en ${operacion} en ${comuna}, ${precioFmt}.${fichaUrl ? ' Ver ficha: ' + fichaUrl : ''} Si quieres mas informacion o agendar una visita, escribenos.`
      await enviarWhatsAppAuto(lead.telefono, msg, 'matching_propiedad', lead.id)
    }
    console.log(`Matching propiedad: ${leads.length} leads notificados`)
  } catch (err) {
    console.error('Error matching propiedad:', err.message)
  }
})

// ─── Brecha 4: Campaña masiva WhatsApp desde CRM ─────────────────────────────
app.post('/api/campana', requireAuth, async (req, res) => {
  const { mensaje, filtro_estado, filtro_tipo } = req.body
  if (!mensaje || mensaje.trim().length < 5) return res.status(400).json({ error: 'Mensaje muy corto' })

  try {
    let query = supabase.from('leads').select('*').eq('canal', 'whatsapp')
    if (filtro_estado) query = query.eq('estado', filtro_estado)
    if (filtro_tipo) query = query.eq('tipo_lead', filtro_tipo)
    const { data: leads } = await query

    if (!leads || !leads.length) return res.json({ ok: true, enviados: 0 })

    res.json({ ok: true, enviados: leads.length })

    for (const lead of leads) {
      const msg = mensaje.replace('{nombre}', lead.nombre || 'cliente')
      await enviarWhatsAppAuto(lead.telefono, msg, 'campana', lead.id)
      await new Promise(r => setTimeout(r, 500)) // 500ms entre envíos para no saturar Twilio
    }
    console.log(`Campaña enviada: ${leads.length} leads`)
  } catch (err) {
    console.error('Error campaña:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─── Notificacion lead caliente ───────────────────────────────────────────────
const NOTIFY_PHONE = process.env.NOTIFY_PHONE // numero personal de Felipe ej: whatsapp:+56912345678

app.post('/api/notificar-lead-caliente', async (req, res) => {
  const { nombre, telefono, propiedad_interes, canal, created_at } = req.body
  if (!nombre) return res.status(400).json({ error: 'Datos incompletos' })

  const fecha = created_at
    ? new Date(created_at).toLocaleString('es-CL', { timeZone: 'America/Santiago', day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })
    : new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago', day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })

  const waLink = telefono ? `https://wa.me/${(telefono).replace(/\D/g,'')}` : null

  // Email via Resend
  try {
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#f7f8fa;border-radius:12px;overflow:hidden">
        <div style="background:#1A3A5C;padding:20px 28px">
          <h2 style="color:#C9A96E;margin:0;font-size:18px">🔥 Lead Caliente — Nova</h2>
        </div>
        <div style="padding:24px 28px;background:#fff">
          <p style="margin:0 0 16px;font-size:15px;color:#333">Un lead fue marcado como <strong style="color:#0F6E56">caliente</strong>. Contactalo ahora.</p>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:8px 0;color:#888;font-size:13px;width:130px">Nombre</td><td style="padding:8px 0;font-size:14px;font-weight:600;color:#1A3A5C">${nombre}</td></tr>
            <tr><td style="padding:8px 0;color:#888;font-size:13px">Telefono</td><td style="padding:8px 0;font-size:14px">${telefono || '-'}</td></tr>
            <tr><td style="padding:8px 0;color:#888;font-size:13px">Interes</td><td style="padding:8px 0;font-size:14px">${propiedad_interes || 'Consulta general'}</td></tr>
            <tr><td style="padding:8px 0;color:#888;font-size:13px">Canal</td><td style="padding:8px 0;font-size:14px">${canal || '-'}</td></tr>
            <tr><td style="padding:8px 0;color:#888;font-size:13px">Fecha</td><td style="padding:8px 0;font-size:14px">${fecha}</td></tr>
          </table>
          ${waLink ? `<a href="${waLink}" style="display:inline-block;margin-top:20px;background:#25D366;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Contactar por WhatsApp</a>` : ''}
        </div>
        <div style="padding:12px 28px;background:#f7f8fa;font-size:11px;color:#aaa">${EMPRESA} — notificacion automatica</div>
      </div>`

    await enviarEmail(`🔥 Lead caliente: ${nombre}`, html)
    console.log('Notificacion email enviada — lead caliente:', nombre)
  } catch (err) {
    console.error('Error email notificacion:', err.message)
  }

  // WhatsApp personal via Twilio
  if (NOTIFY_PHONE) {
    try {
      const twilio = require('twilio')
      const tc = new twilio.Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
      const msg = `🔥 LEAD CALIENTE\n\nNombre: ${nombre}\nTelefono: ${telefono || '-'}\nInteres: ${propiedad_interes || 'Consulta general'}\nCanal: ${canal || '-'}\n\n${waLink ? 'Contactar: ' + waLink : ''}`
      await tc.messages.create({
        from: process.env.TWILIO_WHATSAPP_NUMBER,
        to: NOTIFY_PHONE,
        body: msg
      })
      console.log('Notificacion WhatsApp enviada — lead caliente:', nombre)
    } catch (err) {
      console.error('Error WhatsApp notificacion:', err.message)
    }
  }

  res.json({ ok: true })
})
// ─────────────────────────────────────────────────────────────────────────────

// ─── API: auto_followups para pestaña Automatizaciones ───────────────────────
app.get('/api/automatizaciones', requireAuth, async (_req, res) => {
  try {
    const { data: followups } = await supabase
      .from('auto_followups')
      .select('*, leads(nombre, telefono)')
      .order('enviado_at', { ascending: false })
      .limit(100)

    const inicioMes = new Date()
    inicioMes.setDate(1); inicioMes.setHours(0, 0, 0, 0)
    const { count: totalMes } = await supabase
      .from('auto_followups')
      .select('id', { count: 'exact', head: true })
      .gte('enviado_at', inicioMes.toISOString())

    const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
    const mañana = new Date(hoy.getTime() + 48 * 60 * 60 * 1000)

    // Leads que recibirán follow-up hoy (visitas proximas 48h)
    const { data: proximasVisitas } = await supabase
      .from('leads')
      .select('nombre, telefono, propiedad_interes, fecha_visita')
      .eq('estado', 'visita')
      .gte('fecha_visita', hoy.toISOString())
      .lte('fecha_visita', mañana.toISOString())

    res.json({ followups: followups || [], totalMes: totalMes || 0, proximasVisitas: proximasVisitas || [] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/limpiar', (req, res) => {
  const { sesionId } = req.body
  if (sesionId) delete historial[sesionId]
  res.json({ ok: true })
})

// ─── Reporte finanzas por email ───────────────────────────────────────────────
app.post('/api/enviar-reporte-finanzas', async (req, res) => {
  const { html, mes, ventas, arriendos, totalComision } = req.body
  try {
    await enviarEmail(
      `Reporte Finanzas — ${mes || 'Resumen'}`,
      html
    )
    res.json({ ok: true })
  } catch(e) {
    console.error('Error reporte finanzas:', e.message)
    res.json({ ok: false, error: e.message })
  }
})
// ─────────────────────────────────────────────────────────────────────────────

// ─── Email ──────────────────────────────────────────────────────────────────
const GMAIL_USER = process.env.EMAIL_ADMIN || 'felipec.constructor@gmail.com'

const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_KekDZHkL_4Kca7BP25JXNvbqaEPLgueLS'

// Enviar email via Resend (HTTP, sin SMTP)
async function enviarEmail(asunto, html) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Nova Reportes <onboarding@resend.dev>',
      to: GMAIL_USER,
      subject: asunto,
      html
    })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Error Resend')
  return data
}

async function enviarInformeSemanal() {
  try {
    // Rango: últimos 7 días
    const hace7dias = new Date()
    hace7dias.setDate(hace7dias.getDate() - 7)
    hace7dias.setHours(0, 0, 0, 0)

    const { data: leads } = await supabase
      .from('leads')
      .select('*')
      .gte('created_at', hace7dias.toISOString())
      .order('created_at', { ascending: false })

    const total = leads ? leads.length : 0
    const calientes = leads ? leads.filter(l => l.estado === 'caliente').length : 0
    const visitas = leads ? leads.filter(l => l.estado === 'visita').length : 0
    const porWhatsapp = leads ? leads.filter(l => l.canal === 'whatsapp').length : 0
    const porWeb = leads ? leads.filter(l => l.canal === 'web').length : 0
    const porMessenger = leads ? leads.filter(l => l.canal === 'messenger').length : 0
    const porInstagram = leads ? leads.filter(l => l.canal === 'instagram').length : 0

    // Tabla HTML de leads de la semana
    const filas = leads && leads.length > 0
      ? leads.map(l => {
          const fecha = new Date(l.created_at).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' })
          const estadoColor = { caliente: '#0F6E56', nuevo: '#0C447C', tibio: '#633806', frio: '#791F1F', visita: '#3C3489' }
          const color = estadoColor[l.estado] || '#333'
          return `
            <tr style="border-bottom:1px solid #f0f0f0">
              <td style="padding:8px 12px">${l.nombre || '-'}</td>
              <td style="padding:8px 12px">${l.telefono || '-'}</td>
              <td style="padding:8px 12px">${l.propiedad_interes || '-'}</td>
              <td style="padding:8px 12px;color:${color};font-weight:500;text-transform:capitalize">${l.estado}</td>
              <td style="padding:8px 12px;color:#888">${fecha}</td>
            </tr>`
        }).join('')
      : `<tr><td colspan="5" style="padding:16px;text-align:center;color:#aaa">Sin leads esta semana</td></tr>`

    const fechaInicio = hace7dias.toLocaleDateString('es-CL', { day: '2-digit', month: 'long' })
    const fechaHoy = new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })

    const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:620px;margin:0 auto;background:#fff">

      <!-- Header -->
      <div style="background:#1A3A5C;padding:24px 32px;border-radius:12px 12px 0 0">
        <h1 style="color:#fff;margin:0;font-size:20px;font-weight:500">Informe semanal Nova</h1>
        <p style="color:#C9A96E;margin:4px 0 0;font-size:13px">${fechaInicio} — ${fechaHoy}</p>
      </div>

      <!-- Stats -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:#e0e0e0;border:1px solid #e0e0e0">
        <div style="background:#fff;padding:20px;text-align:center">
          <div style="font-size:32px;font-weight:600;color:#1A3A5C">${total}</div>
          <div style="font-size:12px;color:#888;margin-top:4px">Leads totales</div>
        </div>
        <div style="background:#fff;padding:20px;text-align:center">
          <div style="font-size:32px;font-weight:600;color:#0F6E56">${calientes}</div>
          <div style="font-size:12px;color:#888;margin-top:4px">Leads calientes</div>
        </div>
        <div style="background:#fff;padding:20px;text-align:center">
          <div style="font-size:32px;font-weight:600;color:#3C3489">${visitas}</div>
          <div style="font-size:12px;color:#888;margin-top:4px">Visitas agendadas</div>
        </div>
        <div style="background:#fff;padding:20px;text-align:center">
          <div style="font-size:32px;font-weight:600;color:#1D9E75">${porWhatsapp}</div>
          <div style="font-size:12px;color:#888;margin-top:4px">Por WhatsApp</div>
        </div>
      </div>

      <!-- Canal breakdown -->
      <div style="background:#fafafa;padding:16px 32px;border-left:1px solid #e0e0e0;border-right:1px solid #e0e0e0">
        <p style="margin:0;font-size:13px;color:#666">
          WhatsApp: <strong>${porWhatsapp}</strong> &nbsp;|&nbsp; Web: <strong>${porWeb}</strong>${porMessenger > 0 ? ` &nbsp;|&nbsp; Messenger: <strong>${porMessenger}</strong>` : ''}${porInstagram > 0 ? ` &nbsp;|&nbsp; Instagram: <strong>${porInstagram}</strong>` : ''}
        </p>
      </div>

      <!-- Tabla leads -->
      <div style="border:1px solid #e0e0e0;border-top:none;border-radius:0 0 12px 12px;overflow:hidden">
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="background:#fafafa">
              <th style="padding:10px 12px;text-align:left;font-size:11px;color:#888;font-weight:500">Nombre</th>
              <th style="padding:10px 12px;text-align:left;font-size:11px;color:#888;font-weight:500">Telefono</th>
              <th style="padding:10px 12px;text-align:left;font-size:11px;color:#888;font-weight:500">Propiedad</th>
              <th style="padding:10px 12px;text-align:left;font-size:11px;color:#888;font-weight:500">Estado</th>
              <th style="padding:10px 12px;text-align:left;font-size:11px;color:#888;font-weight:500">Fecha</th>
            </tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
      </div>

      <!-- Footer -->
      <div style="padding:20px 32px;text-align:center">
        <a href="${APP_URL}/crm.html"
           style="display:inline-block;background:#1A3A5C;color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:13px">
          Ver CRM completo
        </a>
        <p style="margin:16px 0 0;font-size:11px;color:#bbb">Nova — Informe automatico semanal</p>
      </div>

    </div>`

    await enviarEmail(
      `Informe semanal Nova — ${total} leads | ${calientes} calientes | ${visitas} visitas`,
      html
    )

    console.log('Informe semanal enviado correctamente')
  } catch (err) {
    console.error('Error enviando informe semanal:', err.message)
    throw err
  }
}

// ─── CANCELACION DE VISITAS ───────────────────────────────────────────────────
app.get('/cancelar-visita/:token', async (req, res) => {
  const { token } = req.params
  try {
    const { data: leads } = await supabase.from('leads').select('*').eq('cancel_token', token).limit(1)
    const lead = leads && leads[0]
    if (!lead) return res.send('<html><body style="font-family:sans-serif;text-align:center;padding:60px"><h2>Link no valido o visita ya cancelada</h2></body></html>')

    // Eliminar evento de Google Calendar
    if (lead.calendar_event_id) {
      try {
        await calendar.events.delete({ calendarId: CALENDAR_ID, eventId: lead.calendar_event_id })
      } catch(e) { /* puede que ya no exista */ }
    }

    // Actualizar lead
    await supabase.from('leads').update({
      estado: 'cancelado',
      cancel_token: null,
      notas: (lead.notas || '') + '\nVisita cancelada por el cliente via link.'
    }).eq('id', lead.id)

    // Notificar al agente
    if (NOTIFY_PHONE && process.env.TWILIO_ACCOUNT_SID) {
      const twilio = require('twilio')
      const tc = new twilio.Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
      await tc.messages.create({
        from: process.env.TWILIO_WHATSAPP_NUMBER,
        to: NOTIFY_PHONE,
        body: `VISITA CANCELADA\n\nCliente: ${lead.nombre}\nTelefono: ${lead.telefono}\nPropiedad: ${lead.propiedad_interes}\nFecha visita: ${lead.fecha_visita ? new Date(lead.fecha_visita).toLocaleString('es-CL', { timeZone: 'America/Santiago' }) : '-'}`
      }).catch(() => {})
    }

    // Enviar confirmacion al cliente
    if (lead.canal === 'whatsapp' && lead.telefono) {
      await enviarWhatsAppAuto(lead.telefono, `Tu visita ha sido cancelada correctamente. Si quieres reagendar, escríbenos cuando quieras.`, 'cancelacion', lead.id)
    }

    res.send(`<html><body style="font-family:sans-serif;text-align:center;padding:60px;max-width:500px;margin:0 auto">
      <div style="font-size:48px">✅</div>
      <h2 style="color:#1A3A5C">Visita cancelada</h2>
      <p style="color:#666">Tu visita ha sido cancelada correctamente. Si deseas reagendar, escríbenos por WhatsApp.</p>
    </body></html>`)
  } catch(err) {
    console.error('Error cancelar visita:', err.message)
    res.status(500).send('<html><body style="text-align:center;padding:60px"><h2>Error al cancelar. Contacta directamente a la inmobiliaria.</h2></body></html>')
  }
})

// Ruta debug para verificar variables de entorno
app.get('/api/debug-env', (req, res) => {
  res.json({
    meta_configurado: META_PAGE_TOKEN.length > 20,
    meta_primeros_10: META_PAGE_TOKEN.substring(0, 10),
    meta_largo: META_PAGE_TOKEN.length
  })
})

// Ruta para enviar informe manualmente (para probar)
app.post('/api/informe-test', async (req, res) => {
  try {
    await enviarInformeSemanal()
    res.json({ ok: true, mensaje: 'Informe enviado a ' + GMAIL_USER })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// Cron: todos los lunes a las 8:00am hora Santiago
cron.schedule('0 8 * * 1', enviarInformeSemanal, { timezone: 'America/Santiago' })
console.log('Cron informe semanal activo — lunes 8:00am Santiago')

// ─── AUTOMATIZACIONES DE SEGUIMIENTO ─────────────────────────────────────────

async function enviarWhatsAppAuto(telefono, mensaje, tipo, leadId) {
  if (!telefono || !process.env.TWILIO_ACCOUNT_SID) return
  const tel = telefono.replace(/\D/g, '')
  const to = `whatsapp:+${tel.startsWith('56') ? tel : '56' + tel}`
  try {
    const twilio = require('twilio')
    const tc = new twilio.Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    await tc.messages.create({ from: process.env.TWILIO_WHATSAPP_NUMBER, to, body: mensaje })
    await supabase.from('auto_followups').insert({ lead_id: leadId, tipo, canal: 'whatsapp', mensaje, exitoso: true }).catch(() => {})
    console.log(`Auto-followup [${tipo}] enviado a ${telefono}`)
  } catch (err) {
    console.error(`Error auto-followup [${tipo}]:`, err.message)
    await supabase.from('auto_followups').insert({ lead_id: leadId, tipo, canal: 'whatsapp', mensaje, exitoso: false }).catch(() => {})
  }
}

// 1C: Notificación instantánea al agente cuando lead es CALIENTE
async function notificarAgenteLeadCaliente(nombre, telefono, propiedad, canal) {
  if (!NOTIFY_PHONE || !process.env.TWILIO_ACCOUNT_SID) return
  try {
    const twilio = require('twilio')
    const tc = new twilio.Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    const waLink = telefono ? `https://wa.me/${telefono.replace(/\D/g, '')}` : ''
    const msg = `LEAD CALIENTE\nNombre: ${nombre}\nTelefono: ${telefono || '-'}\nInteres: ${propiedad || 'Consulta general'}\nCanal: ${canal || '-'}${waLink ? '\nContactar: ' + waLink : ''}`
    await tc.messages.create({ from: process.env.TWILIO_WHATSAPP_NUMBER, to: NOTIFY_PHONE, body: msg })
    console.log('Notificacion LEAD CALIENTE enviada al agente:', nombre)
  } catch (err) {
    console.error('Error notificacion agente:', err.message)
  }
}

// 1A: Seguimiento post-visita — cron cada hora, exacto al horario del Calendar
cron.schedule('0 * * * *', async () => {
  try {
    const ahora = new Date()
    const hace1h = new Date(ahora.getTime() - 60 * 60 * 1000).toISOString()
    const { data: leads } = await supabase
      .from('leads').select('*')
      .eq('estado', 'visita')
      .is('ultimo_auto_followup', null)
      .not('fecha_visita', 'is', null)
      .lte('fecha_visita', ahora.toISOString())
      .gte('fecha_visita', hace1h)
    if (!leads || !leads.length) return
    for (const lead of leads) {
      const msg = `Hola ${lead.nombre}, esperamos que la visita a ${lead.propiedad_interes || 'la propiedad'} haya sido de tu agrado. Quedamos atentos ante cualquier consulta o si deseas avanzar con el proceso.`
      await enviarWhatsAppAuto(lead.telefono, msg, 'post_visita', lead.id)
      await supabase.from('leads').update({ estado: 'post_visita', ultimo_auto_followup: new Date().toISOString() }).eq('id', lead.id)
    }
    console.log(`Post-visita: ${leads.length} leads contactados`)
  } catch (err) { console.error('Error cron post-visita:', err.message) }
}, { timezone: 'America/Santiago' })

// 1B: Reactivación leads fríos — cron cada 4 días 11am Santiago
cron.schedule('0 11 */4 * *', async () => {
  console.log('Cron: reactivacion leads frios')
  try {
    const hace4dias = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
    const { data: leads } = await supabase
      .from('leads').select('*')
      .in('estado', ['frio', 'nuevo'])
      .lt('created_at', hace4dias)
      .lt('contador_reactivaciones', 2)
      .eq('canal', 'whatsapp')
    if (!leads || !leads.length) { console.log('Sin leads frios para reactivar'); return }
    for (const lead of leads) {
      const msg = `Hola ${lead.nombre}, vimos que consultaste por ${lead.propiedad_interes || 'propiedades'}. Seguimos disponibles y tenemos nuevas opciones que podrian interesarte. Hablame cuando quieras.`
      await enviarWhatsAppAuto(lead.telefono, msg, 'reactivacion', lead.id)
      await supabase.from('leads').update({
        contador_reactivaciones: (lead.contador_reactivaciones || 0) + 1,
        ultimo_auto_followup: new Date().toISOString()
      }).eq('id', lead.id)
    }
    console.log(`Reactivacion: ${leads.length} leads contactados`)
  } catch (err) { console.error('Error cron reactivacion:', err.message) }
}, { timezone: 'America/Santiago' })

// 1D: Recordatorios de visita — cron cada hora busca visitas proximas
function programarRecordatorioVisita(nombre, telefono, propiedad, fecha, hora) {
  // No hace nada — el cron de recordatorios maneja todo via Supabase
  console.log(`Visita agendada para ${nombre} — recordatorios via cron`)
}

// Cron cada hora: recordatorio 24h y 1h antes de la visita
cron.schedule('5 * * * *', async () => {
  try {
    const ahora = new Date()
    const en24h = new Date(ahora.getTime() + 24 * 60 * 60 * 1000)
    const en1h = new Date(ahora.getTime() + 60 * 60 * 1000)
    const ventana = 30 * 60 * 1000 // ventana de 30 min para no duplicar

    // Recordatorio 24h
    const { data: leads24 } = await supabase.from('leads').select('*')
      .eq('estado', 'visita').eq('recordatorio_24h_enviado', false)
      .not('fecha_visita', 'is', null).not('cancel_token', 'is', null)
      .gte('fecha_visita', new Date(en24h.getTime() - ventana).toISOString())
      .lte('fecha_visita', new Date(en24h.getTime() + ventana).toISOString())

    for (const lead of (leads24 || [])) {
      const fechaStr = new Date(lead.fecha_visita).toLocaleString('es-CL', { timeZone: 'America/Santiago', weekday:'long', day:'numeric', month:'long', hour:'2-digit', minute:'2-digit' })
      const cancelUrl = `${APP_URL}/cancelar-visita/${lead.cancel_token}`
      const msg = `Hola ${lead.nombre}, te recordamos tu visita manana para ${lead.propiedad_interes}.\n\nFecha: ${fechaStr} hrs.\n\nTe esperamos. Si no puedes asistir, puedes cancelar aqui: ${cancelUrl}`
      await enviarWhatsAppAuto(lead.telefono, msg, 'recordatorio_24h', lead.id)
      await supabase.from('leads').update({ recordatorio_24h_enviado: true }).eq('id', lead.id)
    }

    // Recordatorio 1h
    const { data: leads1h } = await supabase.from('leads').select('*')
      .eq('estado', 'visita').eq('recordatorio_1h_enviado', false)
      .not('fecha_visita', 'is', null).not('cancel_token', 'is', null)
      .gte('fecha_visita', new Date(en1h.getTime() - ventana).toISOString())
      .lte('fecha_visita', new Date(en1h.getTime() + ventana).toISOString())

    for (const lead of (leads1h || [])) {
      const fechaStr = new Date(lead.fecha_visita).toLocaleString('es-CL', { timeZone: 'America/Santiago', hour:'2-digit', minute:'2-digit' })
      const cancelUrl = `${APP_URL}/cancelar-visita/${lead.cancel_token}`
      const msg = `Hola ${lead.nombre}, tu visita a ${lead.propiedad_interes} es en 1 hora (${fechaStr} hrs). Te esperamos.\n\nSi no puedes asistir, cancela aqui: ${cancelUrl}`
      await enviarWhatsAppAuto(lead.telefono, msg, 'recordatorio_1h', lead.id)
      await supabase.from('leads').update({ recordatorio_1h_enviado: true }).eq('id', lead.id)
    }

    if ((leads24 || []).length + (leads1h || []).length > 0)
      console.log(`Recordatorios: ${(leads24||[]).length} de 24h, ${(leads1h||[]).length} de 1h`)
  } catch(err) { console.error('Error cron recordatorios:', err.message) }
}, { timezone: 'America/Santiago' })

console.log('Automatizaciones activas: post-visita 10am, reactivacion frios cada 4 dias')

// ─── Brecha 3: No-show automático ────────────────────────────────────────────
// Cron cada hora: detecta visitas que pasaron hace 3h sin confirmar asistencia
cron.schedule('30 * * * *', async () => {
  try {
    const ahora = new Date()
    const hace3h = new Date(ahora.getTime() - 3 * 60 * 60 * 1000).toISOString()
    const hace6h = new Date(ahora.getTime() - 6 * 60 * 60 * 1000).toISOString()

    // Leads con visita pasada (entre 3h y 6h atrás) sin marcar asistencia
    const { data: leads } = await supabase.from('leads').select('*')
      .eq('estado', 'visita')
      .is('asistio_visita', null)
      .not('fecha_visita', 'is', null)
      .lte('fecha_visita', hace3h)
      .gte('fecha_visita', hace6h)

    if (!leads || !leads.length) return

    for (const lead of leads) {
      // Notificar al agente para que confirme
      if (NOTIFY_PHONE && process.env.TWILIO_ACCOUNT_SID) {
        const twilio = require('twilio')
        const tc = new twilio.Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
        await tc.messages.create({
          from: process.env.TWILIO_WHATSAPP_NUMBER,
          to: NOTIFY_PHONE,
          body: `VISITA REALIZADA?\n\n${lead.nombre} tenia visita a ${lead.propiedad_interes || 'propiedad'}.\n\nMarca en el CRM si asistio o no para activar el seguimiento automatico.`
        }).catch(() => {})
      }
      // Marcar como pendiente de confirmacion para no enviar de nuevo
      await supabase.from('leads').update({ asistio_visita: null, notas: (lead.notas || '') + '\n[Auto] Pendiente confirmar asistencia visita.' }).eq('id', lead.id)
    }
    if (leads.length) console.log(`No-show check: ${leads.length} visitas pendientes de confirmacion`)
  } catch (err) { console.error('Error cron no-show:', err.message) }
}, { timezone: 'America/Santiago' })

// Endpoint para que el agente marque asistencia desde el CRM
app.post('/api/marcar-asistencia', requireAuth, async (req, res) => {
  const { lead_id, asistio } = req.body
  if (!lead_id) return res.status(400).json({ error: 'lead_id requerido' })

  await supabase.from('leads').update({ asistio_visita: asistio }).eq('id', lead_id)

  // Si NO asistió → WhatsApp automático al cliente
  if (!asistio) {
    const { data: lead } = await supabase.from('leads').select('*').eq('id', lead_id).single()
    if (lead && lead.canal === 'whatsapp' && lead.telefono) {
      const msg = `Hola ${lead.nombre}, vimos que no pudiste llegar a la visita de ${lead.propiedad_interes || 'la propiedad'}. Sin problema, podemos reagendar cuando te acomode. Escribenos cuando quieras.`
      await enviarWhatsAppAuto(lead.telefono, msg, 'no_show', lead_id)
      await supabase.from('leads').update({ estado: 'tibio' }).eq('id', lead_id)
    }
  } else {
    // Si asistió → cambiar a post_visita
    await supabase.from('leads').update({ estado: 'post_visita' }).eq('id', lead_id)
  }

  res.json({ ok: true })
})

// ─── Fase 2: Secuencias drip multi-toque ─────────────────────────────────────
// Se llama cada vez que se guarda un lead nuevo (solo canal whatsapp)
async function iniciarSecuenciaDrip(leadId) {
  // El día 0 ya fue atendido por el bot. Marcamos secuencia_dia = 1 para que
  // el cron envíe el segundo toque en ~2 días.
  await supabase.from('leads').update({ secuencia_dia: 1 }).eq('id', leadId).catch(() => {})
  console.log(`Secuencia drip iniciada para lead ${leadId}`)
}

// Los mensajes de la secuencia según el día
const MENSAJES_DRIP = {
  1: (nombre) => `Hola ${nombre}, ¿pudiste ver las opciones que te compartimos? Podemos mostrarte más propiedades según tu presupuesto o zona. Escríbenos cuando quieras.`,
  2: (nombre, propiedad) => `Hola ${nombre}, muchas personas nos preguntan por subsidios habitacionales y financiamiento. ¿Ya tienes claro cómo piensas financiar tu ${propiedad ? 'próxima propiedad' : 'compra'}? Con gusto te orientamos.`,
  3: (nombre) => `Hola ${nombre}, último mensaje de nuestra parte. Tenemos propiedades disponibles y nuestro equipo está listo para ayudarte. Si en algún momento quieres retomar la búsqueda, aquí estaremos.`
}

// Cron diario 10am: avanza secuencias drip
cron.schedule('0 10 * * *', async () => {
  console.log('Cron: secuencias drip')
  try {
    // Día 1: leads nuevos con secuencia_dia=1 creados hace ~2 días
    // Día 2: secuencia_dia=2 hace ~5 días desde inicio (día 1 enviado hace ~3 días)
    // Día 3: secuencia_dia=3 hace ~9 días desde inicio
    const etapas = [
      { dia: 1, diasDesde: 2 },
      { dia: 2, diasDesde: 5 },
      { dia: 3, diasDesde: 9 }
    ]

    for (const { dia, diasDesde } of etapas) {
      const fechaCorte = new Date(Date.now() - diasDesde * 24 * 60 * 60 * 1000).toISOString()
      const { data: leads } = await supabase.from('leads').select('*')
        .eq('secuencia_dia', dia)
        .eq('canal', 'whatsapp')
        .in('estado', ['nuevo', 'frio', 'tibio'])
        .lt('updated_at', fechaCorte)

      if (!leads || !leads.length) continue

      for (const lead of leads) {
        const generarMensaje = MENSAJES_DRIP[dia]
        if (!generarMensaje) continue
        const msg = generarMensaje(lead.nombre, lead.propiedad_interes)
        await enviarWhatsAppAuto(lead.telefono, msg, `secuencia_dia_${dia}`, lead.id)
        const siguienteDia = dia < 3 ? dia + 1 : null
        await supabase.from('leads').update({
          secuencia_dia: siguienteDia,
          ultimo_auto_followup: new Date().toISOString()
        }).eq('id', lead.id)
      }
      console.log(`Secuencia drip día ${dia}: ${leads.length} leads contactados`)
    }
  } catch (err) { console.error('Error cron drip:', err.message) }
}, { timezone: 'America/Santiago' })

// ─── Fase 4: Degradación automática de score ─────────────────────────────────
// Cron diario 9am Santiago: caliente→tibio tras 7 días, tibio→frio tras 14 días
cron.schedule('0 9 * * *', async () => {
  console.log('Cron: degradacion automatica de score')
  try {
    const ahora = new Date()
    const hace7dias = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const hace14dias = new Date(ahora.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString()

    // caliente sin actividad 7 días → tibio
    const { data: calientes } = await supabase.from('leads').select('id, nombre')
      .eq('estado', 'caliente')
      .lt('updated_at', hace7dias)
    if (calientes && calientes.length) {
      await supabase.from('leads').update({ estado: 'tibio' })
        .in('id', calientes.map(l => l.id))
      console.log(`Score degradado: ${calientes.length} caliente→tibio`)
    }

    // tibio sin actividad 14 días → frio
    const { data: tibios } = await supabase.from('leads').select('id, nombre')
      .eq('estado', 'tibio')
      .lt('updated_at', hace14dias)
    if (tibios && tibios.length) {
      await supabase.from('leads').update({ estado: 'frio' })
        .in('id', tibios.map(l => l.id))
      console.log(`Score degradado: ${tibios.length} tibio→frio`)
    }
  } catch (err) { console.error('Error cron degradacion score:', err.message) }
}, { timezone: 'America/Santiago' })


const PUERTO = process.env.PORT || 3000
app.listen(PUERTO, '0.0.0.0', () => {
  console.log(`Servidor corriendo en puerto ${PUERTO}`)
  console.log(`Ambiente: ${process.env.SITE_NAME || 'Nova — Prolig Propiedades'}`)
  const apiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY || ''
  console.log(`Anthropic key: ${apiKey ? apiKey.substring(0,15) + '...' : 'NO CONFIGURADA'}`)
})
