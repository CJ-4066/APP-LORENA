import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import 'shared_drive_library_service.dart';

class LibraryPdfBookmark {
  const LibraryPdfBookmark({
    required this.document,
    required this.page,
    required this.savedAt,
  });

  final SharedDriveDocument document;
  final int page;
  final DateTime savedAt;

  Map<String, dynamic> toJson() {
    return {
      'document': {
        'id': document.id,
        'title': document.title,
        'viewUrl': document.viewUrl,
        'previewUrl': document.previewUrl,
        'downloadUrl': document.downloadUrl,
        'thumbnailUrl': document.thumbnailUrl,
      },
      'page': page,
      'savedAt': savedAt.toIso8601String(),
    };
  }

  static LibraryPdfBookmark? fromJson(Map<String, dynamic> json) {
    final rawDocument = json['document'];
    if (rawDocument is! Map<String, dynamic>) {
      return null;
    }

    final id = (rawDocument['id'] as String?)?.trim() ?? '';
    final title = (rawDocument['title'] as String?)?.trim() ?? '';
    if (id.isEmpty || title.isEmpty) {
      return null;
    }

    final savedAtRaw = json['savedAt'] as String?;
    return LibraryPdfBookmark(
      document: SharedDriveDocument(
        id: id,
        title: title,
        viewUrl: (rawDocument['viewUrl'] as String?)?.trim() ?? '',
        previewUrl: (rawDocument['previewUrl'] as String?)?.trim() ?? '',
        downloadUrl: (rawDocument['downloadUrl'] as String?)?.trim() ?? '',
        thumbnailUrl: (rawDocument['thumbnailUrl'] as String?)?.trim() ?? '',
      ),
      page: ((json['page'] as num?)?.toInt() ?? 1).clamp(1, 999999),
      savedAt: DateTime.tryParse(savedAtRaw ?? '') ?? DateTime.now(),
    );
  }
}

class LibraryPdfBookmarkService {
  static const String _bookmarksKey = 'library_pdf_bookmarks_v1';

  Future<List<LibraryPdfBookmark>> loadBookmarks() async {
    final prefs = await SharedPreferences.getInstance();
    final rawJson = prefs.getString(_bookmarksKey);
    if (rawJson == null || rawJson.trim().isEmpty) {
      return const [];
    }

    try {
      final decoded = jsonDecode(rawJson);
      if (decoded is! List<dynamic>) {
        return const [];
      }

      final bookmarks = decoded
          .whereType<Map<String, dynamic>>()
          .map(LibraryPdfBookmark.fromJson)
          .whereType<LibraryPdfBookmark>()
          .toList(growable: false)
        ..sort((left, right) => right.savedAt.compareTo(left.savedAt));
      return bookmarks;
    } catch (_) {
      return const [];
    }
  }

  Future<void> saveBookmark({
    required SharedDriveDocument document,
    required int page,
  }) async {
    final bookmarks = await loadBookmarks();
    final updated = <LibraryPdfBookmark>[
      LibraryPdfBookmark(
        document: document,
        page: page.clamp(1, 999999),
        savedAt: DateTime.now(),
      ),
      ...bookmarks.where((bookmark) => bookmark.document.id != document.id),
    ];

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _bookmarksKey,
      jsonEncode(updated.map((bookmark) => bookmark.toJson()).toList()),
    );
  }

  Future<LibraryPdfBookmark?> loadBookmarkForDocument(String documentId) async {
    final normalizedId = documentId.trim();
    if (normalizedId.isEmpty) {
      return null;
    }

    final bookmarks = await loadBookmarks();
    for (final bookmark in bookmarks) {
      if (bookmark.document.id == normalizedId) {
        return bookmark;
      }
    }
    return null;
  }

  Future<void> removeBookmark(String documentId) async {
    final normalizedId = documentId.trim();
    if (normalizedId.isEmpty) {
      return;
    }

    final bookmarks = await loadBookmarks();
    final updated = bookmarks
        .where((bookmark) => bookmark.document.id != normalizedId)
        .toList(growable: false);

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _bookmarksKey,
      jsonEncode(updated.map((bookmark) => bookmark.toJson()).toList()),
    );
  }
}
