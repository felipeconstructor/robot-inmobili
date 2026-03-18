require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { createClient } = require('@supabase/supabase-js')
const { google } = require('googleapis')
const path = require('path')

const app = express()
app.use(cors())
app.use(express.json())
app.use((req, res, next) => { res.setHeader('Content-Type', 'application/json; charset=utf-8'); next(); })
app.use(express.urlencoded({ extended: false }))
app.use(express.static('public'))

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

const CALENDAR_ID = 'felipec.constructor@gmail.com'
const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, 'google-credentials.json'),
  scopes: ['https://www.googleapis.com/auth/calendar']
})
const calendar = google.calendar({ version: 'v3', auth })
const HORARIOS_DISPONIBLES = { inicio: 9, fin: 19, duracion: 60 }

async function verificarDisponibilidad(fecha, hora) {
  const inicio = new Date(`${fecha}T${hora.toString().padStart(2,"0")}:00:00-03:00`)
  const fin = new Date(inicio.getTime() + HORARIOS_DISPONIBLES.duracion * 60000)
  const eventos = await calendar.events.list({
    calendarId: CALENDAR_ID,
    timeMin: inicio.toISOString(),
    timeMax: fin.toISOString(),
    singleEvents: true
  })
  return eventos.data.items.length === 0
}

async function agendarEvento(nombre, telefono, descripcion, fecha, hora) {
  const inicio = new Date(`${fecha}T${hora.toString().padStart(2,"0")}:00:00-03:00`)
  const fin = new Date(inicio.getTime() + HORARIOS_DISPONIBLES.duracion * 60000)
  const evento = await calendar.events.insert({
    calendarId: CALENDAR_ID,
    resource: {
      summary: descripcion,
      description: `Cliente: ${nombre}\nTelefono: ${telefono}`,
      start: { dateTime: inicio.toISOString(), timeZone: 'America/Santiago' },
      end: { dateTime: fin.toISOString(), timeZone: 'America/Santiago' }
    }
  })
  return evento.data
}

// ============================================
// NOVA INMOBILIARIA — Prolig Propiedades
// ============================================

const SISTEMA_BASE = `
Eres Nova, asistente virtual de Prolig Propiedades, corredora inmobiliaria en Chile.
Respondes siempre en espanol, con tono amable, profesional y cercano.
REGLA MAS IMPORTANTE: JAMAS uses markdown, emojis, asteriscos, bullets ni simbolos especiales. SOLO texto plano con saltos de linea.
Nunca inventes datos legales ni valores sin aclarar que son aproximados.
Respuestas cortas y directas, maximo 5 parrafos.

AGENDA DE VISITAS:
Cuando un cliente quiera ver una propiedad debes recopilar: nombre completo, telefono, propiedad, fecha (YYYY-MM-DD) y hora (9 a 19).
Cuando tengas todo responde EXACTAMENTE asi:
AGENDAR_VISITA|nombre|telefono|propiedad|fecha|hora

HORARIOS: Lunes a Sabado de 9am a 7pm.

LEYES:
Ley 18.101 arriendos urbanos. DFL-2 beneficios bajo 140m2. Ley 19.537 copropiedad. IVA nuevas 19%. Mayor valor sobre 8000 UF tiene impuesto.

FINANCIAMIENTO:
Hipotecario hasta 80 por ciento, necesitas 20 de pie. Plazos 10 a 30 anos. Subsidios DS1, DS19, DS49.

CORREDOR:
Venta 2 por ciento mas IVA por parte. Arriendo 1 mes mas IVA por parte.

INVERSION:
Cap rate bueno entre 4 y 6 por ciento. Comunas rentables Estacion Central, Independencia, Pudahuel.
`

const historial = {}

async function obtenerRespuestaNova(mensaje, sesionId) {
  if (!historial[sesionId]) historial[sesionId] = []
  const { data: propiedades } = await supabase.from('propiedades').select('*').eq('disponible', true)
  let listaPropiedades = '\nPROPIEDADES DISPONIBLES:\n'
  if (propiedades && propiedades.length > 0) {
    propiedades.forEach((p, i) => {
      listaPropiedades += `Propiedad ${i+1}: ${p.tipo} en ${p.operacion} - ${p.direccion}, ${p.comuna} - ${p.precio.toLocaleString('es-CL')} ${p.moneda} - ${p.dormitorios}D ${p.banos}B ${p.metros}m2 - ${p.descripcion}\n`
    })
  } else {
    listaPropiedades += 'No hay propiedades disponibles.\n'
  }
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
      system: SISTEMA_BASE + listaPropiedades,
      messages: historial[sesionId]
    })
  })
  const data = await respuesta.json()
  if (data.error) throw new Error(data.error.message)
  const texto = data.content[0].text
  historial[sesionId].push({ role: 'assistant', content: texto })
  return texto
}

