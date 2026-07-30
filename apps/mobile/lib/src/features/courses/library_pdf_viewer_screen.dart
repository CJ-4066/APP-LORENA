import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:syncfusion_flutter_pdfviewer/pdfviewer.dart';
import 'package:http/http.dart' as http;

import '../../core/config/app_config.dart';
import '../../core/i18n/app_i18n.dart';
import '../../core/theme/app_palette.dart';
import '../../core/widgets/mystic_ui.dart';
import 'library_pdf_image_viewer_screen.dart';
import 'shared_drive_library_service.dart';

class LibraryPdfViewerScreen extends StatefulWidget {
  const LibraryPdfViewerScreen({
    super.key,
    required this.document,
  });

  final SharedDriveDocument document;

  @override
  State<LibraryPdfViewerScreen> createState() => _LibraryPdfViewerScreenState();
}

class _LibraryPdfViewerScreenState extends State<LibraryPdfViewerScreen> {
  final http.Client _client = http.Client();
  final PdfViewerController _pdfViewerController = PdfViewerController();

  _LibraryPdfMetadata? _metadata;
  Uint8List? _pdfBytes;
  bool _loading = true;
  bool _fallbackNavigationScheduled = false;
  String? _errorMessage;

  String get _baseUrl => AppConfig.apiBaseUrl;
  String get _metaUrl =>
      '$_baseUrl/api/content/library/pdfs/${widget.document.id}/meta';
  String get _pdfUrl =>
      '$_baseUrl/api/content/library/pdfs/${widget.document.id}/file';

  @override
  void initState() {
    super.initState();
    _loadMetadata();
  }

  @override
  void dispose() {
    _client.close();
    _pdfViewerController.dispose();
    super.dispose();
  }

  Future<void> _loadMetadata({bool refresh = false}) async {
    setState(() {
      _loading = true;
      _errorMessage = null;
      _pdfBytes = null;
    });

    try {
      final meta = await _fetchMetadata(refresh: refresh);
      final pdfBytes = await _fetchPdfBytes(refresh: refresh);
      if (!mounted) {
        return;
      }

      setState(() {
        _metadata = meta;
        _pdfBytes = pdfBytes;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _loading = false;
        _errorMessage = error.toString();
      });
    }
  }

  Future<_LibraryPdfMetadata> _fetchMetadata({bool refresh = false}) async {
    final uri = Uri.parse(refresh ? '$_metaUrl?refresh=1' : _metaUrl);
    final response = await _client.get(uri);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('No se pudo leer el documento.');
    }

    final json = jsonDecode(response.body) as Map<String, dynamic>;
    final item = json['item'];
    if (item is! Map<String, dynamic>) {
      throw Exception('No se encontró la metadata del documento.');
    }

    final pageCount = (item['pageCount'] as num?)?.toInt() ?? 0;
    if (pageCount < 1) {
      throw Exception('El documento no tiene páginas legibles.');
    }

    final title = (item['title'] as String?)?.trim();
    return _LibraryPdfMetadata(
      id: widget.document.id,
      title:
          (title != null && title.isNotEmpty) ? title : widget.document.title,
      pageCount: pageCount,
    );
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
      throw Exception('La API no devolvió un PDF válido.');
    }

    return response.bodyBytes;
  }

  void _onDocumentLoaded(PdfDocumentLoadedDetails details) {
    if (!mounted) {
      return;
    }

    setState(() {
      _metadata = _metadata == null
          ? _LibraryPdfMetadata(
              id: widget.document.id,
              title: widget.document.title,
              pageCount: _pdfViewerController.pageCount,
            )
          : _metadata!.copyWith(pageCount: _pdfViewerController.pageCount);
      _loading = false;
    });
  }

  void _onDocumentLoadFailed(PdfDocumentLoadFailedDetails details) {
    if (!mounted) {
      return;
    }

    if (_fallbackNavigationScheduled) {
      return;
    }

    _fallbackNavigationScheduled = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) {
        return;
      }

      Navigator.of(context).pushReplacement(
        MaterialPageRoute<void>(
          builder: (_) => LibraryPdfImageViewerScreen(
            title: _metadata?.title ?? widget.document.title,
            document: widget.document,
          ),
        ),
      );
    });
  }

  Widget _buildErrorPanel(BuildContext context) {
    final message = _errorMessage;
    return Padding(
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
                'La API no devolvió un documento legible. Podemos forzar una nueva lectura desde el servidor.',
              ),
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppPalette.mutedLavender,
                    height: 1.35,
                  ),
            ),
            if (message != null) ...[
              const SizedBox(height: 10),
              Text(
                message,
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
                  onPressed: () => _loadMetadata(),
                  icon: const Icon(Icons.refresh_rounded),
                  label: Text(context.l10n.ts('Reintentar')),
                ),
                OutlinedButton.icon(
                  onPressed: () => _loadMetadata(refresh: true),
                  icon: const Icon(Icons.bolt_rounded),
                  label: Text(context.l10n.ts('Forzar recarga')),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPdfViewer(BuildContext context) {
    final bytes = _pdfBytes;
    if (bytes == null) {
      return const Center(child: CircularProgressIndicator());
    }

    return SfPdfViewer.memory(
      bytes,
      controller: _pdfViewerController,
      canShowScrollHead: false,
      canShowScrollStatus: false,
      canShowPaginationDialog: false,
      canShowHyperlinkDialog: false,
      pageLayoutMode: PdfPageLayoutMode.continuous,
      pageSpacing: 0,
      scrollDirection: PdfScrollDirection.vertical,
      maxZoomLevel: 6,
      enableTextSelection: true,
      enableDoubleTapZooming: true,
      currentSearchTextHighlightColor:
          AppPalette.flameGold.withValues(alpha: 0.55),
      otherSearchTextHighlightColor: AppPalette.indigo.withValues(alpha: 0.18),
      onDocumentLoaded: _onDocumentLoaded,
      onDocumentLoadFailed: _onDocumentLoadFailed,
      onTextSelectionChanged: (_) {},
    );
  }

  Widget _buildBackButton(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: Colors.black.withValues(alpha: 0.46),
            borderRadius: BorderRadius.circular(18),
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
    final Widget content = _loading
        ? const Center(child: CircularProgressIndicator())
        : _errorMessage != null
            ? _buildErrorPanel(context)
            : _buildPdfViewer(context);

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

class _LibraryPdfMetadata {
  const _LibraryPdfMetadata({
    required this.id,
    required this.title,
    required this.pageCount,
  });

  final String id;
  final String title;
  final int pageCount;

  _LibraryPdfMetadata copyWith({
    String? title,
    int? pageCount,
  }) {
    return _LibraryPdfMetadata(
      id: id,
      title: title ?? this.title,
      pageCount: pageCount ?? this.pageCount,
    );
  }
}
