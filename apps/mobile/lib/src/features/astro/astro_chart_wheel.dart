import 'dart:math' as math;
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';

import '../../core/i18n/app_i18n.dart';
import '../../core/theme/app_palette.dart';
import '../../models/astro_models.dart';

part 'astro_chart_wheel_support.dart';

Future<Uint8List> renderAstroChartExportPng(
  AstroNatalChartResult result, {
  double width = 2100,
}) async {
  final height = width * 0.74;
  final recorder = ui.PictureRecorder();
  final canvas = Canvas(
    recorder,
    Rect.fromLTWH(0, 0, width, height),
  );

  _AstroChartExportPainter(result: result).paint(
    canvas,
    Size(width, height),
  );

  final picture = recorder.endRecording();
  final image = await picture.toImage(width.round(), height.round());
  final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
  image.dispose();
  picture.dispose();

  if (byteData == null) {
    throw Exception('No se pudo generar la imagen PNG de la carta.');
  }

  return byteData.buffer.asUint8List();
}

class AstroChartWheelCard extends StatelessWidget {
  const AstroChartWheelCard({
    super.key,
    required this.result,
  });

  final AstroNatalChartResult result;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: LayoutBuilder(
          builder: (context, constraints) {
            final maxWidth = constraints.maxWidth;
            final wheelSize = math.min(maxWidth, 390.0).clamp(260.0, 390.0);

            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  context.l10n.ts('Rueda natal'),
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 12),
                Text(
                  context.l10n.ts(
                    'La rueda muestra signos, casas, grados, ejes y aspectos con una lectura más técnica. Debajo queda la ficha resumida para revisar posiciones y cúspides con claridad.',
                  ),
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                const SizedBox(height: 18),
                AstroChartTechnicalHeader(result: result),
                const SizedBox(height: 18),
                Center(
                  child: AstroChartWheelGraphic(
                    result: result,
                    size: wheelSize,
                    showPlanetDegreeLabels: true,
                  ),
                ),
                const SizedBox(height: 18),
                AstroCuspsSidebar(
                  result: result,
                  compact: true,
                ),
                const SizedBox(height: 14),
                _WheelFactsPanel(result: result),
                const SizedBox(height: 14),
                AstroChartWheelLegend(result: result),
              ],
            );
          },
        ),
      ),
    );
  }
}

class AstroChartExportBoard extends StatelessWidget {
  const AstroChartExportBoard({
    super.key,
    required this.result,
    required this.size,
  });

  final AstroNatalChartResult result;
  final double size;

  @override
  Widget build(BuildContext context) {
    final width = size;
    final height = size * 0.74;
    final wheelSize = math.min(height * 0.94, width * 0.57);

    return Container(
      width: width,
      height: height,
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(32, 24, 28, 24),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: width * 0.205,
            child: AstroChartTechnicalHeader(
              result: result,
              classic: true,
            ),
          ),
          const SizedBox(width: 20),
          Expanded(
            child: Center(
              child: AstroChartWheelGraphic(
                result: result,
                size: wheelSize,
                showPlanetDegreeLabels: true,
              ),
            ),
          ),
          const SizedBox(width: 20),
          SizedBox(
            width: width * 0.14,
            child: AstroCuspsSidebar(
              result: result,
              classic: true,
            ),
          ),
        ],
      ),
    );
  }
}

class AstroChartWheelGraphic extends StatelessWidget {
  const AstroChartWheelGraphic({
    super.key,
    required this.result,
    required this.size,
    this.showPlanetDegreeLabels = true,
  });

  final AstroNatalChartResult result;
  final double size;
  final bool showPlanetDegreeLabels;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: _AstroChartWheelPainter(
          result: result,
          showPlanetDegreeLabels: showPlanetDegreeLabels,
        ),
      ),
    );
  }
}

class _AstroChartExportPainter {
  const _AstroChartExportPainter({
    required this.result,
  });

