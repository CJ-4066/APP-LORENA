import 'dart:io';
import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

import '../../core/i18n/app_i18n.dart';
import '../../core/theme/app_palette.dart';
import '../../core/widgets/mystic_ui.dart';
import '../../models/app_models.dart';
import 'course_pdf_viewer_screen.dart';
import 'library_pdf_viewer_screen.dart';
import 'library_pdf_thumbnail_service.dart';
import 'shared_drive_library_service.dart';

typedef CourseAssetUploader = Future<String> Function({
  required Uint8List bytes,
  required String fileName,
  required String contentType,
});

typedef CourseResourceCreator = Future<Course> Function(
  CreateCourseFromResourceInput input,
);

class CoursesScreen extends StatefulWidget {
  const CoursesScreen({
    super.key,
    required this.data,
    required this.onRefresh,
    required this.contentVersion,
    this.canManageCourses = false,
    this.onUploadCourseAsset,
    this.onCreateCourseFromResource,
  });

  final AppBootstrap data;
  final Future<void> Function() onRefresh;
  final String contentVersion;
  final bool canManageCourses;
  final CourseAssetUploader? onUploadCourseAsset;
  final CourseResourceCreator? onCreateCourseFromResource;

  @override
  State<CoursesScreen> createState() => _CoursesScreenState();
}

class _CoursesScreenState extends State<CoursesScreen> {
  int _refreshTick = 0;

