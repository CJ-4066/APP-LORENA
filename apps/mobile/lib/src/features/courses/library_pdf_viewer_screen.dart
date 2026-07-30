import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:syncfusion_flutter_pdfviewer/pdfviewer.dart';

import '../../core/config/app_config.dart';
import '../../core/i18n/app_i18n.dart';
import '../../core/theme/app_palette.dart';
import '../../core/widgets/mystic_ui.dart';
import 'library_pdf_bookmark_service.dart';
import 'library_pdf_image_viewer_screen.dart';
import 'shared_drive_library_service.dart';

class LibraryPdfViewerScreen extends StatefulWidget {
  const LibraryPdfViewerScreen({
    super.key,
    required this.document,
    this.initialPage = 1,
  });

  final SharedDriveDocument document;
  final int initialPage;

  @override
  State<LibraryPdfViewerScreen> createState() => _LibraryPdfViewerScreenState();
}

class _LibraryPdfViewerScreenState extends State<LibraryPdfViewerScreen> {
  final http.Client _client = http.Client();
  final LibraryPdfBookmarkService _bookmarkService =
      LibraryPdfBookmarkService();
  final PdfViewerController _pdfViewerController = PdfViewerController();
  final Set<int> _activePointers = <int>{};

  _LibraryPdfMetadata? _metadata;
  Uint8List? _pdfBytes;
  bool _loading = true;
  bool _fallbackNavigationScheduled = false;
  int _currentPage = 1;
  int _initialPage = 1;
  Offset? _swipeStart;
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
        _initialPage = widget.initialPage.clamp(1, meta.pageCount);
        _currentPage = _initialPage;
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
      _currentPage = _pdfViewerController.pageNumber;
    });

    if (_initialPage > 1 && _pdfViewerController.pageNumber != _initialPage) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          _pdfViewerController.jumpToPage(_initialPage);
        }
      });
    }
  }

  void _onDocumentLoadFailed(PdfDocumentLoadFailedDetails _) {
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
            initialPage: _currentPage,
          ),
        ),
      );
    });
  }

  void _onPageChanged(PdfPageChangedDetails details) {
    if (!mounted) {
      return;
    }

    setState(() {
      _currentPage = details.newPageNumber;
    });
  }

  void _handlePointerDown(PointerDownEvent event) {
    _activePointers.add(event.pointer);
    _swipeStart = _activePointers.length == 1 ? event.position : null;
  }

  void _handlePointerUp(PointerUpEvent event) {
    final shouldReadSwipe =
        _activePointers.length == 1 && _activePointers.contains(event.pointer);
    final start = _swipeStart;
    _activePointers.remove(event.pointer);
    _swipeStart = _activePointers.isEmpty ? null : _swipeStart;

    if (!shouldReadSwipe || start == null) {
      return;
    }

    final delta = event.position - start;
    if (delta.dx.abs() < 72 || delta.dx.abs() < delta.dy.abs() * 1.2) {
      return;
    }

    if (delta.dx > 0) {
      _goToPage(_currentPage + 1);
    } else {
      _goToPage(_currentPage - 1);
    }
  }

  void _handlePointerCancel(PointerCancelEvent event) {
    _activePointers.remove(event.pointer);
    if (_activePointers.isEmpty) {
      _swipeStart = null;
    }
  }

  void _goToPage(int page) {
    final meta = _metadata;
    if (meta == null) {
      return;
    }

    final targetPage = page.clamp(1, meta.pageCount);
    if (targetPage == _currentPage) {
      return;
    }

    _pdfViewerController.jumpToPage(targetPage);
    setState(() {
      _currentPage = targetPage;
    });
  }

  Future<void> _saveCurrentPage() async {
    final meta = _metadata;
    if (meta == null || _pdfBytes == null) {
      return;
    }

    final savedPage = _currentPage.clamp(1, meta.pageCount);
    await _bookmarkService.saveBookmark(
      document: widget.document,
      page: savedPage,
    );

    if (!mounted) {
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(context.l10n.ts('Página guardada')),
        duration: const Duration(milliseconds: 900),
      ),
    );
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
          ],
        ),
      ),
    );
  }

  Widget _buildPdfViewer() {
    final bytes = _pdfBytes;
    if (bytes == null) {
      return const Center(child: CircularProgressIndicator());
    }

    return Listener(
      onPointerDown: _handlePointerDown,
      onPointerUp: _handlePointerUp,
      onPointerCancel: _handlePointerCancel,
      child: ColoredBox(
        color: Colors.white,
        child: SfPdfViewer.memory(
          bytes,
          controller: _pdfViewerController,
          canShowScrollHead: false,
          canShowScrollStatus: false,
          canShowPaginationDialog: false,
          canShowHyperlinkDialog: false,
          canShowPasswordDialog: false,
          canShowSignaturePadDialog: false,
          canShowTextSelectionMenu: false,
          pageLayoutMode: PdfPageLayoutMode.continuous,
          pageSpacing: 0,
          scrollDirection: PdfScrollDirection.vertical,
          initialPageNumber: _initialPage,
          initialZoomLevel: 1,
          maxZoomLevel: 6,
          interactionMode: PdfInteractionMode.pan,
          enableTextSelection: false,
          enableDoubleTapZooming: true,
          enableDocumentLinkAnnotation: false,
          enableHyperlinkNavigation: false,
          onDocumentLoaded: _onDocumentLoaded,
          onDocumentLoadFailed: _onDocumentLoadFailed,
          onPageChanged: _onPageChanged,
        ),
      ),
    );
  }

  Widget _buildSaveButton(BuildContext context) {
    return SafeArea(
      child: Align(
        alignment: Alignment.topRight,
        child: Padding(
          padding: const EdgeInsets.all(8),
          child: Material(
            color: Colors.black.withValues(alpha: 0.42),
            shape: const CircleBorder(),
            child: InkWell(
              customBorder: const CircleBorder(),
              onTap: _saveCurrentPage,
              child: const SizedBox.square(
                dimension: 34,
                child: Icon(
                  Icons.bookmark_add_rounded,
                  color: Colors.white,
                  size: 18,
                ),
              ),
            ),
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
            : _buildPdfViewer();

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          Positioned.fill(
            child: SafeArea(
              child: content,
            ),
          ),
          if (!_loading && _errorMessage == null) _buildSaveButton(context),
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
