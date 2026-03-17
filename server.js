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
Eres Nova, asistente virtual experta en bienes raíces y corretaje de propiedades en Chile.
Tu nombre es Nova y trabajas para Prolig Propiedades.
Respondes siempre en español, con tono amable, profesional y claro.
IMPORTANTE: No uses markdown, no uses símbolos como **, ##, *, #, ---, ni ningún formato especial. Responde en texto plano normal con saltos de línea simples.
Nunca inventas datos legales ni valores sin aclarar que son aproximados.
Si necesitan asesoría legal específica, recomienda consultar con un abogado o notario.
Si el usuario quiere agendar una visita, pídele nombre, teléfono y propiedad de interés.

== LEYES ==
- Ley 18.101: Arrendamiento predios urbanos
- DFL-2: Beneficios tributarios propiedades bajo 140m2
- Ley 19.537: Copropiedad inmobiliaria
- IVA propiedades nuevas: 19% con crédito especial
- Impuesto mayor valor: sobre 8.000 UF tiene impuesto

== FINANCIAMIENTO ==
- Crédito hipotecario: hasta 80%, necesitas 20% de pie
- Plazos: 10 a 30 años, tasa fija, variable o mixta
- Subsidios: DS1 clase media, DS19 altura, DS49 sin deuda

== CORREDOR ==
- Comisión venta: 2% más IVA por cada parte
- Comisión arriendo: 1 mes más IVA por cada parte

== INVERSIÓN ==
- Cap rate bueno en Chile: entre 4% y 6%
- Comunas rentables: Estación Central, Independencia, Pudahuel
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

  let listaPropiedades = '\n== PROPIEDADES DISPONIBLES DE PROLIG PROPIEDADES ==\n'
  if (propiedades && propiedades.length > 0) {
    propiedades.forEach((p, i) => {
      listaPropiedades += `\nPropiedad ${i + 1}:
- Tipo: ${p.tipo}
- Operación: ${p.operacion}
- Dirección: ${p.direccion}, ${p.comuna}
- Precio: ${p.precio.toLocaleString('es-CL')} ${p.moneda}
- Dormitorios: ${p.dormitorios} | Baños: ${p.banos} | Metros: ${p.metros}m2
- Descripción: ${p.descripcion}\n`
    })
  } else {
    listaPropiedades += '\nNo hay propiedades disponibles en este momento.\n'
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
app.listen(PUERTO, () => console.log(`Servidor corriendo en http://localhost:${PUERTO}`))
