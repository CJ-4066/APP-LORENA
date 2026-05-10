import 'package:flutter/material.dart';

import '../../core/config/app_config.dart';
import '../../core/i18n/app_i18n.dart';
import '../../core/theme/app_palette.dart';
import '../../core/widgets/in_app_webview_screen.dart';
import '../../core/widgets/mystic_ui.dart';
import '../../models/app_models.dart';
import 'shared_drive_library_service.dart';

class CoursesScreen extends StatefulWidget {
  const CoursesScreen({
    super.key,
    required this.data,
    required this.onRefresh,
    this.canManageCourses = false,
  });

  final AppBootstrap data;
  final Future<void> Function() onRefresh;
  final bool canManageCourses;

  @override
  State<CoursesScreen> createState() => _CoursesScreenState();
}

class _CoursesScreenState extends State<CoursesScreen> {
  @override
  Widget build(BuildContext context) {
    if (widget.canManageCourses) {
      return _CourseManagerView(
        data: widget.data,
        onRefresh: widget.onRefresh,
      );
    }

    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            AppPalette.shellGradientTop,
            AppPalette.shellGradientBottom,
          ],
        ),
      ),
      child: SafeArea(
        child: RefreshIndicator(
          onRefresh: widget.onRefresh,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 14, 20, 28),
            children: [
              _CoursesPanel(
                key: const ValueKey('courses'),
                courses: widget.data.courses,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CourseManagerView extends StatelessWidget {
  const _CourseManagerView({
    required this.data,
    required this.onRefresh,
  });

  final AppBootstrap data;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final courses = data.courses;
    final lessonCount = courses.fold<int>(
      0,
      (sum, course) => sum + course.lessonCount,
    );
    final featuredCount = courses.where((course) => course.featured).length;
    final premiumCount = courses.where((course) => course.premium).length;

    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            AppPalette.shellGradientTop,
            AppPalette.shellGradientBottom,
          ],
        ),
      ),
      child: SafeArea(
        child: RefreshIndicator(
          onRefresh: onRefresh,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 14, 20, 28),
            children: [
              MysticBannerCard(
                eyebrow: l10n.ts('Gestión académica'),
                title: l10n.ts('Cursos y PDFs'),
                subtitle: l10n.ts(
                  'Administra rutas formativas, lecciones, materiales descargables y estado de publicación.',
                ),
                glyphKind: MysticGlyphKind.course,
                gradient: const [
                  AppPalette.midnight,
                  AppPalette.indigo,
                  AppPalette.orchid,
                ],
                tags: [
                  l10n.ts('{count} cursos', {'count': '${courses.length}'}),
                  l10n.ts('{count} lecciones', {'count': '$lessonCount'}),
                  l10n.ts(
                    '{count} destacados',
                    {'count': '$featuredCount'},
                  ),
                  l10n.ts('{count} premium', {'count': '$premiumCount'}),
                ],
                primaryLabel: l10n.ts('Actualizar'),
                onPrimaryTap: () {
                  onRefresh();
                },
              ),
              const SizedBox(height: 18),
              _CourseManagerMetrics(
                courseCount: courses.length,
                lessonCount: lessonCount,
                featuredCount: featuredCount,
                premiumCount: premiumCount,
              ),
              const SizedBox(height: 22),
              Text(
                l10n.ts('Contenido publicado'),
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      color: AppPalette.butterflyInk,
                      fontWeight: FontWeight.w900,
                    ),
              ),
              const SizedBox(height: 12),
              if (courses.isEmpty)
                MysticMiniBanner(
                  title: l10n.ts('Sin cursos cargados'),
                  subtitle: l10n.ts(
                    'Cuando se conecte la creación de cursos, aquí se administrarán PDFs, módulos y lecciones.',
                  ),
                  glyphKind: MysticGlyphKind.course,
                  accent: AppPalette.indigo,
                )
              else
                ...courses.map(
                  (course) => Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: _CourseAdminCard(course: course),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CourseManagerMetrics extends StatelessWidget {
  const _CourseManagerMetrics({
    required this.courseCount,
    required this.lessonCount,
    required this.featuredCount,
    required this.premiumCount,
  });

  final int courseCount;
  final int lessonCount;
  final int featuredCount;
  final int premiumCount;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = (constraints.maxWidth - 12) / 2;
        return Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            _CourseMetricTile(
              width: width,
              icon: Icons.auto_stories_outlined,
              label: l10n.ts('Cursos'),
              value: '$courseCount',
              color: AppPalette.indigo,
            ),
            _CourseMetricTile(
              width: width,
              icon: Icons.article_outlined,
              label: l10n.ts('Lecciones/PDF'),
              value: '$lessonCount',
              color: AppPalette.royalViolet,
            ),
            _CourseMetricTile(
              width: width,
              icon: Icons.auto_awesome_rounded,
              label: l10n.ts('Destacados'),
              value: '$featuredCount',
              color: AppPalette.flameGold,
            ),
            _CourseMetricTile(
              width: width,
              icon: Icons.workspace_premium_outlined,
              label: l10n.ts('Premium'),
              value: '$premiumCount',
              color: AppPalette.berry,
            ),
          ],
        );
      },
    );
  }
}

