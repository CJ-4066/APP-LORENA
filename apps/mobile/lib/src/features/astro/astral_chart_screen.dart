import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';
import 'package:syncfusion_flutter_pdf/pdf.dart' as sfpdf;

import '../../core/data/birth_place_catalog.dart';
import '../../core/i18n/app_i18n.dart';
import '../../core/theme/app_palette.dart';
import '../../core/utils/formatters.dart';
import '../../core/utils/natal_chart_profile.dart';
import '../../core/widgets/birth_date_fields.dart';
import '../../core/widgets/birth_time_wheel_field.dart';
import '../../core/widgets/mystic_ui.dart';
import '../../core/widgets/premium_access.dart';
import '../../models/app_models.dart';
import '../../models/astro_models.dart';
import '../../models/profile_models.dart';
import 'chart_image_store_stub.dart'
    if (dart.library.io) 'chart_image_store_io.dart'
    if (dart.library.html) 'chart_image_store_web.dart';
import 'astro_chart_wheel.dart';
import '../profile/birth_place_selector.dart';

part 'astral_chart_sections.dart';

enum _AstroFlowSection {
  setup,
  wheel,
  essence,
  technical,
  timing,
}

class AstralChartScreen extends StatefulWidget {
  const AstralChartScreen({
    super.key,
    required this.user,
    required this.hasPremiumAccess,
    required this.onSaveProfile,
    required this.onGenerate,
    required this.onResolveUtcOffset,
    required this.onSearchBirthPlaces,
  });

  final UserProfile user;
  final bool hasPremiumAccess;
  final Future<String?> Function(UpdateProfileInput input) onSaveProfile;
  final Future<AstroOverviewData> Function(AstroRequestInput input) onGenerate;
  final Future<AstroUtcOffsetResult> Function({
    required String birthDate,
    required String birthTime,
    required bool birthTimeUnknown,
    required String timeZoneId,
  }) onResolveUtcOffset;
  final Future<List<BirthPlaceOption>> Function(String query)
      onSearchBirthPlaces;

  @override
  State<AstralChartScreen> createState() => _AstralChartScreenState();
}

class _AstralChartScreenState extends State<AstralChartScreen> {
  late final TextEditingController _subjectNameController;
  late final BirthDateInputControllers _birthDateControllers;
  late final TextEditingController _birthTimeController;
  late final TextEditingController _cityController;
  late final TextEditingController _stateController;
  late final TextEditingController _countryController;
  late final TextEditingController _utcOffsetController;
  late final TextEditingController _latitudeController;
  late final TextEditingController _longitudeController;
  BirthPlaceOption? _selectedBirthPlace;
  String _timeZoneId = '';
  bool _birthTimeUnknown = false;

  AstroOverviewData? _result;
  String _houseSystem = 'placidus';
  final Set<String> _selectedPlanetKeys = <String>{
    'sun',
    'moon',
    'mercury',
    'venus',
    'mars',
    'jupiter',
    'saturn',
    'uranus',
    'neptune',
    'pluto',
  };
  String _nodeType = 'true';
  String _lilithType = 'mean';
  String _arabicPartsMode = 'sect';
  final Set<String> _technicalPointKeys = <String>{
    'north_node',
    'south_node',
    'chiron',
    'lilith',
    'fortune',
    'misfortune',
    'vertex',
    'ceres',
    'pallas',
    'juno',
    'vesta',
    'pholus',
  };
  String? _errorMessage;
  bool _isLoading = false;
  bool _isExporting = false;
  bool _showManualLocationFields = false;
  _AstroFlowSection _selectedSection = _AstroFlowSection.setup;

