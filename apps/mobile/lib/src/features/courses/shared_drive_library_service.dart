import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../core/config/app_config.dart';

class SharedDriveCategory {
  const SharedDriveCategory({
    required this.id,
    required this.title,
    required this.url,
  });

  final String id;
  final String title;
  final String url;
}

class SharedDriveDocument {
  const SharedDriveDocument({
    required this.id,
    required this.title,
    required this.viewUrl,
    required this.previewUrl,
    required this.thumbnailUrl,
  });

  final String id;
  final String title;
  final String viewUrl;
  final String previewUrl;
  final String thumbnailUrl;
}

class SharedDriveLibraryService {
  SharedDriveLibraryService({
    http.Client? client,
  }) : _client = client ?? http.Client();

  final http.Client _client;

  Future<List<SharedDriveCategory>> fetchRootCategories() async {
    final folderId = AppConfig.sharedLibraryFolderId;
    if (folderId.isEmpty) {
      return const [];
    }

    final html = await _loadEmbeddedFolderHtml(folderId);
    final categoryPattern = RegExp(
      r'<a href="https://drive\.google\.com/drive/folders/([^"?]+)[^"]*" target="_blank">.*?<div class="flip-entry-title">(.*?)</div>',
      multiLine: true,
      dotAll: true,
    );

    final categories = <SharedDriveCategory>[];
    final seenIds = <String>{};

    for (final match in categoryPattern.allMatches(html)) {
      final id = _decodeHtml(match.group(1) ?? '').trim();
      final title = _decodeHtml(match.group(2) ?? '').trim();
      if (id.isEmpty || title.isEmpty || !seenIds.add(id)) {
        continue;
      }

      categories.add(
        SharedDriveCategory(
          id: id,
          title: title,
          url: 'https://drive.google.com/drive/folders/$id',
        ),
      );
    }

    return categories;
  }

  Future<List<SharedDriveDocument>> fetchDocumentsForCategory(
    String folderId,
  ) async {
    if (folderId.trim().isEmpty) {
      return const [];
    }

    final html = await _loadEmbeddedFolderHtml(folderId);
    final documentPattern = RegExp(
      r'<a href="https://drive\.google\.com/file/d/([^"/]+)/view[^"]*" target="_blank">.*?(?:<img src="([^"]+)" alt="PDF"/>)?.*?<div class="flip-entry-title">(.*?)</div>',
      multiLine: true,
      dotAll: true,
    );

    final documents = <SharedDriveDocument>[];
    final seenIds = <String>{};

    for (final match in documentPattern.allMatches(html)) {
      final id = _decodeHtml(match.group(1) ?? '').trim();
      final thumbnailUrl = _decodeHtml(match.group(2) ?? '').trim();
      final title = _decodeHtml(match.group(3) ?? '').trim();
      if (id.isEmpty || title.isEmpty || !seenIds.add(id)) {
        continue;
      }

      documents.add(
        SharedDriveDocument(
          id: id,
          title: title,
          viewUrl: 'https://drive.google.com/file/d/$id/view?usp=drive_web',
          previewUrl: 'https://drive.google.com/file/d/$id/preview',
          thumbnailUrl: thumbnailUrl,
        ),
      );
    }

    return documents;
  }

  Future<String> _loadEmbeddedFolderHtml(String folderId) async {
    final uri = Uri.parse(
      'https://drive.google.com/embeddedfolderview?id=$folderId#list',
    );
    final response = await _client.get(uri);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('No se pudo leer la biblioteca compartida.');
    }

    return utf8.decode(response.bodyBytes);
  }

  String _decodeHtml(String raw) {
    return raw
        .replaceAll('&amp;', '&')
        .replaceAll('&quot;', '"')
        .replaceAll('&#39;', "'")
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>');
  }
}
