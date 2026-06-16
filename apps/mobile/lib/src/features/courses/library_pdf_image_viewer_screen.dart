import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

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
  final TextEditingController _pageController = TextEditingController(text: '1');

  _LibraryPdfMetadata? _metadata;
  bool _loading = true;
  bool _refreshing = false;
  int _currentPage = 1;
  String? _errorMessage;

  String get _metaUrl =>
      '${AppConfig.apiBaseUrl}/api/content/library/pdfs/${widget.document.id}/meta';

  String _pageImageUrl(int pageNumber, {bool refresh = false}) {
    final base =
        '${AppConfig.apiBaseUrl}/api/content/library/pdfs/${widget.document.id}/pages/$pageNumber/image?width=1800';
    return refresh ? '$base&refresh=1' : base;
  }

  @override
  void initState() {
    super.initState();
    _loadMetadata();
  }

  @override
  void dispose() {
    _client.close();
    _pageController.dispose();
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

  Widget _buildTopControls(BuildContext context) {
    final meta = _metadata;
    if (meta == null) {
      return const SizedBox.shrink();
    }

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
                  setState(() {
                    _currentPage = page.clamp(1, meta.pageCount);
                    _pageController.text = '$_currentPage';
                  });
                }
              },
            ),
          ),
          FilledButton.icon(
            onPressed: () {
              final page = int.tryParse(_pageController.text.trim());
              if (page != null) {
                setState(() {
                  _currentPage = page.clamp(1, meta.pageCount);
                  _pageController.text = '$_currentPage';
                });
              }
            },
            icon: const Icon(Icons.search_rounded),
            label: Text(context.l10n.ts('Ir')),
          ),
          OutlinedButton.icon(
            onPressed: _currentPage > 1
                ? () {
                    setState(() {
                      _currentPage -= 1;
                      _pageController.text = '$_currentPage';
                    });
                  }
                : null,
            icon: const Icon(Icons.chevron_left_rounded),
            label: Text(context.l10n.ts('Anterior')),
          ),
          OutlinedButton.icon(
            onPressed: _currentPage < meta.pageCount
                ? () {
                    setState(() {
                      _currentPage += 1;
                      _pageController.text = '$_currentPage';
                    });
                  }
                : null,
            icon: const Icon(Icons.chevron_right_rounded),
            label: Text(context.l10n.ts('Siguiente')),
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

  Widget _buildPageImage(BuildContext context, int pageNumber) {
    return Card(
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: BorderSide(color: AppPalette.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: AppPalette.moonIvory,
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(20),
              ),
              border: Border(
                bottom: BorderSide(color: AppPalette.borderSoft),
              ),
            ),
            child: Text(
              'Página $pageNumber',
              style: Theme.of(context).textTheme.labelLarge?.copyWith(
                    color: AppPalette.butterflyInk,
                    fontWeight: FontWeight.w800,
                  ),
            ),
          ),
          Image.network(
            _pageImageUrl(pageNumber, refresh: _refreshing),
            fit: BoxFit.fitWidth,
            errorBuilder: (context, error, stackTrace) => Padding(
              padding: const EdgeInsets.all(24),
              child: Text(
                context.l10n.ts('No se pudo cargar esta página.'),
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppPalette.mutedLavender,
                    ),
              ),
            ),
            loadingBuilder: (context, child, loadingProgress) {
              if (loadingProgress == null) {
                return child;
              }

              return const Padding(
                padding: EdgeInsets.all(24),
                child: Center(child: CircularProgressIndicator()),
              );
            },
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final title = _metadata?.title ?? widget.title;
    final meta = _metadata;

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
          : meta == null
              ? _buildErrorPanel(context)
              : Column(
                  children: [
                    _buildTopControls(context),
                    Expanded(
                      child: ListView.builder(
                        itemCount: meta.pageCount,
                        itemBuilder: (context, index) => _buildPageImage(
                          context,
                          index + 1,
                        ),
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
