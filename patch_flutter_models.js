const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'apps/mobile/lib/src/models/app_models.dart');
let content = fs.readFileSync(filePath, 'utf8');

// Insert CourseMediaType and parse function before CourseLesson
const mediaTypeDefinition = `
enum CourseMediaType {
  image,
  video,
  pdf,
  canva,
  externalLink,
  document,
  unknown,
}

CourseMediaType parseCourseMediaType(String? value) {
  if (value == null) return CourseMediaType.unknown;
  final normalized = value.trim().toLowerCase();
  switch (normalized) {
    case 'image':
    case 'imagen':
      return CourseMediaType.image;
    case 'video':
      return CourseMediaType.video;
    case 'pdf':
      return CourseMediaType.pdf;
    case 'canva':
      return CourseMediaType.canva;
    case 'external_link':
    case 'link':
      return CourseMediaType.externalLink;
    case 'document':
    case 'file':
      return CourseMediaType.document;
    default:
      return CourseMediaType.unknown;
  }
}

class CourseLesson {`;

content = content.replace(/class CourseLesson \{/, mediaTypeDefinition);

// Add mediaType and mimeType to CourseLesson
content = content.replace(
/    required this\.format,\n    required this\.durationMinutes,/g,
'    required this.format,\n    this.mediaType,\n    this.mimeType,\n    required this.durationMinutes,'
);

content = content.replace(
/  final String format;\n  final int durationMinutes;/g,
'  final String format;\n  final CourseMediaType? mediaType;\n  final String? mimeType;\n  final int durationMinutes;'
);

content = content.replace(
/      format: json\['format'\] as String\? \?\? '',/g,
'      format: json[\'format\'] as String? ?? \'\',\n      mediaType: json[\'mediaType\'] != null ? parseCourseMediaType(json[\'mediaType\'] as String) : null,\n      mimeType: json[\'mimeType\'] as String?,'
);

fs.writeFileSync(filePath, content, 'utf8');
