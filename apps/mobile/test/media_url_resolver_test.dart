import 'package:flutter_test/flutter_test.dart';
import 'package:lo_renaciente/src/features/courses/media_url_resolver.dart';
import 'package:lo_renaciente/src/models/app_models.dart';

void main() {
  group('MediaUrlResolver', () {
    test('resolves relative /api/uploads', () {
      expect(
        MediaUrlResolver.resolve('/api/uploads/video.mp4',
            baseUrl: 'http://localhost:3000'),
        'http://localhost:3000/api/uploads/video.mp4',
      );
      expect(
        MediaUrlResolver.resolve('/api/uploads/video.mp4',
            baseUrl: 'http://localhost:3000/'),
        'http://localhost:3000/api/uploads/video.mp4',
      );
    });

    test('resolves relative /uploads', () {
      expect(
        MediaUrlResolver.resolve('/uploads/img.png',
            baseUrl: 'http://localhost:3000'),
        'http://localhost:3000/api/uploads/img.png',
      );
    });

    test('leaves absolute URLs untouched', () {
      expect(
        MediaUrlResolver.resolve('https://s3.amazonaws.com/video.mp4'),
        'https://s3.amazonaws.com/video.mp4',
      );
    });

    test('resolves other server-relative resources', () {
      expect(
        MediaUrlResolver.resolve(
          '/api/content/library/pdfs/example/file',
          baseUrl: 'https://lorenaciente.com',
        ),
        'https://lorenaciente.com/api/content/library/pdfs/example/file',
      );
    });

    test('infers internal media type from the resource URL', () {
      expect(
        MediaUrlResolver.inferType(
          CourseMediaType.unknown,
          'https://www.canva.com/design/ABC/view',
        ),
        CourseMediaType.canva,
      );
      expect(
        MediaUrlResolver.inferType(
          CourseMediaType.unknown,
          'https://lorenaciente.com/api/uploads/courses/lesson.mp4',
        ),
        CourseMediaType.video,
      );
      expect(
        MediaUrlResolver.inferType(
          CourseMediaType.unknown,
          'https://lorenaciente.com/api/uploads/courses/cover.jpg?version=2',
        ),
        CourseMediaType.image,
      );
    });
  });

  group('CanvaUrlResolver', () {
    test('converts design url to embed url', () {
      expect(
        CanvaUrlResolver.resolveEmbedUrl(
            'https://www.canva.com/design/DAGQ72u9A/view'),
        'https://www.canva.com/design/DAGQ72u9A/view?embed',
      );
    });

    test('leaves already embed urls untouched', () {
      expect(
        CanvaUrlResolver.resolveEmbedUrl(
            'https://www.canva.com/design/DAGQ72u9A/view?embed'),
        'https://www.canva.com/design/DAGQ72u9A/view?embed',
      );
    });

    test('returns null for empty', () {
      expect(CanvaUrlResolver.resolveEmbedUrl(''), null);
    });
  });

  group('CourseMediaType', () {
    test('parses correctly', () {
      expect(parseCourseMediaType('image'), CourseMediaType.image);
      expect(parseCourseMediaType('imagen'), CourseMediaType.image);
      expect(parseCourseMediaType('video'), CourseMediaType.video);
      expect(parseCourseMediaType('pdf'), CourseMediaType.pdf);
      expect(parseCourseMediaType('canva'), CourseMediaType.canva);
      expect(
          parseCourseMediaType('external_link'), CourseMediaType.externalLink);
      expect(parseCourseMediaType('link'), CourseMediaType.externalLink);
      expect(parseCourseMediaType('document'), CourseMediaType.document);
      expect(parseCourseMediaType('file'), CourseMediaType.document);
      expect(parseCourseMediaType('unknown_thing'), CourseMediaType.unknown);
      expect(parseCourseMediaType(null), CourseMediaType.unknown);
    });
  });
}
