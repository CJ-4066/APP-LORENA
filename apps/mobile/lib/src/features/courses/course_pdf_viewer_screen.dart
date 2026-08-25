import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_flutter/webview_flutter.dart';
// ignore: depend_on_referenced_packages
import 'package:webview_flutter_wkwebview/webview_flutter_wkwebview.dart';
import 'package:syncfusion_flutter_pdfviewer/pdfviewer.dart';

import '../../core/i18n/app_i18n.dart';
import '../../core/theme/app_palette.dart';
import '../../models/app_models.dart';
import 'course_resource_viewer_screen.dart';

Future<void> _openCourseResource(
  BuildContext context,
  String value, {
  required String title,
  String? format,
}) async {
  final trimmed = value.trim();
  final uri = Uri.tryParse(trimmed);
  if (uri == null) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('No se pudo abrir el recurso.')),
    );
    return;
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => CourseResourceViewerScreen(
          title: title,
          url: trimmed,
          format: format,
        ),
      ),
    );
    return;
  }

  final opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
  if (!opened && context.mounted) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('No se pudo abrir el recurso.')),
    );
  }
}

class CoursePdfViewerScreen extends StatefulWidget {
  const CoursePdfViewerScreen({
    super.key,
    required this.course,
  });

  final Course course;

  @override
  State<CoursePdfViewerScreen> createState() => _CoursePdfViewerScreenState();
}

class _CoursePdfViewerScreenState extends State<CoursePdfViewerScreen> {
  WebViewController? _webViewController;
  bool _isLoadingWeb = true;
  String? _firstResourceUrl;
  bool _isPdf = false;
  bool _isImage = false;
  bool _isVideo = false;