  final AstroNatalChartResult result;

  void paint(Canvas canvas, Size size) {
    canvas.drawRect(
      Offset.zero & size,
      Paint()
        ..color = Colors.white
        ..style = PaintingStyle.fill,
    );

    final margin = size.width * 0.035;
    final gap = size.width * 0.019;
    final leftWidth = size.width * 0.215;
    final rightWidth = size.width * 0.15;
    final content = Rect.fromLTWH(
      margin,
      margin,
      size.width - (margin * 2),
      size.height - (margin * 2),
    );
    final centerWidth = content.width - leftWidth - rightWidth - (gap * 2);
    final wheelSize = math.min(content.height * 0.92, centerWidth * 0.98);
    final wheelLeft = content.left +
        leftWidth +
        gap +
        ((centerWidth - wheelSize) / 2).clamp(0.0, centerWidth);
    final wheelTop = content.top + ((content.height - wheelSize) / 2);

    _paintExportHeader(
      canvas,
      Rect.fromLTWH(content.left, content.top, leftWidth, content.height),
    );
    _paintExportWheel(
      canvas,
      Rect.fromLTWH(wheelLeft, wheelTop, wheelSize, wheelSize),
    );
    _paintExportCusps(
      canvas,
      Rect.fromLTWH(
        content.right - rightWidth,
        content.top + (content.height * 0.08),
        rightWidth,
        content.height * 0.84,
      ),
    );
  }

  void _paintExportHeader(Canvas canvas, Rect rect) {
    final meta = result.meta;
    final birthUtc = DateTime.tryParse(meta.birthDateTimeUtc)?.toUtc();
    final subjectName =
        meta.subjectName.trim().isEmpty ? 'CARTA NATAL' : meta.subjectName;
    final localBirth = [
      _formatDateLabel(meta.birthDate),
      meta.birthTime,
      if (meta.utcOffset.isNotEmpty) '(${meta.utcOffset})',
    ].where((item) => item.trim().isNotEmpty).join(' ');
    final utcBirth = birthUtc == null
        ? ''
        : '${_formatDateLabel(_formatIsoDate(birthUtc))} ${_formatUtcTime(birthUtc)} UT';
    final coordinates =
        '${_formatLatitude(meta.coordinates.latitude)} ${_formatLongitude(meta.coordinates.longitude)}';

    var y = rect.top;
    y += _paintExportText(
          canvas,
          'Carta natal',
          Offset(rect.left, y),
          maxWidth: rect.width,
          fontSize: 32,
          fontWeight: FontWeight.w800,
          color: const Color(0xFF1A1A1A),
        ) +
        10;
    y += _paintExportText(
          canvas,
          subjectName.toUpperCase(),
          Offset(rect.left, y),
          maxWidth: rect.width,
          fontSize: 38,
          fontWeight: FontWeight.w900,
          color: const Color(0xFF1A1A1A),
          maxLines: 3,
        ) +
        24;

    for (final line in [
      localBirth,
      utcBirth,
      meta.locationLabel,
      coordinates,
    ].where((item) => item.trim().isNotEmpty)) {
      y += _paintExportText(
            canvas,
            line,
            Offset(rect.left, y),
            maxWidth: rect.width,
            fontSize: 25,
            fontWeight: FontWeight.w500,
            color: const Color(0xFF282828),
            maxLines: 3,
          ) +
          8;
    }

    y += 16;
    y += _paintExportText(
          canvas,
          'Tropical/geocentrico',
          Offset(rect.left, y),
          maxWidth: rect.width,
          fontSize: 23,
          fontWeight: FontWeight.w700,
          color: const Color(0xFF5E538F),
        ) +
        8;
    y += _paintExportText(
          canvas,
          'Casas: ${_capitalize(meta.houseSystem)}',
          Offset(rect.left, y),
          maxWidth: rect.width,
          fontSize: 23,
          fontWeight: FontWeight.w700,
          color: const Color(0xFF5E538F),
        ) +
        8;
    y += _paintExportText(
          canvas,
          'Nodos: ${_nodeTypeLabel(meta.nodeType)}',
          Offset(rect.left, y),
          maxWidth: rect.width,
          fontSize: 23,
          fontWeight: FontWeight.w700,
          color: const Color(0xFF5E538F),
        ) +
        28;

    _paintExportText(
      canvas,
      'Sol: ${result.summary.solarSign}\n'
      'Luna: ${result.summary.lunarSign}\n'
      'Ascendente: ${result.summary.ascendantSign}\n'
      'Regente: ${result.summary.chartRuler}',
      Offset(rect.left, y),
      maxWidth: rect.width,
      fontSize: 24,
      fontWeight: FontWeight.w600,
      color: const Color(0xFF1F1F1F),
      lineHeight: 1.35,
    );
  }

