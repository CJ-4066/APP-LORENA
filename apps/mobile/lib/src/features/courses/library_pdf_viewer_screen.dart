import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:syncfusion_flutter_pdfviewer/pdfviewer.dart';
import 'package:http/http.dart' as http;

import '../../core/config/app_config.dart';
import '../../core/i18n/app_i18n.dart';
import '../../core/theme/app_palette.dart';
import '../../core/widgets/mystic_ui.dart';
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
  final TextEditingController _pageController = TextEditingController(text: '1');
  final TextEditingController _searchController = TextEditingController();

  _LibraryPdfMetadata? _metadata;
  PdfTextSearchResult? _searchResult;
  bool _loading = true;
  bool _searchBusy = false;
  bool _refreshing = false;
  int _currentPage = 1;
  String? _errorMessage;
  String? _loadFailureMessage;

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
    _pageController.dispose();
    _searchController.dispose();
    _searchResult?.removeListener(_onSearchResultChanged);
    _searchResult?.dispose();
    super.dispose();
  }

  Future<void> _loadMetadata({bool refresh = false}) async {
    setState(() {
      _loading = true;
      _errorMessage = null;
      _loadFailureMessage = null;
      if (refresh) {
        _refreshing = true;
      }
    });

    try {
      final meta = await _fetchMetadata(refresh: refresh);
      if (!mounted) {
        return;
      }

      setState(() {
        _metadata = meta;
        _loading = false;
        _refreshing = false;
        _currentPage = 1;
        _pageController.text = '1';
      });
    } catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _loading = false;
        _refreshing = false;
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
      title: (title != null && title.isNotEmpty) ? title : widget.document.title,
      pageCount: pageCount,
    );
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
      _loadFailureMessage = null;
      _currentPage = _pdfViewerController.pageNumber;
      _pageController.text = '${_pdfViewerController.pageNumber}';
    });
  }

  void _onDocumentLoadFailed(PdfDocumentLoadFailedDetails details) {
    if (!mounted) {
      return;
    }

    setState(() {
      _loading = false;
      _loadFailureMessage =
          details.description.isNotEmpty ? details.description : details.error;
    });
  }

  void _onPageChanged(PdfPageChangedDetails details) {
    if (!mounted) {
      return;
    }

    setState(() {
      _currentPage = details.newPageNumber;
      _pageController.text = '${details.newPageNumber}';
    });
  }

  void _attachSearchResult(PdfTextSearchResult result) {
    _searchResult?.removeListener(_onSearchResultChanged);
    _searchResult?.dispose();
    _searchResult = result;
    _searchResult!.addListener(_onSearchResultChanged);
  }

  void _onSearchResultChanged() {
    if (!mounted) {
      return;
    }

    setState(() {});
  }

  Future<void> _jumpToPage(int pageNumber) async {
    final meta = _metadata;
    if (meta == null) {
      return;
    }

    final target = pageNumber.clamp(1, meta.pageCount);
    _pageController.text = '$target';
    _pdfViewerController.jumpToPage(target);
  }

  Future<void> _search() async {
    final query = _searchController.text.trim();
    final currentResult = _searchResult;
    if (currentResult != null) {
      currentResult.clear();
    }

    if (query.isEmpty) {
      setState(() {
        _searchBusy = false;
      });
      return;
    }

    setState(() {
      _searchBusy = true;
      _errorMessage = null;
    });

    try {
      final result = _pdfViewerController.searchText(query);
      _attachSearchResult(result);
      if (!mounted) {
        return;
      }

      setState(() {});
      if (result.hasResult) {
        result.nextInstance();
      }
    } catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _errorMessage = error.toString();
      });
    } finally {
      if (mounted) {
        setState(() {
          _searchBusy = false;
        });
      }
    }
  }

  void _clearSearch() {
    _searchController.clear();
    _searchResult?.clear();
    setState(() {});
  }

  Widget _buildTopControls(BuildContext context) {
    final meta = _metadata;
    if (meta == null) {
      return const SizedBox.shrink();
    }

    final searchResult = _searchResult;
    final searchLabel = searchResult == null || !searchResult.hasResult
        ? context.l10n.ts('Sin búsqueda')
        : searchResult.isSearchCompleted
            ? '${searchResult.currentInstanceIndex}/${searchResult.totalInstanceCount}'
            : '${searchResult.currentInstanceIndex}/${searchResult.totalInstanceCount}...';

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(bottom: BorderSide(color: AppPalette.borderSoft)),
      ),
      child: Wrap(
        runSpacing: 10,
        spacing: 10,
        crossAxisAlignment: WrapCrossAlignment.center,
        children: [
          Chip(
            avatar: const Icon(Icons.auto_stories_rounded, size: 18),
            label: Text('Página $_currentPage / ${meta.pageCount}'),
          ),
          SizedBox(
            width: 92,
            child: TextField(
              controller: _pageController,
              keyboardType: TextInputType.number,
              textAlign: TextAlign.center,
              decoration: InputDecoration(
                hintText: context.l10n.ts('Página'),
              ),
              onSubmitted: (_) {
                final page = int.tryParse(_pageController.text.trim());
                if (page != null) {
                  _jumpToPage(page);
                }
              },
            ),
          ),
          FilledButton.icon(
            onPressed: () {
              final page = int.tryParse(_pageController.text.trim());
              if (page != null) {
                _jumpToPage(page);
              }
            },
            icon: const Icon(Icons.search_rounded),
            label: Text(context.l10n.ts('Ir')),
          ),
          OutlinedButton.icon(
            onPressed:
                _currentPage > 1 ? () => _jumpToPage(_currentPage - 1) : null,
            icon: const Icon(Icons.chevron_left_rounded),
            label: Text(context.l10n.ts('Anterior')),
          ),
          OutlinedButton.icon(
            onPressed: _metadata != null && _currentPage < meta.pageCount
                ? () => _jumpToPage(_currentPage + 1)
                : null,
            icon: const Icon(Icons.chevron_right_rounded),
            label: Text(context.l10n.ts('Siguiente')),
          ),
          SizedBox(
            width: 190,
            child: TextField(
              controller: _searchController,
              textInputAction: TextInputAction.search,
              onSubmitted: (_) => _search(),
              decoration: InputDecoration(
                hintText: context.l10n.ts('Buscar texto'),
                prefixIcon: const Icon(Icons.search_rounded),
                suffixIcon: _searchController.text.isEmpty
                    ? null
                    : IconButton(
                        onPressed: _clearSearch,
                        icon: const Icon(Icons.clear_rounded),
                      ),
              ),
            ),
          ),
          FilledButton(
            onPressed: _searchBusy ? null : _search,
            child: Text(context.l10n.ts('Buscar')),
          ),
          OutlinedButton.icon(
            onPressed: searchResult == null || !searchResult.hasResult
                ? null
                : searchResult.previousInstance,
            icon: const Icon(Icons.keyboard_arrow_up_rounded),
            label: Text(context.l10n.ts('Previa')),
          ),
          OutlinedButton.icon(
            onPressed: searchResult == null || !searchResult.hasResult
                ? null
                : searchResult.nextInstance,
            icon: const Icon(Icons.keyboard_arrow_down_rounded),
            label: Text(context.l10n.ts('Siguiente')),
          ),
          Text(
            searchLabel,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: AppPalette.mutedLavender,
                  fontWeight: FontWeight.w600,
                ),
          ),
          IconButton(
            onPressed: () => _loadMetadata(),
            icon: const Icon(Icons.refresh_rounded),
            tooltip: context.l10n.ts('Recargar'),
          ),
          IconButton(
            onPressed: () => _loadMetadata(refresh: true),
            icon: const Icon(Icons.bolt_rounded),
            tooltip: context.l10n.ts('Forzar recarga'),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorPanel(BuildContext context) {
    final message = _errorMessage ?? _loadFailureMessage;
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
    final pdfUrl = _refreshing ? '$_pdfUrl?refresh=1' : _pdfUrl;
    return SfPdfViewer.network(
      pdfUrl,
      controller: _pdfViewerController,
      canShowScrollHead: true,
      canShowScrollStatus: true,
      canShowPaginationDialog: true,
      enableTextSelection: true,
      enableDoubleTapZooming: true,
      currentSearchTextHighlightColor: AppPalette.flameGold.withValues(alpha: 0.55),
      otherSearchTextHighlightColor: AppPalette.indigo.withValues(alpha: 0.18),
      onDocumentLoaded: _onDocumentLoaded,
      onDocumentLoadFailed: _onDocumentLoadFailed,
      onPageChanged: _onPageChanged,
      onTextSelectionChanged: (_) {},
    );
  }

  @override
  Widget build(BuildContext context) {
    final title = _metadata?.title ?? widget.document.title;

    return Scaffold(
      backgroundColor: AppPalette.petalSoft,
      appBar: AppBar(
        backgroundColor: AppPalette.petalSoft,
        foregroundColor: AppPalette.butterflyInk,
        elevation: 0,
        title: Text(title),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _errorMessage != null || _loadFailureMessage != null
              ? _buildErrorPanel(context)
              : Column(
                  children: [
                    _buildTopControls(context),
                    Expanded(child: _buildPdfViewer(context)),
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
