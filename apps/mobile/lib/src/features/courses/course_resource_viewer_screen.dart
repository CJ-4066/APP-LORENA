import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:syncfusion_flutter_pdfviewer/pdfviewer.dart';
import 'package:video_player/video_player.dart';
import 'package:webview_flutter/webview_flutter.dart';
// ignore: depend_on_referenced_packages
import 'package:webview_flutter_wkwebview/webview_flutter_wkwebview.dart';

import '../../core/config/app_config.dart';
import '../../core/theme/app_palette.dart';
import '../../models/app_models.dart';
import 'media_url_resolver.dart';

class CourseResourceViewerScreen extends StatefulWidget {
  const CourseResourceViewerScreen({
    super.key,
    required this.title,
    required this.url,
    required this.mediaType,
  });

  final String title;
  final String url;
  final CourseMediaType mediaType;

  @override
  State<CourseResourceViewerScreen> createState() =>
      _CourseResourceViewerScreenState();
}

class _CourseResourceViewerScreenState
    extends State<CourseResourceViewerScreen> {
  late final String _resolvedUrl;
  late final CourseMediaType _type;

  http.Client? _httpClient;
  Future<Uint8List>? _pdfBytesFuture;
  WebViewController? _webViewController;
  VideoPlayerController? _videoController;
  Future<void>? _videoInitialization;
  int _webProgress = 0;
  bool _webError = false;

  @override
  void initState() {
    super.initState();
    _resolvedUrl = MediaUrlResolver.resolve(
      widget.url,
      baseUrl: AppConfig.apiBaseUrl,
    );
    _type = MediaUrlResolver.inferType(widget.mediaType, _resolvedUrl);

    if (_type == CourseMediaType.pdf) {
      _httpClient = http.Client();
      _pdfBytesFuture = _loadPdfBytes();
      return;
    }

    if (_type == CourseMediaType.video) {
      _videoInitialization = _prepareVideo();
      return;
    }

    if (_type == CourseMediaType.canva ||
        _type == CourseMediaType.externalLink ||
        _type == CourseMediaType.document ||
        _type == CourseMediaType.unknown) {
      late final PlatformWebViewControllerCreationParams params;
      if (WebViewPlatform.instance is WebKitWebViewPlatform) {
        params = WebKitWebViewControllerCreationParams(
          allowsInlineMediaPlayback: true,
          mediaTypesRequiringUserAction: const <PlaybackMediaTypes>{},
        );
      } else {
        params = const PlatformWebViewControllerCreationParams();
      }

      _webViewController = WebViewController.fromPlatformCreationParams(params)
        ..setJavaScriptMode(JavaScriptMode.unrestricted)
        ..setUserAgent(
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/605.1.15")
        ..setNavigationDelegate(
          NavigationDelegate(
            onProgress: (progress) {
              if (!mounted) return;
              setState(() {
                _webProgress = progress.clamp(0, 100);
              });
            },
            onWebResourceError: (error) {
              if (mounted) {
                setState(() => _webError = true);
              }
            },
          ),
        );

      final loadFuture = _webViewController!.loadRequest(
        Uri.parse(
          _type == CourseMediaType.canva
              ? (CanvaUrlResolver.resolveEmbedUrl(_resolvedUrl) ?? _resolvedUrl)
              : _resolvedUrl,
        ),
      );

      loadFuture.timeout(const Duration(seconds: 30), onTimeout: () {
        if (mounted) setState(() => _webError = true);
      });
    }
  }

  @override
  void dispose() {
    _httpClient?.close();
    _videoController?.dispose();
    super.dispose();
  }

  Future<void> _initializeVideo() async {
    final uri = Uri.parse(_resolvedUrl);
    debugPrint('Course video streaming start: $uri');
    final networkController = VideoPlayerController.networkUrl(
      uri,
      httpHeaders: const {
        'accept': 'video/mp4,video/*;q=0.9,*/*;q=0.8',
      },
    );
    _videoController = networkController;

    try {
      await networkController.initialize().timeout(const Duration(seconds: 30));
      debugPrint(
        'Course video streaming ready: '
        '${networkController.value.duration.inMilliseconds}ms',
      );
      await networkController.play();
      return;
    } catch (error, stackTrace) {
      debugPrint('Course video streaming failed: $error\n$stackTrace');
      await networkController.dispose();
      _videoController = null;
    }

    await _initializeCachedVideo();
  }

  Future<void> _prepareVideo() {
    return _initializeVideo().timeout(
      const Duration(minutes: 2),
      onTimeout: () {
        throw TimeoutException(
            'La preparación completa del video excedió 2 minutos.');
      },
    );
  }

  Future<void> _initializeCachedVideo() async {
    final uri = Uri.parse(_resolvedUrl);
    debugPrint('Course video cache fallback start: $uri');
    final cacheDirectory = await getTemporaryDirectory();
    final sourceName =
        uri.pathSegments.isEmpty ? 'course-video.mp4' : uri.pathSegments.last;
    final safeName = sourceName.replaceAll(RegExp(r'[^a-zA-Z0-9._-]'), '_');
    final videoFile = File('${cacheDirectory.path}/course-$safeName');

    try {
      if (!await videoFile.exists() || await videoFile.length() < 1024) {
        if (await videoFile.exists()) {
          await videoFile.delete();
        }
        final partialFile = File('${videoFile.path}.part');
        if (await partialFile.exists()) {
          await partialFile.delete();
        }
        final client = http.Client();
        try {
          final request = http.Request('GET', uri)
            ..headers['accept'] = 'video/mp4,video/*;q=0.9,*/*;q=0.8';
          final response =
              await client.send(request).timeout(const Duration(seconds: 30));
          if (response.statusCode < 200 || response.statusCode >= 300) {
            throw HttpException(
              'El servidor devolvió ${response.statusCode}.',
              uri: uri,
            );
          }
          final sink = partialFile.openWrite();
          await response.stream.timeout(const Duration(seconds: 60)).pipe(sink);
          final expectedLength = response.contentLength;
          final downloadedLength = await partialFile.length();
          if (expectedLength != null && downloadedLength != expectedLength) {
            throw const FormatException(
              'La descarga del video quedó incompleta.',
            );
          }
          await partialFile.rename(videoFile.path);
        } finally {
          client.close();
        }
      }

      if (await videoFile.length() < 1024) {
        throw const FormatException('El video descargado está vacío.');
      }

      final controller = VideoPlayerController.file(videoFile);
      _videoController = controller;
      await controller.initialize().timeout(const Duration(seconds: 20));
      debugPrint(
        'Course video cache fallback ready: '
        '${controller.value.duration.inMilliseconds}ms',
      );
      await controller.play();
    } catch (error, stackTrace) {
      debugPrint('Course video failed: $error\n$stackTrace');
      await _videoController?.dispose();
      _videoController = null;
      if (await videoFile.exists()) {
        await videoFile.delete();
      }
      rethrow;
    }
  }

  void _retryVideo() {
    setState(() {
      _videoInitialization = _prepareVideo();
    });
  }

  String _videoErrorMessage(Object? error) {
    if (error is TimeoutException) {
      return 'La descarga o preparación excedió el tiempo permitido.';
    }
    if (error is HttpException || error is FormatException) {
      return error.toString().replaceFirst(RegExp(r'^[^:]+:\s*'), '');
    }
    final details = error?.toString().trim() ?? '';
    return details.isEmpty
        ? 'iOS no pudo preparar este video.'
        : 'iOS no pudo preparar el video: $details';
  }

  Future<Uint8List> _loadPdfBytes() async {
    final uri = Uri.parse(_resolvedUrl);
    final response = await _httpClient!.get(uri, headers: const {
      'accept': 'application/pdf,*/*'
    }).timeout(const Duration(seconds: 30));

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('El servidor devolvió ${response.statusCode}.');
    }

    final bytes = response.bodyBytes;
    final hasPdfHeader = bytes.length >= 4 &&
        bytes[0] == 0x25 &&
        bytes[1] == 0x50 &&
        bytes[2] == 0x44 &&
        bytes[3] == 0x46;
    if (!hasPdfHeader) {
      throw Exception('El archivo recibido no parece ser un PDF.');
    }

    return bytes;
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
        bottom: _webViewController == null || _webProgress >= 100
            ? null
            : PreferredSize(
                preferredSize: const Size.fromHeight(2),
                child: LinearProgressIndicator(
                  value: _webProgress / 100,
                  minHeight: 2,
                  backgroundColor: AppPalette.borderSoft,
                  color: AppPalette.flameGold,
                ),
              ),
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    switch (_type) {
      case CourseMediaType.pdf:
        return FutureBuilder<Uint8List>(
          future: _pdfBytesFuture,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError || !snapshot.hasData) {
              return const _ResourceError(
                message: 'No pudimos cargar este PDF.',
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
      case CourseMediaType.image:
        return Center(
          child: InteractiveViewer(
            minScale: 0.8,
            maxScale: 5,
            child: Image.network(
              _resolvedUrl,
              fit: BoxFit.contain,
              loadingBuilder: (context, child, loadingProgress) {
                if (loadingProgress == null) return child;
                return const Center(child: CircularProgressIndicator());
              },
              errorBuilder: (_, __, ___) => const _ResourceError(
                message: 'No pudimos cargar esta imagen.',
              ),
            ),
          ),
        );
      case CourseMediaType.video:
        return FutureBuilder<void>(
          future: _videoInitialization,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const _VideoLoadingState();
            }
            if (!snapshot.hasError &&
                (_videoController?.value.isInitialized ?? false)) {
              return _InlineVideoPlayer(controller: _videoController!);
            }
            return _ResourceError(
              message: _videoErrorMessage(snapshot.error),
              onRetry: _retryVideo,
            );
          },
        );
      case CourseMediaType.canva:
      case CourseMediaType.externalLink:
      case CourseMediaType.document:
      case CourseMediaType.unknown:
        if (_webError) {
          return const _ResourceError(
            message: 'No pudimos cargar este contenido.',
          );
        }
        final controller = _webViewController;
        if (controller == null) {
          return const _ResourceError(
            message: 'No se pudo preparar este recurso.',
          );
        }
        return WebViewWidget(controller: controller);
    }
  }
}

