require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { createClient } = require('@supabase/supabase-js')

const app = express()
app.use(cors())
app.use(express.json())
app.use(express.static('public'))

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

const SISTEMA_BASE = `
Eres Nova, asistente virtual de Prolig Propiedades, corredora inmobiliaria en Chile.
Respondes siempre en español, con tono amable, profesional y cercano.
REGLA MAS IMPORTANTE: Nunca uses markdown. Nada de **, ##, *, #, ---, emojis ni simbolos especiales. Solo texto plano con saltos de linea simples.
Nunca inventes datos legales ni valores sin aclarar que son aproximados.
Si necesitan asesoria legal, recomienda consultar con un abogado.
Si el cliente quiere agendar una visita, pidele nombre, telefono y propiedad de interes.
Respuestas cortas y directas, maximo 5 parrafos.

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
- Comunas premium: Las Condes, Vitacura, Providencia
`

const historial = {}

app.post('/api/chat', async (req, res) => {
  const { mensaje, sesionId } = req.body
  if (!mensaje || !sesionId) return res.status(400).json({ error: 'Datos incompletos' })
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

  try {
    const respuesta = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 1024,
        system: SISTEMA,
        messages: historial[sesionId]
      })
    })
    const data = await respuesta.json()
    if (data.error) {
      console.error('Error Claude:', data.error)
      return res.status(500).json({ error: 'Error de Claude API' })
    }
    const texto = data.content[0].text
    historial[sesionId].push({ role: 'assistant', content: texto })
    res.json({ respuesta: texto })
  } catch (err) {
    console.error('Error servidor:', err)
    res.status(500).json({ error: 'Error del servidor' })
  }
})

app.post('/api/limpiar', (req, res) => {
  const { sesionId } = req.body
  if (sesionId) delete historial[sesionId]
  res.json({ ok: true })
})

const PUERTO = process.env.PORT || 3000
console.log('Puerto asignado:', PUERTO)
app.listen(PUERTO, '0.0.0.0', () => console.log(`Servidor corriendo en puerto ${PUERTO}`))
