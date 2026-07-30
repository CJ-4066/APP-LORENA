import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:pdfx/pdfx.dart';

import '../../core/config/app_config.dart';
import '../../core/i18n/app_i18n.dart';
import '../../core/theme/app_palette.dart';
import '../../core/widgets/mystic_ui.dart';
import 'shared_drive_library_service.dart';

class LibraryPdfImageViewerScreen extends StatefulWidget {
  const LibraryPdfImageViewerScreen({
    super.key,
    required this.title,
    required this.document,
  });

  final String title;
  final SharedDriveDocument document;

  @override
  State<LibraryPdfImageViewerScreen> createState() =>
      _LibraryPdfImageViewerScreenState();
}

class _LibraryPdfImageViewerScreenState
    extends State<LibraryPdfImageViewerScreen> {
  final http.Client _client = http.Client();

  PdfControllerPinch? _pdfController;
  bool _loading = true;
  String? _errorMessage;

  String get _pdfUrl =>
      '${AppConfig.apiBaseUrl}/api/content/library/pdfs/${widget.document.id}/file';

  @override
  void initState() {
    super.initState();
    _loadPdf();
  }

  @override
  void dispose() {
    _pdfController?.dispose();
    _client.close();
    super.dispose();
  }

  Future<void> _loadPdf({bool refresh = false}) async {
    setState(() {
      _loading = true;
      _errorMessage = null;
    });

    PdfControllerPinch? nextController;
    try {
      final bytes = await _fetchPdfBytes(refresh: refresh);
      nextController = PdfControllerPinch(
        document: PdfDocument.openData(bytes),
        initialPage: 1,
      );

      if (!mounted) {
        nextController.dispose();
        return;
      }

      final previousController = _pdfController;
      setState(() {
        _pdfController = nextController;
        _loading = false;
      });
      previousController?.dispose();
    } catch (error) {
      nextController?.dispose();
      if (!mounted) {
        return;
      }

      setState(() {
        _loading = false;
        _errorMessage = error.toString();
      });
    }
  }

  Future<Uint8List> _fetchPdfBytes({bool refresh = false}) async {
    final uri = Uri.parse(refresh ? '$_pdfUrl?refresh=1' : _pdfUrl);
    final response = await _client.get(uri);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('No se pudo descargar el PDF.');
    }

    final contentType = response.headers['content-type'] ?? '';
    if (!contentType.contains('application/pdf') ||
        response.bodyBytes.isEmpty) {
      throw Exception('La API no devolvio un PDF valido.');
    }

    return response.bodyBytes;
  }

  Widget _buildErrorPanel(BuildContext context) {
    return SafeArea(
      child: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(18),
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: AppPalette.moonIvory,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: AppPalette.border),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                MysticGlyphBadge(
                  kind: MysticGlyphKind.course,
                  accent: AppPalette.indigo,
                  background: AppPalette.indigo.withValues(alpha: 0.16),
                  size: 58,
                ),
                const SizedBox(height: 14),
                Text(
                  context.l10n.ts('No pudimos abrir este PDF'),
                  style: Theme.of(context)
                      .textTheme
                      .titleMedium
                      ?.copyWith(fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 8),
                Text(
                  context.l10n.ts(
                    'El documento no se pudo descargar como PDF legible.',
                  ),
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppPalette.mutedLavender,
                        height: 1.35,
                      ),
                ),
                if (_errorMessage != null) ...[
                  const SizedBox(height: 10),
                  Text(
                    _errorMessage!,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: AppPalette.mutedLavender,
                          height: 1.4,
                        ),
                  ),
                ],
                const SizedBox(height: 14),
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: [
                    FilledButton.icon(
                      onPressed: () => _loadPdf(),
                      icon: const Icon(Icons.refresh_rounded),
                      label: Text(context.l10n.ts('Reintentar')),
                    ),
                    OutlinedButton.icon(
                      onPressed: () => _loadPdf(refresh: true),
                      icon: const Icon(Icons.bolt_rounded),
                      label: Text(context.l10n.ts('Forzar recarga')),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildPdfViewer(BuildContext context, PdfControllerPinch controller) {
    return PdfViewPinch(
      controller: controller,
      scrollDirection: Axis.vertical,
      padding: 0,
      minScale: 1,
      maxScale: 8,
      backgroundDecoration: const BoxDecoration(color: Colors.white),
      builders: PdfViewPinchBuilders<DefaultBuilderOptions>(
        options: const DefaultBuilderOptions(
          loaderSwitchDuration: Duration(milliseconds: 150),
        ),
        documentLoaderBuilder: (_) => const Center(
          child: CircularProgressIndicator(),
        ),
        pageLoaderBuilder: (_) => const Center(
          child: CircularProgressIndicator(strokeWidth: 2),
        ),
        errorBuilder: (context, error) => Center(
          child: Padding(
            padding: const EdgeInsets.all(28),
            child: Text(
              context.l10n.ts('No se pudo renderizar este PDF.'),
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Colors.white70,
                  ),
              textAlign: TextAlign.center,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildBackButton(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: Colors.black.withValues(alpha: 0.56),
            borderRadius: BorderRadius.circular(16),
          ),
          child: IconButton(
            onPressed: () => Navigator.of(context).maybePop(),
            icon: const Icon(Icons.arrow_back_rounded),
            color: Colors.white,
            tooltip: context.l10n.ts('Volver'),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final controller = _pdfController;
    final Widget content = _loading
        ? const Center(child: CircularProgressIndicator())
        : controller == null
            ? _buildErrorPanel(context)
            : _buildPdfViewer(context, controller);

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          Positioned.fill(child: content),
          _buildBackButton(context),
        ],
      ),
    );
  }
}
