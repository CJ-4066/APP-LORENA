import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:syncfusion_flutter_pdfviewer/pdfviewer.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../../core/theme/app_palette.dart';

enum _CourseResourceKind { pdf, image, video, link }

class CourseResourceViewerScreen extends StatefulWidget {
  const CourseResourceViewerScreen({
    super.key,
    required this.title,
    required this.url,
    this.format,
  });

  final String title;
  final String url;
  final String? format;

  @override
  State<CourseResourceViewerScreen> createState() =>
      _CourseResourceViewerScreenState();
}

class _CourseResourceViewerScreenState
    extends State<CourseResourceViewerScreen> {
  late final String _resourceUrl = widget.url.trim();
  late final _CourseResourceKind _kind = _inferResourceKind(
    _resourceUrl,
    widget.format,
  );

  http.Client? _httpClient;
  Future<Uint8List>? _pdfBytesFuture;
  WebViewController? _webViewController;
  int _webProgress = 0;

  @override
  void initState() {
    super.initState();

    if (_kind == _CourseResourceKind.pdf) {
      _httpClient = http.Client();
      _pdfBytesFuture = _loadPdfBytes();
      return;
    }

    if (_kind == _CourseResourceKind.video ||
        _kind == _CourseResourceKind.link) {
      _webViewController = WebViewController()
        ..setJavaScriptMode(JavaScriptMode.unrestricted)
        ..setNavigationDelegate(
          NavigationDelegate(
            onProgress: (progress) {
              if (!mounted) {
                return;
              }
              setState(() {
                _webProgress = progress.clamp(0, 100);
              });
            },
          ),
        );

      if (_kind == _CourseResourceKind.video) {
        _webViewController!.loadHtmlString(_videoHtml(_resourceUrl));
      } else {
        _webViewController!.loadRequest(Uri.parse(_resourceUrl));
      }
    }
  }

  @override
  void dispose() {
    _httpClient?.close();
    super.dispose();
  }

  Future<Uint8List> _loadPdfBytes() async {
    final uri = Uri.parse(_resourceUrl);
    final response = await _httpClient!.get(uri, headers: const {
      'accept': 'application/pdf,*/*'
    }).timeout(const Duration(seconds: 30));

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('El servidor devolvió ${response.statusCode}.');
    }

    final bytes = response.bodyBytes;
    final contentType = response.headers['content-type']?.toLowerCase() ?? '';
    final path = uri.path.toLowerCase();
    final hasPdfHeader = bytes.length >= 4 &&
        bytes[0] == 0x25 &&
        bytes[1] == 0x50 &&
        bytes[2] == 0x44 &&
        bytes[3] == 0x46;
    if (!hasPdfHeader &&
        !contentType.contains('pdf') &&
        !path.endsWith('.pdf')) {
      throw Exception('El archivo recibido no parece ser un PDF.');
    }

    return bytes;
  }

  Future<void> _openExternally() async {
    final uri = Uri.tryParse(_resourceUrl);
    if (uri == null) {
      return;
    }

    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppPalette.petalSoft,
      appBar: AppBar(
        backgroundColor: AppPalette.petalSoft,
        foregroundColor: AppPalette.butterflyInk,
        elevation: 0,
        title: Text(widget.title),
        actions: [
          IconButton(
            tooltip: 'Abrir fuera',
            onPressed: _openExternally,
            icon: const Icon(Icons.open_in_new_rounded),
          ),
        ],
        bottom: _webViewController == null
            ? null
            : PreferredSize(
                preferredSize: const Size.fromHeight(2),
                child: AnimatedOpacity(
                  opacity: _webProgress >= 100 ? 0 : 1,
                  duration: const Duration(milliseconds: 150),
                  child: LinearProgressIndicator(
                    value: _webProgress / 100,
                    minHeight: 2,
                    backgroundColor: AppPalette.borderSoft,
                    color: AppPalette.flameGold,
                  ),
                ),
              ),
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    switch (_kind) {
      case _CourseResourceKind.pdf:
        return FutureBuilder<Uint8List>(
          future: _pdfBytesFuture,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError || !snapshot.hasData) {
              return _ResourceError(
                message: 'No pudimos cargar este PDF.',
                onOpenExternally: _openExternally,
              );
            }

            return ColoredBox(
              color: Colors.white,
              child: SfPdfViewer.memory(
                snapshot.data!,
                canShowScrollHead: false,
                canShowScrollStatus: false,
                pageLayoutMode: PdfPageLayoutMode.continuous,
              ),
            );
          },
        );
      case _CourseResourceKind.image:
        return Center(
          child: InteractiveViewer(
            minScale: 0.8,
            maxScale: 5,
            child: Image.network(
              _resourceUrl,
              fit: BoxFit.contain,
              loadingBuilder: (context, child, loadingProgress) {
                if (loadingProgress == null) {
                  return child;
                }
                return const Center(child: CircularProgressIndicator());
              },
              errorBuilder: (_, __, ___) => _ResourceError(
                message: 'No pudimos cargar esta imagen.',
                onOpenExternally: _openExternally,
              ),
            ),
          ),
        );
      case _CourseResourceKind.video:
      case _CourseResourceKind.link:
        final controller = _webViewController;
        if (controller == null) {
          return _ResourceError(
            message: 'No se pudo preparar este recurso.',
            onOpenExternally: _openExternally,
          );
        }
        return WebViewWidget(controller: controller);
    }
  }
}

class _ResourceError extends StatelessWidget {
  const _ResourceError({
    required this.message,
    required this.onOpenExternally,
  });

  final String message;
  final VoidCallback onOpenExternally;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.insert_drive_file_rounded,
              color: AppPalette.royalViolet,
              size: 48,
            ),
            const SizedBox(height: 14),
            Text(
              message,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: AppPalette.midnight,
                    fontWeight: FontWeight.w800,
                  ),
            ),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: onOpenExternally,
              icon: const Icon(Icons.open_in_new_rounded),
              label: const Text('Abrir fuera'),
            ),
          ],
        ),
      ),
    );
  }
}

_CourseResourceKind _inferResourceKind(String url, String? format) {
  final normalizedFormat = format?.trim().toLowerCase() ?? '';
  final parsed = Uri.tryParse(url);
  final path = (parsed?.path ?? url).toLowerCase();

  if (normalizedFormat == 'pdf' || path.endsWith('.pdf')) {
    return _CourseResourceKind.pdf;
  }
  if (normalizedFormat == 'image' ||
      normalizedFormat == 'imagen' ||
      RegExp(r'\.(png|jpe?g|webp|gif|svg)$').hasMatch(path)) {
    return _CourseResourceKind.image;
  }
  if (normalizedFormat == 'video' ||
      RegExp(r'\.(mp4|m4v|mov|webm)$').hasMatch(path)) {
    return _CourseResourceKind.video;
  }

  return _CourseResourceKind.link;
}

String _videoHtml(String url) {
  final escapedUrl = const HtmlEscape().convert(url);
  return '''
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
  <video src="$escapedUrl" controls playsinline></video>
</body>
</html>
''';
}
