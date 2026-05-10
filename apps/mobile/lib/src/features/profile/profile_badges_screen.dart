import 'package:flutter/material.dart';

import '../../core/i18n/app_i18n.dart';
import '../../core/theme/app_palette.dart';
import '../../core/utils/formatters.dart';
import '../../models/app_models.dart';

class ProfileBadgesScreen extends StatelessWidget {
  const ProfileBadgesScreen({
    super.key,
    required this.data,
  });

  final AppBootstrap data;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final badgeProfile = data.badges;
    final unlocked = badgeProfile.unlockedBadges;
    final visibleLocked = badgeProfile.visibleLockedBadges;
    final hidden = badgeProfile.hiddenBadges;
    final legendaryOrHigher = unlocked
        .where(
          (badge) => badge.rarity == 'LEGENDARY' || badge.rarity == 'MYTHIC',
        )
        .length;

    return Scaffold(
      backgroundColor: AppPalette.midnight,
      appBar: AppBar(
        backgroundColor: AppPalette.midnight,
        foregroundColor: Colors.white,
        title: Text(l10n.ts('Insignias')),
      ),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              AppPalette.midnight,
              AppPalette.indigo,
              Color(0xFF120F24),
            ],
          ),
        ),
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
          children: [
            _BadgeHero(
              userName: data.user.firstName.trim().isEmpty
                  ? l10n.ts('Tu perfil')
                  : data.user.firstName.trim(),
              unlockedCount: badgeProfile.unlockedCount,
              totalCount: badgeProfile.totalCount,
              hiddenCount: badgeProfile.hiddenCount,
              legendaryCount: legendaryOrHigher,
            ),
            const SizedBox(height: 18),
            _SummaryGrid(profile: badgeProfile),
            const SizedBox(height: 20),
            _CategoryStrip(categories: badgeProfile.categories),
            const SizedBox(height: 22),
            _SectionHeader(
              title: l10n.ts('Desbloqueadas'),
              subtitle: l10n.ts(
                '{count} insignias activas dentro de tu recorrido.',
                {'count': '${unlocked.length}'},
              ),
            ),
            const SizedBox(height: 12),
            if (unlocked.isEmpty)
              _EmptyBadgeState(
                title: l10n.ts('Todavía no hay insignias activas'),
                subtitle: l10n.ts(
                  'Las primeras se desbloquean con uso real: tirar cartas, iniciar cursos, comprar o participar en comunidad.',
                ),
              )
            else
              ...unlocked.map(
                (badge) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: _BadgeCard(
                    badge: badge,
                    isUnlocked: true,
                  ),
                ),
              ),
            const SizedBox(height: 14),
            _SectionHeader(
              title: l10n.ts('Por descubrir'),
              subtitle: l10n.ts(
                'Insignias visibles que ya puedes perseguir dentro de la app.',
              ),
            ),
            const SizedBox(height: 12),
            if (visibleLocked.isEmpty)
              _EmptyBadgeState(
                title: l10n.ts('No hay insignias visibles pendientes'),
                subtitle: l10n.ts(
                  'Por ahora ya desbloqueaste todo lo visible o el resto permanece oculto.',
                ),
              )
            else
              ...visibleLocked.map(
                (badge) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: _BadgeCard(
                    badge: badge,
                    isUnlocked: false,
                  ),
                ),
              ),
            if (hidden.isNotEmpty) ...[
              const SizedBox(height: 14),
              _SectionHeader(
                title: l10n.ts('Ocultas'),
                subtitle: l10n.ts(
                  '{count} insignias secretas siguen veladas.',
                  {'count': '${hidden.length}'},
                ),
              ),
              const SizedBox(height: 12),
              ...hidden.map(
                (badge) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: _BadgeCard(
                    badge: badge,
                    isUnlocked: false,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _BadgeHero extends StatelessWidget {
  const _BadgeHero({
    required this.userName,
    required this.unlockedCount,
    required this.totalCount,
    required this.hiddenCount,
    required this.legendaryCount,
  });

  final String userName;
  final int unlockedCount;
  final int totalCount;
  final int hiddenCount;
  final int legendaryCount;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(30),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFF21163E),
            AppPalette.indigo,
            Color(0xFF7B4F98),
          ],
        ),
        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
        boxShadow: [
          BoxShadow(
            color: AppPalette.orchid.withValues(alpha: 0.22),
            blurRadius: 30,
            offset: const Offset(0, 16),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(22),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              l10n.ts('Archivo arcano de {name}', {'name': userName}),
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: Colors.white.withValues(alpha: 0.82),
                    fontWeight: FontWeight.w700,
                  ),
            ),
            const SizedBox(height: 10),
            Text(
              l10n.ts('Tu colección mística'),
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w900,
                  ),
            ),
            const SizedBox(height: 10),
            Text(
              l10n.ts(
                'Cada insignia marca un gesto real dentro de la app: práctica, estudio, comunidad, compra o reconocimiento manual.',
              ),
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Colors.white.withValues(alpha: 0.78),
                    height: 1.45,
                  ),
            ),
            const SizedBox(height: 18),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: [
                _HeroPill(label: '$unlockedCount / $totalCount'),
                _HeroPill(
                  label: l10n.ts(
                    '{count} ocultas',
                    {'count': '$hiddenCount'},
                  ),
                ),
                _HeroPill(
                  label: l10n.ts(
                    '{count} legendarias+',
                    {'count': '$legendaryCount'},
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _HeroPill extends StatelessWidget {
  const _HeroPill({
    required this.label,
  });

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelMedium?.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.w900,
            ),
      ),
    );
  }
}

