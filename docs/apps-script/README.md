# Correo de bienvenida — despliegue (5 minutos)

El correo de la feria se envía con Google Apps Script desde tu cuenta de Google.
Costo $0, sin comprar dominio. Conviene usar `alan.morales@mayor.cl` si es Google
Workspace: mejor entregabilidad (cae en bandeja, no spam) y cuota más alta.

## Pasos

1. Entra a [script.google.com](https://script.google.com) con tu cuenta de Google.
2. **Nuevo proyecto** → borra el contenido y pega todo `Codigo.gs`.
3. Cambia `var TOKEN = 'CAMBIA-ESTE-TOKEN';` por una palabra secreta tuya
   (la misma que pondrás en `NEXT_PUBLIC_PLANPET_TOKEN`).
4. **Implementar → Nueva implementación** → tipo **Aplicación web**.
   - *Ejecutar como:* **Yo**
   - *Quién tiene acceso:* **Cualquier persona**
5. Autoriza los permisos cuando lo pida (es tu propia cuenta enviando tus correos).
6. Copia la **URL de la app web** (termina en `/exec`).

## Conectar con la app

En la raíz del proyecto, crea `.env.local` (copia de `.env.local.example`):

```
NEXT_PUBLIC_PLANPET_WEBHOOK=https://script.google.com/macros/s/AAAA.../exec
NEXT_PUBLIC_PLANPET_TOKEN=la-misma-palabra-secreta
```

Reinicia el `dev` (o vuelve a desplegar en Vercel, agregando esas dos variables
en Project → Settings → Environment Variables).

## Verificar

- Abre la URL `/exec` en el navegador: debe responder `{"ok":true,"service":"planpet-mailer"}`.
- En la app, escribe tu correo en "Recibe tu plan por correo" → debería llegarte en segundos.

## Límites y notas

- Gmail normal: ~100 destinatarios/día. Google Workspace (`@mayor.cl`): ~1.500/día.
  Más que suficiente para una feria.
- Si cambias el código del script, **vuelve a desplegar** (Implementar → Gestionar
  implementaciones → editar → nueva versión) para que la URL `/exec` tome los cambios.
- Es un proyecto desechable: al terminar la feria puedes borrar la implementación.
