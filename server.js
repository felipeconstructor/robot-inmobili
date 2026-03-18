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

// Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

// Google Calendar
const CALENDAR_ID = 'felipec.constructor@gmail.com'
const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, 'google-credentials.json'),
  scopes: ['https://www.googleapis.com/auth/calendar']
})
const calendar = google.calendar({ version: 'v3', auth })

// Horarios disponibles para visitas (lunes a sabado, 9am a 7pm)
const HORARIOS_DISPONIBLES = {
  inicio: 9,  // 9am
  fin: 19,    // 7pm
  duracion: 60 // minutos por visita
}

// Verificar disponibilidad en Google Calendar
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

// Agendar visita en Google Calendar
async function agendarVisita(nombre, telefono, propiedad, fecha, hora) {
  const inicio = new Date(`${fecha}T${hora.toString().padStart(2,"0")}:00:00-03:00`)
  const fin = new Date(inicio.getTime() + HORARIOS_DISPONIBLES.duracion * 60000)

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

const SISTEMA_BASE = `
Eres Nova, asistente virtual de Prolig Propiedades, corredora inmobiliaria en Chile.
Respondes siempre en espanol, con tono amable, profesional y cercano.
REGLA MAS IMPORTANTE Y OBLIGATORIA: JAMAS uses markdown, emojis, asteriscos, bullets, guiones como listas, ni ningun simbolo especial. SOLO texto plano separado por saltos de linea. Sin excepciones.
Nunca inventes datos legales ni valores sin aclarar que son aproximados.
Si necesitan asesoria legal, recomienda consultar con un abogado.
Respuestas cortas y directas, maximo 5 parrafos.

AGENDA DE VISITAS:
Cuando un cliente quiera ver una propiedad, debes:
1. Preguntarle su nombre completo
2. Preguntarle su telefono
3. Preguntarle que propiedad quiere ver
4. Preguntarle que fecha prefiere (formato: YYYY-MM-DD, ejemplo: 2026-03-20)
5. Preguntarle que hora prefiere entre 9am y 7pm
6. Cuando tengas todos los datos, responde EXACTAMENTE en este formato (sin nada mas):
AGENDAR_VISITA|nombre|telefono|propiedad|fecha|hora
Ejemplo: AGENDAR_VISITA|Juan Perez|56912345678|Depto Providencia|2026-03-20|10

HORARIOS DISPONIBLES: Lunes a Sabado de 9am a 7pm.

LEYES:
- Ley 18.101: Arrendamiento predios urbanos
- DFL-2: Beneficios tributarios propiedades bajo 140m2
- Ley 19.537: Copropiedad inmobiliaria
- IVA propiedades nuevas: 19% con credito especial
- Impuesto mayor valor: sobre 8.000 UF tiene impuesto

FINANCIAMIENTO:
- Credito hipotecario: hasta 80%, necesitas 20% de pie
- Plazos: 10 a 30 anos, tasa fija, variable o mixta
- Subsidios: DS1 clase media, DS19 altura, DS49 sin deuda

CORREDOR:
- Comision venta: 2% mas IVA por cada parte
- Comision arriendo: 1 mes mas IVA por cada parte

INVERSION:
- Cap rate bueno en Chile: entre 4% y 6%
- Comunas rentables: Estacion Central, Independencia, Pudahuel
`

const historial = {}

async function obtenerRespuestaNova(mensaje, sesionId) {
  if (!historial[sesionId]) historial[sesionId] = []

  const { data: propiedades } = await supabase
    .from('propiedades')
    .select('*')
    .eq('disponible', true)

  let listaPropiedades = '\nPROPIEDADES DISPONIBLES:\n'
  if (propiedades && propiedades.length > 0) {
    propiedades.forEach((p, i) => {
      listaPropiedades += `
Propiedad ${i + 1}:
Tipo: ${p.tipo}
Operacion: ${p.operacion}
Direccion: ${p.direccion}, ${p.comuna}
Precio: ${p.precio.toLocaleString('es-CL')} ${p.moneda}
Dormitorios: ${p.dormitorios} | Banos: ${p.banos} | Metros: ${p.metros}m2
Descripcion: ${p.descripcion}
`
    })
  } else {
    listaPropiedades += 'No hay propiedades disponibles.\n'
  }

  const SISTEMA = SISTEMA_BASE + listaPropiedades

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
      system: SISTEMA,
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
  // Detectar si Nova quiere agendar una visita
  if (texto.includes('AGENDAR_VISITA|')) {
    const partes = texto.split('AGENDAR_VISITA|')[1].split('|')
    const [nombre, telefono, propiedad, fecha, hora] = partes

    try {
      const disponible = await verificarDisponibilidad(fecha, parseInt(hora))

      if (disponible) {
        await agendarVisita(nombre, telefono, propiedad, fecha, parseInt(hora))
        return `Listo, agende tu visita correctamente.\n\nResumen de tu cita:\nNombre: ${nombre}\nPropiedad: ${propiedad}\nFecha: ${fecha}\nHora: ${hora}:00\n\nTe esperamos. Si necesitas cambiar la cita escribenos con anticipacion.`
      } else {
        historial[sesionId].push({
          role: 'user',
          content: `El horario ${hora}:00 del ${fecha} no esta disponible. Ofrece otro horario disponible ese mismo dia o sugiere otro dia.`
        })
        return await obtenerRespuestaNova('', sesionId)
      }
    } catch (err) {
      console.error('Error agendando:', err)
      return 'Tuve un problema agendando la visita. Por favor contacta directamente a nuestro equipo.'
    }
  }

  return texto
}

app.post('/api/chat', async (req, res) => {
  const { mensaje, sesionId } = req.body
  if (!mensaje || !sesionId) return res.status(400).json({ error: 'Datos incompletos' })
  try {
    const respuestaNova = await obtenerRespuestaNova(mensaje, sesionId)
    const respuestaFinal = await procesarRespuesta(respuestaNova, sesionId)
    res.json({ respuesta: respuestaFinal })
  } catch (err) {
    console.error('Error chat:', err)
    res.status(500).json({ error: 'Error del servidor' })
  }
})

app.post('/webhook/whatsapp', async (req, res) => {
  const mensaje = req.body.Body
  const numeroCliente = req.body.From
  const sesionId = 'wa_' + numeroCliente.replace('whatsapp:+', '')

  console.log('WA de:', numeroCliente, 'mensaje:', mensaje)

  try {
    const respuestaNova = await obtenerRespuestaNova(mensaje, sesionId)
    const respuestaFinal = await procesarRespuesta(respuestaNova, sesionId)

    const twilio = require('twilio')
    const tc = new twilio.Twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )

    await tc.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: numeroCliente,
      body: respuestaFinal
    })

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

const PUERTO = process.env.PORT || 3000
app.listen(PUERTO, '0.0.0.0', () => console.log(`Servidor corriendo en puerto ${PUERTO}`))