  void _paintExportWheel(Canvas canvas, Rect rect) {
    canvas.save();
    canvas.translate(rect.left, rect.top);
    _AstroChartWheelPainter(
      result: result,
      showPlanetDegreeLabels: true,
    ).paint(canvas, rect.size);
    canvas.restore();
  }

  void _paintExportCusps(Canvas canvas, Rect rect) {
    final rows = <_CuspRowData>[
      _CuspRowData(
        label: 'AC',
        degree: result.angles.ascendant.degreeFormatted.split(' ').first,
        signIndex: result.angles.ascendant.signIndex,
      ),
      ...result.houses
          .where((house) => house.number >= 2 && house.number <= 9)
          .map(
            (house) => _CuspRowData(
              label: '${house.number}',
              degree: house.cuspDegreeFormatted.split(' ').first,
              signIndex: house.signIndex,
            ),
          ),
      _CuspRowData(
        label: 'MC',
        degree: result.angles.midheaven.degreeFormatted.split(' ').first,
        signIndex: result.angles.midheaven.signIndex,
      ),
      ...result.houses.where((house) => house.number >= 11).map(
            (house) => _CuspRowData(
              label: '${house.number}',
              degree: house.cuspDegreeFormatted.split(' ').first,
              signIndex: house.signIndex,
            ),
          ),
    ];

    final borderPaint = Paint()
      ..color = const Color(0xFFBDB7AF)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;
    canvas.drawRRect(
      RRect.fromRectAndRadius(rect, const Radius.circular(8)),
      Paint()
        ..color = Colors.white
        ..style = PaintingStyle.fill,
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(rect, const Radius.circular(8)),
      borderPaint,
    );

    var y = rect.top + 22;
    for (final row in rows) {
      final signIndex = row.signIndex < 0
          ? 0
          : row.signIndex >= _zodiacSigns.length
              ? _zodiacSigns.length - 1
              : row.signIndex;
      final baseline = y + 18;
      _paintExportText(
        canvas,
        row.label,
        Offset(rect.left + 18, y),
        maxWidth: 40,
        fontSize: 23,
        fontWeight: FontWeight.w800,
        color: const Color(0xFF1F1F1F),
      );
      _paintExportText(
        canvas,
        row.degree,
        Offset(rect.left + 58, y),
        maxWidth: rect.width - 108,
        fontSize: 23,
        fontWeight: FontWeight.w500,
        color: const Color(0xFF1F1F1F),
      );
      _paintExportText(
        canvas,
        _zodiacSigns[signIndex].glyph,
        Offset(rect.right - 42, baseline - 22),
        maxWidth: 30,
        fontSize: 30,
        fontWeight: FontWeight.w800,
        color: _zodiacSigns[signIndex].color,
      );
      y += 48;
    }
  }
}

