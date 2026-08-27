const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'apps/mobile/lib/src/features/courses/course_pdf_viewer_screen.dart');
let content = fs.readFileSync(filePath, 'utf8');

// Update _openCourseResource definition
content = content.replace(
/Future<void> _openCourseResource\(\n  BuildContext context,\n  String value, \{\n  required String title,\n  String\? format,\n\}\) async \{/,
`Future<void> _openCourseResource(
  BuildContext context,
  String value, {
  required String title,
  required CourseMediaType mediaType,
}) async {`
);

// Update CourseResourceViewerScreen instantiation
content = content.replace(
/        builder: \(\_\) => CourseResourceViewerScreen\(\n          title: title,\n          url: trimmed,\n          format: format,\n        \),/,
`        builder: (_) => CourseResourceViewerScreen(
          title: title,
          url: trimmed,
          mediaType: mediaType,
        ),`
);

// In _buildBody where it calls _openCourseResource:
content = content.replace(
/format: lessonEntry\.value\.format,/g,
'mediaType: lessonEntry.value.mediaType ?? CourseMediaType.unknown,'
);

fs.writeFileSync(filePath, content, 'utf8');
