# Manual de Entrega Nova — Chatbot Inmobiliario con IA
**Versión 1.0 — Marzo 2026**
**Creado por Felipe Campos — Nova Inmobiliario**

---

## ¿Qué es Nova?

Nova es un chatbot inmobiliario con inteligencia artificial que atiende a los leads 24/7 por:
- **WhatsApp** (responde, agenda visitas, muestra propiedades)
- **Sitio web** (chat embebido en cualquier página)
- **Facebook Messenger** (incluyendo consultas de Marketplace)

Nova guarda cada lead automáticamente en un CRM propio, agenda visitas en Google Calendar del corredor, y envía reportes semanales por email.

---

## Lo que recibe el cliente

| Herramienta | Descripción |
|---|---|
| Chatbot IA 24/7 | Responde preguntas sobre propiedades, precio, metros, disponibilidad |
| Agenda automática | Agenda visitas en Google Calendar sin intervención humana |
| Panel CRM | Lista de leads con estados: nuevo, caliente, tibio, frío, visita |
| Panel Admin | Gestión de propiedades con fotos sin tocar código |
| Fichas individuales | Página de cada propiedad con galería de fotos y botones de contacto |
| Reporte semanal | Email automático cada lunes con stats de leads y actividad |
| WhatsApp sandbox | Número Twilio para pruebas (reemplazar por número real cuando pague) |

---

## Paso 1 — Clonar el repositorio base

```bash
# En la terminal
git clone https://github.com/felipeconstructor/robot-inmobiliario.git nova-cliente-nombre
cd nova-cliente-nombre

# Instalar dependencias
npm install
```

---

## Paso 2 — Crear proyecto Supabase nuevo