  @override
  void initState() {
    super.initState();
    final natalChart = widget.user.natalChart;
    _subjectNameController = TextEditingController();
    _birthDateControllers = BirthDateInputControllers();
    _birthTimeController = TextEditingController();
    _cityController = TextEditingController();
    _stateController = TextEditingController();
    _countryController = TextEditingController();
    _utcOffsetController = TextEditingController();
    _latitudeController = TextEditingController();
    _longitudeController = TextEditingController();
    _applyNatalChartToForm(natalChart);

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && hasReusableNatalChartData(natalChart)) {
        _loadSavedChart();
      }
    });
  }

  @override
  void didUpdateWidget(covariant AstralChartScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    final previousSnapshot = _natalChartSnapshot(oldWidget.user.natalChart);
    final nextSnapshot = _natalChartSnapshot(widget.user.natalChart);
    if (previousSnapshot == nextSnapshot) {
      return;
    }

    _applyNatalChartToForm(widget.user.natalChart);
    if (hasReusableNatalChartData(widget.user.natalChart)) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          _loadSavedChart();
        }
      });
    }
  }

  @override
  void dispose() {
    _subjectNameController.dispose();
    _birthDateControllers.dispose();
    _birthTimeController.dispose();
    _cityController.dispose();
    _stateController.dispose();
    _countryController.dispose();
    _utcOffsetController.dispose();
    _latitudeController.dispose();
    _longitudeController.dispose();
    super.dispose();
  }

  Future<void> _loadSavedChart() async {
    if (_isLoading || _result != null) {
      return;
    }

    final latitude = double.tryParse(_latitudeController.text.trim());
    final longitude = double.tryParse(_longitudeController.text.trim());
    if (latitude == null || longitude == null) {
      return;
    }

    final city = _cityController.text.trim();
    final state = _stateController.text.trim();
    final country = _countryController.text.trim();
    final subjectName = _subjectNameController.text.trim();
    final birthDate = _birthDateControllers.normalizedIsoDate();
    if (birthDate == null) {
      return;
    }

    final locationLabel =
        [city, state, country].where((item) => item.isNotEmpty).join(', ');

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final result = await widget.onGenerate(
        AstroRequestInput(
          subjectName: subjectName.isEmpty ? null : subjectName,
          birthDate: birthDate,
          birthTime: _birthTimeUnknown ? '' : _birthTimeController.text.trim(),
          birthTimeUnknown: _birthTimeUnknown,
          utcOffset: _utcOffsetController.text.trim(),
          timeZoneId: _timeZoneId.isEmpty ? null : _timeZoneId,
          selectedPlanets: _orderedSelectedPlanetKeys,
          nodeType: _nodeType,
          lilithType: _lilithType,
          arabicPartsMode: _arabicPartsMode,
          technicalPoints: _orderedTechnicalPointKeys,
          latitude: latitude,
          longitude: longitude,
          locationLabel: locationLabel,
          houseSystem: _houseSystem,
        ),
      );

      if (!mounted) {
        return;
      }

      setState(() {
        _applyGeneratedResult(result);
        _selectedSection = _AstroFlowSection.wheel;
        _isLoading = false;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _isLoading = false;
        _errorMessage = error.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  void _applyGeneratedResult(AstroOverviewData result) {
    _result = result;
    _selectedPlanetKeys
      ..clear()
      ..addAll(result.natalChart.meta.selectedPlanets);
    _nodeType = result.natalChart.meta.nodeType;
    _lilithType = result.natalChart.meta.lilithType;
    _arabicPartsMode = result.natalChart.meta.arabicPartsMode;
    _technicalPointKeys
      ..clear()
      ..addAll(result.natalChart.meta.technicalPoints);
  }

  void _applyNatalChartToForm(NatalChart natalChart) {
    _subjectNameController.text = natalChart.subjectName;
    _birthDateControllers.setFromDate(natalChart.birthDate);
    _birthTimeController.text = natalChart.birthTime;
    _birthTimeUnknown = natalChart.birthTimeUnknown;
    _cityController.text = natalChart.city;
    _stateController.text = natalChart.state;
    _countryController.text = natalChart.country;
    _utcOffsetController.text = natalChart.utcOffset;
    _latitudeController.text = natalChart.latitude?.toString() ?? '';
    _longitudeController.text = natalChart.longitude?.toString() ?? '';
    _selectedBirthPlace = findBirthPlaceOption(
      city: natalChart.city,
      country: natalChart.country,
    );
    _timeZoneId = _selectedBirthPlace?.timeZoneId ?? natalChart.timeZoneId;
    _showManualLocationFields = _selectedBirthPlace == null &&
        (natalChart.city.trim().isNotEmpty ||
            natalChart.country.trim().isNotEmpty);
  }

  String _natalChartSnapshot(NatalChart natalChart) {
    return [
      natalChart.subjectName,
      natalChart.birthDate,
      natalChart.birthTime,
      natalChart.birthTimeUnknown ? '1' : '0',
      natalChart.city,
      natalChart.state,
      natalChart.country,
      natalChart.timeZoneId,
      natalChart.utcOffset,
      natalChart.latitude?.toString() ?? '',
      natalChart.longitude?.toString() ?? '',
    ].join('|');
  }

  Future<void> _generateChart() async {
    if (_selectedBirthPlace != null) {
      _applyBirthPlace(_selectedBirthPlace!);
    } else {
      await _tryResolveBirthPlaceFromManualFields();
      if (_selectedBirthPlace != null) {
        _applyBirthPlace(_selectedBirthPlace!);
      }
    }

    final subjectName = _subjectNameController.text.trim();
    final birthDate = _birthDateControllers.normalizedIsoDate();
    final birthTime = _birthTimeController.text.trim();
    final city = _cityController.text.trim();
    final state = _stateController.text.trim();
    final country = _countryController.text.trim();
    final latitudeText = _latitudeController.text.trim();
    final longitudeText = _longitudeController.text.trim();
    final latitude = double.tryParse(latitudeText);
    final longitude = double.tryParse(longitudeText);

    if (city.isEmpty ||
        country.isEmpty ||
        latitudeText.isEmpty ||
        longitudeText.isEmpty) {
      setState(() {
        _errorMessage = context.l10n.ts(
          'Completa fecha, país, ciudad, UTC offset y coordenadas para generar la carta.',
        );
      });
      return;
    }

    if (birthDate == null) {
      setState(() {
        _errorMessage = context.l10n.ts(
          'Ingresa una fecha de nacimiento válida en año, día y mes.',
        );
      });
      return;
    }

    if (!_birthTimeUnknown &&
        !RegExp(r'^(\d{2}:\d{2}|\d{2}:\d{2}:\d{2})$').hasMatch(birthTime)) {
      setState(() {
        _errorMessage = context.l10n.ts(
          'La hora debe tener formato HH:MM o HH:MM:SS, o marcar hora desconocida.',
        );
      });
      return;
    }

    if (_timeZoneId.isNotEmpty) {
      try {
        final offsetResult = await widget.onResolveUtcOffset(
          birthDate: birthDate,
          birthTime: _birthTimeUnknown ? '' : birthTime,
          birthTimeUnknown: _birthTimeUnknown,
          timeZoneId: _timeZoneId,
        );
        _utcOffsetController.text = offsetResult.utcOffset;
      } catch (error) {
        if (!mounted) {
          return;
        }
        setState(() {
          _errorMessage = error.toString().replaceFirst('Exception: ', '');
        });
        return;
      }
    }

    final utcOffset = _utcOffsetController.text.trim();
    if (!RegExp(r'^[+-]\d{2}:\d{2}$').hasMatch(utcOffset)) {
      setState(() {
        _errorMessage =
            context.l10n.ts('El UTC offset debe tener formato +/-HH:MM.');
      });
      return;
    }

    if (latitude == null || latitude < -90 || latitude > 90) {
      setState(() {
        _errorMessage =
            context.l10n.ts('La latitud debe estar entre -90 y 90.');
      });
      return;
    }

    if (longitude == null || longitude < -180 || longitude > 180) {
      setState(() {
        _errorMessage =
            context.l10n.ts('La longitud debe estar entre -180 y 180.');
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final locationLabel = [city, state, country]
        .where((item) => item.trim().isNotEmpty)
        .join(', ');
    try {
      final saveError = await widget.onSaveProfile(
        UpdateProfileInput(
          location: locationLabel,
          zodiacSign: '',
          subjectName: subjectName,
          birthDate: birthDate,
          birthTime: _birthTimeUnknown ? '' : birthTime,
          birthTimeUnknown: _birthTimeUnknown,
          city: city,
          state: state,
          country: country,
          timeZoneId: _timeZoneId,
          utcOffset: utcOffset,
          latitude: latitude,
          longitude: longitude,
        ),
      );

      if (saveError != null) {
        setState(() {
          _isLoading = false;
          _errorMessage = saveError;
        });
        return;
      }

      final result = await widget.onGenerate(
        AstroRequestInput(
          subjectName: subjectName.isEmpty ? null : subjectName,
          birthDate: birthDate,
          birthTime: _birthTimeUnknown ? '' : birthTime,
          birthTimeUnknown: _birthTimeUnknown,
          utcOffset: utcOffset,
          timeZoneId: _timeZoneId.isEmpty ? null : _timeZoneId,
          selectedPlanets: _orderedSelectedPlanetKeys,
          nodeType: _nodeType,
          lilithType: _lilithType,
          arabicPartsMode: _arabicPartsMode,
          technicalPoints: _orderedTechnicalPointKeys,
          latitude: latitude,
          longitude: longitude,
          locationLabel: locationLabel,
          houseSystem: _houseSystem,
        ),
      );

      if (!mounted) {
        return;
      }

      setState(() {
        _applyGeneratedResult(result);
        _selectedSection = _AstroFlowSection.wheel;
        _isLoading = false;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _isLoading = false;
        _errorMessage = error.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  Future<_ChartExportPayload> _buildClassicChartImagePayload() async {
    final result = _result;
    if (result == null) {
      throw Exception('Primero genera una carta natal.');
    }

    final bytes = await renderAstroChartExportPng(result.natalChart);

    final fileName =
        'carta-astral-${DateTime.now().millisecondsSinceEpoch}.png';
    return _ChartExportPayload(
      bytes: bytes,
      fileName: fileName,
    );
  }

  Future<_ChartExportPayload> _buildChartPdfPayload() async {
    final result = _result;
    if (result == null) {
      throw Exception('Primero genera una carta natal.');
    }

    final coverImage = await _buildClassicChartImagePayload();
    final document = sfpdf.PdfDocument();
    document.pageSettings.margins.all = 0;
    document.pageSettings.size = sfpdf.PdfPageSize.a4;

    final titleFont = sfpdf.PdfStandardFont(
      sfpdf.PdfFontFamily.helvetica,
      20,
      style: sfpdf.PdfFontStyle.bold,
    );
    final sectionFont = sfpdf.PdfStandardFont(
      sfpdf.PdfFontFamily.helvetica,
      13,
      style: sfpdf.PdfFontStyle.bold,
    );
    final bodyFont = sfpdf.PdfStandardFont(
      sfpdf.PdfFontFamily.helvetica,
      10,
    );
    final footerFont = sfpdf.PdfStandardFont(
      sfpdf.PdfFontFamily.helvetica,
      9,
      style: sfpdf.PdfFontStyle.bold,
    );

    var page = document.pages.add();
    const margin = 32.0;
    var y = margin;

    sfpdf.PdfLayoutResult drawTextBlock(
      String text, {
      sfpdf.PdfFont? font,
      double spacingAfter = 12,
    }) {
      final result = sfpdf.PdfTextElement(
        text: text,
        font: font ?? bodyFont,
      ).draw(
        page: page,
        bounds: Rect.fromLTWH(
          margin,
          y,
          page.getClientSize().width - (margin * 2),
          page.getClientSize().height - y - margin,
        ),
        format: sfpdf.PdfLayoutFormat(
          layoutType: sfpdf.PdfLayoutType.paginate,
        ),
      )!;
      page = result.page;
      y = result.bounds.bottom + spacingAfter;
      return result;
    }

    void ensureSpace(double height) {
      if (y + height <= page.getClientSize().height - margin) {
        return;
      }
      page = document.pages.add();
      y = margin;
    }

    String bulletList(List<String> items) {
      return items.map((item) => '• $item').join('\n');
    }

    final subjectName = result.natalChart.meta.subjectName.trim().isNotEmpty
        ? result.natalChart.meta.subjectName.trim()
        : '${widget.user.firstName} ${widget.user.lastName}'.trim();
    final resolvedSubjectName =
        subjectName.isEmpty ? 'Carta astral personal' : subjectName;

    drawTextBlock(
      'Carta astral Lo Renaciente',
      font: titleFont,
      spacingAfter: 6,
    );
    drawTextBlock(
      '$resolvedSubjectName\n'
      '${result.natalChart.meta.birthDate} · ${result.natalChart.meta.birthTime.isEmpty ? 'Hora no informada' : result.natalChart.meta.birthTime}\n'
      '${result.natalChart.meta.locationLabel}\n'
      'UTC ${result.natalChart.meta.utcOffset} · ${result.natalChart.meta.timeZoneId}',
      font: bodyFont,
    );

    ensureSpace(250);
    page.graphics.drawImage(
      sfpdf.PdfBitmap(coverImage.bytes),
      Rect.fromLTWH(
        margin,
        y,
        page.getClientSize().width - (margin * 2),
        220,
      ),
    );
    y += 236;

    drawTextBlock('Resumen base', font: sectionFont, spacingAfter: 6);
    drawTextBlock(
      'Sol en ${result.natalChart.summary.solarSign}\n'
      'Luna en ${result.natalChart.summary.lunarSign}\n'
      'Ascendente en ${result.natalChart.summary.ascendantSign}\n'
      'Regente de carta: ${result.natalChart.summary.chartRuler}\n'
      'Elemento dominante: ${result.natalChart.summary.dominantElement}\n'
      'Cualidad dominante: ${result.natalChart.summary.dominantQuality}',
    );

    drawTextBlock('Interpretación principal',
        font: sectionFont, spacingAfter: 6);
    drawTextBlock(
      bulletList(result.natalChart.interpretation.take(8).toList()),
    );

    drawTextBlock('Planetas principales', font: sectionFont, spacingAfter: 6);
    drawTextBlock(
      bulletList(
        result.natalChart.planets.take(10).map((planet) {
          final retrograde = planet.retrograde ? ' · R' : '';
          return '${planet.label}: ${planet.sign} ${planet.degreeFormatted} · Casa ${planet.house}$retrograde';
        }).toList(),
      ),
    );

    drawTextBlock('Aspectos destacados', font: sectionFont, spacingAfter: 6);
    drawTextBlock(
      bulletList(
        result.natalChart.aspects.take(8).map((aspect) {
          return '${aspect.left} ${aspect.type} ${aspect.right} · orb ${aspect.orb.toStringAsFixed(1)}°';
        }).toList(),
      ),
    );

    drawTextBlock('Tránsitos del momento', font: sectionFont, spacingAfter: 6);
    drawTextBlock(
      'Fecha de cálculo: ${result.transits.targetDateUtc}\n'
      '${bulletList(result.transits.highlights.take(6).toList())}',
    );

    drawTextBlock('Retornos', font: sectionFont, spacingAfter: 6);
    drawTextBlock(
      'Retorno solar: ${result.returns.solarReturn.startsAt} · grado ${result.returns.solarReturn.degree}\n'
      'Retorno lunar: ${result.returns.lunarReturn.startsAt} · grado ${result.returns.lunarReturn.degree}',
    );

    final eventLines = <String>[
      ...result.events.moonPhases.take(4).map(
            (event) =>
                '${event.label} · ${event.startsAt} · ${event.visibility}',
          ),
      ...result.events.eclipses.take(4).map(
            (event) =>
                '${event.label} · ${event.startsAt} · ${event.visibility}',
          ),
    ];
    if (eventLines.isNotEmpty) {
      drawTextBlock('Eventos próximos', font: sectionFont, spacingAfter: 6);
      drawTextBlock(bulletList(eventLines));
    }

    ensureSpace(28);
    page.graphics.drawString(
      'Documento generado desde Lo Renaciente',
      footerFont,
      brush: sfpdf.PdfSolidBrush(sfpdf.PdfColor(94, 83, 143)),
      bounds: Rect.fromLTWH(
        margin,
        page.getClientSize().height - margin,
        page.getClientSize().width - (margin * 2),
        18,
      ),
    );

    final bytes = Uint8List.fromList(await document.save());
    document.dispose();

    return _ChartExportPayload(
      bytes: bytes,
      fileName: 'carta-astral-${DateTime.now().millisecondsSinceEpoch}.pdf',
      mimeType: 'application/pdf',
    );
  }

  Future<void> _exportChartPdf() async {
    final result = _result;
    if (result == null || _isExporting) {
      return;
    }

    setState(() {
      _isExporting = true;
    });

    final l10n = context.l10n;

    try {
      final payload = await _buildChartPdfPayload();

      if (kIsWeb) {
        await SharePlus.instance.share(
          ShareParams(
            files: [
              XFile.fromData(
                payload.bytes,
                mimeType: payload.mimeType,
                name: payload.fileName,
              ),
            ],
            fileNameOverrides: [payload.fileName],
            title: l10n.ts('Carta astral Lo Renaciente'),
            downloadFallbackEnabled: true,
          ),
        );

        if (!mounted) {
          return;
        }

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              context.l10n
                  .ts('El PDF se preparó para descarga desde el navegador.'),
            ),
          ),
        );
        return;
      }

      if (defaultTargetPlatform == TargetPlatform.iOS) {
        await _shareFilePayload(
          payload,
          text: l10n.ts(
            'Tu carta astral de Lo Renaciente en PDF. Puedes guardarla en Archivos o compartirla.',
          ),
          subject: l10n.ts('Carta astral Lo Renaciente'),
        );
        if (!mounted) {
          return;
        }
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              context.l10n.ts(
                'Se abrió Compartir para que guardes la carta astral en PDF desde tu iPhone.',
              ),
            ),
          ),
        );
        return;
      }

      await _shareFilePayload(
        payload,
        text: l10n.ts(
          'Tu carta astral de Lo Renaciente en PDF. Puedes guardarla en Archivos o compartirla.',
        ),
        subject: l10n.ts('Carta astral Lo Renaciente'),
      );
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            context.l10n.ts(
              'Se abrió Compartir para guardar o enviar tu carta astral en PDF.',
            ),
          ),
        ),
      );
    } catch (error) {
      if (!mounted) {
        return;
      }

      try {
        final payload = await _buildChartPdfPayload();
        if (mounted) {
          await _shareFilePayload(
            payload,
            text: context.l10n.ts(
              'Tu carta astral de Lo Renaciente en PDF. Puedes guardarla en Archivos o compartirla.',
            ),
            subject: context.l10n.ts('Carta astral Lo Renaciente'),
          );
        }
      } catch (_) {}

      if (!mounted) {
        return;
      }

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            context.l10n.ts(
              'No se pudo guardar la carta directamente. Se abrió Compartir como respaldo.',
            ),
          ),
        ),
      );
    } finally {
      if (mounted) {
        setState(() {
          _isExporting = false;
        });
      }
    }
  }

  Future<void> _saveChartImageToPhotos() async {
    final result = _result;
    if (result == null || _isExporting) {
      return;
    }

    setState(() {
      _isExporting = true;
    });

    try {
      final payload = await _buildClassicChartImagePayload();
      final saved = await saveChartImageBytes(payload.bytes, payload.fileName);

      if (!mounted) {
        return;
      }

      if (saved == true) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              context.l10n.ts(
                'La imagen de tu carta astral se guardó en Fotos.',
              ),
            ),
          ),
        );
        return;
      }

      await _shareChartImage(payload);
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            context.l10n.ts(
              'No se pudo guardar automáticamente. Se abrió Compartir para que guardes la imagen.',
            ),
          ),
        ),
      );
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            context.l10n.ts(
              'No se pudo guardar la imagen: {error}',
              {'error': error.toString().replaceFirst('Exception: ', '')},
            ),
          ),
        ),
      );
    } finally {
      if (mounted) {
        setState(() {
          _isExporting = false;
        });
      }
    }
  }

  Future<void> _shareCurrentChartImage() async {
    if (_result == null || _isExporting) {
      return;
    }

    setState(() {
      _isExporting = true;
    });

    try {
      final payload = await _buildClassicChartImagePayload();
      if (!mounted) {
        return;
      }
      await _shareChartImage(payload);
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            context.l10n.ts(
              'No se pudo compartir la carta: {error}',
              {'error': error.toString().replaceFirst('Exception: ', '')},
            ),
          ),
        ),
      );
    } finally {
      if (mounted) {
        setState(() {
          _isExporting = false;
        });
      }
    }
  }

  Future<void> _shareChartImage(_ChartExportPayload payload) async {
    await _shareFilePayload(
      payload,
      text: context.l10n.ts(
        'Mi carta astral de Lo Renaciente. Puedes guardarla también en Archivos o compartirla.',
      ),
      subject: context.l10n.ts('Carta astral Lo Renaciente'),
    );
  }

  Future<void> _shareFilePayload(
    _ChartExportPayload payload, {
    required String text,
    required String subject,
  }) async {
    final box = context.findRenderObject();
    final renderBox = box is RenderBox ? box : null;

    await SharePlus.instance.share(
      ShareParams(
        text: text,
        files: [
          XFile.fromData(
            payload.bytes,
            mimeType: payload.mimeType,
            name: payload.fileName,
          ),
        ],
        fileNameOverrides: [payload.fileName],
        subject: subject,
        sharePositionOrigin: renderBox == null
            ? null
            : renderBox.localToGlobal(Offset.zero) & renderBox.size,
      ),
    );
  }

  Future<void> _tryResolveBirthPlaceFromManualFields() async {
    final city = _cityController.text.trim();
    final state = _stateController.text.trim();
    final country = _countryController.text.trim();
    final latitudeFilled = _latitudeController.text.trim().isNotEmpty;
    final longitudeFilled = _longitudeController.text.trim().isNotEmpty;
    final utcFilled = _utcOffsetController.text.trim().isNotEmpty;
    final timeZoneFilled = _timeZoneId.trim().isNotEmpty;

    if (city.isEmpty || country.isEmpty) {
      return;
    }
    if (latitudeFilled && longitudeFilled && utcFilled && timeZoneFilled) {
      return;
    }

    final query = [city, if (state.isNotEmpty) state, country].join(', ');
    try {
      final matches = await widget.onSearchBirthPlaces(query);
      if (!mounted || matches.isEmpty) {
        return;
      }

      final normalizedCity = _normalizePlaceText(city);
      final normalizedState = _normalizePlaceText(state);
      final normalizedCountry = _normalizePlaceText(country);

      BirthPlaceOption? bestMatch;
      for (final item in matches) {
        final itemCity = _normalizePlaceText(item.city);
        final itemState = _normalizePlaceText(item.state);
        final itemCountry = _normalizePlaceText(item.country);
        if (itemCity == normalizedCity && itemCountry == normalizedCountry) {
          bestMatch = item;
          if (normalizedState.isEmpty || itemState == normalizedState) {
            break;
          }
        }
      }

      final resolved = bestMatch ?? matches.first;
      setState(() {
        _selectedBirthPlace = resolved;
        _applyBirthPlace(resolved);
      });
    } catch (_) {
      return;
    }
  }

  void _applyBirthPlace(BirthPlaceOption place) {
    _cityController.text = place.city;
    _countryController.text = place.country;
    if (place.state.trim().isNotEmpty) {
      _stateController.text = place.state;
    } else if (_stateController.text.trim().isEmpty) {
      _stateController.text = place.country;
    }
    _timeZoneId = place.timeZoneId;
    _utcOffsetController.text = place.utcOffset;
    _latitudeController.text = place.latitude.toString();
    _longitudeController.text = place.longitude.toString();
  }

  List<String> get _orderedSelectedPlanetKeys {
    return _planetSelectionOptions
        .map((item) => item.key)
        .where(_selectedPlanetKeys.contains)
        .toList();
  }

  List<String> get _orderedTechnicalPointKeys {
    return _technicalPointOptions
        .map((item) => item.key)
        .where(_technicalPointKeys.contains)
        .toList();
  }

  String _normalizePlaceText(String value) {
    return value
        .toLowerCase()
        .trim()
        .replaceAll(RegExp(r'[áàäâ]'), 'a')
        .replaceAll(RegExp(r'[éèëê]'), 'e')
        .replaceAll(RegExp(r'[íìïî]'), 'i')
        .replaceAll(RegExp(r'[óòöô]'), 'o')
        .replaceAll(RegExp(r'[úùüû]'), 'u')
        .replaceAll('ñ', 'n')
        .replaceAll(RegExp(r'[^a-z0-9]+'), ' ')
        .trim();
  }

  Widget _buildIntroHero(ThemeData theme) {
    final l10n = context.l10n;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        gradient: const LinearGradient(
          colors: [
            AppPalette.midnight,
            AppPalette.indigo,
            AppPalette.royalViolet,
          ],
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            l10n.ts('Activa tu motor natal'),
            style: theme.textTheme.headlineSmall?.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            l10n.ts(
              'Esta sección ya usa el motor propio de Lo Renaciente para calcular carta natal, tránsitos, revoluciones y eventos próximos.',
            ),
            style: const TextStyle(
              color: Colors.white70,
              fontSize: 15,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              Chip(label: Text(l10n.ts('Carta natal'))),
              Chip(label: Text(l10n.ts('Tránsitos'))),
              Chip(label: Text(l10n.ts('Revoluciones'))),
              Chip(label: Text(l10n.ts('Eclipses'))),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildNatalDataSection() {
    final l10n = context.l10n;

    return _SectionCard(
      title: l10n.ts('Datos natales'),
      child: Column(
        children: [
          TextField(
            controller: _subjectNameController,
            autocorrect: false,
            enableSuggestions: false,
            spellCheckConfiguration: const SpellCheckConfiguration.disabled(),
            decoration: InputDecoration(
              labelText: l10n.ts('Nombre (opcional)'),
              hintText: l10n.ts('Nombre de la carta'),
            ),
          ),
          const SizedBox(height: 12),
          BirthDateFields(
            controllers: _birthDateControllers,
            enabled: !_isLoading,
          ),
          const SizedBox(height: 14),
          SwitchListTile.adaptive(
            value: _birthTimeUnknown,
            contentPadding: EdgeInsets.zero,
            title: Text(l10n.ts('Hora de nacimiento desconocida')),
            subtitle: Text(
              l10n.ts(
                'Si no conoces la hora exacta, el sistema calculará con una referencia media y la marcará como no exacta.',
              ),
            ),
            onChanged: (value) {
              setState(() {
                _birthTimeUnknown = value;
              });
            },
          ),
          const SizedBox(height: 12),
          BirthTimeWheelField(
            controller: _birthTimeController,
            enabled: !_birthTimeUnknown && !_isLoading,
          ),
          const SizedBox(height: 12),
          _buildTimeZoneField(),
          const SizedBox(height: 12),
          BirthPlaceSelector(
            selectedPlace: _selectedBirthPlace,
            onSearchRemote: widget.onSearchBirthPlaces,
            onSelected: (value) {
              if (value == null) {
                return;
              }

              setState(() {
                _selectedBirthPlace = value;
                _applyBirthPlace(value);
              });
            },
          ),
          const SizedBox(height: 12),
          _buildHouseSystemSelector(),
          const SizedBox(height: 12),
          _buildCalculationConfiguration(),
          const SizedBox(height: 16),
          _buildLocationSummary(),
          const SizedBox(height: 8),
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton.icon(
              onPressed: _isLoading
                  ? null
                  : () {
                      setState(() {
                        _showManualLocationFields = !_showManualLocationFields;
                      });
                    },
              icon: Icon(
                _showManualLocationFields
                    ? Icons.expand_less_rounded
                    : Icons.tune_rounded,
              ),
              label: Text(
                _showManualLocationFields
                    ? l10n.ts('Ocultar edición técnica')
                    : l10n.ts('Editar datos técnicos manualmente'),
              ),
            ),
          ),
          AnimatedCrossFade(
            duration: const Duration(milliseconds: 220),
            crossFadeState: _showManualLocationFields
                ? CrossFadeState.showSecond
                : CrossFadeState.showFirst,
            firstChild: const SizedBox.shrink(),
            secondChild: _buildManualLocationFields(),
          ),
          const SizedBox(height: 16),
          if (_errorMessage != null) _buildErrorBanner(),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: _isLoading ? null : _generateChart,
              child: _isLoading
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Text(l10n.ts('Generar carta astral')),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTimeZoneField() {
    final l10n = context.l10n;

    return InputDecorator(
      decoration: InputDecoration(
        labelText: l10n.ts('Zona horaria'),
      ),
      child: Text(
        _timeZoneId.isEmpty ? l10n.ts('Sin resolver') : _timeZoneId,
        style: TextStyle(
          color: _timeZoneId.isEmpty
              ? const Color(0xFF867A6C)
              : const Color(0xFF1E252B),
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Widget _buildHouseSystemSelector() {
    return Align(
      alignment: Alignment.centerLeft,
      child: Wrap(
        spacing: 8,
        runSpacing: 8,
        children: [
          _HouseSystemChip(
            label: 'Placidus',
            selected: _houseSystem == 'placidus',
            onSelected: _isLoading
                ? null
                : () => setState(() {
                      _houseSystem = 'placidus';
                    }),
          ),
          _HouseSystemChip(
            label: 'Whole Sign',
            selected: _houseSystem == 'whole_sign',
            onSelected: _isLoading
                ? null
                : () => setState(() {
                      _houseSystem = 'whole_sign';
                    }),
          ),
          _HouseSystemChip(
            label: 'Equal',
            selected: _houseSystem == 'equal',
            onSelected: _isLoading
                ? null
                : () => setState(() {
                      _houseSystem = 'equal';
                    }),
          ),
        ],
      ),
    );
  }

  Widget _buildCalculationConfiguration() {
    return _CalculationConfigurationPanel(
      selectedPlanetKeys: _selectedPlanetKeys,
      nodeType: _nodeType,
      lilithType: _lilithType,
      arabicPartsMode: _arabicPartsMode,
      selectedTechnicalPointKeys: _technicalPointKeys,
      isLoading: _isLoading,
      onPlanetChanged: (key, selected) {
        setState(() {
          if (selected) {
            _selectedPlanetKeys.add(key);
          } else if (_selectedPlanetKeys.length > 1) {
            _selectedPlanetKeys.remove(key);
          }
        });
      },
      onNodeTypeChanged: (value) {
        setState(() {
          _nodeType = value;
        });
      },
      onLilithTypeChanged: (value) {
        setState(() {
          _lilithType = value;
        });
      },
      onArabicPartsModeChanged: (value) {
        setState(() {
          _arabicPartsMode = value;
        });
      },
      onTechnicalPointChanged: (key, selected) {
        setState(() {
          if (selected) {
            _technicalPointKeys.add(key);
          } else if (_technicalPointKeys.length > 1) {
            _technicalPointKeys.remove(key);
          }
        });
      },
    );
  }

  Widget _buildLocationSummary() {
    final l10n = context.l10n;
    final locationText = _cityController.text.isEmpty
        ? l10n.ts('Aún no seleccionaste un lugar natal')
        : [
            _cityController.text,
            _stateController.text,
            _countryController.text,
          ].where((item) => item.trim().isNotEmpty).join(', ');

    final technicalText = _utcOffsetController.text.isEmpty
        ? l10n.ts(
            'Selecciona una ciudad del listado para completar automáticamente los datos técnicos.',
          )
        : 'UTC ${_utcOffsetController.text} · Lat ${_latitudeController.text} · Lon ${_longitudeController.text}';

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE6D3BE)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            locationText,
            style: const TextStyle(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 6),
          Text(technicalText),
          if (_timeZoneId.isNotEmpty) ...[
            const SizedBox(height: 2),
            Text(
              _timeZoneId,
              style: const TextStyle(
                fontSize: 12.5,
                color: Color(0xFF6A625B),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildManualLocationFields() {
    final l10n = context.l10n;

    return Column(
      children: [
        TextField(
          controller: _countryController,
          autocorrect: false,
          enableSuggestions: false,
          spellCheckConfiguration: const SpellCheckConfiguration.disabled(),
          decoration: InputDecoration(
            labelText: l10n.ts('País'),
            hintText: 'Perú',
          ),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _stateController,
          autocorrect: false,
          enableSuggestions: false,
          spellCheckConfiguration: const SpellCheckConfiguration.disabled(),
          decoration: InputDecoration(
            labelText: l10n.ts('Provincia o estado'),
            hintText: l10n.ts('Opcional o para carga manual'),
          ),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _cityController,
          autocorrect: false,
          enableSuggestions: false,
          spellCheckConfiguration: const SpellCheckConfiguration.disabled(),
          decoration: InputDecoration(
            labelText: l10n.ts('Ciudad'),
            hintText: l10n.ts('Selecciona o escribe manualmente'),
          ),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _utcOffsetController,
          autocorrect: false,
          enableSuggestions: false,
          spellCheckConfiguration: const SpellCheckConfiguration.disabled(),
          decoration: const InputDecoration(
            labelText: 'UTC offset',
            hintText: '-05:00',
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: _latitudeController,
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                  signed: true,
                ),
                autocorrect: false,
                enableSuggestions: false,
                spellCheckConfiguration:
                    const SpellCheckConfiguration.disabled(),
                decoration: InputDecoration(
                  labelText: l10n.ts('Latitud'),
                  hintText: '-12.0464',
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: TextField(
                controller: _longitudeController,
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                  signed: true,
                ),
                autocorrect: false,
                enableSuggestions: false,
                spellCheckConfiguration:
                    const SpellCheckConfiguration.disabled(),
                decoration: InputDecoration(
                  labelText: l10n.ts('Longitud'),
                  hintText: '-77.0428',
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildErrorBanner() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: const Color(0xFFFFECE8),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Text(
        _errorMessage!,
        style: const TextStyle(
          color: Color(0xFF8B2C1F),
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Widget _buildFlowContent(ThemeData theme) {
    final l10n = context.l10n;

    switch (_selectedSection) {
      case _AstroFlowSection.setup:
        return Column(
          key: const ValueKey('astro-setup'),
          children: [
            _buildNatalDataSection(),
            const SizedBox(height: 16),
            if (_result == null)
              _SectionCard(
                title: l10n.ts('Vista previa'),
                child: Text(
                  l10n.ts(
                    'Completa los datos natales y toca "Generar carta astral" para pasar a la rueda, la lectura técnica y los tiempos activos sin cargar toda la pantalla de una sola vez.',
                  ),
                  style: theme.textTheme.bodyLarge,
                ),
              ),
          ],
        );
      case _AstroFlowSection.wheel:
        if (_result == null) {
          return _buildFlowEmptyState(
            key: const ValueKey('astro-wheel-empty'),
            title: l10n.ts('Genera la carta primero'),
            subtitle: l10n.ts(
              'La rueda, la descarga PNG y la ficha técnica aparecerán aquí apenas calcules tu carta natal.',
            ),
          );
        }
        return Column(
          key: const ValueKey('astro-wheel'),
          children: [
            _buildResultActions(),
            const SizedBox(height: 16),
            AstroChartWheelCard(result: _result!.natalChart),
          ],
        );
      case _AstroFlowSection.essence:
        if (_result == null) {
          return _buildFlowEmptyState(
            key: const ValueKey('astro-essence-empty'),
            title: l10n.ts('Tu lectura central aún no está lista'),
            subtitle: l10n.ts(
              'Cuando generes la carta verás Sol, Luna, Ascendente, regencias, dominantes e interpretación en este bloque.',
            ),
          );
        }
        return Column(
          key: const ValueKey('astro-essence'),
          children: [
            _BigThreeCard(result: _result!.natalChart),
            const SizedBox(height: 16),
            _TriadDetailsCard(result: _result!.natalChart),
            const SizedBox(height: 16),
            _RulershipsCard(result: _result!.natalChart),
            const SizedBox(height: 16),
            _DominantsCard(result: _result!.natalChart),
            const SizedBox(height: 16),
            _MidheavenCard(result: _result!.natalChart),
            const SizedBox(height: 16),
            _buildInterpretationSection(_result!.natalChart),
          ],
        );
      case _AstroFlowSection.technical:
        if (!widget.hasPremiumAccess) {
          return _buildPremiumLockedSection(_AstroFlowSection.technical);
        }
        if (_result == null) {
          return _buildFlowEmptyState(
            key: const ValueKey('astro-technical-empty'),
            title: l10n.ts('Todavía no hay técnica para revisar'),
            subtitle: l10n.ts(
              'Este espacio mostrará puntos técnicos, planetas, casas y aspectos principales cuando la carta esté calculada.',
            ),
          );
        }
        return Column(
          key: const ValueKey('astro-technical'),
          children: [
            _TechnicalPointsCard(result: _result!.natalChart),
            const SizedBox(height: 16),
            _buildPlanetsAndHousesSection(_result!.natalChart),
            const SizedBox(height: 16),
            _buildAspectsSection(_result!.natalChart),
          ],
        );
      case _AstroFlowSection.timing:
        if (!widget.hasPremiumAccess) {
          return _buildPremiumLockedSection(_AstroFlowSection.timing);
        }
        if (_result == null) {
          return _buildFlowEmptyState(
            key: const ValueKey('astro-timing-empty'),
            title: l10n.ts('Aún no tenemos tiempos activos'),
            subtitle: l10n.ts(
              'Tránsitos, revoluciones y eventos próximos aparecerán aquí cuando generes la carta.',
            ),
          );
        }
        return Column(
          key: const ValueKey('astro-timing'),
          children: [
            _buildTransitsSection(_result!),
            const SizedBox(height: 16),
            _buildReturnsSection(_result!),
            const SizedBox(height: 16),
            _buildEventsSection(_result!),
          ],
        );
    }
  }

  Widget _buildFlowEmptyState({
    required Key key,
    required String title,
    required String subtitle,
  }) {
    return _SectionCard(
      key: key,
      title: title,
      child: Text(subtitle),
    );
  }

  bool _sectionRequiresPremium(_AstroFlowSection section) {
    return section == _AstroFlowSection.technical ||
        section == _AstroFlowSection.timing;
  }

  Widget _buildPremiumLockedSection(_AstroFlowSection section) {
    final title = section == _AstroFlowSection.technical
        ? context.l10n.ts('Carta Natal: Técnica')
        : context.l10n.ts('Carta Natal: Tiempo');

    return PremiumLockedCard(
      key: ValueKey('astro-premium-${section.name}'),
      title: title,
      message: context.l10n.ts(
        'Esta opción pertenece al Plan Premium. Habilita Premium desde administración para ver este análisis durante un mes.',
      ),
    );
  }

  Widget _buildResultActions() {
    final l10n = context.l10n;

    Widget actionLabel(String text) {
      return Text(
        text,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        textAlign: TextAlign.center,
      );
    }

    final filledStyle = FilledButton.styleFrom(
      minimumSize: const Size.fromHeight(52),
      padding: const EdgeInsets.symmetric(horizontal: 14),
      textStyle: const TextStyle(fontWeight: FontWeight.w800),
    );
    final outlinedStyle = OutlinedButton.styleFrom(
      minimumSize: const Size.fromHeight(52),
      padding: const EdgeInsets.symmetric(horizontal: 10),
      textStyle: const TextStyle(fontWeight: FontWeight.w800),
    );

    return LayoutBuilder(
      builder: (context, constraints) {
        final useWideLayout = constraints.maxWidth >= 720;
        final useSingleColumn = constraints.maxWidth < 390;

        final pdfButton = FilledButton.icon(
          onPressed: _isExporting ? null : _exportChartPdf,
          style: filledStyle,
          icon: _isExporting
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Icon(Icons.picture_as_pdf_outlined),
          label: actionLabel(
            _isExporting
                ? l10n.ts('Generando PDF...')
                : l10n.ts('Exportar PDF'),
          ),
        );
        final saveImageButton = OutlinedButton.icon(
          onPressed: _isExporting ? null : _saveChartImageToPhotos,
          style: outlinedStyle,
          icon: const Icon(Icons.photo_library_outlined),
          label: actionLabel(l10n.ts('Guardar imagen')),
        );
        final shareImageButton = OutlinedButton.icon(
          onPressed: _isExporting ? null : _shareCurrentChartImage,
          style: outlinedStyle,
          icon: const Icon(Icons.ios_share_rounded),
          label: actionLabel(l10n.ts('Compartir imagen')),
        );

        if (useWideLayout) {
          return Row(
            children: [
              Expanded(flex: 2, child: pdfButton),
              const SizedBox(width: 12),
              Expanded(child: saveImageButton),
              const SizedBox(width: 12),
              Expanded(child: shareImageButton),
            ],
          );
        }

        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            pdfButton,
            const SizedBox(height: 10),
            if (useSingleColumn) ...[
              saveImageButton,
              const SizedBox(height: 10),
              shareImageButton,
            ] else
              Row(
                children: [
                  Expanded(child: saveImageButton),
                  const SizedBox(width: 10),
                  Expanded(child: shareImageButton),
                ],
              ),
          ],
        );
      },
    );
  }

  Widget _buildPlanetsAndHousesSection(AstroNatalChartResult natalChart) {
    final l10n = context.l10n;

    return _SectionCard(
      title: l10n.ts('Planetas y casas'),
      child: Column(
        children: [
          LayoutBuilder(
            builder: (context, constraints) {
              const spacing = 10.0;
              final itemWidth = ((constraints.maxWidth - spacing) / 2)
                  .clamp(0.0, constraints.maxWidth)
                  .toDouble();

              return Wrap(
                spacing: spacing,
                runSpacing: spacing,
                children: natalChart.planets
                    .take(8)
                    .map(
                      (planet) => SizedBox(
                        width: itemWidth,
                        child: _PillStat(
                          title: _displayAstroLabel(planet.label),
                          value: l10n.ts(
                            '{sign} · Casa {house}{retrograde}',
                            {
                              'sign': planet.sign,
                              'house': '${planet.house}',
                              'retrograde': planet.retrograde ? ' · R' : '',
                            },
                          ),
                        ),
                      ),
                    )
                    .toList(),
              );
            },
          ),
          const SizedBox(height: 16),
          Column(
            children: natalChart.houses
                .take(12)
                .map(
                  (house) => Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Row(
                      children: [
                        Text(
                          l10n.ts(
                            'Casa {house}',
                            {'house': '${house.number}'},
                          ),
                          style: const TextStyle(
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            '${house.cuspDegreeFormatted} · Regente ${_displayAstroLabel(house.ruler)}',
                          ),
                        ),
                      ],
                    ),
                  ),
                )
                .toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildAspectsSection(AstroNatalChartResult natalChart) {
    final l10n = context.l10n;

    return _SectionCard(
      title: l10n.ts('Aspectos principales'),
      child: Column(
        children: natalChart.aspects
            .take(10)
            .map(
              (aspect) => ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text('${aspect.left} · ${aspect.right}'),
                subtitle: Text(
                  '${aspect.type} · ${_aspectPrecisionLabel(aspect.precision)}',
                ),
                trailing: Text(
                  'Orb ${aspect.orb.toStringAsFixed(1)}°/${aspect.maxOrb.toStringAsFixed(1)}°',
                ),
              ),
            )
            .toList(),
      ),
    );
  }

  Widget _buildInterpretationSection(AstroNatalChartResult natalChart) {
    return _SectionCard(
      title: context.l10n.ts('Interpretación base'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: natalChart.interpretation
            .map(
              (line) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Text('• $line'),
              ),
            )
            .toList(),
      ),
    );
  }

  Widget _buildTransitsSection(AstroOverviewData result) {
    final l10n = context.l10n;

    return _SectionCard(
      title: l10n.ts('Tránsitos del momento'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            l10n.ts(
              'Fecha de cálculo: {date}',
              {'date': formatSchedule(result.transits.targetDateUtc)},
            ),
          ),
          const SizedBox(height: 12),
          ...result.transits.highlights.take(6).map(
                (item) => Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Text('• $item'),
                ),
              ),
        ],
      ),
    );
  }

  Widget _buildReturnsSection(AstroOverviewData result) {
    final l10n = context.l10n;

    return _SectionCard(
      title: l10n.ts('Revoluciones'),
      child: Column(
        children: [
          _TimelineRow(
            label: l10n.ts('Próxima revolución solar'),
            value: formatSchedule(result.returns.solarReturn.startsAt),
            detail: result.returns.solarReturn.degree,
          ),
          const SizedBox(height: 12),
          _TimelineRow(
            label: l10n.ts('Próxima revolución lunar'),
            value: formatSchedule(result.returns.lunarReturn.startsAt),
            detail: result.returns.lunarReturn.degree,
          ),
        ],
      ),
    );
  }

  Widget _buildEventsSection(AstroOverviewData result) {
    return _SectionCard(
      title: context.l10n.ts('Eventos próximos'),
      child: Column(
        children: [
          ...result.events.moonPhases.take(4).map(
                (event) => _TimelineRow(
                  label: event.label,
                  value: formatSchedule(event.startsAt),
                  detail: event.kind,
                ),
              ),
          if (result.events.eclipses.isNotEmpty) ...[
            const SizedBox(height: 12),
            ...result.events.eclipses.take(4).map(
                  (event) => Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: _TimelineRow(
                      label: event.label,
                      value: formatSchedule(event.startsAt),
                      detail: event.visibility.isEmpty
                          ? event.sourceLabel.isEmpty
                              ? event.kind
                              : '${event.kind} · ${event.sourceLabel}'
                          : event.sourceLabel.isEmpty
                              ? '${event.kind} · ${event.visibility}'
                              : '${event.kind} · ${event.visibility} · ${event.sourceLabel}',
                    ),
                  ),
                ),
          ],
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final l10n = context.l10n;
    final sections = <MysticFlowOption>[
      MysticFlowOption(
        label: l10n.ts('Configura'),
        caption: l10n.ts('Datos natales y ajustes'),
        glyphKind: MysticGlyphKind.person,
      ),
      MysticFlowOption(
        label: l10n.ts('Rueda'),
        caption: l10n.ts('Carta, ficha y exportación'),
        glyphKind: MysticGlyphKind.astral,
      ),
      MysticFlowOption(
        label: l10n.ts('Esencia'),
        caption: l10n.ts('Tríada, regencias y sentido'),
        glyphKind: MysticGlyphKind.subscription,
      ),
      MysticFlowOption(
        label: l10n.ts('Técnica'),
        caption: widget.hasPremiumAccess
            ? l10n.ts('Puntos, casas y aspectos')
            : l10n.ts('Plan Premium'),
        glyphKind: MysticGlyphKind.generic,
      ),
      MysticFlowOption(
        label: l10n.ts('Tiempo'),
        caption: widget.hasPremiumAccess
            ? l10n.ts('Tránsitos y eventos')
            : l10n.ts('Plan Premium'),
        glyphKind: MysticGlyphKind.ritual,
      ),
    ];

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.ts('Carta Astral')),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
        children: [
          _buildIntroHero(theme),
          const SizedBox(height: 18),
          MysticFlowNavigator(
            items: sections,
            selectedIndex: _AstroFlowSection.values.indexOf(_selectedSection),
            onSelect: (index) {
              final nextSection = _AstroFlowSection.values[index];
              if (_sectionRequiresPremium(nextSection) &&
                  !widget.hasPremiumAccess) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(
                      l10n.ts('Esta opción está bloqueada para usuarios Free.'),
                    ),
                  ),
                );
                setState(() {
                  _selectedSection = nextSection;
                });
                return;
              }

              setState(() {
                _selectedSection = nextSection;
              });
            },
            accent: AppPalette.royalViolet,
          ),
          const SizedBox(height: 18),
          MysticSlideSwitcher(
            child: _buildFlowContent(theme),
          ),
        ],
      ),
    );
  }
}

class _ChartExportPayload {
  const _ChartExportPayload({
    required this.bytes,
    required this.fileName,
    this.mimeType = 'image/png',
  });

  final Uint8List bytes;
  final String fileName;
  final String mimeType;
}