class _SummaryGrid extends StatelessWidget {
  const _SummaryGrid({
    required this.profile,
  });

  final BadgeProfileSummary profile;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return Wrap(
      spacing: 12,
      runSpacing: 12,
      children: [
        _SummaryTile(
          title: l10n.ts('Desbloqueadas'),
          value: '${profile.unlockedCount}',
          accent: AppPalette.moonIvory,
        ),
        _SummaryTile(
          title: l10n.ts('Pendientes'),
          value: '${profile.lockedCount}',
          accent: AppPalette.orchid,
        ),
        _SummaryTile(
          title: l10n.ts('Secretas'),
          value: '${profile.hiddenCount}',
          accent: AppPalette.royalViolet,
        ),
      ],
    );
  }
}

class _SummaryTile extends StatelessWidget {
  const _SummaryTile({
    required this.title,
    required this.value,
    required this.accent,
  });

  final String title;
  final String value;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 110,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.06),
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: Colors.white.withValues(alpha: 0.76),
                    fontWeight: FontWeight.w700,
                  ),
            ),
            const SizedBox(height: 8),
            Text(
              value,
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    color: accent,
                    fontWeight: FontWeight.w900,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CategoryStrip extends StatelessWidget {
  const _CategoryStrip({
    required this.categories,
  });

  final List<BadgeCategorySummary> categories;

  @override
  Widget build(BuildContext context) {
    if (categories.isEmpty) {
      return const SizedBox.shrink();
    }

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: categories.map((category) {
          return Padding(
            padding: const EdgeInsets.only(right: 10),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.06),
                borderRadius: BorderRadius.circular(999),
                border: Border.all(
                  color: Colors.white.withValues(alpha: 0.08),
                ),
              ),
              child: Text(
                '${category.category} · ${category.unlockedCount}/${category.totalCount}',
                style: Theme.of(context).textTheme.labelMedium?.copyWith(
                      color: Colors.white.withValues(alpha: 0.9),
                      fontWeight: FontWeight.w800,
                    ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({
    required this.title,
    required this.subtitle,
  });

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.w900,
              ),
        ),
        const SizedBox(height: 4),
        Text(
          subtitle,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Colors.white.withValues(alpha: 0.66),
              ),
        ),
      ],
    );
  }
}

class _BadgeCard extends StatelessWidget {
  const _BadgeCard({
    required this.badge,
    required this.isUnlocked,
  });