double _paintExportText(
  Canvas canvas,
  String text,
  Offset offset, {
  required double maxWidth,
  double fontSize = 24,
  FontWeight fontWeight = FontWeight.w600,
  Color color = Colors.black,
  int? maxLines,
  double lineHeight = 1.15,
}) {
  final painter = TextPainter(
    text: TextSpan(
      text: text,
      style: TextStyle(
        color: color,
        fontSize: fontSize,
        fontWeight: fontWeight,
        height: lineHeight,
      ),
    ),
    textDirection: TextDirection.ltr,
    maxLines: maxLines,
    ellipsis: maxLines == null ? null : '...',
  )..layout(maxWidth: maxWidth);

  painter.paint(canvas, offset);
  return painter.height;
}

class _AstroChartWheelPainter extends CustomPainter {
  const _AstroChartWheelPainter({
    required this.result,
    required this.showPlanetDegreeLabels,
  });

  final AstroNatalChartResult result;
  final bool showPlanetDegreeLabels;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = math.min(size.width, size.height) / 2;
    final outerRadius = radius - 8;
    final signOuterRadius = outerRadius;
    final signInnerRadius = radius * 0.78;
    final houseOuterRadius = radius * 0.59;
    final houseInnerRadius = radius * 0.40;
    final aspectRadius = radius * 0.34;
    final ascLongitude = result.angles.ascendant.longitude;

