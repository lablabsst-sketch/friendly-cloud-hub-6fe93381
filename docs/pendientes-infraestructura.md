# Pendientes de infraestructura

## HTTP Security Headers

### Qué son
Instrucciones que el servidor envía al browser junto con cada página para proteger contra ataques comunes (clickjacking, MIME sniffing, downgrade de HTTPS, etc.). El usuario nunca los ve.

### Cuándo aplicar
Al migrar el deploy de Lovable a infraestructura propia (Netlify, Vercel, o servidor propio).

### Cómo aplicar en Netlify
Crear archivo `netlify.toml` en la raíz del proyecto:

```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=()"
    Strict-Transport-Security = "max-age=31536000; includeSubDomains"
```

### Cómo aplicar en Vercel
Crear archivo `vercel.json` en la raíz del proyecto:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" },
        { "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains" }
      ]
    }
  ]
}
```

### Qué protege cada uno

| Header | Ataque que previene |
|--------|-------------------|
| `X-Frame-Options: DENY` | Clickjacking — meter la app en un iframe malicioso |
| `X-Content-Type-Options: nosniff` | MIME sniffing — ejecutar un JS disfrazado de imagen |
| `Strict-Transport-Security` | Forzar HTTPS, evitar downgrade a HTTP |
| `Referrer-Policy` | Filtrar URLs internas al navegar a sitios externos |
| `Permissions-Policy` | Bloquear acceso a cámara/micrófono/GPS desde la app |

### Prioridad
Baja — Lovable ya maneja HTTPS. Aplicar antes de migrar a dominio propio en producción.
