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
    required this.downloadUrl,
    required this.thumbnailUrl,
  });

  final String id;
  final String title;
  final String viewUrl;
  final String previewUrl;
  final String downloadUrl;
  final String thumbnailUrl;
}

class SharedDriveLibraryService {
  SharedDriveLibraryService({
    http.Client? client,
  }) : _client = client ?? http.Client();

  final http.Client _client;
  List<_LibraryPdfItem>? _cachedItems;

  void invalidateCache() {
    _cachedItems = null;
  }

  Future<List<SharedDriveCategory>> fetchRootCategories() async {
    final items = await _loadPublishedItems();
    final categoriesById = <String, SharedDriveCategory>{};

    for (final item in items) {
      final categoryId = _normalizeCategoryId(item.category);
      if (categoriesById.containsKey(categoryId)) {
        continue;
      }

      categoriesById[categoryId] = SharedDriveCategory(
        id: categoryId,
        title: _formatCategoryTitle(item.category),
        url:
            '${AppConfig.apiBaseUrl}/api/content/library/pdfs?category=${Uri.encodeComponent(categoryId)}',
      );
    }

    final categories = categoriesById.values.toList(growable: false)
      ..sort((left, right) =>
          left.title.toLowerCase().compareTo(right.title.toLowerCase()));

    return categories;
  }

  Future<List<SharedDriveDocument>> fetchDocumentsForCategory(
    String categoryId,
  ) async {
    final items = await _loadPublishedItems();
    final normalizedCategory = _normalizeCategoryId(categoryId);

    return items
        .where(
            (item) => _normalizeCategoryId(item.category) == normalizedCategory)
        .map(
          (item) => SharedDriveDocument(
            id: item.id,
            title: item.title,
            viewUrl:
                '${AppConfig.apiBaseUrl}/api/content/library/pdfs/${Uri.encodeComponent(item.id)}/view',
            previewUrl:
                '${AppConfig.apiBaseUrl}/api/content/library/pdfs/${Uri.encodeComponent(item.id)}/view',
            downloadUrl:
                '${AppConfig.apiBaseUrl}/api/content/library/pdfs/${Uri.encodeComponent(item.id)}/file',
            thumbnailUrl:
                '${AppConfig.apiBaseUrl}/api/content/library/pdfs/${Uri.encodeComponent(item.id)}/pages/1/image?width=900',
          ),
        )
        .toList(growable: false)
      ..sort((left, right) =>
          left.title.toLowerCase().compareTo(right.title.toLowerCase()));
  }

  Future<List<_LibraryPdfItem>> _loadPublishedItems() async {
    if (_cachedItems != null) {
      return _cachedItems!;
    }

    final uri = Uri.parse('${AppConfig.apiBaseUrl}/api/content/library/pdfs');
    final response = await _client.get(uri);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('No se pudo leer la biblioteca del servidor.');
    }

    final json = jsonDecode(response.body) as Map<String, dynamic>;
    final rawItems = json['items'] as List<dynamic>? ?? const [];
    final items = rawItems
        .whereType<Map<String, dynamic>>()
        .map(
          (item) => _LibraryPdfItem(
            id: (item['id'] as String?)?.trim() ?? '',
            title: (item['title'] as String?)?.trim() ?? '',
            category: (item['category'] as String?)?.trim() ?? 'General',
          ),
        )
        .where((item) => item.id.isNotEmpty && item.title.isNotEmpty)
        .toList(growable: false);

    items.sort((left, right) =>
        left.title.toLowerCase().compareTo(right.title.toLowerCase()));
    _cachedItems = items;
    return items;
  }

  String _normalizeCategoryId(String value) {
    final normalized = value.trim().toLowerCase();
    if (normalized.isEmpty) {
      return 'general';
    }

    return normalized
        .replaceAll(RegExp(r'[^a-z0-9]+'), '-')
        .replaceAll(RegExp(r'-+'), '-')
        .replaceAll(RegExp(r'^-|-$'), '');
  }

  String _formatCategoryTitle(String value) {
    final normalized = value.trim();
    if (normalized.isEmpty) {
      return 'General';
    }

    return normalized
        .replaceAll(RegExp(r'[_-]+'), ' ')
        .split(' ')
        .where((part) => part.trim().isNotEmpty)
        .map((part) => part[0].toUpperCase() + part.substring(1).toLowerCase())
        .join(' ');
  }
}

class _LibraryPdfItem {
  const _LibraryPdfItem({
    required this.id,
    required this.title,
    required this.category,
  });

  final String id;
  final String title;
  final String category;
}
