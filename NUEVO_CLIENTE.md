# Guía: Instalar Nova para nuevo cliente
**Tiempo estimado: 30-45 minutos**

---

## PASO 1 — Crear proyecto Supabase

1. Ir a [supabase.com](https://supabase.com) → **New project**
2. Nombre: `nova-[nombre-cliente]` (ej: `nova-corredora-valparaiso`)
3. Región: **South America (São Paulo)**
4. Esperar ~2 minutos que termine de crear

### Crear todas las tablas (SQL Editor → New query → pegar todo junto)

```sql
-- Propiedades
create table propiedades (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  tipo text,
  operacion text,
  direccion text,
  comuna text,
  precio numeric,
  moneda text default 'CLP',
  dormitorios integer,
  "baños" integer,
  metros numeric,
  "descripción" text,
  disponible boolean default true,
  imagen_url text
);

-- Fotos de propiedades
create table fotos_propiedades (
  id bigint generated always as identity primary key,
  propiedad_id bigint references propiedades(id) on delete cascade,
  url text,
  orden integer default 0
);

-- Leads / clientes potenciales
create table leads (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  nombre text,
  telefono text,
  propiedad_interes text,
  mensaje_inicial text,
  estado text default 'nuevo',
  canal text default 'web',
  notas text,
  agente text,
  tipo_lead text default 'sin_clasificar',
  fecha_visita timestamptz,
  calendar_event_id text,
  cancel_token text,
  recordatorio_24h_enviado boolean default false,
  recordatorio_1h_enviado boolean default false,
  fecha_seguimiento date,
  tenant_id uuid
);

-- Usuarios del sistema (login CRM)
create table usuarios (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  nombre text not null,
  email text unique not null,
  password_hash text not null,
  rol text default 'agente',
  activo boolean default true,
  google_calendar_id text,
  tenant_id uuid
);

-- Administraciones de propiedades
create table administraciones (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  propietario text,
  rut_propietario text,
  banco text,
  tipo_cuenta text,
  numero_cuenta text,
  direccion text,
  arrendatario text,
  mes text,
  valor_arriendo numeric,
  porcentaje_comision numeric default 10,
  estado text default 'pendiente',
  notas text,
  corredor_email text
);

-- Transacciones cerradas
create table transacciones (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  fecha_cierre date,
  tipo text,
  precio numeric,
  moneda text default 'CLP',
  comision_total numeric,
  agente text,
  utm_campaign text,
  propiedad_id bigint,
  tenant_id uuid
);

-- Desactivar RLS en todas las tablas
alter table propiedades disable row level security;
alter table fotos_propiedades disable row level security;
alter table leads disable row level security;
alter table usuarios disable row level security;
alter table administraciones disable row level security;
alter table transacciones disable row level security;
```

### Crear bucket Storage

1. Supabase → **Storage** → **New bucket**
2. Nombre: `propiedades`
3. Marcar como **Public** → Crear

### Anotar las credenciales

Ir a **Settings → API** y copiar:
- **Project URL** → `SUPABASE_URL`
- **anon / public key** → `SUPABASE_ANON_KEY`
- **service_role key** → `SUPABASE_SERVICE_KEY`

---

## PASO 2 — Fork del repo en GitHub

1. Ir a [github.com/felipeconstructor/robot-inmobili](https://github.com/felipeconstructor/robot-inmobili)
2. Click en **Fork** (arriba a la derecha)
3. Nombrar el fork: `nova-[nombre-cliente]`
4. El fork queda en tu cuenta GitHub

---

## PASO 3 — Crear proyecto en Railway

1. Ir a [railway.app](https://railway.app) → **New project**
2. Elegir **"Deploy from GitHub repo"**
3. Seleccionar el fork recién creado
4. Railway empieza a desplegar

### Agregar variables de entorno

Railway → proyecto → **Variables** → agregar:

| Variable | Valor |
|---|---|
| `ANTHROPIC_API_KEY` | (tu API key de Anthropic) |
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_ANON_KEY` | anon key de Supabase |
| `SUPABASE_SERVICE_KEY` | service_role key de Supabase |
| `TWILIO_ACCOUNT_SID` | (de twilio.com) |
| `TWILIO_AUTH_TOKEN` | (de twilio.com) |
| `TWILIO_WHATSAPP_NUMBER` | `whatsapp:+14155238886` |
| `SITE_NAME` | Nombre de la corredora (ej: `Propiedades Valle Central`) |
| `ADMIN_PASSWORD` | Contraseña para el cliente (ej: `corredora2026`) |
| `NOTIFY_PHONE` | WhatsApp del admin (ej: `whatsapp:+56912345678`) |
| `CALENDAR_ID` | Email de Google Calendar del admin |
| `EMAIL_ADMIN` | Email del admin (para reportes) |
| `APP_URL` | URL pública del proyecto Railway |
| `PORT` | `8080` |

### Redesplegar

Después de agregar todas las variables → **Deploy** para aplicarlos.

### Obtener la URL pública

Railway → **Settings → Networking → Public domain**
Ejemplo: `https://nova-cliente.up.railway.app`
→ Esta va en la variable `APP_URL`

---

## PASO 4 — Crear usuario admin inicial

El sistema no tiene usuarios por defecto. Entrar a:

```
https://tu-url.up.railway.app/login.html
```

El primer acceso usa la variable `ADMIN_PASSWORD`. Una vez dentro:
1. Ir a **Usuarios** en el sidebar
2. Crear el primer usuario admin con email y contraseña
3. A partir de ahí se usa ese login

---

## PASO 5 — Google Calendar (opcional)

Si el cliente quiere que Nova agende visitas automáticamente:

1. El admin va a Google Calendar → **Configuración del calendario** → **Compartir con personas específicas**
2. Agrega: `nova-calendar@sodium-gateway-490602-p0.iam.gserviceaccount.com`
3. Permiso: **"Ver todos los detalles"** (para verificar disponibilidad) o **"Hacer cambios"** (para crear eventos)
4. El ID del calendario es el email del admin → va en la variable `CALENDAR_ID`

---

## PASO 6 — Personalizar el prompt de Nova

En el fork, abrir `server.js` y buscar:

```
Eres Nova, asistente virtual de Nova CRM
```

Cambiar por el nombre, ciudad y descripción del cliente:

```
Eres Nova, asistente virtual de Propiedades Valle Central, corredora especializada en la V Región de Chile.
```

Push → Railway redespliega automáticamente.

---

## PASO 7 — Entregar al cliente

| Panel | URL |
|---|---|
| Sitio web público | `https://su-url.up.railway.app` |
| Workspace / Chat IA | `https://su-url.up.railway.app/workspace.html` |
| Admin propiedades | `https://su-url.up.railway.app/admin.html` |
| CRM leads | `https://su-url.up.railway.app/crm.html` |
| Administraciones | `https://su-url.up.railway.app/administraciones.html` |

---

## Costos mensuales por cliente

| Servicio | Costo |
|---|---|
| Railway | ~$5 USD/mes |
| Supabase | Gratis (plan free) |
| Anthropic API | ~$5–20 USD/mes según uso |
| Twilio WhatsApp | ~$15 USD/mes (número dedicado) |
| **Total tuyo** | **~$25–40 USD/mes** |

Precio sugerido al cliente: **$49.000–$89.000 CLP/mes** → margen 70–80%

---

## Checklist rápido

```
[ ] Supabase: proyecto creado en São Paulo
[ ] Supabase: SQL ejecutado (todas las tablas creadas)
[ ] Supabase: RLS desactivado en todas las tablas
[ ] Supabase: bucket "propiedades" creado (público)
[ ] GitHub: fork del repo creado
[ ] Railway: proyecto creado desde el fork
[ ] Railway: todas las variables de entorno configuradas
[ ] Railway: redeploy hecho después de las variables
[ ] Nova: prompt personalizado con nombre del cliente
[ ] Google Calendar: compartido con service account (si aplica)
[ ] Usuario admin: creado desde el panel Usuarios
[ ] URLs y contraseña entregadas al cliente
```

---

*Actualizado: Mayo 2026*
