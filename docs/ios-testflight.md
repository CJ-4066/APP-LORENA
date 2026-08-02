# iOS TestFlight para Lo Renaciente

Este proyecto ya queda preparado para generar una build iOS orientada a TestFlight.

## Identidad actual

- App visible: `Lo Renaciente`
- Bundle ID: `com.lorenaciente.loRenaciente`
- Team ID en proyecto iOS: `463SPRTG5F`

## Requisitos externos

Antes de subir una build necesitas:

1. Cuenta Apple Developer activa
2. App creada en App Store Connect con el mismo Bundle ID
3. Sesion iniciada en Xcode con la cuenta Apple correcta
4. Firma automatica activa en `Runner > Signing & Capabilities`

## Comando del repo

```bash
API_BASE_URL=https://lorenaciente.com npm run mobile:ios:testflight
```

Opcionalmente puedes forzar version y build:

```bash
API_BASE_URL=https://lorenaciente.com \
IOS_BUILD_NAME=0.1.0 \
IOS_BUILD_NUMBER=2 \
npm run mobile:ios:testflight
```

## Que hace el script

- valida `flutter`
- valida `xcodebuild`
- lee el Bundle ID y Team ID actuales
- ejecuta `flutter pub get`
- genera un `.ipa` con `--export-method app-store`

## Salida esperada

El IPA queda en:

```text
apps/mobile/build/ios/ipa
```

## Subida a TestFlight

### Opcion A: Xcode Organizer

1. Abre `apps/mobile/ios/Runner.xcworkspace`
2. `Product > Archive`
3. Cuando termine, abre `Organizer`
4. `Distribute App`
5. `App Store Connect`
6. `Upload`

### Opcion B: Transporter

1. Abre la app `Transporter` en macOS
2. Arrastra el `.ipa`
3. Sube la build

## Despues de la subida

1. Entra a App Store Connect
2. Abre la app `Lo Renaciente`
3. Ve a `TestFlight`
4. Espera el procesamiento de Apple
5. Agrega testers internos
6. Instala desde TestFlight en el iPhone

## Importante

- Cada nueva subida necesita un `build number` mayor que el anterior.
- TestFlight no deja una app permanente; cada build dura 90 dias.
- Para una instalacion estable a mercado, luego debes publicar en App Store.
