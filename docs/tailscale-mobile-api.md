# API móvil por Tailscale

Objetivo: usar esta Mac como servidor de pruebas durante días y acceder a la API desde iPhone y Android, incluso por datos móviles, sin dominio público.

## Qué resuelve

- La API sigue corriendo en esta Mac.
- Tailscale crea una red privada entre tu Mac y tus celulares.
- La app móvil apunta a una URL HTTPS privada tipo `https://<nombre>.ts.net`.
- Mientras la Mac siga encendida, con internet y con Tailscale activo, la API se reinicia sola y la conexión se mantiene.

## Requisitos

- Tailscale instalado en la Mac.
- Tailscale instalado en iPhone y Android.
- Los tres dispositivos deben iniciar sesión en la misma cuenta de Tailscale.

## Mac

1. Instalar Tailscale:

```bash
brew install tailscale
```

2. Instalar el daemon persistente en modo usuario:

```bash
./scripts/install-tailscale-userspace-launchagent.sh
```

3. Autenticar la Mac:

```bash
/opt/homebrew/opt/tailscale/bin/tailscale --socket="$HOME/Library/Application Support/LoRenaciente/tailscale/tailscaled.sock" up
```

4. Dejar la API corriendo en segundo plano:

```bash
npm run api:daemon:start
```

5. Publicar la API dentro de la tailnet:

```bash
./scripts/publish-api-tailscale.sh
```

## Celulares

1. Instalar Tailscale desde App Store / Play Store.
2. Iniciar sesión con la misma cuenta usada en la Mac.
3. Verificar que ambos celulares aparezcan conectados dentro de Tailscale.

## Reinstalar la app móvil contra la URL Tailscale

Cuando `publish-api-tailscale.sh` te dé una URL HTTPS:

```bash
API_BASE_URL=https://<tu-mac>.tailnet.ts.net npm run mobile:ios:device
API_BASE_URL=https://<tu-mac>.tailnet.ts.net npm run mobile:android:wifi
```

## Notas

- Esto no expone la API a internet pública; solo a tus dispositivos dentro de Tailscale.
- Si la Mac se apaga o pierde internet, la API deja de estar disponible.
- Si el iPhone o Android no tienen Tailscale activo, no podrán llegar a la API.
- Los logs de la API daemon quedan en `~/Library/Application Support/LoRenaciente/api-daemon/`.
