import 'dart:async';
import 'dart:ui';

import 'package:flutter/material.dart';

import 'src/app/app.dart';

void main() {
  runZonedGuarded(
    () {
      debugPrint('LR Dart main start');
      WidgetsFlutterBinding.ensureInitialized();
      ErrorWidget.builder = (details) {
        return Material(
          color: const Color(0xFF171A3E),
          child: SafeArea(
            child: Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 460),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(
                        Icons.shield_outlined,
                        color: Color(0xFFFFF8F2),
                        size: 44,
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'La app encontró un error al abrir',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: Color(0xFFFFF8F2),
                          fontSize: 22,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 10),
                      Text(
                        'No se cerrará sola. Revisa la conexión o reinicia la app.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.82),
                          fontSize: 15,
                          height: 1.45,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        );
      };
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
