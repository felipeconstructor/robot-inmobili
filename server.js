require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { createClient } = require('@supabase/supabase-js')
const { google } = require('googleapis')
const path = require('path')
const cron = require('node-cron')

const app = express()
app.use(cors())
app.use(express.json())
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
  const destino = encodeURIComponent(req.path)
  res.redirect('/login.html?next=' + destino)
}

function requireAdmin(req, res, next) {
  const cookies = parseCookies(req)
  const sesion = sesionesActivas.get(cookies.nova_session)
  if (sesion && sesion.rol === 'admin') return next()
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
Cuando el cliente muestre interes real en una propiedad (pregunte precio, disponibilidad, caracteristicas o quiera visitarla), pidele su nombre y telefono antes de continuar entregando mas informacion. Usa esta frase o similar: "Para darte atencion personalizada y que un ejecutivo de ${EMPRESA} te contacte directamente, necesito tu nombre y numero de telefono. Tus datos quedan registrados de forma segura en nuestro sistema y recibiras atencion preferencial de nuestro equipo." Si el cliente entrega sus datos agradecele y confirmale que quedaron registrados y que seran contactados a la brevedad.

LONGITUD DE RESPUESTAS — REGLA ESTRICTA:
Maximo 2 oraciones de respuesta. Si la pregunta es sobre leyes, financiamiento o informacion general responde en 1 sola oracion clara y directa. Nunca expliques todo lo que sabes sobre un tema. Solo responde lo que el cliente pregunto y nada mas. Si hay un link de ficha o de agenda, ese link debe ser lo ultimo visible y no debe quedar enterrado en texto largo.

LISTA DE PROPIEDADES — REGLA OBLIGATORIA:
Cuando el cliente pida ver propiedades disponibles o pregunte que tienes, presenta cada propiedad en una linea separada con este formato exacto:
. [Tipo] en [Comuna] — [Precio] [Moneda] — [Dormitorios] dorm, [Banos] ban, [Metros]m2
Ejemplo:
. Casa en La Ligua — $85.000.000 CLP — 3 dorm, 2 ban, 120m2
. Departamento en Valparaiso — 2.500 UF — 2 dorm, 1 ban, 58m2
Nunca pongas toda la lista en una sola oracion. Cada propiedad va en su propia linea comenzando con punto.

IMAGENES Y FICHA DE PROPIEDADES:
Cuando respondas sobre una propiedad especifica, SIEMPRE incluye el link de la ficha completa al final de tu respuesta. Ejemplo: "Ver fotos y detalles completos: ${APP_URL}/propiedad/3"
Usa el id de la propiedad que aparece en los datos. Nunca inventes IDs.
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

GUARDAR_LEAD: Cuando el cliente te diga su nombre y telefono aunque no agende visita responde tambien:
LEAD_DATOS|nombre|telefono|propiedad_consultada

LEYES (usar solo si te preguntan directamente — responder en 1 oracion):
- Ley 18.101 Arrendamiento predios urbanos
- DFL-2 Beneficios tributarios propiedades bajo 140m2
- Ley 19.537 Copropiedad inmobiliaria
- IVA propiedades nuevas 19% con credito especial
- Impuesto mayor valor sobre 8000 UF tiene impuesto

FINANCIAMIENTO (usar solo si te preguntan directamente — responder en 1 oracion):
- Credito hipotecario hasta 80% necesitas 20% de pie
- Plazos 10 a 30 anos tasa fija variable o mixta
- Subsidios DS1 clase media DS19 altura DS49 sin deuda

CORREDOR:
- Comision venta 2% mas IVA por cada parte
- Comision arriendo 1 mes mas IVA por cada parte

INVERSION (usar solo si te preguntan directamente — responder en 1 oracion):
- Cap rate bueno en Chile entre 4% y 6%
- Comunas rentables Estacion Central Independencia Pudahuel
`

const historial = {}

async function guardarLead(nombre, telefono, propiedadInteres, mensajeInicial, canal, estado = 'nuevo') {
  try {
    await supabase.from('leads').insert({
      nombre: nombre || 'Sin nombre',
      telefono: telefono || 'Sin telefono',
      propiedad_interes: propiedadInteres || 'Consulta general',
      mensaje_inicial: mensajeInicial || '',
      estado,
      canal: canal || 'web'
    })
  } catch (err) {
    console.error('Error guardando lead:', err.message)
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

  return { tiemeNombreCompleto, tieneTelefono, expresionInteres }
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
  return evento.data
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
      listaPropiedades += `
Propiedad ${i + 1}:
Tipo: ${p.tipo} | Operacion: ${p.operacion}
Direccion: ${p.direccion}, ${p.comuna}
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
  if (data.error) throw new Error(data.error.message)

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
        respuestaFinal = `Listo, agende tu visita correctamente.\n\nResumen:\nNombre: ${nombre}\nPropiedad: ${propiedad}\nFecha: ${fecha}\nHora: ${hora}:00\n\nTe esperamos. Si necesitas cambiar escríbenos con anticipacion.`
      } else {
        historial[sesionId].push({ role: 'user', content: `El horario ${hora}:00 del ${fecha} no esta disponible. Ofrece otro horario.` })
        respuestaFinal = await obtenerRespuestaNova('', sesionId)
      }
    } catch (err) {
      console.error('Error agenda:', err)
      respuestaFinal = 'Tuve un problema agendando. Por favor contacta directamente a nuestro equipo.'
    }
  } else if (respuestaFinal.includes('LEAD_DATOS|')) {
    // Solo guardar lead si no hubo agenda (evita duplicados)
    const partes = respuestaFinal.split('LEAD_DATOS|')[1].split('|')
    const [nombre, telefono, propiedad] = partes
    await guardarLead(nombre, telefono, propiedad, '', canal)
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
    console.error('Error chat:', err)
    res.status(500).json({ error: 'Error del servidor' })
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

    const texto = `${tipo} en ${operacion} — ${direccion}, ${comuna}\nPrecio: ${precioFormateado}\n\n${descripcion || ''}\n\nEscríbenos por mensaje directo para más información.`

    const payload = {
      tipo,
      operacion,
      direccion,
      comuna,
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
          Canal web: <strong>${porWeb} leads</strong> &nbsp;|&nbsp; Canal WhatsApp: <strong>${porWhatsapp} leads</strong>
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

const PUERTO = process.env.PORT || 3000
app.listen(PUERTO, '0.0.0.0', () => {
  console.log(`Servidor corriendo en puerto ${PUERTO}`)
  console.log(`Ambiente: ${process.env.SITE_NAME || 'Nova — Prolig Propiedades'}`)
})
