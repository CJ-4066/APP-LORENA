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

## Actualizaciones para todos los dispositivos

Las instalaciones distribuidas desde una release Shorebird reciben parches de
interfaz y lógica automáticamente en segundo plano. El parche se aplica en el
siguiente inicio de la aplicación.

Primera release o cambios nativos/de dependencias:

```bash
npm run mobile:shorebird:release:android
npm run mobile:shorebird:release:ios
```

Para una instalación iOS de desarrollo en dispositivos registrados, mientras
se habilitan los permisos de App Store Connect:

```bash
IOS_EXPORT_METHOD=development npm run mobile:shorebird:release:ios
```

Cambios posteriores únicamente en Dart:

```bash
npm run mobile:shorebird:patch:android
npm run mobile:shorebird:patch:ios
```

Cada dispositivo debe instalar una release Shorebird al menos una vez. Android
recibe el APK nuevo; iOS debe instalar la build desde TestFlight o App Store.
Los parches Shorebird no reemplazan cambios nativos ni dependencias nuevas.

Guia corta:

- [docs/ios-testflight.md](/Users/mark/Desktop/APP%20DE%20LORE/docs/ios-testflight.md)

A few resources to get you started if this is your first Flutter project:

- [Learn Flutter](https://docs.flutter.dev/get-started/learn-flutter)
- [Write your first Flutter app](https://docs.flutter.dev/get-started/codelab)
- [Flutter learning resources](https://docs.flutter.dev/reference/learning-resources)

For help getting started with Flutter development, view the
[online documentation](https://docs.flutter.dev/), which offers tutorials,
samples, guidance on mobile development, and a full API reference.
