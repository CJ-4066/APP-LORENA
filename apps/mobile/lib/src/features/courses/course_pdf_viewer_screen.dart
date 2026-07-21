import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/i18n/app_i18n.dart';
import '../../core/theme/app_palette.dart';
import '../../models/app_models.dart';

Future<void> _openCourseResource(BuildContext context, String value) async {
  final uri = Uri.tryParse(value.trim());
  if (uri == null) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('No se pudo abrir el recurso.')),
    );
    return;
  }

  final opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
  if (!opened && context.mounted) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('No se pudo abrir el recurso.')),
    );
  }
}

class CoursePdfViewerScreen extends StatelessWidget {
  const CoursePdfViewerScreen({
    super.key,
    required this.course,
  });

  final Course course;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final hasCover = course.coverImageUrl?.trim().isNotEmpty ?? false;

    return Scaffold(
      backgroundColor: AppPalette.petalSoft,
      appBar: AppBar(
        backgroundColor: AppPalette.petalSoft,
        foregroundColor: AppPalette.butterflyInk,
        elevation: 0,
        title: Text(course.title),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(18, 12, 18, 28),
        children: [
          _PdfPage(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (hasCover) ...[
                  ClipRRect(
                    borderRadius: BorderRadius.circular(22),
                    child: SizedBox(
                      height: 180,
                      width: double.infinity,
                      child: Image.network(
                        course.coverImageUrl!.trim(),
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => _CoverFallback(
                          course: course,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                ] else ...[
                  _CoverFallback(course: course),
                  const SizedBox(height: 16),
                ],
                Text(
                  l10n.ts(course.category),
                  style: const TextStyle(
                    color: AppPalette.royalViolet,
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.35,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  course.title,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        color: AppPalette.midnight,
                        fontWeight: FontWeight.w900,
                      ),
                ),
                const SizedBox(height: 10),
                Text(
                  course.subtitle,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: AppPalette.butterflyInk,
                        fontWeight: FontWeight.w700,
                      ),
                ),
                const SizedBox(height: 14),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _MetaPill(
                      label: l10n.ts(
                        '{count} lecciones',
                        {'count': '${course.lessonCount}'},
                      ),
                    ),
                    _MetaPill(
                      label: l10n.ts(
                        '{hours} h',
                        {'hours': course.estimatedHours.toStringAsFixed(1)},
                      ),
                    ),
                    _MetaPill(label: l10n.ts(course.level)),
                  ],
                ),
                const SizedBox(height: 18),
                Text(
                  course.description,
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        color: AppPalette.butterflyInk,
                        height: 1.55,
                      ),
                ),
                if (course.outcomes.isNotEmpty) ...[
                  const SizedBox(height: 18),
                  Text(
                    l10n.ts('Resultados clave'),
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          color: AppPalette.midnight,
                          fontWeight: FontWeight.w800,
                        ),
                  ),
                  const SizedBox(height: 10),
                  ...course.outcomes.map(
                    (item) => Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Padding(
                            padding: EdgeInsets.only(top: 4),
                            child: Icon(
                              Icons.auto_awesome_rounded,
                              size: 16,
                              color: AppPalette.flameGold,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              l10n.ts(item),
                              style: Theme.of(context)
                                  .textTheme
                                  .bodyMedium
                                  ?.copyWith(
                                    color: AppPalette.butterflyInk,
                                    height: 1.5,
                                  ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
          ...course.modules.asMap().entries.map(
                (entry) => Padding(
                  padding: const EdgeInsets.only(top: 14),
                  child: _PdfPage(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          l10n.ts(
                              'Módulo {index}', {'index': '${entry.key + 1}'}),
                          style: const TextStyle(
                            color: AppPalette.royalViolet,
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.35,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          entry.value.title,
                          style:
                              Theme.of(context).textTheme.titleLarge?.copyWith(
                                    color: AppPalette.midnight,
                                    fontWeight: FontWeight.w900,
                                  ),
                        ),
                        const SizedBox(height: 10),
                        Text(
                          entry.value.summary,
                          style:
                              Theme.of(context).textTheme.bodyMedium?.copyWith(
                                    color: AppPalette.butterflyInk,
                                    height: 1.5,
                                  ),
                        ),
                        const SizedBox(height: 16),
                        ...entry.value.lessons.asMap().entries.map(
                              (lessonEntry) => Padding(
                                padding: const EdgeInsets.only(bottom: 12),
                                child: Container(
                                  padding: const EdgeInsets.all(14),
                                  decoration: BoxDecoration(
                                    color: AppPalette.petalSoft,
                                    borderRadius: BorderRadius.circular(18),
                                    border: Border.all(
                                        color: AppPalette.borderSoft),
                                  ),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        l10n.ts(
                                          'Lección {index}',
                                          {'index': '${lessonEntry.key + 1}'},
                                        ),
                                        style: const TextStyle(
                                          color: AppPalette.flameGold,
                                          fontSize: 11,
                                          fontWeight: FontWeight.w800,
                                          letterSpacing: 0.28,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        lessonEntry.value.title,
                                        style: Theme.of(context)
                                            .textTheme
                                            .titleMedium
                                            ?.copyWith(
                                              color: AppPalette.midnight,
                                              fontWeight: FontWeight.w800,
                                            ),
                                      ),
                                      const SizedBox(height: 6),
                                      Text(
                                        '${l10n.ts(lessonEntry.value.format)} · ${lessonEntry.value.durationMinutes} min',
                                        style: Theme.of(context)
                                            .textTheme
                                            .bodySmall
                                            ?.copyWith(
                                              color: AppPalette.mutedLavender,
                                              fontWeight: FontWeight.w700,
                                            ),
                                      ),
                                      const SizedBox(height: 8),
                                      Text(
                                        lessonEntry.value.prompt,
                                        style: Theme.of(context)
                                            .textTheme
                                            .bodyMedium
                                            ?.copyWith(
                                              color: AppPalette.butterflyInk,
                                              height: 1.45,
                                            ),
                                      ),
                                      if (lessonEntry.value.resourceUrl
                                              ?.trim()
                                              .isNotEmpty ??
                                          false) ...[
                                        const SizedBox(height: 12),
                                        Align(
                                          alignment: Alignment.centerLeft,
                                          child: FilledButton.icon(
                                            onPressed: () =>
                                                _openCourseResource(
                                              context,
                                              lessonEntry.value.resourceUrl!,
                                            ),
                                            icon: const Icon(
                                              Icons.open_in_new_rounded,
                                              size: 18,
                                            ),
                                            label: Text(
                                              l10n.ts('Abrir recurso'),
                                            ),
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                ),
                              ),
                            ),
                      ],
                    ),
                  ),
                ),
              ),
        ],
      ),
    );
  }
}

class _CoverFallback extends StatelessWidget {
  const _CoverFallback({
    required this.course,
  });

  final Course course;

  @override
  Widget build(BuildContext context) {
    final palette = course.featured
        ? const [AppPalette.midnight, AppPalette.indigo, AppPalette.orchid]
        : const [
            AppPalette.indigo,
            AppPalette.royalViolet,
            AppPalette.flameGold
          ];

    return Container(
      height: 180,
      width: double.infinity,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(22),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: palette,
        ),
      ),
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Align(
            alignment: Alignment.topRight,
            child: Icon(
              Icons.auto_stories_rounded,
              color: Colors.white,
              size: 30,
            ),
          ),
          const Spacer(),
          Text(
            course.title,
            maxLines: 3,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.w900,
                  height: 1.15,
                ),
          ),
        ],
      ),
    );
  }
}

class _PdfPage extends StatelessWidget {
  const _PdfPage({
    required this.child,
  });

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: AppPalette.border),
        boxShadow: [
          BoxShadow(
            color: AppPalette.indigo.withValues(alpha: 0.08),
            blurRadius: 22,
            offset: const Offset(0, 14),
          ),
        ],
      ),
      child: child,
    );
  }
}

class _MetaPill extends StatelessWidget {
  const _MetaPill({
    required this.label,
  });

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: AppPalette.candleGlow,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: const TextStyle(
          color: AppPalette.midnight,
          fontSize: 12,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