  Future<void> _handleRefresh() async {
    await widget.onRefresh();
    if (!mounted) {
      return;
    }

    setState(() {
      _refreshTick += 1;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (widget.canManageCourses) {
      return _CourseManagerView(
        data: widget.data,
        onRefresh: widget.onRefresh,
        onUploadCourseAsset: widget.onUploadCourseAsset,
        onCreateCourseFromResource: widget.onCreateCourseFromResource,
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
          onRefresh: _handleRefresh,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 14, 20, 28),
            children: [
              _CoursesPanel(
                key: const ValueKey('courses'),
                courses: widget.data.courses,
                refreshTick: _refreshTick,
                contentVersion: widget.contentVersion,
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
    required this.onUploadCourseAsset,
    required this.onCreateCourseFromResource,
  });

  final AppBootstrap data;
  final Future<void> Function() onRefresh;
  final CourseAssetUploader? onUploadCourseAsset;
  final CourseResourceCreator? onCreateCourseFromResource;

  Future<void> _openCreateCourse(BuildContext context) async {
    final uploader = onUploadCourseAsset;
    final creator = onCreateCourseFromResource;
    if (uploader == null || creator == null) {
      return;
    }

    final created = await Navigator.of(context).push<bool>(
      MaterialPageRoute<bool>(
        builder: (_) => CreateCourseResourceScreen(
          onUploadCourseAsset: uploader,
          onCreateCourseFromResource: creator,
        ),
      ),
    );
    if (created == true && context.mounted) {
      await onRefresh();
      if (!context.mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Curso creado como borrador.')),
      );
    }
  }

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
                primaryLabel: l10n.ts('Crear curso'),
                onPrimaryTap: onCreateCourseFromResource != null &&
                        onUploadCourseAsset != null
                    ? () => _openCreateCourse(context)
                    : null,
                secondaryLabel: l10n.ts('Actualizar'),
                onSecondaryTap: () {
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
                    'Crea el primer curso y adjunta su PDF, archivo o enlace Canva.',
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

class CreateCourseResourceScreen extends StatefulWidget {
  const CreateCourseResourceScreen({
    super.key,
    required this.onUploadCourseAsset,
    required this.onCreateCourseFromResource,
  });

  final CourseAssetUploader onUploadCourseAsset;
  final CourseResourceCreator onCreateCourseFromResource;

  @override
  State<CreateCourseResourceScreen> createState() =>
      _CreateCourseResourceScreenState();
}

class _CreateCourseResourceScreenState
    extends State<CreateCourseResourceScreen> {
  final _titleController = TextEditingController();
  final _categoryController = TextEditingController(text: 'General');
  final _descriptionController = TextEditingController();
  final _resourceUrlController = TextEditingController();
  final _resourceTitleController = TextEditingController();

  PlatformFile? _selectedFile;
  Uint8List? _selectedBytes;
  String _resourceKind = 'pdf';
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _titleController.dispose();
    _categoryController.dispose();
    _descriptionController.dispose();
    _resourceUrlController.dispose();
    _resourceTitleController.dispose();
    super.dispose();
  }

  Future<void> _pickFile() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.any,
      withData: true,
      allowMultiple: false,
    );
    final file = result?.files.single;
    if (file == null) {
      return;
    }

    Uint8List? bytes = file.bytes;
    final path = file.path;
    if (bytes == null && path != null && path.isNotEmpty) {
      bytes = await File(path).readAsBytes();
    }

    if (!mounted) {
      return;
    }
    if (bytes == null || bytes.isEmpty) {
      setState(() {
        _error = 'No se pudo leer el archivo seleccionado.';
      });
      return;
    }

    setState(() {
      _selectedFile = file;
      _selectedBytes = bytes;
      _resourceKind = _guessResourceKind(file.name);
      _error = null;
      if (_resourceTitleController.text.trim().isEmpty) {
        _resourceTitleController.text = file.name;
      }
    });
  }

  Future<void> _saveCourse() async {
    final title = _titleController.text.trim();
    final category = _categoryController.text.trim();
    final description = _descriptionController.text.trim();
    final resourceTitle = _resourceTitleController.text.trim();
    final typedUrl = _resourceUrlController.text.trim();
    final selectedFile = _selectedFile;
    final selectedBytes = _selectedBytes;

    if (title.isEmpty) {
      setState(() {
        _error = 'Ingresa el título del curso.';
      });
      return;
    }
    if ((selectedFile == null || selectedBytes == null) && typedUrl.isEmpty) {
      setState(() {
        _error = 'Selecciona un archivo o pega un enlace.';
      });
      return;
    }

    setState(() {
      _saving = true;
      _error = null;
    });

    try {
      var resourceUrl = typedUrl;
      var resourceKind = _resourceKind;
      if (selectedFile != null && selectedBytes != null) {
        resourceUrl = await widget.onUploadCourseAsset(
          bytes: selectedBytes,
          fileName: selectedFile.name,
          contentType: _guessContentType(selectedFile.name),
        );
        resourceKind = _guessResourceKind(selectedFile.name);
      } else if (typedUrl.toLowerCase().contains('canva.com')) {
        resourceKind = 'canva';
      } else if (typedUrl.toLowerCase().endsWith('.pdf')) {
        resourceKind = 'pdf';
      }

      await widget.onCreateCourseFromResource(
        CreateCourseFromResourceInput(
          title: title,
          subtitle: description.isEmpty ? 'Material de estudio' : description,
          category: category.isEmpty ? 'General' : category,
          description: description,
          resourceTitle: resourceTitle.isEmpty ? title : resourceTitle,
          resourceKind: resourceKind,
          resourceUrl: resourceUrl,
        ),
      );

      if (mounted) {
        Navigator.of(context).pop(true);
      }
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _error = error.toString().replaceFirst('Exception: ', '');
        _saving = false;
      });
    }
  }

  String _guessContentType(String fileName) {
    final lower = fileName.toLowerCase();
    if (lower.endsWith('.pdf')) {
      return 'application/pdf';
    }
    if (lower.endsWith('.doc')) {
      return 'application/msword';
    }
    if (lower.endsWith('.docx')) {
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }
    if (lower.endsWith('.png')) {
      return 'image/png';
    }
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
      return 'image/jpeg';
    }
    if (lower.endsWith('.webp')) {
      return 'image/webp';
    }
    if (lower.endsWith('.svg')) {
      return 'image/svg+xml';
    }
    return 'application/octet-stream';
  }