class _VideoLoadingState extends StatelessWidget {
  const _VideoLoadingState();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          CircularProgressIndicator(color: AppPalette.flameGold),
          SizedBox(height: 14),
          Text('Preparando video...'),
        ],
      ),
    );
  }
}

class _InlineVideoPlayer extends StatefulWidget {
  const _InlineVideoPlayer({
    required this.controller,
    this.isFullscreen = false,
  });

  final VideoPlayerController controller;
  final bool isFullscreen;

  @override
  State<_InlineVideoPlayer> createState() => _InlineVideoPlayerState();
}

class _InlineVideoPlayerState extends State<_InlineVideoPlayer> {
  Timer? _controlsTimer;
  bool _controlsVisible = true;

  VideoPlayerController get _controller => widget.controller;

  @override
  void initState() {
    super.initState();
    _controller.addListener(_handleVideoChange);
    _showControls();
  }

  @override
  void didUpdateWidget(covariant _InlineVideoPlayer oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.controller == widget.controller) return;
    oldWidget.controller.removeListener(_handleVideoChange);
    _controller.addListener(_handleVideoChange);
  }

  @override
  void dispose() {
    _controlsTimer?.cancel();
    _controller.removeListener(_handleVideoChange);
    super.dispose();
  }

  void _handleVideoChange() {
    if (!mounted) return;
    final value = _controller.value;
    if (value.hasError || value.isBuffering || !value.isPlaying) {
      _showControls(autoHide: false);
    }
  }

  void _showControls({bool autoHide = true}) {
    _controlsTimer?.cancel();
    if (!_controlsVisible && mounted) {
      setState(() => _controlsVisible = true);
    }
    if (autoHide && _controller.value.isPlaying) {
      _controlsTimer = Timer(const Duration(seconds: 3), () {
        if (mounted && _controller.value.isPlaying) {
          setState(() => _controlsVisible = false);
        }
      });
    }
  }

  void _toggleControls() {
    if (_controlsVisible) {
      _controlsTimer?.cancel();
      setState(() => _controlsVisible = false);
    } else {
      _showControls();
    }
  }

  Future<void> _togglePlayback() async {
    if (_controller.value.isPlaying) {
      await _controller.pause();
      _showControls(autoHide: false);
    } else {
      final value = _controller.value;
      if (value.duration > Duration.zero &&
          value.position >=
              value.duration - const Duration(milliseconds: 300)) {
        await _controller.seekTo(Duration.zero);
      }
      await _controller.play();
      _showControls();
    }
  }

  Future<void> _seekBy(Duration offset) async {
    final value = _controller.value;
    final target = value.position + offset;
    final bounded = target < Duration.zero
        ? Duration.zero
        : target > value.duration
            ? value.duration
            : target;
    await _controller.seekTo(bounded);
    _showControls();
  }

  Future<void> _toggleFullscreen() async {
    if (widget.isFullscreen) {
      Navigator.of(context).pop();
      return;
    }
    _controlsTimer?.cancel();
    await Navigator.of(context).push<void>(
      MaterialPageRoute<void>(
        builder: (_) => _FullscreenVideoPage(controller: _controller),
      ),
    );
    if (mounted) _showControls();
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<VideoPlayerValue>(
      valueListenable: _controller,
      builder: (context, value, _) {
        return ColoredBox(
          color: Colors.black,
          child: Stack(
            fit: StackFit.expand,
            children: [
              Center(
                child: AspectRatio(
                  aspectRatio:
                      value.aspectRatio > 0 ? value.aspectRatio : 16 / 9,
                  child: VideoPlayer(_controller),
                ),
              ),
              GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: _toggleControls,
              ),
              if (value.isBuffering)
                const Center(
                  child: CircularProgressIndicator(
                    color: AppPalette.flameGold,
                  ),
                ),
              AnimatedOpacity(
                opacity: _controlsVisible ? 1 : 0,
                duration: const Duration(milliseconds: 180),
                child: IgnorePointer(
                  ignoring: !_controlsVisible,
                  child: _VideoControls(
                    controller: _controller,
                    value: value,
                    isFullscreen: widget.isFullscreen,
                    onPlayPause: _togglePlayback,
                    onSeekBack: () => _seekBy(const Duration(seconds: -10)),
                    onSeekForward: () => _seekBy(const Duration(seconds: 10)),
                    onFullscreen: _toggleFullscreen,
                    onInteraction: _showControls,
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _VideoControls extends StatelessWidget {
  const _VideoControls({
    required this.controller,
    required this.value,
    required this.isFullscreen,
    required this.onPlayPause,
    required this.onSeekBack,
    required this.onSeekForward,
    required this.onFullscreen,
    required this.onInteraction,
  });

  final VideoPlayerController controller;
  final VideoPlayerValue value;
  final bool isFullscreen;
  final VoidCallback onPlayPause;
  final VoidCallback onSeekBack;
  final VoidCallback onSeekForward;
  final VoidCallback onFullscreen;
  final VoidCallback onInteraction;

  @override
  Widget build(BuildContext context) {
    final durationMs = value.duration.inMilliseconds;
    final positionMs = value.position.inMilliseconds.clamp(0, durationMs);

    return ColoredBox(
      color: Colors.black38,
      child: SafeArea(
        top: false,
        child: Stack(
          children: [
            Center(
              child: IconButton.filled(
                tooltip: value.isPlaying ? 'Pausar' : 'Reproducir',
                style: IconButton.styleFrom(
                  backgroundColor: Colors.black54,
                  foregroundColor: Colors.white,
                  minimumSize: const Size.square(64),
                ),
                onPressed: onPlayPause,
                icon: Icon(
                  value.isPlaying
                      ? Icons.pause_rounded
                      : Icons.play_arrow_rounded,
                  size: 38,
                ),
              ),
            ),
            Positioned(
              left: 8,
              right: 8,
              bottom: 6,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  SliderTheme(
                    data: SliderTheme.of(context).copyWith(
                      activeTrackColor: AppPalette.flameGold,
                      inactiveTrackColor: Colors.white30,
                      secondaryActiveTrackColor: AppPalette.mutedLavender,
                      thumbColor: AppPalette.flameGold,
                      overlayColor: AppPalette.flameGold.withValues(alpha: 0.2),
                      trackHeight: 3,
                    ),
                    child: Slider(
                      min: 0,
                      max: durationMs <= 0 ? 1 : durationMs.toDouble(),
                      value: durationMs <= 0 ? 0 : positionMs.toDouble(),
                      secondaryTrackValue: durationMs <= 0
                          ? 0
                          : _bufferedMilliseconds(value).toDouble(),
                      onChangeStart: (_) => onInteraction(),
                      onChanged: durationMs <= 0
                          ? null
                          : (milliseconds) {
                              controller.seekTo(
                                Duration(milliseconds: milliseconds.round()),
                              );
                            },
                      onChangeEnd: (_) => onInteraction(),
                    ),
                  ),
                  Row(
                    children: [
                      _VideoControlButton(
                        tooltip: 'Retroceder 10 segundos',
                        icon: Icons.replay_10_rounded,
                        onPressed: onSeekBack,
                      ),
                      _VideoControlButton(
                        tooltip: value.isPlaying ? 'Pausar' : 'Reproducir',
                        icon: value.isPlaying
                            ? Icons.pause_rounded
                            : Icons.play_arrow_rounded,
                        onPressed: onPlayPause,
                      ),
                      _VideoControlButton(
                        tooltip: 'Adelantar 10 segundos',
                        icon: Icons.forward_10_rounded,
                        onPressed: onSeekForward,
                      ),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          '${_formatVideoTime(value.position)} / '
                          '${_formatVideoTime(value.duration)}',
                          maxLines: 1,
                          overflow: TextOverflow.fade,
                          softWrap: false,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      PopupMenuButton<double>(
                        tooltip: 'Velocidad de reproducción',
                        initialValue: value.playbackSpeed,
                        color: AppPalette.midnight,
                        onOpened: onInteraction,
                        onSelected: (speed) {
                          controller.setPlaybackSpeed(speed);
                          onInteraction();
                        },
                        itemBuilder: (_) => const [
                          PopupMenuItem(
                            value: 0.75,
                            child: Text('0.75x', style: _speedTextStyle),
                          ),
                          PopupMenuItem(
                            value: 1.0,
                            child: Text('1x', style: _speedTextStyle),
                          ),
                          PopupMenuItem(
                            value: 1.25,
                            child: Text('1.25x', style: _speedTextStyle),
                          ),
                          PopupMenuItem(
                            value: 1.5,
                            child: Text('1.5x', style: _speedTextStyle),
                          ),
                          PopupMenuItem(
                            value: 2.0,
                            child: Text('2x', style: _speedTextStyle),
                          ),
                        ],
                        child: Padding(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 10,
                          ),
                          child: Text(
                            '${value.playbackSpeed.toStringAsFixed(value.playbackSpeed == 1 ? 0 : 2)}x',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ),
                      _VideoControlButton(
                        tooltip: isFullscreen
                            ? 'Salir de pantalla completa'
                            : 'Pantalla completa',
                        icon: isFullscreen
                            ? Icons.fullscreen_exit_rounded
                            : Icons.fullscreen_rounded,
                        onPressed: onFullscreen,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

const _speedTextStyle = TextStyle(
  color: Colors.white,
  fontWeight: FontWeight.w600,
);

class _VideoControlButton extends StatelessWidget {
  const _VideoControlButton({
    required this.tooltip,
    required this.icon,
    required this.onPressed,
  });

  final String tooltip;
  final IconData icon;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return IconButton(
      tooltip: tooltip,
      constraints: const BoxConstraints.tightFor(width: 40, height: 40),
      padding: EdgeInsets.zero,
      color: Colors.white,
      onPressed: onPressed,
      icon: Icon(icon, size: 23),
    );
  }
}

class _FullscreenVideoPage extends StatefulWidget {
  const _FullscreenVideoPage({required this.controller});

  final VideoPlayerController controller;

  @override
  State<_FullscreenVideoPage> createState() => _FullscreenVideoPageState();
}

class _FullscreenVideoPageState extends State<_FullscreenVideoPage> {
  @override
  void initState() {
    super.initState();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
  }

  @override
  void dispose() {
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      child: Scaffold(
        backgroundColor: Colors.black,
        body: _InlineVideoPlayer(
          controller: widget.controller,
          isFullscreen: true,
        ),
      ),
    );
  }
}

int _bufferedMilliseconds(VideoPlayerValue value) {
  if (value.buffered.isEmpty) return 0;
  return value.buffered.last.end.inMilliseconds.clamp(
    0,
    value.duration.inMilliseconds,
  );
}

String _formatVideoTime(Duration duration) {
  final totalSeconds = duration.inSeconds;
  final hours = totalSeconds ~/ 3600;
  final minutes = (totalSeconds % 3600) ~/ 60;
  final seconds = totalSeconds % 60;
  final minuteText =
      hours > 0 ? minutes.toString().padLeft(2, '0') : minutes.toString();
  final secondText = seconds.toString().padLeft(2, '0');
  return hours > 0
      ? '$hours:$minuteText:$secondText'
      : '$minuteText:$secondText';
}

class _ResourceError extends StatelessWidget {
  const _ResourceError({required this.message, this.onRetry});

  final String message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.insert_drive_file_rounded,
                color: AppPalette.royalViolet, size: 48),
            const SizedBox(height: 14),
            Text(
              message,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: AppPalette.midnight,
                    fontWeight: FontWeight.w800,
                  ),
            ),
            if (onRetry != null) ...[
              const SizedBox(height: 16),
              FilledButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('Reintentar'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
