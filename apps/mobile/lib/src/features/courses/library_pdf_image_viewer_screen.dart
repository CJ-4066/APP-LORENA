import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

import '../../core/config/app_config.dart';
import '../../core/i18n/app_i18n.dart';
import '../../core/theme/app_palette.dart';
import '../../core/widgets/mystic_ui.dart';
import 'library_pdf_bookmark_service.dart';
import 'shared_drive_library_service.dart';

class LibraryPdfImageViewerScreen extends StatefulWidget {
  const LibraryPdfImageViewerScreen({
    super.key,
    required this.title,
    required this.document,
    this.initialPage = 1,
  });

  final String title;
  final SharedDriveDocument document;
  final int initialPage;

  @override
  State<LibraryPdfImageViewerScreen> createState() =>
      _LibraryPdfImageViewerScreenState();
}

class _LibraryPdfImageViewerScreenState
    extends State<LibraryPdfImageViewerScreen> {
  final http.Client _client = http.Client();
  final LibraryPdfBookmarkService _bookmarkService =
      LibraryPdfBookmarkService();
  late final PageController _viewerController;
  final Map<int, Future<Uint8List?>> _pageImageCache = {};
  final Set<int> _activePointers = <int>{};

  _LibraryPdfMetadata? _metadata;
  bool _loading = true;
  bool _refreshing = false;
  int _currentPage = 1;
  int? _savedPage;
  Offset? _swipeStart;
  Offset? _swipeLatest;
  bool _swipeHandled = false;
  String? _errorMessage;

  int get _pageRenderWidth =>
      defaultTargetPlatform == TargetPlatform.android ? 1200 : 1800;
  String get _metaUrl =>
      '${AppConfig.apiBaseUrl}/api/content/library/pdfs/${widget.document.id}/meta';

  String _pageImageUrl(int pageNumber, {bool refresh = false}) {
    final base =
        '${AppConfig.apiBaseUrl}/api/content/library/pdfs/${widget.document.id}/pages/$pageNumber/image?width=$_pageRenderWidth';
    return refresh ? '$base&refresh=1' : base;
  }

  void _trimPageImageCache(int centerPage) {
    final allowedPages = <int>{
      if (centerPage > 1) centerPage - 1,
      centerPage,
      centerPage + 1,
    };
    _pageImageCache.removeWhere(
      (key, _) => !allowedPages.contains(key.abs()),
    );
  }

  Future<Uint8List?> _loadPageBytes(int pageNumber) {
    _trimPageImageCache(pageNumber);
    final key = _refreshing ? -pageNumber : pageNumber;
    return _pageImageCache.putIfAbsent(key, () async {
      try {
        final response = await _client.get(Uri.parse(
          _pageImageUrl(pageNumber, refresh: _refreshing),
        ));
        if (response.statusCode < 200 || response.statusCode >= 300) {
          return null;
        }

        final contentType = response.headers['content-type'] ?? '';
        if (!contentType.contains('image/png') || response.bodyBytes.isEmpty) {
          return null;
        }

        return response.bodyBytes;
      } catch (_) {
        return null;
      }
    });
  }

  @override
  void initState() {
    super.initState();
    _currentPage = widget.initialPage < 1 ? 1 : widget.initialPage;
    _viewerController = PageController(initialPage: _currentPage - 1);
    _loadSavedBookmark();
    _loadMetadata();
  }

  @override
  void dispose() {
    _client.close();
    _viewerController.dispose();
    super.dispose();
  }

  Future<void> _loadMetadata({bool refresh = false}) async {
    setState(() {
      _loading = true;
      _errorMessage = null;
      if (refresh) {
        _refreshing = true;
      }
    });

    try {
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

      if (!mounted) {
        return;
      }

      setState(() {
        _metadata = _LibraryPdfMetadata(
          id: widget.document.id,
          title: (item['title'] as String?)?.trim().isNotEmpty == true
              ? (item['title'] as String).trim()
              : widget.document.title,
          pageCount: pageCount,
        );
        _loading = false;
        _refreshing = false;
        _currentPage = _currentPage.clamp(1, pageCount);
        _pageImageCache.clear();
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

  Future<void> _loadSavedBookmark() async {
    final bookmark =
        await _bookmarkService.loadBookmarkForDocument(widget.document.id);
    if (!mounted) {
      return;
    }

    setState(() {
      _savedPage = bookmark?.page;
    });
  }

  Widget _buildErrorPanel(BuildContext context) {
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
          ],
        ),
      ),
    );
  }

  void _handlePointerDown(PointerDownEvent event) {
    _activePointers.add(event.pointer);
    if (_activePointers.length == 1) {
      _swipeStart = event.position;
      _swipeLatest = event.position;
      _swipeHandled = false;
    } else {
      _swipeStart = null;
      _swipeLatest = null;
      _swipeHandled = true;
    }
  }

  void _handlePointerMove(PointerMoveEvent event) {
    if (_activePointers.length != 1 ||
        !_activePointers.contains(event.pointer)) {
      return;
    }

    _swipeLatest = event.position;
    _resolveHorizontalSwipe();
  }

  void _handlePointerUp(PointerUpEvent event) {
    final shouldReadSwipe =
        _activePointers.length == 1 && _activePointers.contains(event.pointer);
    _swipeLatest = event.position;
    if (shouldReadSwipe) {
      _resolveHorizontalSwipe();
    }
    _activePointers.remove(event.pointer);
    if (_activePointers.isEmpty) {
      _swipeStart = null;
      _swipeLatest = null;
      _swipeHandled = false;
    }
  }

  void _resolveHorizontalSwipe() {
    final start = _swipeStart;
    final latest = _swipeLatest;
    if (_swipeHandled || start == null || latest == null) {
      return;
    }

    final delta = latest - start;

    if (delta.dx.abs() < 72 || delta.dx.abs() < delta.dy.abs() * 1.2) {
      return;
    }

    _swipeHandled = true;
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
      _swipeLatest = null;
      _swipeHandled = false;
    }
  }

  Future<void> _goToPage(int page) async {
    final meta = _metadata;
    if (meta == null) {
      return;
    }

    final targetPage = page.clamp(1, meta.pageCount);
    if (targetPage == _currentPage) {
      return;
    }

    setState(() {
      _currentPage = targetPage;
    });
    if (_viewerController.hasClients) {
      await _viewerController.animateToPage(
        targetPage - 1,
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOutCubic,
      );
    }
  }

  Future<void> _toggleCurrentPageBookmark() async {
    final meta = _metadata;
    if (meta == null) {
      return;
    }

    final savedPage = _currentPage.clamp(1, meta.pageCount);
    final alreadySaved = _savedPage == savedPage;

    if (alreadySaved) {
      await _bookmarkService.removeBookmark(widget.document.id);
    } else {
      await _bookmarkService.saveBookmark(
        document: widget.document,
        page: savedPage,
      );
    }

    if (!mounted) {
      return;
    }

    setState(() {
      _savedPage = alreadySaved ? null : savedPage;
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          context.l10n.ts(
            alreadySaved ? 'Página quitada' : 'Página guardada',
          ),
        ),
        duration: const Duration(milliseconds: 900),
      ),
    );
  }

  Widget _buildPageImage(BuildContext context, int pageNumber) {
    return LayoutBuilder(
      builder: (context, constraints) {
        return FutureBuilder<Uint8List?>(
          future: _loadPageBytes(pageNumber),
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const Center(child: CircularProgressIndicator());
            }

            final bytes = snapshot.data;
            if (bytes == null) {
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(28),
                  child: Text(
                    context.l10n.ts('No se pudo cargar esta página.'),
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: Colors.white70,
                        ),
                    textAlign: TextAlign.center,
                  ),
                ),
              );
            }

            return SizedBox.expand(
              child: InteractiveViewer(
                minScale: 1,
                maxScale: 6,
                boundaryMargin: EdgeInsets.zero,
                clipBehavior: Clip.hardEdge,
                child: ColoredBox(
                  color: Colors.black,
                  child: SizedBox.expand(
                    child: Image.memory(
                      bytes,
                      width: constraints.maxWidth,
                      height: constraints.maxHeight,
                      cacheWidth: _pageRenderWidth,
                      fit: BoxFit.contain,
                      alignment: Alignment.center,
                      filterQuality: FilterQuality.medium,
                      gaplessPlayback: true,
                    ),
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final meta = _metadata;
    final Widget content = _loading
        ? const Center(child: CircularProgressIndicator())
        : meta == null
            ? _buildErrorPanel(context)
            : PageView.builder(
                controller: _viewerController,
                scrollDirection: Axis.vertical,
                itemCount: meta.pageCount,
                onPageChanged: (index) {
                  final nextPage = index + 1;
                  _trimPageImageCache(nextPage);
                  setState(() {
                    _currentPage = nextPage;
                  });
                  if (nextPage < meta.pageCount) {
                    _loadPageBytes(nextPage + 1);
                  }
                  if (nextPage > 1) {
                    _loadPageBytes(nextPage - 1);
                  }
                },
                itemBuilder: (context, index) {
                  return _buildPageImage(context, index + 1);
                },
              );

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          Positioned.fill(
            child: SafeArea(
              child: Listener(
                behavior: HitTestBehavior.translucent,
                onPointerDown: _handlePointerDown,
                onPointerMove: _handlePointerMove,
                onPointerUp: _handlePointerUp,
                onPointerCancel: _handlePointerCancel,
                child: content,
              ),
            ),
          ),
          if (!_loading && _errorMessage == null) _buildSaveButton(context),
        ],
      ),
    );
  }

  Widget _buildSaveButton(BuildContext context) {
    final isSaved = _savedPage == _currentPage;
    return SafeArea(
      child: Align(
        alignment: Alignment.topRight,
        child: Padding(
          padding: const EdgeInsets.all(10),
          child: Material(
            color: isSaved
                ? AppPalette.flameGold
                : Colors.black.withValues(alpha: 0.44),
            shape: const CircleBorder(),
            child: InkWell(
              customBorder: const CircleBorder(),
              onTap: _toggleCurrentPageBookmark,
              child: SizedBox.square(
                dimension: 44,
                child: Icon(
                  isSaved ? Icons.bookmark_rounded : Icons.bookmark_add_rounded,
                  color: isSaved ? AppPalette.midnight : Colors.white,
                  size: 23,
                ),
              ),
            ),
          ),
        ),
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
