import 'dart:typed_data';

import 'package:http/http.dart' as http;

import '../../core/config/app_config.dart';
import 'shared_drive_library_service.dart';

class LibraryPdfThumbnailService {
  LibraryPdfThumbnailService({
    http.Client? client,
  }) : _client = client ?? http.Client();

  final http.Client _client;
  static final Map<String, Future<Uint8List?>> _cache = {};

  static void clearCache() {
    _cache.clear();
  }

  Future<Uint8List?> loadFirstPageImage(SharedDriveDocument document) {
    return _cache.putIfAbsent(document.id, () => _loadFirstPageImage(document));
  }

  void dispose() {
    _client.close();
  }

  Future<Uint8List?> _loadFirstPageImage(SharedDriveDocument document) async {
    try {
      final url =
          '${AppConfig.apiBaseUrl}/api/content/library/pdfs/${document.id}/pages/1/image?width=900';
      final response = await _client.get(Uri.parse(url));
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
  }
}