    _drawBaseRings(
      canvas,
      center,
      outerRadius,
      signInnerRadius,
      houseOuterRadius,
      houseInnerRadius,
    );
    _drawSignSectors(
      canvas,
      center,
      ascLongitude,
      signOuterRadius,
      signInnerRadius,
    );
    _drawTicks(canvas, center, ascLongitude, signOuterRadius, signInnerRadius);
    _drawAngleAxes(
      canvas,
      center,
      ascLongitude,
      outerRadius,
      signInnerRadius,
      houseInnerRadius,
    );
    _drawHouseCusps(
      canvas,
      center,
      ascLongitude,
      signInnerRadius,
      houseOuterRadius,
      houseInnerRadius,
    );
    _drawAspects(canvas, center, ascLongitude, aspectRadius);
    _drawPlanets(
      canvas,
      center,
      ascLongitude,
      signInnerRadius,
      houseOuterRadius,
      outerRadius,
    );
    _drawHouseNumbers(
      canvas,
      center,
      ascLongitude,
      houseOuterRadius,
      houseInnerRadius,
    );
  }

  void _drawBaseRings(
    Canvas canvas,
    Offset center,
    double outerRadius,
    double signInnerRadius,
    double houseOuterRadius,
    double houseInnerRadius,
  ) {
    final fillPaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.fill;
    final strokePaint = Paint()
      ..color = const Color(0xFF203A64)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.15;

    canvas.drawCircle(center, outerRadius, fillPaint);
    canvas.drawCircle(center, outerRadius, strokePaint);
    canvas.drawCircle(center, signInnerRadius, strokePaint);
    canvas.drawCircle(
      center,
      outerRadius - 12,
      Paint()
        ..color = const Color(0xFF203A64)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 0.8,
    );
    canvas.drawCircle(
      center,
      houseOuterRadius,
      Paint()
        ..color = const Color(0xFF1E3762)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1,
    );
    canvas.drawCircle(
      center,
      houseInnerRadius,
      Paint()
        ..color = const Color(0xFF8F8A85)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 0.8,
    );
  }

  void _drawSignSectors(
    Canvas canvas,
    Offset center,
    double ascLongitude,
    double outerRadius,
    double innerRadius,
  ) {
    final rect = Rect.fromCircle(center: center, radius: outerRadius);
    final innerRect = Rect.fromCircle(center: center, radius: innerRadius);

    for (var index = 0; index < _zodiacSigns.length; index++) {
      final startLongitude = index * 30.0;
      final startAngle = _toCanvasRadians(startLongitude, ascLongitude);
      final sweep = -_degreesToRadians(30);
      final sectorPaint = Paint()
        ..color = _signBackgroundColor(index)
        ..style = PaintingStyle.fill;

      final path = Path()
        ..arcTo(rect, startAngle, sweep, false)
        ..arcTo(innerRect, startAngle + sweep, -sweep, false)
        ..close();
      canvas.drawPath(path, sectorPaint);

      final borderPaint = Paint()
        ..color = const Color(0xFF1E3762)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1;
      final startPoint = _polarToOffset(center, innerRadius, startAngle);
      final endPoint = _polarToOffset(center, outerRadius, startAngle);
      canvas.drawLine(startPoint, endPoint, borderPaint);

      final middleAngle = startAngle + (sweep / 2);
      final glyphOffset =
          _polarToOffset(center, (outerRadius + innerRadius) / 2, middleAngle);
      _paintText(
        canvas,
        _zodiacSigns[index].glyph,
        glyphOffset,
        fontSize: outerRadius * 0.1,
        color: _zodiacSigns[index].color,
        fontWeight: FontWeight.w700,
        glowColor: Colors.white,
      );
    }
  }

  void _drawTicks(
    Canvas canvas,
    Offset center,
    double ascLongitude,
    double outerRadius,
    double innerRadius,
  ) {
    final tickPaint = Paint()
      ..color = const Color(0xFF203A64)
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    for (var degree = 0; degree < 360; degree += 1) {
      final angle = _toCanvasRadians(degree.toDouble(), ascLongitude);
      final isMajor = degree % 10 == 0;
      final isMedium = degree % 5 == 0;
      final startRadius = isMajor
          ? outerRadius - 14
          : isMedium
              ? outerRadius - 9
              : outerRadius - 5;
      tickPaint.strokeWidth = isMajor
          ? 1.05
          : isMedium
              ? 0.75
              : 0.45;
      final start = _polarToOffset(center, startRadius, angle);
      final end = _polarToOffset(center, outerRadius, angle);
      canvas.drawLine(start, end, tickPaint);
    }

    canvas.drawCircle(
      center,
      innerRadius,
      Paint()
        ..color = const Color(0xFF203A64)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1,
    );
  }

  void _drawAngleAxes(
    Canvas canvas,
    Offset center,
    double ascLongitude,
    double outerRadius,
    double signInnerRadius,
    double houseInnerRadius,
  ) {
    final horizontalPaint = Paint()
      ..color = const Color(0xFF9D2F2D)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;
    final verticalPaint = Paint()
      ..color = const Color(0xFF315FB0)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;
    final acAngle =
        _toCanvasRadians(result.angles.ascendant.longitude, ascLongitude);
    final dcAngle = _toCanvasRadians(
      (result.angles.ascendant.longitude + 180) % 360,
      ascLongitude,
    );
    final mcAngle =
        _toCanvasRadians(result.angles.midheaven.longitude, ascLongitude);
    final icAngle = _toCanvasRadians(
      (result.angles.midheaven.longitude + 180) % 360,
      ascLongitude,
    );

    canvas.drawLine(
      _polarToOffset(center, outerRadius - 12, acAngle),
      _polarToOffset(center, outerRadius - 12, dcAngle),
      horizontalPaint,
    );
    canvas.drawLine(
      _polarToOffset(center, outerRadius - 12, mcAngle),
      _polarToOffset(center, outerRadius - 12, icAngle),
      verticalPaint,
    );

    final axes = [
      (acAngle, 'AC', horizontalPaint.color),
      (dcAngle, 'DC', horizontalPaint.color),
      (mcAngle, 'MC', verticalPaint.color),
      (icAngle, 'IC', verticalPaint.color),
    ];

    for (final axis in axes) {
      final labelOffset = _polarToOffset(center, signInnerRadius - 10, axis.$1);
      _paintText(
        canvas,
        axis.$2,
        labelOffset,
        fontSize: signInnerRadius * 0.032,
        color: axis.$3,
        fontWeight: FontWeight.w700,
      );
    }
  }

  void _drawHouseCusps(
    Canvas canvas,
    Offset center,
    double ascLongitude,
    double signInnerRadius,
    double houseOuterRadius,
    double houseInnerRadius,
  ) {
    final linePaint = Paint()
      ..color = const Color(0xFF7E7872)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 0.9;
    final anglePaint = Paint()
      ..color = const Color(0xFF2C55A0)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.4;

    for (final house in result.houses) {
      final angle = _toCanvasRadians(house.cuspLongitude, ascLongitude);
      final isAngleHouse = house.number == 1 ||
          house.number == 4 ||
          house.number == 7 ||
          house.number == 10;
      final start = _polarToOffset(center, houseInnerRadius, angle);
      final end = _polarToOffset(center, signInnerRadius, angle);
      canvas.drawLine(start, end, isAngleHouse ? anglePaint : linePaint);
    }
  }

  void _drawHouseNumbers(
    Canvas canvas,
    Offset center,
    double ascLongitude,
    double houseOuterRadius,
    double houseInnerRadius,
  ) {
    final houses = result.houses;
    for (var index = 0; index < houses.length; index++) {
      final current = houses[index];
      final next = houses[(index + 1) % houses.length];
      final delta = _normalizedDelta(current.cuspLongitude, next.cuspLongitude);
      final middleLongitude = (current.cuspLongitude + (delta / 2)) % 360;
      final angle = _toCanvasRadians(middleLongitude, ascLongitude);
      final labelRadius = (houseOuterRadius + houseInnerRadius) / 2;
      final labelOffset = _polarToOffset(center, labelRadius, angle);
      _paintText(
        canvas,
        current.number.toString(),
        labelOffset,
        fontSize: houseOuterRadius * 0.12,
        color: const Color(0xFF32312E),
        fontWeight: FontWeight.w500,
      );
    }
  }

  void _drawAspects(
    Canvas canvas,
    Offset center,
    double ascLongitude,
    double aspectRadius,
  ) {
    final planetMap = {
      for (final planet in result.planets) planet.label: planet,
    };

    for (final aspect in result.aspects.take(18)) {
      final left = planetMap[aspect.left];
      final right = planetMap[aspect.right];
      if (left == null || right == null) {
        continue;
      }

      final start = _polarToOffset(
        center,
        aspectRadius,
        _toCanvasRadians(left.longitude, ascLongitude),
      );
      final end = _polarToOffset(
        center,
        aspectRadius,
        _toCanvasRadians(right.longitude, ascLongitude),
      );

      canvas.drawLine(
        start,
        end,
        Paint()
          ..color = _aspectColor(aspect.type)
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1,
      );
    }
  }

  void _drawPlanets(
    Canvas canvas,
    Offset center,
    double ascLongitude,
    double signInnerRadius,
    double houseOuterRadius,
    double outerRadius,
  ) {
    final sorted = result.planets.toList()
      ..addAll(result.points)
      ..sort((left, right) => left.longitude.compareTo(right.longitude));
    final placements = _spreadPlanets(sorted);

    for (final placement in placements) {
      final exactAngle =
          _toCanvasRadians(placement.planet.longitude, ascLongitude);
      final displayAngle = _toCanvasRadians(
        placement.displayLongitude,
        ascLongitude,
      );
      final anchorOffset =
          _polarToOffset(center, signInnerRadius - 4, exactAngle);
      final orbitRadius = signInnerRadius - 20 - (placement.lane * 15);
      final glyphOffset = _polarToOffset(center, orbitRadius, displayAngle);
      final degreeRadius = orbitRadius - 18;
      final degreeOffset = _polarToOffset(center, degreeRadius, displayAngle);
      final tangentDirection = math.sin(displayAngle) >= 0 ? 1.0 : -1.0;
      final tangentOffset = Offset(
        math.cos(displayAngle + (math.pi / 2)) * (8 * tangentDirection),
        math.sin(displayAngle + (math.pi / 2)) * (8 * tangentDirection),
      );
      final radialOffset = Offset(
        math.cos(displayAngle) * (placement.lane * 1.8),
        math.sin(displayAngle) * (placement.lane * 1.8),
      );
      final labelOffset = degreeOffset + tangentOffset + radialOffset;

      canvas.drawCircle(
        anchorOffset,
        outerRadius * 0.006,
        Paint()
          ..color = _planetColor(placement.planet.label)
          ..style = PaintingStyle.fill,
      );
      canvas.drawLine(
        anchorOffset,
        glyphOffset,
        Paint()
          ..color = const Color(0xFF8C847C)
          ..style = PaintingStyle.stroke
          ..strokeWidth = 0.8,
      );
      _paintText(
        canvas,
        _planetGlyph(placement.planet.label),
        glyphOffset,
        fontSize: _isTechnicalPoint(placement.planet.label)
            ? outerRadius * 0.048
            : outerRadius * 0.056,
        color: _planetColor(placement.planet.label),
        fontWeight: FontWeight.w700,
        glowColor: Colors.white,
      );

      if (showPlanetDegreeLabels) {
        _paintPositionLabel(
          canvas,
          placement.planet,
          labelOffset,
          fontSize: outerRadius * 0.022,
        );
      }
    }
  }

  List<_PlanetPlacement> _spreadPlanets(List<AstroPlacement> planets) {
    if (planets.isEmpty) {
      return const <_PlanetPlacement>[];
    }

    const clusterThreshold = 10.5;
    final clusters = <List<AstroPlacement>>[];
    var currentCluster = <AstroPlacement>[planets.first];

    for (var index = 1; index < planets.length; index++) {
      final previous = planets[index - 1];
      final current = planets[index];
      if (_normalizedDelta(previous.longitude, current.longitude) <=
          clusterThreshold) {
        currentCluster.add(current);
      } else {
        clusters.add(currentCluster);
        currentCluster = <AstroPlacement>[current];
      }
    }
    clusters.add(currentCluster);

    if (clusters.length > 1) {
      final firstCluster = clusters.first;
      final lastCluster = clusters.last;
      final wrapDelta = _normalizedDelta(
        lastCluster.last.longitude,
        firstCluster.first.longitude + 360,
      );
      if (wrapDelta <= clusterThreshold) {
        final merged = <AstroPlacement>[
          ...lastCluster,
          ...firstCluster,
        ];
        clusters
          ..removeLast()
          ..removeAt(0)
          ..insert(0, merged);
      }
    }

    final placements = <_PlanetPlacement>[];
    for (final cluster in clusters) {
      final count = cluster.length;
      final centerLongitude = _clusterCenter(cluster);
      final minGap = count >= 7
          ? 5.2
          : count >= 5
              ? 5.8
              : 6.4;
      final startLongitude = centerLongitude - ((count - 1) * minGap / 2);
      for (var index = 0; index < count; index++) {
        final centeredIndex = index - ((count - 1) / 2);
        final lane = _planetClusterLane(
          centeredIndex,
          count,
          _isTechnicalPoint(cluster[index].label),
        );
        placements.add(
          _PlanetPlacement(
            planet: cluster[index],
            lane: lane,
            displayLongitude:
                normalizeLongitude(startLongitude + (index * minGap)),
          ),
        );
      }
    }

    return placements;
  }

  @override
  bool shouldRepaint(covariant _AstroChartWheelPainter oldDelegate) {
    return oldDelegate.result != result ||
        oldDelegate.showPlanetDegreeLabels != showPlanetDegreeLabels;
  }
}

class _PlanetPlacement {
  const _PlanetPlacement({
    required this.planet,
    required this.lane,
    required this.displayLongitude,
  });

  final AstroPlacement planet;
  final int lane;
  final double displayLongitude;
}
