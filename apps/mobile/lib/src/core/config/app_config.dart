import 'package:flutter/foundation.dart';

class AppConfig {
  static const _localNetworkBaseUrl = String.fromEnvironment(
    'API_LOCAL_NETWORK_BASE_URL',
    defaultValue: 'http://172.20.10.2:4000',
  );
  static const sharedLibraryUrl = String.fromEnvironment(
    'SHARED_LIBRARY_URL',
    defaultValue:
        'https://drive.google.com/drive/folders/1kH0Y13P2iVqXLD6enfZCLbqKdbLis4QI?usp=sharing',
  );
  static final sharedLibraryFolderId = _extractDriveFolderId(sharedLibraryUrl);

  static String get apiBaseUrl {
    const override = String.fromEnvironment('API_BASE_URL');
    if (override.isNotEmpty) {
      return override;
    }

    if (kIsWeb) {
      return 'http://127.0.0.1:4000';
    }

    return switch (defaultTargetPlatform) {
      TargetPlatform.android => 'http://10.0.2.2:4000',
      TargetPlatform.iOS => _localNetworkBaseUrl,
      _ => 'http://127.0.0.1:4000',
    };
  }

  static String connectionHelpMessage(String baseUrl) {
    final uri = Uri.tryParse(baseUrl);
    final host = uri?.host ?? '';

    if (host == '127.0.0.1' || host == 'localhost' || host == '10.0.2.2') {
      return 'No se pudo conectar a la API en $baseUrl. Si estás usando un celular físico, ejecuta la app con --dart-define=API_BASE_URL=http://<IP-DE-TU-MAC>:4000.';
    }

    if (host.startsWith('192.168.') ||
        host.startsWith('10.') ||
        host.startsWith('172.')) {
      return 'No se pudo conectar a la API en $baseUrl. En iPhone revisa Ajustes > Privacidad y seguridad > Red local y confirma que Lo Renaciente tenga permiso. También verifica que el iPhone y la Mac estén en la misma red y que el backend siga levantado.';
    }

    return 'No se pudo conectar a la API en $baseUrl. Verifica que el backend esté levantado y accesible desde tu dispositivo.';
  }

  static String _extractDriveFolderId(String url) {
    final match = RegExp(r'/folders/([a-zA-Z0-9_-]+)').firstMatch(url);
    return match?.group(1) ?? '';
  }
}