async function procesarRespuesta(texto, sesionId) {
  if (texto.includes('AGENDAR_VISITA|')) {
    const partes = texto.split('AGENDAR_VISITA|')[1].split('|')
    const [nombre, telefono, propiedad, fecha, hora] = partes
    try {
      const disponible = await verificarDisponibilidad(fecha, parseInt(hora))
      if (disponible) {
        await agendarEvento(nombre, telefono, `Visita: ${propiedad}`, fecha, parseInt(hora))
        return `Listo, agende tu visita.\n\nNombre: ${nombre}\nPropiedad: ${propiedad}\nFecha: ${fecha}\nHora: ${hora}:00\n\nTe esperamos. Si necesitas cambiar la cita avisanos con anticipacion.`
      } else {
        historial[sesionId].push({ role: 'user', content: `El horario ${hora}:00 del ${fecha} no esta disponible. Ofrece otro horario.` })
        return await obtenerRespuestaNova('', sesionId)
      }
    } catch (err) {
      console.error('Error agendando visita:', err)
      return 'Tuve un problema agendando. Por favor contacta directamente a nuestro equipo.'
    }
  }
  return texto
}

app.post('/api/chat', async (req, res) => {
  const { mensaje, sesionId } = req.body
  if (!mensaje || !sesionId) return res.status(400).json({ error: 'Datos incompletos' })
  try {
    const texto = await obtenerRespuestaNova(mensaje, sesionId)
    const final = await procesarRespuesta(texto, sesionId)
    res.json({ respuesta: final })
  } catch (err) {
    console.error('Error chat:', err)
    res.status(500).json({ error: 'Error del servidor' })
  }
})

app.post('/webhook/whatsapp', async (req, res) => {
  const mensaje = req.body.Body
  const numeroCliente = req.body.From
  const sesionId = 'wa_' + numeroCliente.replace('whatsapp:+', '')
  console.log('WA Inmobiliaria de:', numeroCliente)
  try {
    const texto = await obtenerRespuestaNova(mensaje, sesionId)
    const final = await procesarRespuesta(texto, sesionId)
    const twilio = require('twilio')
    const tc = new twilio.Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    await tc.messages.create({ from: process.env.TWILIO_WHATSAPP_NUMBER, to: numeroCliente, body: final })
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

// ============================================
// NOVA LEGAL — Dagoberto Riffo Abogado
// ============================================

const SISTEMA_LEGAL = `
Eres Nova, asistente virtual del abogado Dagoberto Riffo Paredes, La Ligua, V Region de Chile.
Respondes siempre en espanol, tono amable y profesional.
REGLA OBLIGATORIA: JAMAS uses markdown, asteriscos, bullets, emojis ni simbolos. SOLO texto plano con saltos de linea.
Respuestas cortas, maximo 3 parrafos.
No des consejos legales especificos, eso es trabajo del abogado en la consulta.
El estudio trabaja en toda la V Region de Chile.

EL ABOGADO TRABAJA SOLO EN ESTAS TRES AREAS:
Si preguntan por otra area, di que el estudio se especializa solo en Herencia, Defensa Penal y Bienes Raices, y ofrece agendar una consulta.

HERENCIA:
El abogado gestiona todo el proceso sucesorio en Chile: posesion efectiva ante el Registro Civil o tribunales, distribucion de bienes entre herederos, resolucion de conflictos entre herederos, y regularizacion de propiedades y cuentas a nombre del causante. Un proceso complejo que requiere asesoria profesional para proteger lo que le corresponde a cada heredero.

DEFENSA PENAL:
El abogado representa a personas imputadas en causas penales en toda la V Region, desde la formalizacion hasta el juicio oral. Elabora estrategia de defensa solida y tambien representa a victimas. Todo caso con absoluta confidencialidad.

BIENES RAICES:
Asesoria en compraventa, contratos de arriendo, estudio de titulos, regularizacion de propiedades y resolucion de conflictos entre arrendadores y arrendatarios. Trabaja en La Ligua, Cabildo, Petorca, Los Andes, Valparaiso y toda la V Region.

AGENDA DE CONSULTAS:
Cuando un cliente quiera agendar una consulta debes recopilar: nombre completo, telefono, tipo de caso (herencia, penal o bienes raices), fecha (YYYY-MM-DD) y hora (9 a 19 lunes a viernes).
Cuando tengas todo responde EXACTAMENTE asi:
AGENDAR_CONSULTA|nombre|telefono|tipo_caso|fecha|hora

CONSULTA PERSONAL:
Valor: 35.000 pesos chilenos.
Horario: lunes a viernes 9:00 a 19:00, sabados 10:00 a 14:00.
Oficina: Esmeralda 265, La Ligua.
Telefono: +56 9 7888 8794.
Atiende tambien online por videollamada.

COSTOS DE CASOS:
El valor depende de cada caso y se informa en la consulta inicial de 35.000 pesos.
`

const historialLegal = {}

async function obtenerRespuestaLegal(mensaje, sesionId) {
  if (!historialLegal[sesionId]) historialLegal[sesionId] = []
  historialLegal[sesionId].push({ role: 'user', content: mensaje })
  if (historialLegal[sesionId].length > 20) historialLegal[sesionId] = historialLegal[sesionId].slice(-20)
  const respuesta = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-opus-4-6',
      max_tokens: 400,
      system: SISTEMA_LEGAL,
      messages: historialLegal[sesionId]
    })
  })
  const data = await respuesta.json()
  if (data.error) throw new Error(data.error.message)
  const texto = data.content[0].text
  historialLegal[sesionId].push({ role: 'assistant', content: texto })
  return texto
}

