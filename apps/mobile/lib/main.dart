import 'dart:async';
import 'dart:ui';

import 'package:flutter/material.dart';

import 'src/app/app.dart';

void main() {
  runZonedGuarded(
    () {
      debugPrint('LR Dart main start');
      WidgetsFlutterBinding.ensureInitialized();
      PaintingBinding.instance.imageCache
        ..maximumSize = 120
        ..maximumSizeBytes = 80 << 20;
      FlutterError.onError = (details) {
        FlutterError.presentError(details);
        Zone.current.handleUncaughtError(
          details.exception,
          details.stack ?? StackTrace.current,
        );
      };
      PlatformDispatcher.instance.onError = (error, stackTrace) {
        Zone.current.handleUncaughtError(error, stackTrace);
        return true;
      };

      debugPrint('LR Dart runApp');
      runApp(const LoRenacienteApp());
    },
    (error, stackTrace) {
      debugPrint('Uncaught zone error: $error');
      debugPrintStack(stackTrace: stackTrace);
    },
  );
}
