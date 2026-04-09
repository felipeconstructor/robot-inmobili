// Script para importar propiedades a Supabase
// Ejecutar: node importar_propiedades.js

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

const propiedades = [
  {
    tipo: 'casa',
    operacion: 'venta',
    direccion: 'villa el bosque',
    comuna: 'la ligua',
    precio: 190000000,
    moneda: 'CLP',
    dormitorios: 3,
    banos: 3,
    metros: 315,
    descripcion: 'Casa de lujo con distribución inteligente en 3 niveles. Subterráneo con habitación independiente, baño, amplio walking closet y lavandería. Segundo piso con cocina moderna, living y comedor de concepto abierto. Tercer piso con 2 habitaciones y baño completo. Propiedad diseñada para ofrecer comodidad, amplitud y exclusividad en cada espacio.',
    disponible: true
  },
  {
    tipo: 'casa',
    operacion: 'venta',
    direccion: 'molinos de viento (camino a placilla)',
    comuna: 'la ligua',
    precio: 350000000,
    moneda: 'CLP',
    dormitorios: 4,
    banos: 4,
    metros: 58,
    descripcion: 'Casa amplia con terreno de 2 hectareas, quincho, vista hermosa.',
    disponible: true
  },
  {
    tipo: 'casa',
    operacion: 'venta',
    direccion: 'Los Copihues 567',
    comuna: 'Maipu',
    precio: 3800,
    moneda: 'UF',
    dormitorios: 4,
    banos: 2,
    metros: 120,
    descripcion: 'Casa de 2 plantas con jardin privado quincho y 3 estacionamientos. Condominio cerrado con seguridad 24hrs en sector residencial tranquilo.',
    disponible: true
  },
  {
    tipo: 'departamento',
    operacion: 'venta',
    direccion: 'Catedral 1850 Depto 34',
    comuna: 'Santiago',
    precio: 2200,
    moneda: 'UF',
    dormitorios: 1,
    banos: 1,
    metros: 42,
    descripcion: 'Departamento en Santiago centro ideal para inversion. A 3 cuadras del metro Baquedano. Alta demanda de arriendo en el sector.',
    disponible: true
  },
  {
    tipo: 'casa',
    operacion: 'arriendo',
    direccion: 'Av. Irarrazaval 3210',
    comuna: 'Nunoa',
    precio: 680000,
    moneda: 'CLP',
    dormitorios: 3,
    banos: 2,
    metros: 85,
    descripcion: 'Casa en Nunoa en barrio residencial tranquilo. Patio trasero. Sin muebles. Acepta mascotas con garantia adicional.',
    disponible: true
  }
]

async function importar() {
  console.log(`Importando ${propiedades.length} propiedades...`)

  const { data, error } = await supabase
    .from('propiedades')
    .insert(propiedades)
    .select()

  if (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }

  console.log(`✓ ${data.length} propiedades importadas correctamente`)
  data.forEach((p, i) => console.log(`  ${i + 1}. [${p.id}] ${p.tipo} en ${p.direccion}, ${p.comuna}`))
}

importar()