1. Ir a [supabase.com](https://supabase.com) → New Project
2. Nombre del proyecto: `nova-[nombre-cliente]` (ej: `nova-prolig`)
3. Guardar la **URL** y **anon/public key** del proyecto

### SQL para crear las tablas (ejecutar en SQL Editor de Supabase)

```sql
-- Tabla propiedades
CREATE TABLE propiedades (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  tipo TEXT,
  operacion TEXT,
  direccion TEXT,
  comuna TEXT,
  precio NUMERIC,
  moneda TEXT DEFAULT 'CLP',
  dormitorios INT,
  "baños" INT,
  metros NUMERIC,
  "descripción" TEXT,
  disponible BOOLEAN DEFAULT TRUE,
  imagen_url TEXT
);

-- Tabla leads
CREATE TABLE leads (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  nombre TEXT,
  telefono TEXT,
  propiedad_interes TEXT,
  mensaje_inicial TEXT,
  estado TEXT DEFAULT 'nuevo',
  canal TEXT DEFAULT 'whatsapp'
);

-- Tabla fotos por propiedad
CREATE TABLE fotos_propiedades (
  id BIGSERIAL PRIMARY KEY,
  propiedad_id BIGINT REFERENCES propiedades(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  orden INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Desactivar RLS en todas las tablas (el servidor usa service key)
ALTER TABLE propiedades DISABLE ROW LEVEL SECURITY;
ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE fotos_propiedades DISABLE ROW LEVEL SECURITY;
```

### Crear bucket de Storage para fotos

1. En Supabase → Storage → New Bucket
2. Nombre: `propiedades`
3. Marcar como **Public**
4. En Policies del bucket, ejecutar este SQL:

```sql
-- Permitir subir fotos
CREATE POLICY "Subir fotos" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'propiedades');

-- Permitir ver fotos
CREATE POLICY "Ver fotos" ON storage.objects
FOR SELECT USING (bucket_id = 'propiedades');

-- Permitir eliminar fotos
CREATE POLICY "Eliminar fotos" ON storage.objects
FOR DELETE USING (bucket_id = 'propiedades');
```

---

## Paso 3 — Cambios en el código

### 3.1 Archivos a editar

**server.js** — buscar y reemplazar estas líneas:

```js
// Nombre del negocio en respuestas de Nova
const SYSTEM_PROMPT = `Eres Nova, asistente de [NOMBRE CORREDORA]...`

// Número WhatsApp del corredor (el número real del negocio)
// Se configura en variable de entorno TWILIO_WHATSAPP_NUMBER
```

**public/admin.html** — línea del título:
```html
<div class="header-brand">[Nombre Corredora]</div>
<div class="header-sub">[Slogan o ciudad]</div>
```

**public/crm.html** — misma línea del encabezado.

**public/propiedad.html** — mismas líneas del header.

### 3.2 Actualizar el System Prompt de Nova

En `server.js`, dentro de la función `construirSystemPrompt()`, cambiar:
- Nombre de la empresa
- Ciudad/región donde opera
- Nombre del corredor de contacto
- Horario de atención (aunque Nova atiende 24/7, se menciona en contexto)

---

## Paso 4 — Google Calendar

1. Ir a [console.cloud.google.com](https://console.cloud.google.com)
2. Crear proyecto nuevo: `nova-[cliente]`
3. Habilitar Google Calendar API
4. Crear cuenta de servicio → Descargar JSON de credenciales
5. En Google Calendar del cliente:
   - Configuración → Compartir con personas específicas
   - Agregar el email de la cuenta de servicio (termina en `.iam.gserviceaccount.com`)
   - Permisos: **Realizar cambios en eventos**
6. Copiar el **Calendar ID** del cliente (en configuración del calendario)
7. El JSON de credenciales va como variable de entorno `GOOGLE_CREDENTIALS`

---

## Paso 5 — Twilio WhatsApp

### Para pruebas (sandbox)
1. [twilio.com](https://twilio.com) → Messaging → Senders → WhatsApp Sandbox
2. El número sandbox es siempre `+1 415 523 8886`
3. El cliente debe enviar el código de activación (ej: `join specific-supper`) al sandbox

### Para producción (cuando el cliente pague)
1. En Twilio → Messaging → Senders → WhatsApp Senders
2. Conectar número de teléfono real del cliente
3. Meta aprueba en 3-5 días hábiles
4. Actualizar variable `TWILIO_WHATSAPP_NUMBER` con el número real

---

## Paso 6 — Facebook Messenger

1. Ir a [developers.facebook.com](https://developers.facebook.com)
2. Crear App → Tipo: **Negocios**
3. Agregar producto: **Messenger**
4. En Messenger → Configuración:
   - Conectar la Página de Facebook del cliente
   - Generar token de acceso de página
5. Configurar Webhook:
   - URL: `https://[url-railway]/webhook/meta`
   - Token de verificación: `nova_verify_2025`
   - Suscribir a: `messages`, `messaging_postbacks`
6. Guardar el **Page Access Token** como variable `META_PAGE_TOKEN`

---

## Paso 7 — Email (Resend)

1. [resend.com](https://resend.com) → API Keys → Create API Key
2. Usar dominio propio del cliente si tiene (o usar `onboarding@resend.dev` para pruebas)
3. En `server.js`, configurar el destinatario del reporte semanal:
```js
to: ['correo@delcliente.com'],
from: 'Nova <nova@dominiocliente.cl>', // Con dominio propio
```

---

## Paso 8 — Railway (deploy)

1. [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Seleccionar el repositorio del cliente
3. Configurar variables de entorno:

| Variable | Valor |
|---|---|
| `ANTHROPIC_API_KEY` | API key de Anthropic (la misma o una nueva) |
| `SUPABASE_URL` | URL del proyecto Supabase del cliente |
| `SUPABASE_KEY` | Anon key de Supabase del cliente |
| `TWILIO_ACCOUNT_SID` | SID de cuenta Twilio |
| `TWILIO_AUTH_TOKEN` | Auth token de Twilio |
| `TWILIO_WHATSAPP_NUMBER` | `whatsapp:+56XXXXXXXXX` (número real) o sandbox |
| `GOOGLE_CREDENTIALS` | JSON completo de credenciales de cuenta de servicio |
| `GOOGLE_CALENDAR_ID` | Calendar ID del cliente |
| `RESEND_API_KEY` | API key de Resend del cliente |
| `META_PAGE_TOKEN` | Token de página de Facebook |
| `PORT` | 8080 |

4. Railway despliega automáticamente en cada push a GitHub
5. Copiar la URL pública del deploy (ej: `https://[nombre].up.railway.app`)

---

## Paso 9 — Configurar Webhook de WhatsApp en Twilio

1. En Twilio → Messaging → Senders → WhatsApp Sandbox Settings
2. En "When a message comes in": pegar la URL del webhook:
   ```
   https://[url-railway]/webhook/whatsapp
   ```
3. Método: POST

---

## Paso 10 — Verificar que todo funciona

Checklist de pruebas antes de entregar:

- [ ] Enviar mensaje al WhatsApp sandbox — Nova responde en menos de 5 segundos
- [ ] Pedir a Nova una propiedad específica — describe correctamente
- [ ] Decirle a Nova "quiero agendar una visita" — pregunta nombre, teléfono, día y hora
- [ ] Verificar que la visita apareció en Google Calendar del cliente
- [ ] Verificar que el lead quedó en el CRM (/crm.html) con nombre y teléfono
- [ ] Pedir a Nova "quiero ver fotos" — responde con link a ficha individual
- [ ] Abrir la ficha (/propiedad/1) — se ve galería, precio, botones de contacto
- [ ] Ingresar al admin (/admin.html) — agregar una propiedad de prueba
- [ ] El lunes siguiente — verificar que llegó el reporte semanal por email

---

## Precios sugeridos para el cliente

| Plan | Precio |
|---|---|
| Instalación y configuración | $150.000 CLP (única vez) |
| Plan base mensual | $49.000 CLP/mes |
| Add-on: Facebook + Instagram | +$40.000 CLP/mes |
| Add-on: Fotos ilimitadas por propiedad | +$20.000 CLP/mes |
| Add-on: Publicación automática en redes | +$20.000 CLP/mes |
| Número WhatsApp Business real | $30.000 CLP instalación |

---

## Tiempos estimados de instalación

| Tarea | Tiempo |
|---|---|
| Clonar y configurar código | 30 min |
| Crear Supabase + tablas + bucket | 20 min |
| Configurar Google Calendar | 20 min |
| Configurar Railway + variables | 15 min |
| Configurar Twilio | 10 min |
| Configurar Messenger | 20 min |
| Pruebas y ajustes | 30 min |
| **Total** | **~2.5 horas** |

---

## Contacto y soporte

Este sistema fue desarrollado y es mantenido por **Felipe Campos — Nova Inmobiliario**.

Para soporte técnico o consultas de nuevas funcionalidades, contactar directamente a Felipe.

---

*Manual generado el 20 de marzo de 2026 — Versión 1.0*
