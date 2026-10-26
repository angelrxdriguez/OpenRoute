# Instalar OpenRoute en el iPhone (gratis, desde Windows)

Esta guía instala la app con un **Apple ID gratuito**, sin Mac y sin pagar el Apple Developer Program. El porqué está en el [ADR-0001](adr/0001-stack-y-distribucion.md).

Resumen: GitHub compila la app en un Mac en la nube → descargas el `.ipa` → iloader la instala en el iPhone. La instalación dura **7 días** y luego se renueva sin perder datos.

> Se usa **iloader** porque Sideloadly no funcionó.

---

## 1. Preparar el PC (solo la primera vez)

1. Instala **iloader**: <https://iloader.app> (gratuito y de código abierto).
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

## 4. Instalar con iloader

1. Conecta el iPhone al PC con cable. Desbloquéalo y pulsa **Confiar en este ordenador**.
2. Abre iloader, pulsa **Iniciar sesión** con tu Apple ID (la primera vez pide el código de verificación) y elige el iPhone en **Seleccionar un dispositivo**.
3. Pulsa **Importar IPA** y elige el `.ipa`. iloader lo firma y lo instala.
4. En el iPhone:
   - **Ajustes → General → VPN y gestión de dispositivos →** tu Apple ID **→ Confiar**.
   - **Ajustes → Privacidad y seguridad → Modo de desarrollador →** actívalo. El iPhone se reinicia y te pide confirmarlo.

## 5. Primer uso

- Al empezar la primera actividad, iOS pide la ubicación: elige **Permitir al usarse la app**. Basta con eso: la app no pide «Siempre» y sigue grabando con la pantalla bloqueada.
- Deja activada la **Ubicación exacta**.
- Durante la grabación verás el indicador azul de ubicación en la barra de estado: es normal y significa que el GPS sigue grabando.

### Datos en la pantalla bloqueada (Live Activity)

Mientras grabas, la pantalla bloqueada muestra una tarjeta con la actividad, el tiempo en movimiento, la distancia y la velocidad media. En los iPhone con Dynamic Island también aparece arriba. Al tocarla se abre la grabación. Por qué está hecha así: [ADR-0004](adr/0004-live-activity-nativa.md).

- No hay que configurar nada. Si no aparece, mira **Ajustes → OpenRoute → Actividades en directo**.
- Si iOS cierra la app mientras grabas, la tarjeta deja de contar y pide abrir OpenRoute: al abrirla, la grabación sigue.

### Con el perfil `development`

1. En el PC, con el iPhone en la misma Wi-Fi:
   ```bash
   npm start
   ```
2. Abre OpenRoute en el iPhone. Si no aparece el servidor en la lista, escanea con la cámara el QR que sale en la terminal.
3. Si pregunta por la **red local**, pulsa Permitir.

## 6. Renovar cada 7 días

Pasados 7 días la app no abre, pero **tus actividades siguen en el iPhone**. Para renovarla, conecta el iPhone y vuelve a instalar el mismo `.ipa` con iloader (**Importar IPA**). Se instala por encima y conserva los datos.

Cada nueva compilación instalada también reinicia el plazo de 7 días.

## Límites del Apple ID gratuito

- Como mucho 3 apps instaladas así a la vez.
- No sirve para publicar en la App Store ni para TestFlight. Para eso hace falta el Apple Developer Program (99 €/año); ver el ADR.