  @override
  void initState() {
    super.initState();
    final firstLesson = widget.course.modules.firstOrNull?.lessons.firstOrNull;
    final url = firstLesson?.resourceUrl?.trim();
    if (url != null &&
        (url.startsWith('http://') || url.startsWith('https://'))) {
      _firstResourceUrl = url;
      final lowercase = url.toLowerCase();
      final format = firstLesson?.format.trim().toLowerCase() ?? '';
      _isPdf = format == 'pdf' ||
          lowercase.endsWith('.pdf') ||
          lowercase.contains('/pdf');
      _isImage = format == 'image' ||
          format == 'imagen' ||
          RegExp(r'\.(png|jpe?g|webp|gif|svg)(\?|#|$)').hasMatch(lowercase);
      _isVideo = format == 'video' ||
          lowercase.endsWith('.mp4') ||
          lowercase.endsWith('.m4v') ||
          lowercase.endsWith('.mov') ||
          lowercase.contains('video');

      if (!_isPdf && !_isImage) {
        // Fallback timer: force hide loading spinner after 4 seconds
        Future.delayed(const Duration(seconds: 4), () {
          if (mounted && _isLoadingWeb) {
            setState(() {
              _isLoadingWeb = false;
            });
          }
        });

        late final PlatformWebViewControllerCreationParams params;
        if (WebViewPlatform.instance is WebKitWebViewPlatform) {
          params = WebKitWebViewControllerCreationParams(
            allowsInlineMediaPlayback: true,
          );
        } else {
          params = const PlatformWebViewControllerCreationParams();
        }

        _webViewController = WebViewController.fromPlatformCreationParams(params)
          ..setJavaScriptMode(JavaScriptMode.unrestricted)
          ..setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/605.1.15")
          ..setNavigationDelegate(
            NavigationDelegate(
              onProgress: (progress) {
                if (progress > 60) {
                  if (mounted && _isLoadingWeb) {
                    setState(() {
                      _isLoadingWeb = false;
                    });
                  }
                }
              },
              onPageFinished: (_) {
                if (mounted && _isLoadingWeb) {
                  setState(() {
                    _isLoadingWeb = false;
                  });
                }
              },
            ),
          );

        if (_isVideo) {
          final html = '''
            <!DOCTYPE html>
            <html>
            <head>
              <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
              <style>
                body, html {
                  margin: 0;
                  padding: 0;
                  background-color: black;
                  width: 100%;
                  height: 100%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  overflow: hidden;
                }
                video {
                  width: 100%;
                  height: 100%;
                  max-width: 100%;
                  max-height: 100%;
                  object-fit: contain;
                }
              </style>
            </head>
            <body>
              <video src="$url" controls autoplay playsinline></video>
            </body>
            </html>
          ''';
          _webViewController!.loadHtmlString(html);
        } else {
          var finalUrl = url;
          if (finalUrl.contains('canva.com/design/')) {
            if (!finalUrl.contains('view?embed')) {
              final parts = finalUrl.split('/');
              final designIndex = parts.indexOf('design');
              if (designIndex != -1 && parts.length > designIndex + 1) {
                final designId = parts[designIndex + 1];
                finalUrl = 'https://www.canva.com/design/$designId/view?embed';
              }
            }
          }
          _webViewController!.loadRequest(Uri.parse(finalUrl));
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final hasCover = widget.course.coverImageUrl?.trim().isNotEmpty ?? false;

    return Scaffold(
      backgroundColor: AppPalette.petalSoft,
      appBar: AppBar(
        backgroundColor: AppPalette.petalSoft,
        foregroundColor: AppPalette.butterflyInk,
        elevation: 0,
        title: Text(widget.course.title),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(18, 12, 18, 28),
        children: [
          _PdfPage(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (_isPdf && _firstResourceUrl != null) ...[
                  ClipRRect(
                    borderRadius: BorderRadius.circular(22),
                    child: Container(
                      height: 380,
                      width: double.infinity,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(22),
                        border: Border.all(color: AppPalette.border),
                      ),
                      child: SfPdfViewer.network(
                        _firstResourceUrl!,
                        canShowScrollHead: false,
                        canShowScrollStatus: false,
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                ] else if (_isImage && _firstResourceUrl != null) ...[
                  ClipRRect(
                    borderRadius: BorderRadius.circular(22),
                    child: Container(
                      height: 260,
                      width: double.infinity,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(22),
                        border: Border.all(color: AppPalette.border),
                      ),
                      child: Image.network(
                        _firstResourceUrl!,
                        fit: BoxFit.contain,
                        errorBuilder: (_, __, ___) => _CoverFallback(
                          course: widget.course,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                ] else if (_webViewController != null) ...[
                  ClipRRect(
                    borderRadius: BorderRadius.circular(22),
                    child: Container(
                      height: _isVideo ? 200 : 260,
                      width: double.infinity,
                      decoration: BoxDecoration(
                        color: _isVideo ? Colors.black : Colors.white,
                        borderRadius: BorderRadius.circular(22),
                        border: Border.all(color: AppPalette.border),
                      ),
                      child: Stack(
                        children: [
                          WebViewWidget(controller: _webViewController!),
                          if (_isLoadingWeb) ...[
                            if (hasCover)
                              Positioned.fill(
                                child: Image.network(
                                  widget.course.coverImageUrl!.trim(),
                                  fit: BoxFit.cover,
                                ),
                              )
                            else
                              Positioned.fill(
                                child: _CoverFallback(course: widget.course),
                              ),
                            const Center(
                              child: CircularProgressIndicator(
                                color: AppPalette.flameGold,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                ] else if (hasCover) ...[
                  ClipRRect(
                    borderRadius: BorderRadius.circular(22),
                    child: SizedBox(
                      height: 180,
                      width: double.infinity,
                      child: Image.network(
                        widget.course.coverImageUrl!.trim(),
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => _CoverFallback(
                          course: widget.course,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                ] else ...[
                  _CoverFallback(course: widget.course),
                  const SizedBox(height: 16),
                ],
                Text(
                  l10n.ts(widget.course.category),
                  style: const TextStyle(
                    color: AppPalette.royalViolet,
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.35,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  widget.course.title,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        color: AppPalette.midnight,
                        fontWeight: FontWeight.w900,
                      ),
                ),
                const SizedBox(height: 10),
                Text(
                  widget.course.subtitle,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: AppPalette.butterflyInk,
                        fontWeight: FontWeight.w700,
                      ),
                ),
                const SizedBox(height: 14),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _MetaPill(
                      label: l10n.ts(
                        '{count} lecciones',
                        {'count': '${widget.course.lessonCount}'},
                      ),
                    ),
                    _MetaPill(
                      label: l10n.ts(
                        '{hours} h',
                        {
                          'hours':
                              widget.course.estimatedHours.toStringAsFixed(1)
                        },
                      ),
                    ),
                    _MetaPill(label: l10n.ts(widget.course.level)),
                  ],
                ),
                const SizedBox(height: 18),
                Text(
                  widget.course.description,
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        color: AppPalette.butterflyInk,
                        height: 1.55,
                      ),
                ),
                if (widget.course.outcomes.isNotEmpty) ...[
                  const SizedBox(height: 18),
                  Text(
                    l10n.ts('Resultados clave'),
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          color: AppPalette.midnight,
                          fontWeight: FontWeight.w800,
                        ),
                  ),
                  const SizedBox(height: 10),
                  ...widget.course.outcomes.map(
                    (item) => Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Padding(
                            padding: EdgeInsets.only(top: 4),
                            child: Icon(
                              Icons.auto_awesome_rounded,
                              size: 16,
                              color: AppPalette.flameGold,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              l10n.ts(item),
                              style: Theme.of(context)
                                  .textTheme
                                  .bodyMedium
                                  ?.copyWith(
                                    color: AppPalette.butterflyInk,
                                    height: 1.5,
                                  ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
          ...widget.course.modules.asMap().entries.map(
                (entry) => Padding(
                  padding: const EdgeInsets.only(top: 14),
                  child: _PdfPage(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          l10n.ts(
                              'Módulo {index}', {'index': '${entry.key + 1}'}),
                          style: const TextStyle(
                            color: AppPalette.royalViolet,
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.35,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          entry.value.title,
                          style:
                              Theme.of(context).textTheme.titleLarge?.copyWith(
                                    color: AppPalette.midnight,
                                    fontWeight: FontWeight.w900,
                                  ),
                        ),
                        const SizedBox(height: 10),
                        Text(
                          entry.value.summary,
                          style:
                              Theme.of(context).textTheme.bodyMedium?.copyWith(
                                    color: AppPalette.butterflyInk,
                                    height: 1.5,
                                  ),
                        ),
                        const SizedBox(height: 16),
                        ...entry.value.lessons.asMap().entries.map(
                              (lessonEntry) => Padding(
                                padding: const EdgeInsets.only(bottom: 12),
                                child: Container(
                                  padding: const EdgeInsets.all(14),
                                  decoration: BoxDecoration(
                                    color: AppPalette.petalSoft,
                                    borderRadius: BorderRadius.circular(18),
                                    border: Border.all(
                                        color: AppPalette.borderSoft),
                                  ),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        l10n.ts(
                                          'Lección {index}',
                                          {'index': '${lessonEntry.key + 1}'},
                                        ),
                                        style: const TextStyle(
                                          color: AppPalette.flameGold,
                                          fontSize: 11,
                                          fontWeight: FontWeight.w800,
                                          letterSpacing: 0.28,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        lessonEntry.value.title,
                                        style: Theme.of(context)
                                            .textTheme
                                            .titleMedium
                                            ?.copyWith(
                                              color: AppPalette.midnight,
                                              fontWeight: FontWeight.w800,
                                            ),
                                      ),
                                      const SizedBox(height: 6),
                                      Text(
                                        '${l10n.ts(lessonEntry.value.format)} · ${lessonEntry.value.durationMinutes} min',
                                        style: Theme.of(context)
                                            .textTheme
                                            .bodySmall
                                            ?.copyWith(
                                              color: AppPalette.mutedLavender,
                                              fontWeight: FontWeight.w700,
                                            ),
                                      ),
                                      const SizedBox(height: 8),
                                      Text(
                                        lessonEntry.value.prompt,
                                        style: Theme.of(context)
                                            .textTheme
                                            .bodyMedium
                                            ?.copyWith(
                                              color: AppPalette.butterflyInk,
                                              height: 1.45,
                                            ),
                                      ),
                                      if (lessonEntry.value.resourceUrl
                                              ?.trim()
                                              .isNotEmpty ??
                                          false) ...[
                                        const SizedBox(height: 12),
                                        Align(
                                          alignment: Alignment.centerLeft,
                                          child: FilledButton.icon(
                                            onPressed: () =>
                                                _openCourseResource(
                                              context,
                                              lessonEntry.value.resourceUrl!,
                                              title: lessonEntry.value.title,
                                              format: lessonEntry.value.format,
                                            ),
                                            icon: const Icon(
                                              Icons.open_in_new_rounded,
                                              size: 18,
                                            ),
                                            label: Text(
                                              l10n.ts('Abrir recurso'),
                                            ),
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                ),
                              ),
                            ),
                      ],
                    ),
                  ),
                ),
              ),
        ],
      ),
    );
  }
}

class _CoverFallback extends StatelessWidget {
  const _CoverFallback({
    required this.course,
  });

  final Course course;

  @override
  Widget build(BuildContext context) {
    final palette = course.featured
        ? const [AppPalette.midnight, AppPalette.indigo, AppPalette.orchid]
        : const [
            AppPalette.indigo,
            AppPalette.royalViolet,
            AppPalette.flameGold
          ];

    return Container(
      height: 180,
      width: double.infinity,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(22),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: palette,
        ),
      ),
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Align(
            alignment: Alignment.topRight,
            child: Icon(
              Icons.auto_stories_rounded,
              color: Colors.white,
              size: 30,
            ),
          ),
          const Spacer(),
          Text(
            course.title,
            maxLines: 3,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.w900,
                  height: 1.15,
                ),
          ),
        ],
      ),
    );
  }
}

class _PdfPage extends StatelessWidget {
  const _PdfPage({
    required this.child,
  });

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: AppPalette.border),
        boxShadow: [
          BoxShadow(
            color: AppPalette.indigo.withValues(alpha: 0.08),
            blurRadius: 22,
            offset: const Offset(0, 14),
          ),
        ],
      ),
      child: child,
    );
  }
}

class _MetaPill extends StatelessWidget {
  const _MetaPill({
    required this.label,
  });

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: AppPalette.candleGlow,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: const TextStyle(
          color: AppPalette.midnight,
          fontSize: 12,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