  final UserBadgeEntry badge;
  final bool isUnlocked;

  @override
  Widget build(BuildContext context) {
    final borderColor = _rarityColor(badge.rarity);
    final symbol = _badgeSymbolFor(badge);

    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: isUnlocked
              ? [
                  Colors.white.withValues(alpha: 0.08),
                  borderColor.withValues(alpha: 0.08),
                ]
              : [
                  Colors.white.withValues(alpha: 0.04),
                  Colors.white.withValues(alpha: 0.02),
                ],
        ),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: borderColor.withValues(alpha: 0.34)),
        boxShadow: isUnlocked
            ? [
                BoxShadow(
                  color: borderColor.withValues(alpha: 0.16),
                  blurRadius: 20,
                  offset: const Offset(0, 12),
                ),
              ]
            : null,
      ),
      padding: const EdgeInsets.all(16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: RadialGradient(
                colors: [
                  borderColor.withValues(alpha: isUnlocked ? 0.38 : 0.18),
                  const Color(0xFF1B1630),
                ],
              ),
              border: Border.all(color: borderColor.withValues(alpha: 0.4)),
            ),
            child: Stack(
              alignment: Alignment.center,
              children: [
                Positioned(
                  top: 10,
                  child: Icon(
                    Icons.circle_outlined,
                    size: 34,
                    color: borderColor.withValues(alpha: 0.22),
                  ),
                ),
                Icon(symbol, color: borderColor, size: 24),
              ],
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    Text(
                      badge.displayName,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.w900,
                          ),
                    ),
                    _MetaChip(
                      label: badge.rarity,
                      color: borderColor,
                    ),
                    _MetaChip(
                      label: badge.category,
                      color: Colors.white.withValues(alpha: 0.68),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  badge.displayDescription,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Colors.white.withValues(alpha: 0.8),
                        height: 1.45,
                      ),
                ),
                const SizedBox(height: 10),
                Text(
                  isUnlocked
                      ? context.l10n.ts(
                          'Desbloqueada: {date}',
                          {
                            'date': badge.unlockedAt == null
                                ? context.l10n.ts('Fecha no disponible')
                                : formatSchedule(badge.unlockedAt!),
                          },
                        )
                      : badge.displayLocked
                          ? context.l10n.ts(
                              'Esta insignia permanece oculta hasta ser revelada.',
                            )
                          : context.l10n.ts(
                              'Tipo: {type}',
                              {'type': badge.type},
                            ),
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Colors.white.withValues(alpha: 0.62),
                        fontWeight: FontWeight.w700,
                      ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _MetaChip extends StatelessWidget {
  const _MetaChip({
    required this.label,
    required this.color,
  });

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withValues(alpha: 0.18)),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: color,
              fontWeight: FontWeight.w900,
            ),
      ),
    );
  }
}

class _EmptyBadgeState extends StatelessWidget {
  const _EmptyBadgeState({
    required this.title,
    required this.subtitle,
  });

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.w900,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            subtitle,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Colors.white.withValues(alpha: 0.72),
                  height: 1.45,
                ),
          ),
        ],
      ),
    );
  }
}

Color _rarityColor(String rarity) {
  switch (rarity.toUpperCase()) {
    case 'MYTHIC':
      return AppPalette.moonIvory;
    case 'LEGENDARY':
      return AppPalette.roseQuartz;
    case 'EPIC':
      return AppPalette.orchid;
    case 'RARE':
      return AppPalette.royalViolet;
    case 'COMMON':
    default:
      return AppPalette.softLilac;
  }
}

