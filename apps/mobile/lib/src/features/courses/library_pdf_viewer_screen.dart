import 'dart:convert';

import 'package:flutter/material.dart';
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
  final TextEditingController _pageController =
      TextEditingController(text: '1');
  final TextEditingController _searchController = TextEditingController();

  final Map<int, ImageProvider> _pageImageCache = {};
  final Map<int, Future<_PageTextLayer?>> _pageTextLayerCache = {};

  PageController? _pageViewController;
  _LibraryPdfMetadata? _metadata;
  List<_SearchMatch> _searchMatches = const [];
  bool _loading = true;
  bool _searchBusy = false;
  bool _refreshing = false;
  bool _showTextLayer = true;
  int _currentPage = 1;
  String? _errorMessage;

  String get _baseUrl => AppConfig.apiBaseUrl;
  String get _metaUrl =>
      '$_baseUrl/api/content/library/pdfs/${widget.document.id}/meta';

  @override
  void initState() {
    super.initState();
    _loadMetadata();
  }

  @override
  void dispose() {
    _client.close();
    _pageViewController?.dispose();
    _pageController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadMetadata({bool refresh = false}) async {
    setState(() {
      _loading = true;
      _errorMessage = null;
      if (refresh) {
        _refreshing = true;
        _pageImageCache.clear();
        _pageTextLayerCache.clear();
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
        _searchMatches = const [];
        _pageViewController?.dispose();
        _pageViewController = PageController(initialPage: 0);
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
    final uri = Uri.parse(
      refresh ? '$_metaUrl?refresh=1' : _metaUrl,
    );
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

  String _pageImageUrl(int pageNumber) {
    final refreshPart = _refreshing ? '&refresh=1' : '';
    return '$_baseUrl/api/content/library/pdfs/${widget.document.id}/pages/$pageNumber/image?width=3200$refreshPart';
  }

  String _searchUrl(String query) {
    final encodedQuery = Uri.encodeQueryComponent(query);
    final refreshPart = _refreshing ? '&refresh=1' : '';
    return '$_baseUrl/api/content/library/pdfs/${widget.document.id}/search?q=$encodedQuery$refreshPart';
  }

  Future<void> _reload({bool refresh = false}) async {
    _searchController.clear();
    _searchMatches = const [];
    await _loadMetadata(refresh: refresh);
  }

  Future<void> _search() async {
    final query = _searchController.text.trim();
    if (query.isEmpty) {
      setState(() {
        _searchMatches = const [];
      });
      return;
    }

    setState(() {
      _searchBusy = true;
      _errorMessage = null;
    });

    try {
      final response = await _client.get(Uri.parse(_searchUrl(query)));
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw Exception('No se pudo buscar dentro del documento.');
      }

      final json = jsonDecode(response.body) as Map<String, dynamic>;
      final item = json['item'] as Map<String, dynamic>?;
      final matches = (item?['matches'] as List<dynamic>? ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(
            (match) => _SearchMatch(
              pageNumber: (match['pageNumber'] as num).toInt(),
              snippet: (match['snippet'] as String?)?.trim() ?? '',
            ),
          )
          .toList(growable: false);

      if (!mounted) {
        return;
      }

      setState(() {
        _searchMatches = matches;
      });

      if (matches.isNotEmpty) {
        await _jumpToPage(matches.first.pageNumber);
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

  Future<void> _jumpToPage(int pageNumber) async {
    final meta = _metadata;
    if (meta == null) {
      return;
    }

    final target = pageNumber.clamp(1, meta.pageCount);
    _pageController.text = '$target';
    if (_pageViewController == null || !_pageViewController!.hasClients) {
      setState(() {
        _currentPage = target;
      });
      return;
    }

    await _pageViewController!.animateToPage(
      target - 1,
      duration: const Duration(milliseconds: 240),
      curve: Curves.easeOutCubic,
    );
  }

  void _updateCurrentPage(int pageNumber) {
    if (!mounted) {
      return;
    }

    setState(() {
      _currentPage = pageNumber;
      _pageController.text = '$pageNumber';
    });
  }

  ImageProvider _pageImageProvider(int pageNumber) {
    return _pageImageCache.putIfAbsent(
      pageNumber,
      () => NetworkImage(_pageImageUrl(pageNumber)),
    );
  }

  Future<_PageTextLayer?> _pageTextLayer(int pageNumber) {
    return _pageTextLayerCache.putIfAbsent(
      pageNumber,
      () => _fetchPageTextLayer(pageNumber),
    );
  }

  Future<_PageTextLayer?> _fetchPageTextLayer(int pageNumber) async {
    try {
      final refreshPart = _refreshing ? '&refresh=1' : '';
      final url =
          '$_baseUrl/api/content/library/pdfs/${widget.document.id}/pages/$pageNumber/text?width=3200$refreshPart';
      final response = await _client.get(Uri.parse(url));
      if (response.statusCode < 200 || response.statusCode >= 300) {
        return null;
      }

      final json = jsonDecode(response.body) as Map<String, dynamic>;
      final item = json['item'];
      if (item is! Map<String, dynamic>) {
        return null;
      }

      final pageWidth = (item['pageWidth'] as num?)?.toDouble() ?? 0;
      final pageHeight = (item['pageHeight'] as num?)?.toDouble() ?? 0;
      if (pageWidth <= 0 || pageHeight <= 0) {
        return null;
      }

      final lines = (item['lines'] as List<dynamic>? ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(
            (line) => _PageTextLine(
              text: (line['text'] as String?)?.trim() ?? '',
              left: (line['left'] as num?)?.toDouble() ?? 0,
              top: (line['top'] as num?)?.toDouble() ?? 0,
              width: (line['width'] as num?)?.toDouble() ?? 0,
              height: (line['height'] as num?)?.toDouble() ?? 0,
              fontSize: (line['fontSize'] as num?)?.toDouble() ?? 12,
            ),
          )
          .where((line) => line.text.isNotEmpty)
          .toList(growable: false);

      return _PageTextLayer(
        pageWidth: pageWidth,
        pageHeight: pageHeight,
        lines: lines,
      );
    } catch (_) {
      return null;
    }
  }

  Widget _buildTopControls(BuildContext context) {
    final meta = _metadata;
    if (meta == null) {
      return const SizedBox.shrink();
    }

    final pageTitle = 'Página $_currentPage / ${meta.pageCount}';

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
            label: Text(pageTitle),
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
          IconButton(
            onPressed: () {
              setState(() {
                _showTextLayer = !_showTextLayer;
              });
            },
            icon: Icon(
              _showTextLayer
                  ? Icons.text_fields_rounded
                  : Icons.text_format_rounded,
            ),
            tooltip: _showTextLayer
                ? context.l10n.ts('Ocultar capa de texto')
                : context.l10n.ts('Mostrar capa de texto'),
          ),
          IconButton(
            onPressed: () => _reload(),
            icon: const Icon(Icons.refresh_rounded),
            tooltip: context.l10n.ts('Recargar'),
          ),
          IconButton(
            onPressed: () => _reload(refresh: true),
            icon: const Icon(Icons.bolt_rounded),
            tooltip: context.l10n.ts('Forzar recarga'),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchPanel(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(bottom: BorderSide(color: AppPalette.borderSoft)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _searchController,
                  textInputAction: TextInputAction.search,
                  onChanged: (_) {
                    setState(() {});
                  },
                  onSubmitted: (_) => _search(),
                  decoration: InputDecoration(
                    hintText: context.l10n.ts('Buscar palabra clave'),
                    prefixIcon: const Icon(Icons.search_rounded),
                    suffixIcon: _searchController.text.isEmpty
                        ? null
                        : IconButton(
                            onPressed: () {
                              _searchController.clear();
                              setState(() {
                                _searchMatches = const [];
                              });
                            },
                            icon: const Icon(Icons.clear_rounded),
                          ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              FilledButton(
                onPressed: _searchBusy ? null : _search,
                child: Text(context.l10n.ts('Buscar')),
              ),
            ],
          ),
          const SizedBox(height: 10),
          if (_searchMatches.isNotEmpty)
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: _searchMatches.map((match) {
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ActionChip(
                      label: Text('P${match.pageNumber}'),
                      onPressed: () => _jumpToPage(match.pageNumber),
                    ),
                  );
                }).toList(),
              ),
            )
          else
            Text(
              _searchBusy
                  ? context.l10n.ts('Buscando...')
                  : context.l10n.ts(
                      'Busca una palabra clave para saltar a páginas relevantes.'),
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: AppPalette.mutedLavender,
                    fontWeight: FontWeight.w600,
                  ),
            ),
        ],
      ),
    );
  }

  Widget _buildPage(BuildContext context, int index) {
    final meta = _metadata!;
    final pageNumber = index + 1;

    return FutureBuilder<_PageTextLayer?>(
      future: _pageTextLayer(pageNumber),
      builder: (context, snapshot) {
        final layout = snapshot.data;

        return Padding(
          padding: const EdgeInsets.fromLTRB(16, 14, 16, 18),
          child: Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: AppPalette.border),
              boxShadow: [
                BoxShadow(
                  color: AppPalette.indigo.withValues(alpha: 0.08),
                  blurRadius: 24,
                  offset: const Offset(0, 14),
                ),
              ],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(24),
              child: Column(
                children: [
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 12,
                    ),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          AppPalette.petalSoft,
                          AppPalette.moonIvory,
                        ],
                      ),
                      border: Border(
                        bottom: BorderSide(color: AppPalette.borderSoft),
                      ),
                    ),
                    child: Row(
                      children: [
                        Text(
                          '${context.l10n.ts('Página')} $pageNumber',
                          style:
                              Theme.of(context).textTheme.titleSmall?.copyWith(
                                    fontWeight: FontWeight.w800,
                                    color: AppPalette.butterflyInk,
                                  ),
                        ),
                        const Spacer(),
                        Text(
                          '${meta.pageCount}',
                          style:
                              Theme.of(context).textTheme.bodySmall?.copyWith(
                                    color: AppPalette.mutedLavender,
                                    fontWeight: FontWeight.w700,
                                  ),
                        ),
                      ],
                    ),
                  ),
                  Expanded(
                    child: Center(
                      child: layout == null
                          ? InteractiveViewer(
                              minScale: 1,
                              maxScale: 3.5,
                              panEnabled: true,
                              child: Image(
                                image: _pageImageProvider(pageNumber),
                                fit: BoxFit.contain,
                                gaplessPlayback: true,
                                filterQuality: FilterQuality.high,
                                loadingBuilder: (context, child, loading) {
                                  if (loading == null) {
                                    return child;
                                  }
                                  return SizedBox(
                                    width: double.infinity,
                                    height: 420,
                                    child: Center(
                                      child: Column(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          const CircularProgressIndicator(),
                                          const SizedBox(height: 10),
                                          Text(
                                            context.l10n
                                                .ts('Cargando página...'),
                                            style: Theme.of(context)
                                                .textTheme
                                                .bodySmall
                                                ?.copyWith(
                                                  color:
                                                      AppPalette.mutedLavender,
                                                ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  );
                                },
                                errorBuilder: (_, __, ___) => Padding(
                                  padding: const EdgeInsets.all(24),
                                  child: Column(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      const Icon(
                                        Icons.broken_image_outlined,
                                        size: 40,
                                      ),
                                      const SizedBox(height: 10),
                                      Text(
                                        context.l10n.ts(
                                          'No se pudo cargar esta página.',
                                        ),
                                        style: Theme.of(context)
                                            .textTheme
                                            .bodyMedium,
                                      ),
                                      const SizedBox(height: 10),
                                      OutlinedButton.icon(
                                        onPressed: () {
                                          setState(() {
                                            _pageImageCache.remove(pageNumber);
                                            _pageTextLayerCache
                                                .remove(pageNumber);
                                          });
                                        },
                                        icon: const Icon(Icons.refresh_rounded),
                                        label:
                                            Text(context.l10n.ts('Reintentar')),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            )
                          : Column(
                              children: [
                                Expanded(
                                  child: InteractiveViewer(
                                    minScale: 1,
                                    maxScale: 4,
                                    panEnabled: true,
                                    child: AspectRatio(
                                      aspectRatio:
                                          layout.pageWidth / layout.pageHeight,
                                      child: Image(
                                        image: _pageImageProvider(pageNumber),
                                        fit: BoxFit.fill,
                                        gaplessPlayback: true,
                                        filterQuality: FilterQuality.high,
                                        errorBuilder: (_, __, ___) => Container(
                                          color: Colors.white,
                                          alignment: Alignment.center,
                                          child: Column(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              const Icon(
                                                Icons.broken_image_outlined,
                                                size: 40,
                                              ),
                                              const SizedBox(height: 10),
                                              Text(
                                                context.l10n.ts(
                                                  'No se pudo cargar esta página.',
                                                ),
                                                style: Theme.of(context)
                                                    .textTheme
                                                    .bodyMedium,
                                              ),
                                            ],
                                          ),
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                                if (_showTextLayer)
                                  Container(
                                    width: double.infinity,
                                    decoration: BoxDecoration(
                                      color: AppPalette.moonIvory,
                                      border: Border(
                                        top: BorderSide(
                                          color: AppPalette.borderSoft,
                                        ),
                                      ),
                                    ),
                                    padding: const EdgeInsets.fromLTRB(
                                      14,
                                      12,
                                      14,
                                      14,
                                    ),
                                    child: layout.lines.isEmpty
                                        ? Text(
                                            context.l10n.ts(
                                              'Esta página no tiene texto embebido para seleccionar.',
                                            ),
                                            style: Theme.of(context)
                                                .textTheme
                                                .bodySmall
                                                ?.copyWith(
                                                  color:
                                                      AppPalette.mutedLavender,
                                                ),
                                          )
                                        : SizedBox(
                                            height: 162,
                                            child: SelectionArea(
                                              child: SingleChildScrollView(
                                                child: SelectableText(
                                                  layout.lines
                                                      .map((line) => line.text)
                                                      .join('\n'),
                                                  style: Theme.of(context)
                                                      .textTheme
                                                      .bodyMedium
                                                      ?.copyWith(
                                                        fontFamily: 'NotoSans',
                                                        fontFamilyFallback: const [
                                                          'NotoSans',
                                                          'Roboto',
                                                          'Helvetica Neue',
                                                          'Arial',
                                                        ],
                                                        color: AppPalette
                                                            .butterflyInk,
                                                        height: 1.5,
                                                      ),
                                                ),
                                              ),
                                            ),
                                          ),
                                  ),
                              ],
                            ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;

    return Scaffold(
      backgroundColor: AppPalette.petalSoft,
      appBar: AppBar(
        backgroundColor: AppPalette.petalSoft,
        foregroundColor: AppPalette.butterflyInk,
        elevation: 0,
        title: Text(_metadata?.title ?? widget.document.title),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _errorMessage != null
              ? Padding(
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
                          l10n.ts('No pudimos abrir este PDF'),
                          style: Theme.of(context)
                              .textTheme
                              .titleMedium
                              ?.copyWith(fontWeight: FontWeight.w800),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          l10n.ts(
                            'La API no devolvió un documento legible. Podemos forzar una nueva lectura desde el servidor.',
                          ),
                          style:
                              Theme.of(context).textTheme.bodyMedium?.copyWith(
                                    color: AppPalette.mutedLavender,
                                    height: 1.35,
                                  ),
                        ),
                        const SizedBox(height: 10),
                        Text(
                          _errorMessage!,
                          style:
                              Theme.of(context).textTheme.bodySmall?.copyWith(
                                    color: AppPalette.mutedLavender,
                                    height: 1.4,
                                  ),
                        ),
                        const SizedBox(height: 14),
                        Wrap(
                          spacing: 10,
                          runSpacing: 10,
                          children: [
                            FilledButton.icon(
                              onPressed: () => _loadMetadata(),
                              icon: const Icon(Icons.refresh_rounded),
                              label: Text(l10n.ts('Reintentar')),
                            ),
                            OutlinedButton.icon(
                              onPressed: () => _loadMetadata(refresh: true),
                              icon: const Icon(Icons.bolt_rounded),
                              label: Text(l10n.ts('Forzar recarga')),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                )
              : Column(
                  children: [
                    _buildTopControls(context),
                    _buildSearchPanel(context),
                    Expanded(
                      child: PageView.builder(
                        controller: _pageViewController,
                        itemCount: _metadata?.pageCount ?? 0,
                        onPageChanged: _updateCurrentPage,
                        itemBuilder: _buildPage,
                      ),
                    ),
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
}

class _SearchMatch {
  const _SearchMatch({
    required this.pageNumber,
    required this.snippet,
  });

  final int pageNumber;
  final String snippet;
}

class _PageTextLayer {
  const _PageTextLayer({
    required this.pageWidth,
    required this.pageHeight,
    required this.lines,
  });

  final double pageWidth;
  final double pageHeight;
  final List<_PageTextLine> lines;
}

class _PageTextLine {
  const _PageTextLine({
    required this.text,
    required this.left,
    required this.top,
    required this.width,
    required this.height,
    required this.fontSize,
  });

  final String text;
  final double left;
  final double top;
  final double width;
  final double height;
  final double fontSize;
}