class _CourseMetricTile extends StatelessWidget {
  const _CourseMetricTile({
    required this.width,
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  final double width;
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: width,
      child: Container(
        decoration: BoxDecoration(
          color: AppPalette.moonIvory,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: AppPalette.border),
        ),
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Icon(icon, color: color),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    value,
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          color: AppPalette.butterflyInk,
                          fontWeight: FontWeight.w900,
                        ),
                  ),
                  Text(
                    label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.labelMedium?.copyWith(
                          color: AppPalette.mutedLavender,
                          fontWeight: FontWeight.w800,
                        ),
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

class _CourseAdminCard extends StatelessWidget {
  const _CourseAdminCard({
    required this.course,
  });

  final Course course;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return Container(
      decoration: BoxDecoration(
        color: AppPalette.moonIvory,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppPalette.border),
      ),
      padding: const EdgeInsets.all(16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: AppPalette.softLilac,
              borderRadius: BorderRadius.circular(18),
            ),
            child: const Icon(
              Icons.menu_book_outlined,
              color: AppPalette.indigo,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  course.title,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: AppPalette.butterflyInk,
                        fontWeight: FontWeight.w900,
                      ),
                ),
                const SizedBox(height: 5),
                Text(
                  course.subtitle,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppPalette.mutedLavender,
                        height: 1.32,
                        fontWeight: FontWeight.w600,
                      ),
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _CourseStatusPill(
                      label: l10n.ts(
                        '{count} lecciones',
                        {'count': '${course.lessonCount}'},
                      ),
                    ),
                    _CourseStatusPill(
                      label: l10n.ts(
                        '{hours} h',
                        {'hours': course.estimatedHours.toStringAsFixed(1)},
                      ),
                    ),
                    if (course.featured)
                      _CourseStatusPill(label: l10n.ts('Destacado')),
                    if (course.premium)
                      _CourseStatusPill(label: l10n.ts('Premium')),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _CourseStatusPill extends StatelessWidget {
  const _CourseStatusPill({
    required this.label,
  });

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: AppPalette.petal,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: AppPalette.indigo,
              fontWeight: FontWeight.w900,
            ),
      ),
    );
  }
}

class _CoursesPanel extends StatefulWidget {
  const _CoursesPanel({
    super.key,
    required this.courses,
  });

  final List<Course> courses;

  @override
  State<_CoursesPanel> createState() => _CoursesPanelState();
}

class _CoursesPanelState extends State<_CoursesPanel> {
  final SharedDriveLibraryService _libraryService = SharedDriveLibraryService();
  late Future<List<SharedDriveCategory>> _categoriesFuture;
  Future<List<SharedDriveDocument>>? _documentsFuture;
  SharedDriveCategory? _selectedCategory;

