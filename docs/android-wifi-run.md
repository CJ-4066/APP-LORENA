# Android por Wi-Fi

Para actualizar y abrir la app en el Moto g23 sin depender del cable despues de la primera conexion:

```bash
npm run dev:api
npm run mobile:android:wifi
```

## Flujo recomendado

1. Conecta el Android por cable al menos una vez.
2. Desbloquea el telefono y acepta la autorizacion de Depuracion USB si aparece.
3. Ejecuta `npm run mobile:android:wifi`.
4. El script activa `adb tcpip 5555`, detecta la IP Wi-Fi del telefono y lanza Flutter contra `IP:5555`.
5. Si la conexion Wi-Fi queda activa, en siguientes ejecuciones puede reutilizarla sin cable.

## Variables utiles

```bash
API_BASE_URL=http://192.168.1.245:4000 npm run mobile:android:wifi
ANDROID_DEVICE_ID=ZY22GZVR3G npm run mobile:android:wifi
ANDROID_WIFI_DEVICE_ID=192.168.1.120:5555 npm run mobile:android:wifi
ANDROID_ADB_PORT=5555 npm run mobile:android:wifi
```

## Si Android pide emparejamiento

En Android 11+ tambien puedes usar:

`Opciones de desarrollador > Depuracion inalambrica`

Luego ejecuta:

```bash
adb pair IP:PUERTO_DE_EMPAREJAMIENTO
adb connect IP:PUERTO_ADB
npm run mobile:android:wifi
```

## Requisitos

- Android y Mac en la misma red Wi-Fi.
- Depuracion USB o Depuracion inalambrica activa.
- Backend escuchando en el puerto 4000 con `npm run dev:api`.
