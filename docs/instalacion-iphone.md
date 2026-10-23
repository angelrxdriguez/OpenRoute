# Instalar OpenRoute en el iPhone (gratis, desde Windows)

Esta guía instala la app con un **Apple ID gratuito**, sin Mac y sin pagar el Apple Developer Program. El porqué está en el [ADR-0001](adr/0001-stack-y-distribucion.md).

Resumen: GitHub compila la app en un Mac en la nube → descargas el `.ipa` → Sideloadly la instala en el iPhone. La instalación dura **7 días** y luego se renueva sin perder datos.

---

## 1. Preparar el PC (solo la primera vez)

1. Instala **Sideloadly**: <https://sideloadly.io>. Sigue sus instrucciones para Windows sobre iTunes e iCloud (suele pedir las versiones que se descargan de la web de Apple, no las de Microsoft Store).
2. Instala las dependencias del proyecto:
   ```bash
   npm install
   ```

## 2. Token de Mapbox (solo la primera vez)

Sin él la app funciona, pero sin mapa.

1. Crea una cuenta en <https://account.mapbox.com/auth/signup/> y elige **«Start without a credit card»**. La cuenta de prueba sin tarjeta permite 100 usuarios al mes en móvil, y tú eres uno.
2. En el panel de Mapbox, copia el **Default public token** (empieza por `pk.`).
3. Guárdalo en local, en un archivo `.env.local` en la raíz del proyecto (Git lo ignora):
   ```bash
   EXPO_PUBLIC_MAPBOX_TOKEN=pk.xxxxxxxx
   ```
4. Guárdalo también en GitHub para las compilaciones:
   ```bash
   gh secret set MAPBOX_PUBLIC_TOKEN
   ```
   (pega el token cuando lo pida).

## 3. Compilar el `.ipa` en GitHub

Sube el código y lanza la compilación:

```bash
git push
gh workflow run ios-build.yml -f profile=development
```

| Perfil | Para qué | ¿Necesita el PC? |
|---|---|---|
| `development` | Desarrollar: los cambios de código aparecen al instante en el iPhone | Sí, con `npm start` y la misma Wi-Fi |
| `release` | Usarla en el día a día, por ejemplo en una ruta sin el PC | No |

Tarda unos 20-30 minutos. Para seguirla y descargar el resultado:

```bash
gh run watch
gh run download --pattern "OpenRoute-*"
```

También puedes descargarla desde GitHub → pestaña **Actions** → la ejecución → **Artifacts**. Descomprime el `.zip` y dentro está el `.ipa`.

> Solo hace falta recompilar cuando se añaden librerías nativas o se cambia `app.json`. Los cambios normales de código no lo necesitan con el perfil `development`.

## 4. Instalar con Sideloadly

1. Conecta el iPhone al PC con cable. Desbloquéalo y pulsa **Confiar en este ordenador**.
2. Abre Sideloadly, arrastra el `.ipa`, escribe tu Apple ID y pulsa **Start**. La primera vez te pedirá el código de verificación en dos pasos.
3. En el iPhone:
   - **Ajustes → General → VPN y gestión de dispositivos →** tu Apple ID **→ Confiar**.
   - **Ajustes → Privacidad y seguridad → Modo de desarrollador →** actívalo. El iPhone se reinicia y te pide confirmarlo.

## 5. Primer uso

- Al empezar la primera actividad, iOS pide la ubicación: elige **Permitir al usarse la app**. Basta con eso: la app no pide «Siempre» y sigue grabando con la pantalla bloqueada.
- Deja activada la **Ubicación exacta**.
- Durante la grabación verás el indicador azul de ubicación en la barra de estado: es normal y significa que el GPS sigue grabando.

### Con el perfil `development`

1. En el PC, con el iPhone en la misma Wi-Fi:
   ```bash
   npm start
   ```
2. Abre OpenRoute en el iPhone. Si no aparece el servidor en la lista, escanea con la cámara el QR que sale en la terminal.
3. Si pregunta por la **red local**, pulsa Permitir.

## 6. Renovar cada 7 días

Pasados 7 días la app no abre, pero **tus actividades siguen en el iPhone**. Para renovarla:

- **Automático:** activa la renovación automática de Sideloadly y la sincronización por Wi-Fi del iPhone. Con el PC encendido y en la misma Wi-Fi, Sideloadly la renueva antes de que caduque.
- **Manual:** conecta el iPhone y vuelve a instalar el mismo `.ipa` con Sideloadly. Se instala por encima y conserva los datos.

Cada nueva compilación instalada también reinicia el plazo de 7 días.

## Límites del Apple ID gratuito

- Como mucho 3 apps instaladas así a la vez.
- No sirve para publicar en la App Store ni para TestFlight. Para eso hace falta el Apple Developer Program (99 €/año); ver el ADR.