  String _guessResourceKind(String fileName) {
    final lower = fileName.toLowerCase();
    if (lower.endsWith('.pdf')) {
      return 'pdf';
    }
    if (lower.endsWith('.png') ||
        lower.endsWith('.jpg') ||
        lower.endsWith('.jpeg') ||
        lower.endsWith('.webp') ||
        lower.endsWith('.svg')) {
      return 'image';
    }
    return 'file';
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final selectedFile = _selectedFile;

    return Scaffold(
      backgroundColor: AppPalette.shellGradientBottom,
      appBar: AppBar(
        title: Text(l10n.ts('Crear curso')),
        backgroundColor: AppPalette.shellGradientTop,
        foregroundColor: AppPalette.butterflyInk,
      ),
      body: Container(
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
          top: false,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
            children: [
              _CourseFormPanel(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _CourseTextField(
                      controller: _titleController,
                      label: l10n.ts('Título'),
                    ),
                    const SizedBox(height: 12),
                    _CourseTextField(
                      controller: _categoryController,
                      label: l10n.ts('Categoría'),
                    ),
                    const SizedBox(height: 12),
                    _CourseTextField(
                      controller: _descriptionController,
                      label: l10n.ts('Descripción'),
                      maxLines: 4,
                    ),
                    const SizedBox(height: 12),
                    _CourseTextField(
                      controller: _resourceTitleController,
                      label: l10n.ts('Título del recurso'),
                    ),
                    const SizedBox(height: 14),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _CourseKindChip(
                          label: 'PDF',
                          selected: _resourceKind == 'pdf',
                          onTap: () => setState(() => _resourceKind = 'pdf'),
                        ),
                        _CourseKindChip(
                          label: 'Canva',
                          selected: _resourceKind == 'canva',
                          onTap: () => setState(() => _resourceKind = 'canva'),
                        ),
                        _CourseKindChip(
                          label: l10n.ts('Archivo'),
                          selected: _resourceKind == 'file',
                          onTap: () => setState(() => _resourceKind = 'file'),
                        ),
                        _CourseKindChip(
                          label: l10n.ts('Imagen'),
                          selected: _resourceKind == 'image',
                          onTap: () => setState(() => _resourceKind = 'image'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    _CourseFilePickerTile(
                      fileName: selectedFile?.name,
                      fileSize: selectedFile?.size,
                      onTap: _saving ? null : _pickFile,
                    ),
                    const SizedBox(height: 12),
                    _CourseTextField(
                      controller: _resourceUrlController,
                      label: l10n.ts('Enlace Canva o PDF'),
                      keyboardType: TextInputType.url,
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 12),
                      Text(
                        _error!,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: AppPalette.berry,
                              fontWeight: FontWeight.w800,
                            ),
                      ),
                    ],
                    const SizedBox(height: 18),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton.icon(
                        onPressed: _saving ? null : _saveCourse,
                        icon: _saving
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              )
                            : const Icon(Icons.upload_file_outlined),
                        label: Text(
                          _saving
                              ? l10n.ts('Guardando...')
                              : l10n.ts('Guardar curso'),
                        ),
                      ),
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

class _CourseFormPanel extends StatelessWidget {
  const _CourseFormPanel({
    required this.child,
  });

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppPalette.moonIvory,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppPalette.border),
      ),
      padding: const EdgeInsets.all(18),
      child: child,
    );
  }
}

class _CourseTextField extends StatelessWidget {
  const _CourseTextField({
    required this.controller,
    required this.label,
    this.maxLines = 1,
    this.keyboardType,
  });

  final TextEditingController controller;
  final String label;
  final int maxLines;
  final TextInputType? keyboardType;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      maxLines: maxLines,
      keyboardType: keyboardType,
      decoration: InputDecoration(
        labelText: label,
        filled: true,
        fillColor: Colors.white.withValues(alpha: 0.68),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: BorderSide(color: AppPalette.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: BorderSide(color: AppPalette.border),
        ),
      ),
    );
  }
}