IconData _badgeSymbolFor(UserBadgeEntry badge) {
  if (badge.displayLocked) {
    return Icons.lock_outline_rounded;
  }

  switch (badge.id) {
    case 'badge-el-primer-velo':
      return Icons.visibility_outlined;
    case 'badge-el-llamado':
      return Icons.notifications_active_outlined;
    case 'badge-ojos-del-umbral':
      return Icons.remove_red_eye_outlined;
    case 'badge-la-puerta-entreabierta':
      return Icons.door_front_door_outlined;
    case 'badge-el-alma-despierta':
      return Icons.self_improvement_outlined;
    case 'badge-voz-del-arcano':
      return Icons.style_outlined;
    case 'badge-guardian-del-oraculo':
      return Icons.shield_moon_outlined;
    case 'badge-hijo-de-la-luna':
      return Icons.dark_mode_outlined;
    case 'badge-tejedor-del-destino':
      return Icons.account_tree_outlined;
    case 'badge-portador-del-arcano':
      return Icons.auto_stories_outlined;
    case 'badge-ojo-del-vacio':
      return Icons.visibility_outlined;
    case 'badge-explorador-interior':
      return Icons.explore_outlined;
    case 'badge-espejo-del-alma':
      return Icons.face_4_outlined;
    case 'badge-caminante-de-sombras':
      return Icons.nights_stay_outlined;
    case 'badge-el-portal-interior':
      return Icons.radio_button_checked_outlined;
    case 'badge-el-renacido':
      return Icons.autorenew_rounded;
    case 'badge-consejero-etico':
      return Icons.balance_outlined;
    case 'badge-voz-del-circulo':
      return Icons.forum_outlined;
    case 'badge-faro-de-almas':
      return Icons.light_mode_outlined;
    case 'badge-guardian-del-templo':
      return Icons.temple_buddhist_outlined;
    case 'badge-custodio-del-circulo':
      return Icons.panorama_fish_eye_outlined;
    case 'badge-portador-de-armonia':
      return Icons.graphic_eq_outlined;
    case 'badge-primer-ritual':
      return Icons.shopping_bag_outlined;
    case 'badge-coleccionista-mistico':
      return Icons.inventory_2_outlined;
    case 'badge-aliado-del-tarot':
      return Icons.local_mall_outlined;
    case 'badge-guardian-del-santuario':
      return Icons.home_work_outlined;
    case 'badge-mecenas-arcano':
      return Icons.volunteer_activism_outlined;
    case 'badge-guia-del-velo':
      return Icons.menu_book_outlined;
    case 'badge-mentor-arcano':
      return Icons.school_outlined;
    case 'badge-maestro-del-umbral':
      return Icons.cast_for_education_outlined;
    case 'badge-formador-de-almas':
      return Icons.groups_2_outlined;
    case 'badge-oraculo-docente':
      return Icons.library_books_outlined;
    case 'badge-elegido-por-la-luna':
      return Icons.workspace_premium_outlined;
    case 'badge-hijo-del-eclipse':
      return Icons.brightness_3_outlined;
    case 'badge-llama-dorada':
      return Icons.emoji_events_outlined;
    case 'badge-corona-arcana':
      return Icons.diamond_outlined;
    case 'badge-arcano-legendario':
      return Icons.military_tech_outlined;
    case 'badge-la-carta-xiii':
      return Icons.style_outlined;
    case 'badge-el-nombre-olvidado':
      return Icons.key_outlined;
    case 'badge-la-septima-puerta':
      return Icons.meeting_room_outlined;
    case 'badge-el-arcano-perdido':
      return Icons.travel_explore_outlined;
    case 'badge-hijo-del-vacio':
      return Icons.blur_circular_outlined;
    default:
      switch (badge.category.toUpperCase()) {
        case 'DESPERTAR':
          return Icons.auto_awesome_rounded;
        case 'TAROT':
          return Icons.style_outlined;
        case 'PSYCHOLOGY':
          return Icons.psychology_alt_outlined;
        case 'COMMUNITY':
          return Icons.forum_outlined;
        case 'PURCHASE':
          return Icons.shopping_bag_outlined;
        case 'INSTRUCTOR':
          return Icons.menu_book_outlined;
        case 'AWARD':
          return Icons.workspace_premium_outlined;
        case 'SECRET':
          return Icons.visibility_off_outlined;
        default:
          return Icons.stars_rounded;
      }
  }
}