  @override
  void initState() {
    super.initState();
    _categoriesFuture = _loadCategories();
  }

  Future<List<SharedDriveCategory>> _loadCategories() async {
    final categories = await _libraryService.fetchRootCategories();
    if (categories.isNotEmpty) {
      _selectedCategory = categories.first;
      _documentsFuture = _libraryService.fetchDocumentsForCategory(
        categories.first.id,
      );
    }
    return categories;
  }

  void _selectCategory(SharedDriveCategory category) {
    if (_selectedCategory?.id == category.id) {
      return;
    }

    setState(() {
      _selectedCategory = category;
      _documentsFuture = _libraryService.fetchDocumentsForCategory(category.id);
    });
  }

  void _openSharedLibrary(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => const InAppWebViewScreen(
          title: 'Biblioteca compartida',
          url: AppConfig.sharedLibraryUrl,
        ),
      ),
    );
  }

  void _openDocument(BuildContext context, SharedDriveDocument document) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => InAppWebViewScreen(
          title: document.title,
          url: document.previewUrl,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        MysticBannerCard(
          eyebrow: l10n.ts('Biblioteca premium'),
          title: l10n.ts('Cursos en PDF'),
          subtitle: l10n.ts(
            'Explora tu biblioteca por categorías y abre cada libro como una experiencia de lectura cuidada dentro de la app.',
          ),
          glyphKind: MysticGlyphKind.course,
          gradient: const [
            AppPalette.midnight,
            AppPalette.indigo,
            AppPalette.royalViolet,
          ],
          tags: [
            l10n.ts('Drive sincronizado'),
            l10n.ts('Lectura en PDF'),
            l10n.ts('Galería curada'),
          ],
          primaryLabel: l10n.ts('Abrir carpeta completa'),
          onPrimaryTap: () => _openSharedLibrary(context),
        ),
        const SizedBox(height: 18),
        _DriveLibrarySection(
          categoriesFuture: _categoriesFuture,
          documentsFuture: _documentsFuture,
          selectedCategory: _selectedCategory,
          onSelectCategory: _selectCategory,
          onOpenDocument: (document) => _openDocument(context, document),
        ),
      ],
    );
  }
}

class _DriveLibrarySection extends StatelessWidget {
  const _DriveLibrarySection({
    required this.categoriesFuture,
    required this.documentsFuture,
    required this.selectedCategory,
    required this.onSelectCategory,
    required this.onOpenDocument,
  });

  final Future<List<SharedDriveCategory>> categoriesFuture;
  final Future<List<SharedDriveDocument>>? documentsFuture;
  final SharedDriveCategory? selectedCategory;
  final ValueChanged<SharedDriveCategory> onSelectCategory;
  final ValueChanged<SharedDriveDocument> onOpenDocument;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return FutureBuilder<List<SharedDriveCategory>>(
      future: categoriesFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Padding(
            padding: EdgeInsets.symmetric(vertical: 24),
            child: Center(child: CircularProgressIndicator()),
          );
        }

        if (snapshot.hasError || (snapshot.data?.isEmpty ?? true)) {
          return MysticMiniBanner(
            title: l10n.ts('No pudimos leer la biblioteca'),
            subtitle: l10n.ts(
              'La carpeta compartida existe, pero no pudimos cargar sus categorías públicas en este momento.',
            ),
            glyphKind: MysticGlyphKind.course,
            accent: AppPalette.indigo,
          );
        }

