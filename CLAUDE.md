# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

Nova — chatbot IA inmobiliario para Prolig Propiedades. En producción 24/7 en Railway.

- Produccion: https://robot-inmobiliario-production.up.railway.app
- CRM: /crm.html (conecta directo a Supabase desde el browser)
- WhatsApp sandbox: +1 415 523 8886

## Comandos

```bash
npm start          # inicia server en puerto 3000 (local) u 8080 (Railway via PORT env)
node server.js     # equivalente a npm start
```

No hay tests ni linter configurados. Para verificar sintaxis: `node --check server.js`

Para probar localmente requiere `.env` con todas las variables (ver abajo).

## Arquitectura

Todo el backend vive en un solo archivo: `server.js`. No hay carpetas src/, routes/, ni módulos separados.

**Flujo de un mensaje:**
1. `POST /api/chat` o `POST /webhook/whatsapp` recibe el mensaje
2. `obtenerRespuestaNova()` — consulta propiedades en Supabase, arma historial, llama Claude API (`claude-opus-4-6`, max 500 tokens)
3. Claude responde con texto plano. Si detecta nombre+teléfono incluye señales estructuradas: `AGENDAR_VISITA|...` o `LEAD_DATOS|...`
4. `procesarRespuesta()` — parsea las señales, guarda lead en Supabase, agenda en Google Calendar si aplica
5. `AGENDAR_VISITA` tiene prioridad sobre `LEAD_DATOS` (evita leads duplicados)

**Historial de conversación:**
Se guarda en memoria (`const historial = {}`). Se pierde al reiniciar el servidor. Máximo 20 mensajes por sesión.

**Identificadores de sesión:**
- Web: `sesionId` generado en el frontend
- WhatsApp: `wa_` + número sin prefijo `whatsapp:+`

## Base de datos Supabase

Tablas:
- `propiedades`: tipo, operacion, direccion, comuna, precio, moneda, dormitorios, banos, metros, descripcion, disponible
- `leads`: id, nombre, telefono, propiedad_interes, mensaje_inicial, estado (nuevo/caliente/tibio/frio/visita), canal (whatsapp/web), created_at, updated_at

El CRM (`public/crm.html`) se conecta directamente a Supabase desde el browser usando la clave pública. RLS desactivado.

## Variables de entorno requeridas

```
ANTHROPIC_API_KEY
SUPABASE_URL
SUPABASE_KEY
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_WHATSAPP_NUMBER
PORT=8080
```

Google Calendar usa `google-credentials.json` en la raíz (cuenta de servicio, archivo en git). El calendario `felipec.constructor@gmail.com` debe estar compartido con el service account del archivo.

## Deploy

Railway detecta cambios en `main` y redespliega automáticamente. El servidor debe escuchar en `0.0.0.0:${process.env.PORT}`.

Para forzar redeploy sin cambios: hacer commit vacío o cambio menor y push.

## Convenciones

- Código y comentarios en español
- Sin markdown, emojis ni símbolos en las respuestas de Nova al usuario final
- `node_modules/` está commiteado (Railway lo usa en cache — no eliminar ni agregar a .gitignore sin probar)
