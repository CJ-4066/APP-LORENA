import 'package:flutter/material.dart';

import '../../models/app_models.dart';
import '../theme/app_palette.dart';
import 'zodiac_sign_icon.dart';

class EnergyProfileCardView extends StatelessWidget {
  const EnergyProfileCardView({
    super.key,
    required this.profile,
    this.title = 'Tu energía de hoy',
    this.showAffirmation = true,
    this.showFocusArea = false,
    this.showModality = false,
  });

  final EnergyProfile profile;
  final String title;
  final bool showAffirmation;
  final bool showFocusArea;
  final bool showModality;

  @override
  Widget build(BuildContext context) {
    final swatch = _parseEnergyHex(profile.powerColorHex);
    final metrics = _buildMetrics(swatch);

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Colors.white,
            swatch.withValues(alpha: 0.13),
            AppPalette.mistLilac,
          ],
        ),
        border: Border.all(color: swatch.withValues(alpha: 0.28)),
        boxShadow: [
          BoxShadow(
            color: swatch.withValues(alpha: 0.12),
            blurRadius: 26,
            offset: const Offset(0, 14),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _EnergyHeader(
            title: title,
            sign: profile.sign,
            theme: profile.energyTheme,
            accent: swatch,
          ),
          if (metrics.isNotEmpty) ...[
            const SizedBox(height: 16),
            _EnergyMetricsGrid(metrics: metrics),
          ],
          const SizedBox(height: 16),
          _EnergyRitualPanel(
            ritual: profile.ritual,
            affirmation: showAffirmation ? profile.affirmation : '',
            focusArea: showFocusArea ? profile.focusArea : '',
            accent: swatch,
          ),
        ],
      ),
    );
  }

  List<_EnergyMetric> _buildMetrics(Color swatch) {
    final metrics = <_EnergyMetric>[
      _EnergyMetric(
        label: 'Signo',
        value: profile.sign,
        icon: Icons.auto_awesome_rounded,
        accent: swatch,
        zodiacSign: profile.sign,
      ),
      _EnergyMetric(
        label: 'Elemento',
        value: profile.element,
        icon: _elementIcon(profile.element),
        accent: _elementColor(profile.element, swatch),
      ),
      if (showModality)
        _EnergyMetric(
          label: 'Modalidad',
          value: profile.modality,
          icon: Icons.blur_circular_outlined,
          accent: AppPalette.royalViolet,
        ),
      _EnergyMetric(
        label: 'Planeta',
        value: profile.rulingPlanet,
        icon: Icons.public_rounded,
        accent: AppPalette.indigo,
      ),
      _EnergyMetric(
        label: 'Color',
        value: profile.powerColorName,
        icon: Icons.palette_rounded,
        accent: swatch,
        colorSwatch: swatch,
      ),
      if (profile.energyNumber > 0)
        _EnergyMetric(
          label: 'Número',
          value: '${profile.energyNumber}',
          icon: Icons.confirmation_number_outlined,
          accent: AppPalette.flameGold,
        ),
      _EnergyMetric(
        label: 'Piedra',
        value: profile.energyStone,
        icon: Icons.diamond_outlined,
        accent: AppPalette.berry,
      ),
      _EnergyMetric(
        label: 'Chakra',
        value: profile.chakra,
        icon: Icons.self_improvement_outlined,
        accent: AppPalette.success,
      ),
      _EnergyMetric(
        label: 'Día',
        value: profile.powerDay,
        icon: Icons.event_available_outlined,
        accent: AppPalette.warning,
      ),
    ];

    return metrics
        .where((metric) => metric.value.trim().isNotEmpty)
        .toList(growable: false);
  }
}

class _EnergyHeader extends StatelessWidget {
  const _EnergyHeader({
    required this.title,
    required this.sign,
    required this.theme,
    required this.accent,
  });

  final String title;
  final String sign;
  final String theme;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    final signLabel = sign.trim().isEmpty ? 'Energía' : sign.trim();
    final themeText = theme.trim();

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _EnergySignMark(
          sign: signLabel,
          accent: accent,
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: accent.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(color: accent.withValues(alpha: 0.22)),
                ),
                child: Text(
                  signLabel,
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: AppPalette.butterflyInk,
                        fontWeight: FontWeight.w900,
                      ),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                title,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w900,
                      color: AppPalette.butterflyInk,
                    ),
              ),
              if (themeText.isNotEmpty) ...[
                const SizedBox(height: 6),
                Text(
                  themeText,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppPalette.mutedLavender,
                        height: 1.42,
                        fontWeight: FontWeight.w600,
                      ),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

class _EnergySignMark extends StatelessWidget {
  const _EnergySignMark({
    required this.sign,
    required this.accent,
  });

  final String sign;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 68,
      height: 68,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            accent.withValues(alpha: 0.24),
            Colors.white.withValues(alpha: 0.92),
          ],
        ),
        border: Border.all(
          color: accent.withValues(alpha: 0.34),
          width: 1.4,
        ),
      ),
      child: Stack(
        alignment: Alignment.center,
        children: [
          Icon(
            Icons.auto_awesome_rounded,
            color: accent.withValues(alpha: 0.18),
            size: 42,
          ),
          ZodiacSignIcon(
            sign: sign,
            color: AppPalette.butterflyInk,
            size: 31,
          ),
        ],
      ),
    );
  }
}

class _EnergyMetricsGrid extends StatelessWidget {
  const _EnergyMetricsGrid({
    required this.metrics,
  });

  final List<_EnergyMetric> metrics;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final useTwoColumns = constraints.maxWidth >= 300;
        final width = useTwoColumns
            ? (constraints.maxWidth - 10) / 2
            : constraints.maxWidth;