        final categories = snapshot.data!;

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: AppPalette.moonIvory,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: AppPalette.border),
              ),
              child: Text(
                l10n.ts(
                  'Selecciona una categoría para abrir su galería de libros y documentos.',
                ),
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppPalette.butterflyInk,
                      height: 1.45,
                    ),
              ),
            ),
            const SizedBox(height: 14),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: categories.map((category) {
                final selected = selectedCategory?.id == category.id;
                return FilterChip(
                  selected: selected,
                  label: Text(category.title),
                  onSelected: (_) => onSelectCategory(category),
                  selectedColor: AppPalette.candleGlow,
                  checkmarkColor: AppPalette.butterflyInk,
                  labelStyle: TextStyle(
                    color: AppPalette.butterflyInk,
                    fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
                  ),
                  side: const BorderSide(color: AppPalette.border),
                );
              }).toList(),
            ),
            if (selectedCategory != null) ...[
              const SizedBox(height: 14),
              Text(
                selectedCategory!.title,
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      color: AppPalette.butterflyInk,
                      fontWeight: FontWeight.w900,
                    ),
              ),
              const SizedBox(height: 4),
              Text(
                l10n.ts('Galería visual de la categoría'),
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppPalette.mutedLavender,
                      fontWeight: FontWeight.w600,
                    ),
              ),
              const SizedBox(height: 14),
            ],
            FutureBuilder<List<SharedDriveDocument>>(
              future: documentsFuture,
              builder: (context, documentsSnapshot) {
                if (documentsSnapshot.connectionState != ConnectionState.done) {
                  return const Padding(
                    padding: EdgeInsets.symmetric(vertical: 24),
                    child: Center(child: CircularProgressIndicator()),
                  );
                }

                if (documentsSnapshot.hasError ||
                    (documentsSnapshot.data?.isEmpty ?? true)) {
                  return MysticMiniBanner(
                    title: l10n.ts('No encontramos PDFs en esta categoría'),
                    subtitle: l10n.ts(
                      'Si la carpeta está vacía o cambió permisos, no podremos armar la galería de libros.',
                    ),
                    glyphKind: MysticGlyphKind.course,
                    accent: AppPalette.indigo,
                  );
                }

                final documents = documentsSnapshot.data!;
                return GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: documents.length,
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    mainAxisSpacing: 12,
                    crossAxisSpacing: 12,
                    childAspectRatio: 0.64,
                  ),
                  itemBuilder: (context, index) {
                    final document = documents[index];
                    return _DriveBookCard(
                      document: document,
                      onTap: () => onOpenDocument(document),
                    );
                  },
                );
              },
            ),
          ],
        );
      },
    );
  }
}

class _DriveBookCard extends StatelessWidget {
  const _DriveBookCard({
    required this.document,
    required this.onTap,
  });

  final SharedDriveDocument document;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(22),
        onTap: onTap,
        child: Ink(
          decoration: BoxDecoration(
            color: AppPalette.moonIvory,
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: AppPalette.border),
            boxShadow: [
              BoxShadow(
                color: AppPalette.indigo.withValues(alpha: 0.08),
                blurRadius: 16,
                offset: const Offset(0, 12),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(
                child: ClipRRect(
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(22),
                  ),
                  child: document.thumbnailUrl.isNotEmpty
                      ? Image.network(
                          document.thumbnailUrl,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) =>
                              _DriveBookCoverFallback(title: document.title),
                        )
                      : _DriveBookCoverFallback(title: document.title),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      document.title,
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            color: AppPalette.butterflyInk,
                            fontWeight: FontWeight.w800,
                            height: 1.25,
                          ),
                    ),
                    const SizedBox(height: 8),
                    const Row(
                      children: [
                        Icon(
                          Icons.picture_as_pdf_outlined,
                          size: 16,
                          color: AppPalette.flameGold,
                        ),
                        SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            'Abrir PDF',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              color: AppPalette.mutedLavender,
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DriveBookCoverFallback extends StatelessWidget {
  const _DriveBookCoverFallback({
    required this.title,
  });

  final String title;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppPalette.midnight,
            AppPalette.indigo,
            AppPalette.royalViolet,
          ],
        ),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Align(
            alignment: Alignment.topRight,
            child: Icon(
              Icons.menu_book_rounded,
              color: AppPalette.candleGlow,
            ),
          ),
          const Spacer(),
          Text(
            title,
            maxLines: 4,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.w900,
                  height: 1.2,
                ),
          ),
        ],
      ),
    );
  }
}