class _CourseKindChip extends StatelessWidget {
  const _CourseKindChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ChoiceChip(
      label: Text(label),
      selected: selected,
      onSelected: (_) => onTap(),
      selectedColor: AppPalette.softLilac,
      labelStyle: TextStyle(
        color: selected ? AppPalette.indigo : AppPalette.mutedLavender,
        fontWeight: FontWeight.w900,
      ),
      side: BorderSide(color: selected ? AppPalette.indigo : AppPalette.border),
    );
  }
}

class _CourseFilePickerTile extends StatelessWidget {
  const _CourseFilePickerTile({
    required this.fileName,
    required this.fileSize,
    required this.onTap,
  });

  final String? fileName;
  final int? fileSize;
  final VoidCallback? onTap;

  String _formatSize(int bytes) {
    if (bytes < 1024) {
      return '$bytes B';
    }
    if (bytes < 1024 * 1024) {
      return '${(bytes / 1024).toStringAsFixed(1)} KB';
    }
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }

  @override
  Widget build(BuildContext context) {
    final hasFile = fileName != null && fileName!.trim().isNotEmpty;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onTap,
        child: Ink(
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.68),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: AppPalette.border),
          ),
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: AppPalette.softLilac,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Icon(
                  Icons.attach_file_rounded,
                  color: AppPalette.indigo,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      hasFile
                          ? fileName!
                          : context.l10n.ts('Seleccionar archivo'),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            color: AppPalette.butterflyInk,
                            fontWeight: FontWeight.w900,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      hasFile && fileSize != null
                          ? _formatSize(fileSize!)
                          : context.l10n.ts('PDF, DOC, imagen o archivo'),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: AppPalette.mutedLavender,
                            fontWeight: FontWeight.w700,
                          ),
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

class _CourseShelfSection extends StatelessWidget {
  const _CourseShelfSection({
    required this.courses,
  });

  final List<Course> courses;

