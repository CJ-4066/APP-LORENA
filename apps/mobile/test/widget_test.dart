import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lo_renaciente/src/core/i18n/app_i18n.dart';
import 'package:lo_renaciente/src/core/utils/natal_chart_profile.dart';
import 'package:lo_renaciente/src/features/astro/astral_chart_screen.dart';
import 'package:lo_renaciente/src/models/app_models.dart';
import 'package:lo_renaciente/src/models/astro_models.dart';

void main() {
  test('project bootstrap test', () {
    expect(2 + 2, 4);
  });

  group('saved natal chart data', () {
    test('is reusable after the user registered it once', () {
      final natalChart = _natalChart();

      expect(hasReusableNatalChartData(natalChart), isTrue);
      expect(hasCompleteNatalProfileData(natalChart), isTrue);
    });

    test('accepts an explicitly unknown birth time', () {
      final natalChart = _natalChart(
        birthTime: '',
        birthTimeUnknown: true,
      );

      expect(hasReusableNatalChartData(natalChart), isTrue);
      expect(hasCompleteNatalProfileData(natalChart), isTrue);
    });

    test('does not reuse incomplete coordinates', () {
      final natalChart = _natalChart(latitude: null);

      expect(hasReusableNatalChartData(natalChart), isFalse);
    });
  });

  testWidgets('opens a saved natal chart without asking for data again',
      (tester) async {
    AstroRequestInput? generatedInput;
    final natalChart = _natalChart();
    final user = UserProfile.fromJson({
      'id': 'user-1',
      'firstName': 'Usuario',
      'lastName': 'Prueba',
      'natalChart': natalChart.toJson(),
    });

    await tester.pumpWidget(
      MaterialApp(
        locale: const Locale('es'),
        supportedLocales: AppLocalizations.supportedLocales,
        localizationsDelegates: const [
          AppLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        home: AstralChartScreen(
          user: user,
          onSaveProfile: (_) async => null,
          onGenerate: (input) async {
            generatedInput = input;
            throw Exception('Fin controlado de la prueba');
          },
          onResolveUtcOffset: ({
            required birthDate,
            required birthTime,
            required birthTimeUnknown,
            required timeZoneId,
          }) async {
            throw UnimplementedError();
          },
          onSearchBirthPlaces: (_) async => const [],
        ),
      ),
    );
    await tester.pump();
    await tester.pump();

    expect(generatedInput, isNotNull);
    expect(generatedInput!.birthDate, '15-01-1990');
    expect(generatedInput!.utcOffset, '-05:00');
    expect(generatedInput!.latitude, -12.0464);
    expect(generatedInput!.longitude, -77.0428);
  });
}

NatalChart _natalChart({
  String birthTime = '08:30',
  bool birthTimeUnknown = false,
  double? latitude = -12.0464,
}) {
  return NatalChart(
    subjectName: 'Usuario',
    birthDate: '1990-01-15',
    birthTime: birthTime,
    birthTimeUnknown: birthTimeUnknown,
    city: 'Lima',
    state: 'Lima',
    country: 'Perú',
    timeZoneId: 'America/Lima',
    utcOffset: '-05:00',
    latitude: latitude,
    longitude: -77.0428,
  );
}
