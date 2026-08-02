# lo_renaciente

A new Flutter project.

## Getting Started

This project is a starting point for a Flutter application.

La app usa la URL inyectada con `--dart-define=API_BASE_URL=...`.
Para desarrollo local puedes apuntar a la API de tu Mac o a la URL Tailscale publicada.

Si ejecutas los scripts `npm run mobile:ios:device` o `npm run mobile:android:wifi`, la URL se toma automáticamente de `API_BASE_URL`, luego de `.tailnet-api-url` si existe, y por ultimo de la IP LAN detectada de la Mac.

Para builds publicos usa siempre `API_BASE_URL=https://lorenaciente.com` antes de ejecutar `npm run mobile:android:public` o `npm run mobile:ios:public`.

Para iPhone via TestFlight usa:

```bash
API_BASE_URL=https://lorenaciente.com npm run mobile:ios:testflight
```

Guia corta:

- [docs/ios-testflight.md](/Users/mark/Desktop/APP%20DE%20LORE/docs/ios-testflight.md)

A few resources to get you started if this is your first Flutter project:

- [Learn Flutter](https://docs.flutter.dev/get-started/learn-flutter)
- [Write your first Flutter app](https://docs.flutter.dev/get-started/codelab)
- [Flutter learning resources](https://docs.flutter.dev/reference/learning-resources)

For help getting started with Flutter development, view the
[online documentation](https://docs.flutter.dev/), which offers tutorials,
samples, guidance on mobile development, and a full API reference.
