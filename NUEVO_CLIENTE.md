ANTHROPIC_API_KEY = TU_API_KEY_AQUI Guía: Agregar nuevo cliente Nova
**Tiempo estimado: 20-30 minutos**

---
# Guía: Agregar nuevo cliente Nova

## Variables de entorno

| Variable | Valor |
|---------|------|
| ANTHROPIC_API_KEY | (configurar en Railway) |
| SUPABASE_URL | (desde Supabase) |
| SUPABASE_KEY | (anon public key) |
| RESEND_API_KEY | (configurar en Railway) |
| TWILIO_ACCOUNT_SID | (configurar en Railway) |
| TWILIO_AUTH_TOKEN | (configurar en Railway) |

---

## PASO 1 — Crear proyecto Supabase

1. Ir a supabase.com → New project  
2. Nombre: nova-[cliente]  
3. Región: São Paulo  

---

## PASO 2 — Configurar Railway

1. Crear proyecto  
2. Conectar repo  
3. Agregar variables de entorno  
4. Deploy  

---

## CHECK FINAL

[ ] Supabase listo  
[ ] Railway deploy OK  
[ ] Variables configuradas  
[ ] Bot respondiendo  
## PASO 1 — Crear proyecto Supabase

1. Ir a supabase.com → **New project**
2. Nombre: `nova-[nombre-cliente]` (ej: `nova-corredora-ligua`)
3. Region: **South America (São Paulo)**
4. Guardar la contraseña del proyecto (no la necesitarás luego)
5. Esperar ~2 minutos que termine de crear

### Crear las 3 tablas (SQL Editor → New query)

**Tabla propiedades:**
```sql
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
```

**Tabla leads:**
```sql
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
  notas text
);
```

**Tabla fotos_propiedades:**
```sql
create table fotos_propiedades (
  id bigint generated always as identity primary key,
  propiedad_id bigint references propiedades(id) on delete cascade,
  url text,
  orden integer default 0
);
```

**Desactivar RLS en las 3 tablas:**
```sql
alter table propiedades disable row level security;
alter table leads disable row level security;
alter table fotos_propiedades disable row level security;
```

### Crear bucket Storage

1. Supabase → **Storage** → **New bucket**
2. Nombre: `propiedades`
3. Marcar como **Public**
4. Crear

### Anotar las credenciales

- Ir a **Settings → API**
- Copiar **Project URL** → será `SUPABASE_URL`
- Copiar **anon / public key** → será `SUPABASE_KEY`

---

## PASO 2 — Crear proyecto Railway

1. Ir a railway.app → **New project**
2. Elegir **"Deploy from GitHub repo"**
3. Seleccionar `felipeconstructor/robot-inmobiliario`
4. Railway empieza a desplegar automáticamente

### Agregar variables de entorno

Railway → proyecto → **Variables** → agregar una por una:

| Variable | Valor |
|---|---|
| `ANTHROPIC_API_KEY` |( configurar en railway) |
| `SUPABASE_URL` | URL del proyecto Supabase recién creado |
| `SUPABASE_KEY` | Key anon del proyecto Supabase recién creado |
| `TWILIO_ACCOUNT_SID` | `AC576ce1fa6e074bc53047a3e7319f6bca` |
| `TWILIO_AUTH_TOKEN` | `c10a0e0a26d00483a0d54cb783499c85` |
| `TWILIO_WHATSAPP_NUMBER` | `whatsapp:+14155238886` |
| `GOOGLE_CREDENTIALS` | Pegar el JSON completo de google-credentials.json |
| `RESEND_API_KEY` | `re_KekDZHkL_4Kca7BP25JXNvbqaEPLgueLS` |
| `ADMIN_PASSWORD` | Contraseña para el cliente (ej: `cliente2026`) |
| `NOTIFY_PHONE` | WhatsApp del cliente (ej: `whatsapp:+56912345678`) |
| `PORT` | `8080` |
| `APP_URL` | URL del proyecto Railway (ver abajo) |

### Obtener la URL del proyecto

- Railway asigna una URL automáticamente al crear el proyecto
- Se ve en **Settings → Networking → Public domain**
- Ejemplo: `https://nombre-produccion.up.railway.app`
- Esa URL va en la variable `APP_URL`

### Redesplegar con las variables

- Después de agregar todas las variables → **Deploy** para que tome los cambios

---

## PASO 3 — Personalizar el prompt de Nova

Abrir `server.js` y buscar la línea:

```
Eres Nova, asistente virtual de Prolig Propiedades
```

Cambiar el nombre y la descripción por los del cliente nuevo. Ejemplo:

```
Eres Nova, asistente virtual de Corredora La Ligua, corredora de propiedades en La Ligua, V Region de Chile.
```

Hacer push → ambos clientes se actualizan → **problema**: si el prompt es genérico, afecta a todos.

**Solución correcta:** usar variable de entorno `PROMPT_EMPRESA` (pendiente implementar).

---

## PASO 4 — Entregar al cliente

URLs que le das al cliente:

| Panel | URL |
|---|---|
| Chat público | `https://su-url.up.railway.app` |
| Admin propiedades | `https://su-url.up.railway.app/admin.html` |
| CRM leads | `https://su-url.up.railway.app/crm.html` |
| Contraseña | La que pusiste en `ADMIN_PASSWORD` |

---

## PASO 5 — Cobrar

- Instalación: **$150.000 CLP** (pago único)
- Mensualidad: **$49.000 CLP/mes**
- Costo real tuyo: ~$10-15 USD/mes → margen 75%

---

## Checklist rápido

```
[ ] Supabase: proyecto creado
[ ] Supabase: 3 tablas creadas (propiedades, leads, fotos_propiedades)
[ ] Supabase: RLS desactivado en las 3 tablas
[ ] Supabase: bucket "propiedades" creado (público)
[ ] Railway: proyecto creado desde repo robot-inmobiliario
[ ] Railway: todas las variables de entorno configuradas
[ ] Railway: redeploy hecho después de las variables
[ ] Prompt Nova: nombre del cliente actualizado
[ ] URLs entregadas al cliente
[ ] Contraseña entregada al cliente
[ ] Cobro realizado
```

---

*Actualizado: 29 marzo 2026*