  void _openCourseViewer(BuildContext context, Course course) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => CoursePdfViewerScreen(course: course),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          height: 262,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            physics: const BouncingScrollPhysics(),
            itemCount: courses.length,
            separatorBuilder: (_, __) => const SizedBox(width: 12),
            itemBuilder: (context, index) {
              final course = courses[index];
              return _CourseShelfCard(
                course: course,
                onTap: () => _openCourseViewer(context, course),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _CourseShelfCard extends StatelessWidget {
  const _CourseShelfCard({
    required this.course,
    required this.onTap,
  });

  final Course course;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final hasCover = course.coverImageUrl?.trim().isNotEmpty ?? false;
    final category = course.category.trim().isNotEmpty
        ? course.category
        : context.l10n.ts('Biblioteca');

    return SizedBox(
      width: 246,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(24),
          onTap: onTap,
          child: Ink(
            decoration: BoxDecoration(
              color: AppPalette.moonIvory,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: AppPalette.border),
              boxShadow: [
                BoxShadow(
                  color: AppPalette.indigo.withValues(alpha: 0.08),
                  blurRadius: 18,
                  offset: const Offset(0, 12),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                ClipRRect(
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(24),
                  ),
                  child: SizedBox(
                    height: 136,
                    child: hasCover
                        ? Image.network(
                            course.coverImageUrl!.trim(),
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) =>
                                _CourseCoverFallback(course: course),
                          )
                        : _CourseCoverFallback(course: course),
                  ),
                ),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          category,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style:
                              Theme.of(context).textTheme.labelMedium?.copyWith(
                                    color: AppPalette.royalViolet,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: 0.15,
                                  ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          course.title,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style:
                              Theme.of(context).textTheme.titleSmall?.copyWith(
                                    color: AppPalette.butterflyInk,
                                    fontWeight: FontWeight.w900,
                                    height: 1.2,
                                  ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          course.subtitle,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style:
                              Theme.of(context).textTheme.bodySmall?.copyWith(
                                    color: AppPalette.mutedLavender,
                                    height: 1.35,
                                    fontWeight: FontWeight.w600,
                                  ),
                        ),
                        const Spacer(),
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                context.l10n.ts(
                                  '{count} lecciones · {hours} h',
                                  {
                                    'count': '${course.lessonCount}',
                                    'hours': course.estimatedHours
                                        .toStringAsFixed(1),
                                  },
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: Theme.of(context)
                                    .textTheme
                                    .labelSmall
                                    ?.copyWith(
                                      color: AppPalette.mutedLavender,
                                      fontWeight: FontWeight.w700,
                                    ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 10,
                                vertical: 6,
                              ),
                              decoration: BoxDecoration(
                                color: course.premium
                                    ? AppPalette.candleGlow
                                    : AppPalette.petalSoft,
                                borderRadius: BorderRadius.circular(999),
                              ),
                              child: Text(
                                course.premium
                                    ? context.l10n.ts('Premium')
                                    : context.l10n.ts('Abierto'),
                                style: const TextStyle(
                                  color: AppPalette.midnight,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _CourseCoverFallback extends StatelessWidget {
  const _CourseCoverFallback({
    required this.course,
  });

  final Course course;

  @override
  Widget build(BuildContext context) {
    final palette = course.featured
        ? const [AppPalette.midnight, AppPalette.indigo, AppPalette.royalViolet]
        : const [AppPalette.royalViolet, AppPalette.orchid, AppPalette.petal];

    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: palette,
        ),
      ),
      child: Stack(
        fit: StackFit.expand,
        children: [
          Positioned(
            right: -18,
            top: -18,
            child: Container(
              width: 90,
              height: 90,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withValues(alpha: 0.08),
              ),
            ),
          ),
          Positioned(
            left: -14,
            bottom: -24,
            child: Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withValues(alpha: 0.08),
              ),
            ),
          ),
          const Center(
            child: Icon(
              Icons.auto_stories_rounded,
              size: 48,
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }
}

class _CoursesPanel extends StatefulWidget {
  const _CoursesPanel({
    super.key,
    required this.courses,
    required this.refreshTick,
    required this.contentVersion,
  });

  final List<Course> courses;
  final int refreshTick;
  final String contentVersion;

  @override
  State<_CoursesPanel> createState() => _CoursesPanelState();
}

class _CoursesPanelState extends State<_CoursesPanel> {
  final TextEditingController _librarySearchController =
      TextEditingController();
  final SharedDriveLibraryService _libraryService = SharedDriveLibraryService();
  final LibraryPdfThumbnailService _thumbnailService =
      LibraryPdfThumbnailService(client: http.Client());
  late Future<List<SharedDriveCategory>> _categoriesFuture;
  Future<List<SharedDriveDocument>>? _documentsFuture;
  SharedDriveCategory? _selectedCategory;
  List<Course> _coursesSnapshot = const [];
  String _librarySearchQuery = '';

  @override
  void initState() {
    super.initState();
    _coursesSnapshot = widget.courses;
    _categoriesFuture = _loadCategories();
  }

  @override
  void dispose() {
    _librarySearchController.dispose();
    _thumbnailService.dispose();
    super.dispose();
  }

  @override
  void didUpdateWidget(covariant _CoursesPanel oldWidget) {
    super.didUpdateWidget(oldWidget);
    final coursesChanged = !_sameCourses(oldWidget.courses, widget.courses);
    final contentChanged = oldWidget.contentVersion != widget.contentVersion;
    if (coursesChanged ||
        oldWidget.refreshTick != widget.refreshTick ||
        contentChanged) {
      _reloadLibrary();
    }
  }

  bool _sameCourses(List<Course> left, List<Course> right) {
    if (identical(left, right)) {
      return true;
    }
    if (left.length != right.length) {
      return false;
    }

    for (var index = 0; index < left.length; index += 1) {
      if (left[index].id != right[index].id ||
          left[index].title != right[index].title ||
          left[index].coverImageUrl != right[index].coverImageUrl) {
        return false;
      }
    }

    return true;
  }

  void _reloadLibrary() {
    setState(() {
      _coursesSnapshot = widget.courses;
      _selectedCategory = null;
      _documentsFuture = null;
      _librarySearchQuery = '';
      _librarySearchController.clear();
      _libraryService.invalidateCache();
      LibraryPdfThumbnailService.clearCache();
      _categoriesFuture = _loadCategories();
    });
  }

  Future<List<SharedDriveCategory>> _loadCategories() async {
    final categories = await _libraryService.fetchRootCategories();
    if (categories.isNotEmpty) {
      final preferredCategory = categories.firstWhere(
        (category) => category.id == 'general',
        orElse: () => categories.first,
      );
      if (mounted) {
        setState(() {
          _selectedCategory = preferredCategory;
          _documentsFuture = _libraryService.fetchDocumentsForCategory(
            preferredCategory.id,
          );
        });
      } else {
        _selectedCategory = preferredCategory;
        _documentsFuture = _libraryService.fetchDocumentsForCategory(
          preferredCategory.id,
        );
      }
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

  void _openDocument(BuildContext context, SharedDriveDocument document) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => LibraryPdfViewerScreen(
          document: document,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _DriveLibrarySection(
          categoriesFuture: _categoriesFuture,
          documentsFuture: _documentsFuture,
          selectedCategory: _selectedCategory,
          searchController: _librarySearchController,
          searchQuery: _librarySearchQuery,
          onSelectCategory: _selectCategory,
          onSearchChanged: (value) {
            setState(() {
              _librarySearchQuery = value;
            });
          },
          thumbnailService: _thumbnailService,
          onOpenDocument: (document) => _openDocument(context, document),
        ),
        if (_coursesSnapshot.isNotEmpty) ...[
          const SizedBox(height: 18),
          _CourseShelfSection(courses: _coursesSnapshot),
        ],
      ],
    );
  }
}

class _DriveLibrarySection extends StatelessWidget {
  const _DriveLibrarySection({
    required this.categoriesFuture,
    required this.documentsFuture,
    required this.selectedCategory,
    required this.searchController,
    required this.searchQuery,
    required this.onSelectCategory,
    required this.onSearchChanged,
    required this.thumbnailService,
    required this.onOpenDocument,
  });

  final Future<List<SharedDriveCategory>> categoriesFuture;
  final Future<List<SharedDriveDocument>>? documentsFuture;
  final SharedDriveCategory? selectedCategory;
  final TextEditingController searchController;
  final String searchQuery;
  final ValueChanged<SharedDriveCategory> onSelectCategory;
  final ValueChanged<String> onSearchChanged;
  final LibraryPdfThumbnailService thumbnailService;
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

        if (snapshot.hasError) {
          return MysticMiniBanner(
            title: l10n.ts('No pudimos leer la biblioteca'),
            subtitle: l10n.ts(
              'La API del servidor respondió con un error al cargar las categorías.',
            ),
            glyphKind: MysticGlyphKind.course,
            accent: AppPalette.indigo,
          );
        }

        if (snapshot.data?.isEmpty ?? true) {
          return MysticMiniBanner(
            title: l10n.ts('No hay PDFs publicados'),
            subtitle: l10n.ts(
              'Todavía no hay documentos publicados en el servidor para mostrar en la biblioteca.',
            ),
            glyphKind: MysticGlyphKind.course,
            accent: AppPalette.indigo,
          );
        }

        final categories = snapshot.data!;
        final hasSearch = searchQuery.trim().isNotEmpty;

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            TextField(
              controller: searchController,
              onChanged: onSearchChanged,
              decoration: InputDecoration(
                labelText: l10n.ts('Buscar en la biblioteca'),
                hintText: l10n.ts('Título, concepto o palabra clave'),
                prefixIcon: const Icon(Icons.search_rounded),
                suffixIcon: searchQuery.isEmpty
                    ? null
                    : IconButton(
                        onPressed: () {
                          searchController.clear();
                          onSearchChanged('');
                        },
                        icon: const Icon(Icons.clear_rounded),
                      ),
              ),
            ),
            const SizedBox(height: 14),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: categories.map((category) {
                  final selected = selectedCategory?.id == category.id;
                  return Padding(
                    padding: const EdgeInsets.only(right: 10),
                    child: FilterChip(
                      selected: selected,
                      label: Text(category.title),
                      onSelected: (_) => onSelectCategory(category),
                      selectedColor: AppPalette.candleGlow,
                      checkmarkColor: AppPalette.butterflyInk,
                      labelStyle: TextStyle(
                        color: AppPalette.butterflyInk,
                        fontWeight:
                            selected ? FontWeight.w800 : FontWeight.w600,
                      ),
                      side: const BorderSide(color: AppPalette.border),
                    ),
                  );
                }).toList(),
              ),
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

                if (documentsSnapshot.hasError) {
                  return MysticMiniBanner(
                    title: l10n.ts('No encontramos PDFs en esta categoría'),
                    subtitle: l10n.ts(
                      'La API respondió con un error al cargar los documentos.',
                    ),
                    glyphKind: MysticGlyphKind.course,
                    accent: AppPalette.indigo,
                  );
                }

                if (documentsSnapshot.data?.isEmpty ?? true) {
                  return MysticMiniBanner(
                    title: l10n.ts('Sin PDFs publicados'),
                    subtitle: l10n.ts(
                      'No hay documentos publicados dentro de esta categoría en el servidor.',
                    ),
                    glyphKind: MysticGlyphKind.course,
                    accent: AppPalette.indigo,
                  );
                }

                final documents = documentsSnapshot.data!;
                final filteredDocuments = hasSearch
                    ? documents
                        .where(
                          (document) => document.title
                              .toLowerCase()
                              .contains(searchQuery.toLowerCase()),
                        )
                        .toList(growable: false)
                    : documents;

                if (filteredDocuments.isEmpty) {
                  return MysticMiniBanner(
                    title: l10n.ts('Sin resultados'),
                    subtitle: l10n.ts(
                      'No encontramos documentos para esa búsqueda dentro de esta categoría.',
                    ),
                    glyphKind: MysticGlyphKind.course,
                    accent: AppPalette.indigo,
                  );
                }

                return LayoutBuilder(
                  builder: (context, constraints) {
                    final maxWidth = constraints.maxWidth;
                    final crossAxisCount = maxWidth >= 720
                        ? 4
                        : maxWidth >= 520
                            ? 3
                            : 2;
                    final aspectRatio = maxWidth >= 520 ? 0.72 : 0.66;

                    return GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: filteredDocuments.length,
                      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: crossAxisCount,
                        mainAxisSpacing: 12,
                        crossAxisSpacing: 12,
                        childAspectRatio: aspectRatio,
                      ),
                      itemBuilder: (context, index) {
                        final document = filteredDocuments[index];
                        return _DriveBookCard(
                          document: document,
                          thumbnailService: thumbnailService,
                          onTap: () => onOpenDocument(document),
                        );
                      },
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
    required this.thumbnailService,
    required this.onTap,
  });

  final SharedDriveDocument document;
  final LibraryPdfThumbnailService thumbnailService;
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
                  child: FutureBuilder<Uint8List?>(
                    future: thumbnailService.loadFirstPageImage(document),
                    builder: (context, snapshot) {
                      final bytes = snapshot.data;

                      return Stack(
                        fit: StackFit.expand,
                        children: [
                          if (bytes != null)
                            Image.memory(bytes, fit: BoxFit.cover)
                          else
                            _DriveBookCoverFallback(title: document.title),
                          Positioned(
                            left: 10,
                            top: 10,
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 10,
                                vertical: 6,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.86),
                                borderRadius: BorderRadius.circular(999),
                              ),
                              child: const Text(
                                'PDF',
                                style: TextStyle(
                                  color: AppPalette.midnight,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                            ),
                          ),
                        ],
                      );
                    },
                  ),
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
