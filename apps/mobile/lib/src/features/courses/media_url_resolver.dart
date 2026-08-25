import '../../models/app_models.dart';

class MediaUrlResolver {
  static String resolve(
    String url, {
    String baseUrl = 'https://lorenaciente.com',
  }) {
    var trimmed = url.trim();
    if (trimmed.isEmpty) return trimmed;

    if (trimmed.startsWith('/api/uploads/') ||
        trimmed.startsWith('/uploads/')) {
      if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.substring(0, baseUrl.length - 1);
      }
      if (trimmed.startsWith('/api/uploads/')) {
        return '$baseUrl$trimmed';
      }
      return '$baseUrl/api$trimmed';
    }

    if (trimmed.startsWith('/')) {
      return Uri.parse(baseUrl).resolve(trimmed).toString();
    }

    return trimmed;
  }

  static CourseMediaType inferType(
    CourseMediaType declaredType,
    String url,
  ) {
    if (declaredType != CourseMediaType.unknown) {
      return declaredType;
    }

    final uri = Uri.tryParse(url.trim());
    final host = uri?.host.toLowerCase() ?? '';
    final path = uri?.path.toLowerCase() ?? url.toLowerCase();

    if (host.endsWith('canva.com') || host.endsWith('.canva.com')) {
      return CourseMediaType.canva;
    }
    if (RegExp(r'\.(mp4|m4v|mov|webm|m3u8)$').hasMatch(path)) {
      return CourseMediaType.video;
    }
    if (RegExp(r'\.(png|jpe?g|webp|gif|svg)$').hasMatch(path)) {
      return CourseMediaType.image;
    }
    if (path.endsWith('.pdf')) {
      return CourseMediaType.pdf;
    }

    return CourseMediaType.externalLink;
  }
}

class CanvaUrlResolver {
  static String? resolveEmbedUrl(String url) {
    var trimmed = url.trim();
    if (trimmed.isEmpty) return null;

    final uri = Uri.tryParse(trimmed);
    if (uri == null) return trimmed;

    if (uri.host.contains('canva.com') && uri.path.contains('/design/')) {
      if (trimmed.contains('view?embed')) {
        return trimmed;
      }
      final pathSegments = uri.pathSegments;
      final designIndex = pathSegments.indexOf('design');
      if (designIndex != -1 && pathSegments.length > designIndex + 1) {
        final designId = pathSegments[designIndex + 1];
        return 'https://www.canva.com/design/$designId/view?embed';
      }
    }
    return trimmed;
  }
}