        return Wrap(
          spacing: 10,
          runSpacing: 10,
          children: metrics
              .map(
                (metric) => SizedBox(
                  width: width,
                  child: _EnergyMetricTile(metric: metric),
                ),
              )
              .toList(growable: false),
        );
      },
    );
  }
}

class _EnergyMetricTile extends StatelessWidget {
  const _EnergyMetricTile({
    required this.metric,
  });

  final _EnergyMetric metric;

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(minHeight: 74),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.82),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: metric.accent.withValues(alpha: 0.18),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: metric.accent.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: metric.zodiacSign == null
                ? Icon(
                    metric.icon,
                    color: metric.accent,
                    size: 19,
                  )
                : ZodiacSignIcon(
                    sign: metric.zodiacSign!,
                    color: metric.accent,
                    size: 18,
                  ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  metric.label,
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: AppPalette.mutedLavender,
                        fontWeight: FontWeight.w800,
                      ),
                ),
                const SizedBox(height: 3),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (metric.colorSwatch != null) ...[
                      Container(
                        width: 10,
                        height: 10,
                        margin: const EdgeInsets.only(top: 4, right: 6),
                        decoration: BoxDecoration(
                          color: metric.colorSwatch,
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: AppPalette.butterflyInk.withValues(
                              alpha: 0.1,
                            ),
                          ),
                        ),
                      ),
                    ],
                    Expanded(
                      child: Text(
                        metric.value,
                        softWrap: true,
                        style: Theme.of(context).textTheme.labelLarge?.copyWith(
                              color: AppPalette.butterflyInk,
                              fontWeight: FontWeight.w900,
                              height: 1.22,
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
    );
  }
}

class _EnergyRitualPanel extends StatelessWidget {
  const _EnergyRitualPanel({
    required this.ritual,
    required this.affirmation,
    required this.focusArea,
    required this.accent,
  });

  final String ritual;
  final String affirmation;
  final String focusArea;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    final ritualText = ritual.trim();
    final affirmationText = affirmation.trim();
    final focusText = focusArea.trim();

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppPalette.butterflyInk.withValues(alpha: 0.055),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: accent.withValues(alpha: 0.22)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _EnergyPanelTitle(
            icon: Icons.spa_outlined,
            label: 'Ritual sugerido',
            accent: accent,
          ),
          if (ritualText.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              ritualText,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppPalette.butterflyInk,
                    height: 1.45,
                    fontWeight: FontWeight.w600,
                  ),
            ),
          ],
          if (focusText.isNotEmpty) ...[
            const SizedBox(height: 12),
            _EnergyPanelTitle(
              icon: Icons.track_changes_outlined,
              label: 'Enfoque',
              accent: accent,
            ),
            const SizedBox(height: 8),
            Text(
              focusText,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppPalette.butterflyInk,
                    height: 1.45,
                  ),
            ),
          ],
          if (affirmationText.isNotEmpty) ...[
            const SizedBox(height: 12),
            Divider(
              height: 1,
              color: accent.withValues(alpha: 0.18),
            ),
            const SizedBox(height: 12),
            _EnergyPanelTitle(
              icon: Icons.format_quote_rounded,
              label: 'Afirmación',
              accent: accent,
            ),
            const SizedBox(height: 8),
            Text(
              affirmationText,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppPalette.mutedLavender,
                    fontStyle: FontStyle.italic,
                    height: 1.45,
                    fontWeight: FontWeight.w600,
                  ),
            ),
          ],
        ],
      ),
    );
  }
}

class _EnergyPanelTitle extends StatelessWidget {
  const _EnergyPanelTitle({
    required this.icon,
    required this.label,
    required this.accent,
  });

  final IconData icon;
  final String label;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 28,
          height: 28,
          decoration: BoxDecoration(
            color: accent.withValues(alpha: 0.14),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(
            icon,
            color: accent,
            size: 17,
          ),
        ),
        const SizedBox(width: 9),
        Expanded(
          child: Text(
            label,
            style: Theme.of(context).textTheme.labelLarge?.copyWith(
                  color: AppPalette.butterflyInk,
                  fontWeight: FontWeight.w900,
                ),
          ),
        ),
      ],
    );
  }
}

class _EnergyMetric {
  const _EnergyMetric({
    required this.label,
    required this.value,
    required this.icon,
    required this.accent,
    this.colorSwatch,
    this.zodiacSign,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color accent;
  final Color? colorSwatch;
  final String? zodiacSign;
}

Color _parseEnergyHex(String value) {
  final normalized = value.replaceAll('#', '').trim();
  if (normalized.length == 6) {
    return Color(int.parse('FF$normalized', radix: 16));
  }

  return AppPalette.royalViolet;
}

IconData _elementIcon(String value) {
  switch (_foldEnergyText(value)) {
    case 'fuego':
      return Icons.local_fire_department_rounded;
    case 'agua':
      return Icons.water_drop_outlined;
    case 'aire':
      return Icons.air_rounded;
    case 'tierra':
      return Icons.landscape_outlined;
  }

  return Icons.spa_outlined;
}

Color _elementColor(String value, Color fallback) {
  switch (_foldEnergyText(value)) {
    case 'fuego':
      return AppPalette.flameGold;
    case 'agua':
      return AppPalette.royalViolet;
    case 'aire':
      return AppPalette.indigo;
    case 'tierra':
      return AppPalette.success;
  }

  return fallback;
}

String _foldEnergyText(String value) {
  return value
      .trim()
      .toLowerCase()
      .replaceAll('á', 'a')
      .replaceAll('é', 'e')
      .replaceAll('í', 'i')
      .replaceAll('ó', 'o')
      .replaceAll('ú', 'u');
}
