import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:lo_renaciente/src/core/i18n/app_i18n.dart';
import 'package:lo_renaciente/src/features/courses/courses_screen.dart';
import 'package:lo_renaciente/src/features/courses/library_pdf_thumbnail_service.dart';
import 'package:lo_renaciente/src/features/courses/shared_drive_library_service.dart';
import 'package:lo_renaciente/src/models/app_models.dart';

void main() {
  testWidgets(
    'content refresh preserves the selected library category and search',
    (tester) async {
      final libraryService = SharedDriveLibraryService(
        client: MockClient(
          (_) async => http.Response(
            jsonEncode({
              'items': [
                {
                  'id': 'pdf-aromas',
                  'title': 'Guía de aceites',
                  'category': 'Aromaterapia',
                },
                {
                  'id': 'pdf-tarot',
                  'title': 'Luna y arcanos',
                  'category': 'Tarot',
                },
              ],
            }),
            200,
            headers: {'content-type': 'application/json'},
          ),
        ),
      );
      final thumbnailService = LibraryPdfThumbnailService(
        client: MockClient((_) async => http.Response('', 404)),
      );
      final data = AppBootstrap.fromJson({
        'user': {'id': 'premium-user'},
        'subscription': {
          'planId': 'premium',
          'planName': 'Premium',
          'status': 'active',
        },
        'courses': <Object>[],
      });

      Widget buildLibrary(String contentVersion) {
        return MaterialApp(
          locale: const Locale('es'),
          supportedLocales: AppLocalizations.supportedLocales,
          localizationsDelegates: const [
            AppLocalizations.delegate,
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          home: Scaffold(
            body: CoursesScreen(
              data: data,
              onRefresh: () async {},
              contentVersion: contentVersion,
              libraryService: libraryService,
              thumbnailService: thumbnailService,
            ),
          ),
        );
      }

      await tester.pumpWidget(buildLibrary('version-1'));
      await tester.pumpAndSettle();

      await tester.tap(find.widgetWithText(FilterChip, 'Tarot'));
      await tester.enterText(find.byType(TextField), 'luna');
      await tester.pumpAndSettle();

      FilterChip tarotChip() =>
          tester.widget(find.widgetWithText(FilterChip, 'Tarot'));

      expect(tarotChip().selected, isTrue);
      expect(find.text('Luna y arcanos'), findsWidgets);

      await tester.pumpWidget(buildLibrary('version-2'));
      await tester.pump();

      expect(tarotChip().selected, isTrue);
      expect(find.byType(CircularProgressIndicator), findsNothing);

      await tester.pumpAndSettle();

      expect(tarotChip().selected, isTrue);
      expect(
        tester.widget<TextField>(find.byType(TextField)).controller?.text,
        'luna',
      );
      expect(find.text('Luna y arcanos'), findsWidgets);
      expect(find.byType(CircularProgressIndicator), findsNothing);
    },
  );
}
