import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

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
  late final WebViewController _webViewController;

  bool _loading = true;
  int _progress = 0;
  String? _errorMessage;

  String get _readerUrl {
    final parsed = Uri.tryParse(widget.document.viewUrl);
    final base = parsed?.hasScheme == true
        ? parsed!
        : Uri.parse('${AppConfig.apiBaseUrl}${widget.document.viewUrl}');
    return base.replace(
      queryParameters: {
        ...base.queryParameters,
        'reader': '1',
      },
    ).toString();
  }

  @override
  void initState() {
    super.initState();
    _webViewController = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.white)
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (progress) {
            if (!mounted) {
              return;
            }
            setState(() {
              _progress = progress.clamp(0, 100);
            });
          },
          onPageStarted: (_) {
            if (!mounted) {
              return;
            }
            setState(() {
              _loading = true;
              _errorMessage = null;
            });
          },
          onPageFinished: (_) async {
            await _applyReaderLayout();
            if (!mounted) {
              return;
            }
            setState(() {
              _loading = false;
            });
          },
          onWebResourceError: (error) {
            if (error.isForMainFrame == false) {
              return;
            }
            if (!mounted) {
              return;
            }
            setState(() {
              _loading = false;
              _errorMessage = error.description;
            });
          },
        ),
      )
      ..loadRequest(Uri.parse(_readerUrl));
  }

  Future<void> _applyReaderLayout() async {
    try {
      await _webViewController.runJavaScript(r'''
        (function () {
          const existing = document.getElementById('lo-renaciente-reader-style');
          if (!existing) {
            const style = document.createElement('style');
            style.id = 'lo-renaciente-reader-style';
            style.textContent = `
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                height: 100% !important;
                overflow: hidden !important;
                background: #ffffff !important;
              }
              .toolbar, .meta, .pageHeader {
                display: none !important;
              }
              #viewer {
                position: fixed !important;
                inset: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                overflow: auto !important;
                padding: 0 0 18px !important;
                background: #ffffff !important;
                -webkit-overflow-scrolling: touch !important;
              }
              .page {
                width: 100vw !important;
                max-width: none !important;
                margin: 0 auto 8px !important;
                border: 0 !important;
                border-radius: 0 !important;
                box-shadow: none !important;
                background: #ffffff !important;
                overflow: visible !important;
              }
              .pageCanvas {
                display: block !important;
                width: 100% !important;
                height: auto !important;
                max-width: none !important;
                background: #ffffff !important;
              }
              .empty {
                padding-top: 42vh !important;
                color: #555 !important;
              }
            `;
            document.head.appendChild(style);
          }

          const fitPages = function () {
            document.querySelectorAll('.page').forEach(function (page) {
              page.style.width = '100vw';
              page.style.maxWidth = 'none';
              page.style.margin = '0 auto 8px';
              page.style.border = '0';
              page.style.borderRadius = '0';
              page.style.boxShadow = 'none';
            });
            document.querySelectorAll('canvas.pageCanvas').forEach(function (canvas) {
              canvas.style.width = '100%';
              canvas.style.height = 'auto';
              canvas.style.maxWidth = 'none';
            });
          };

          fitPages();
          window.clearInterval(window.__loRenacientePdfFitTimer);
          window.__loRenacientePdfFitTimer = window.setInterval(fitPages, 400);
        })();
      ''');
    } catch (_) {
      // The viewer can still work with the server defaults if injection fails.
    }
  }

  Widget _buildErrorPanel(BuildContext context) {
    final message = _errorMessage;
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
                FilledButton.icon(
                  onPressed: () => _webViewController.reload(),
                  icon: const Icon(Icons.refresh_rounded),
                  label: Text(context.l10n.ts('Reintentar')),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildBackButton(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(10),
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: Colors.black.withValues(alpha: 0.5),
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
    return Scaffold(
      backgroundColor: Colors.white,
      body: Stack(
        children: [
          Positioned.fill(
            child: SafeArea(
              bottom: false,
              child: _errorMessage == null
                  ? WebViewWidget(controller: _webViewController)
                  : _buildErrorPanel(context),
            ),
          ),
          if (_loading)
            Positioned(
              left: 0,
              right: 0,
              top: 0,
              child: SafeArea(
                bottom: false,
                child: LinearProgressIndicator(
                  value: _progress <= 0 || _progress >= 100
                      ? null
                      : _progress / 100,
                  minHeight: 2,
                  backgroundColor: Colors.transparent,
                  color: AppPalette.flameGold,
                ),
              ),
            ),
          _buildBackButton(context),
        ],
      ),
    );
  }
}