async function procesarRespuestaLegal(texto, sesionId) {
  if (texto.includes('AGENDAR_CONSULTA|')) {
    const partes = texto.split('AGENDAR_CONSULTA|')[1].split('|')
    const [nombre, telefono, tipoCaso, fecha, hora] = partes
    try {
      const disponible = await verificarDisponibilidad(fecha, parseInt(hora))
      if (disponible) {
        await agendarEvento(nombre, telefono, `Consulta Legal: ${tipoCaso}`, fecha, parseInt(hora))
        return `Listo, agende tu consulta con el abogado.\n\nNombre: ${nombre}\nTipo de caso: ${tipoCaso}\nFecha: ${fecha}\nHora: ${hora}:00\n\nDagoberto Riffo se comunicara contigo para confirmar. Cualquier cambio avisanos con anticipacion.`
      } else {
        historialLegal[sesionId].push({ role: 'user', content: `El horario ${hora}:00 del ${fecha} no esta disponible. Ofrece otro horario.` })
        return await obtenerRespuestaLegal('', sesionId)
      }
    } catch (err) {
      console.error('Error agendando consulta:', err)
      return 'Tuve un problema agendando. Contacta directamente al abogado por WhatsApp al +56 9 7888 8794.'
    }
  }
  return texto
}

app.post('/api/chat-legal', async (req, res) => {
  const { mensaje, sesionId } = req.body
  if (!mensaje || !sesionId) return res.status(400).json({ error: 'Datos incompletos' })
  try {
    const texto = await obtenerRespuestaLegal(mensaje, sesionId)
    const final = await procesarRespuestaLegal(texto, sesionId)
    res.json({ respuesta: final })
  } catch (err) {
    console.error('Error chat legal:', err)
    res.status(500).json({ error: 'Error del servidor' })
  }
})

app.post('/webhook/whatsapp-legal', async (req, res) => {
  const mensaje = req.body.Body
  const numeroCliente = req.body.From
  const sesionId = 'wa_legal_' + numeroCliente.replace('whatsapp:+', '')
  console.log('WA Legal de:', numeroCliente)
  try {
    const texto = await obtenerRespuestaLegal(mensaje, sesionId)
    const final = await procesarRespuestaLegal(texto, sesionId)
    const twilio = require('twilio')
    const tc = new twilio.Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    await tc.messages.create({ from: process.env.TWILIO_WHATSAPP_NUMBER, to: numeroCliente, body: final })
    res.status(200).send('<Response></Response>')
  } catch (err) {
    console.error('Error WA Legal:', err.message)
    res.status(500).send('<Response></Response>')
  }
})

app.post('/api/limpiar-legal', (req, res) => {
  const { sesionId } = req.body
  if (sesionId) delete historialLegal[sesionId]
  res.json({ ok: true })
})

// ============================================
// SERVIDOR
// ============================================

const PUERTO = process.env.PORT || 3000
app.listen(PUERTO, '0.0.0.0', () => console.log(`Servidor corriendo en puerto ${PUERTO}`))
