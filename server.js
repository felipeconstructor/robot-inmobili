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
app.use(express.static(path.join(__dirname, 'public')))

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

const CALENDAR_ID = 'felipec.constructor@gmail.com'
const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, 'google-credentials.json'),
  scopes: ['https://www.googleapis.com/auth/calendar']
})
const calendar = google.calendar({ version: 'v3', auth })

// Link al catalogo de WhatsApp (publico, no es dato sensible)
const CATALOGO_URL = process.env.WHATSAPP_CATALOGO_URL || 'https://wa.me/c/56920553288'

const SISTEMA_BASE = `
Eres Nova, asistente virtual de Prolig Propiedades, corredora inmobiliaria en Chile.
Respondes siempre en espanol, con tono amable, profesional y cercano.
REGLA OBLIGATORIA: Nunca uses markdown, emojis, asteriscos ni simbolos especiales. Solo texto plano.
Nunca inventes datos legales ni valores sin aclarar que son aproximados.
Si necesitan asesoria legal recomienda un abogado.
Si el cliente quiere agendar una visita pidele nombre, telefono y propiedad de interes.
Respuestas cortas y directas, maximo 5 parrafos.

IMAGENES Y FICHA DE PROPIEDADES:
Cuando respondas sobre una propiedad especifica y esta tenga imagen disponible, incluye al final de tu respuesta en una linea separada (sin texto adicional en esa linea):
IMAGEN_URL|{url_exacta_de_la_imagen}
Solo una imagen por respuesta. Solo si la propiedad tiene imagen. No inventes URLs.
Ademas, cuando el cliente pida ver mas fotos o mas informacion de una propiedad, comparte el link de la ficha completa que aparece en los datos de la propiedad. Ejemplo: "Puedes ver todas las fotos y detalles aqui: https://alluring-flow-production-16db.up.railway.app/propiedad/3"

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

LEYES:
- Ley 18.101 Arrendamiento predios urbanos
- DFL-2 Beneficios tributarios propiedades bajo 140m2
- Ley 19.537 Copropiedad inmobiliaria
- IVA propiedades nuevas 19% con credito especial
- Impuesto mayor valor sobre 8000 UF tiene impuesto

FINANCIAMIENTO:
- Credito hipotecario hasta 80% necesitas 20% de pie
- Plazos 10 a 30 anos tasa fija variable o mixta
- Subsidios DS1 clase media DS19 altura DS49 sin deuda

CORREDOR:
- Comision venta 2% mas IVA por cada parte
- Comision arriendo 1 mes mas IVA por cada parte

INVERSION:
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
Ficha completa con fotos: https://alluring-flow-production-16db.up.railway.app/propiedad/${p.id}
`
    })
  } else {
    listaPropiedades += 'No hay propiedades disponibles.\n'
  }

  // Agregar link al catalogo de WhatsApp si esta configurado
  const sistemaDinamico = SISTEMA_BASE +
    (CATALOGO_URL ? `\nCATALOGO: Cuando el cliente pida ver mas propiedades o el catalogo completo, menciona que puede verlo en: ${CATALOGO_URL}\n` : '') +
    listaPropiedades

  historial[sesionId].push({ role: 'user', content: mensaje })
  if (historial[sesionId].length > 20) historial[sesionId] = historial[sesionId].slice(-20)

  const respuesta = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-opus-4-6',
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
app.get('/propiedad/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'propiedad.html'))
})

// ─── Meta Webhook (Messenger + Instagram DM) ─────────────────────────────────
const META_VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'nova_prolig_2026'
const META_PAGE_TOKEN = process.env.META_PAGE_TOKEN || 'EAF0uhX9idx8BQ35O7feu8Xhezu8QMJnNZBVnCzLJhXxYzusD1vt9FqHOhNnUFNH5X4GzGnDwXuN92VEdZCyn1mZCHmqxc7wZAxoBRGWbFu0KN1TRkuSGW6HujwYfE62Np10GTwlbjBWIJ2yIfFRPZAQdEOByiNLDNEjAWZAkVJOx5xZB8QjzjVeL8WXHTDKwonVbPFAhxDomQZDZD'

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
  console.log('Meta webhook recibido:', JSON.stringify(body).substring(0, 300))

  if (body.object !== 'page' && body.object !== 'instagram') return
  const canal = body.object === 'instagram' ? 'instagram' : 'messenger'

  for (const entry of (body.entry || [])) {
    // Formato Messenger y Instagram DM via Messenger Platform
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
        await enviarMensajeMeta(senderId, resultado.respuesta)
      } catch (err) {
        console.error(`Error Meta (${canal}):`, err.message)
      }
    }

    // Formato alternativo Instagram via changes
    for (const change of (entry.changes || [])) {
      const val = change.value
      if (!val || !val.messages) continue
      for (const msg of val.messages) {
        if (msg.type !== 'text') continue
        const senderId = val.sender?.id || msg.from?.id
        const texto = msg.text?.body || msg.text
        if (!senderId || !texto) continue
        const sesionId = `instagram_${senderId}`
        console.log(`Instagram DM de ${senderId}: ${texto}`)
        try {
          const respuestaNova = await obtenerRespuestaNova(texto, sesionId)
          const resultado = await procesarRespuesta(respuestaNova, sesionId, 'instagram')
          await enviarMensajeMeta(senderId, resultado.respuesta)
        } catch (err) {
          console.error('Error Instagram DM:', err.message)
        }
      }
    }
  }
})

// Enviar respuesta via Graph API
async function enviarMensajeMeta(recipientId, texto) {
  if (!META_PAGE_TOKEN) { console.error('META_PAGE_TOKEN no configurado'); return }
  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${META_PAGE_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: texto.substring(0, 2000) }
      })
    })
    const data = await res.json()
    if (data.error) console.error('Error Graph API:', data.error.message)
  } catch (err) {
    console.error('Error enviando mensaje Meta:', err.message)
  }
}

// Ruta chat web
app.post('/api/chat', async (req, res) => {
  const { mensaje, sesionId } = req.body
  if (!mensaje || !sesionId) return res.status(400).json({ error: 'Datos incompletos' })
  try {
    const respuestaNova = await obtenerRespuestaNova(mensaje, sesionId)
    const resultado = await procesarRespuesta(respuestaNova, sesionId, 'web')
    res.json({ respuesta: resultado.respuesta })
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

app.post('/api/limpiar', (req, res) => {
  const { sesionId } = req.body
  if (sesionId) delete historial[sesionId]
  res.json({ ok: true })
})

// ─── Email ──────────────────────────────────────────────────────────────────
const GMAIL_USER = 'felipec.constructor@gmail.com'

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
        <a href="https://alluring-flow-production-16db.up.railway.app/crm.html"
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
app.listen(PUERTO, '0.0.0.0', () => console.log(`Servidor corriendo en puerto ${PUERTO}`))
