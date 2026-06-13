import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

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
    final pathGroups = _groupBadgesByPath(badgeProfile.badges);
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
            _PathOverviewStrip(groups: pathGroups),
            const SizedBox(height: 18),
            if (pathGroups.isEmpty)
              _EmptyBadgeState(
                title: l10n.ts('Todavía no hay rutas visibles'),
                subtitle: l10n.ts(
                  'Las rutas de progreso se mostrarán aquí cuando el perfil cargue insignias.',
                ),
              )
            else
              ...pathGroups.expand(
                (group) => [
                  _SectionHeader(
                    title: group.label,
                    subtitle: l10n.ts(
                      '{count} escalones · {unlocked} desbloqueados',
                      {
                        'count': '${group.badges.length}',
                        'unlocked':
                            '${group.badges.where((badge) => badge.unlocked).length}',
                      },
                    ),
                  ),
                  const SizedBox(height: 12),
                  ...group.badges.map(
                    (badge) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: _BadgeCard(
                        badge: badge,
                        isUnlocked: badge.unlocked,
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                ],
              ),
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

class _BadgePathGroup {
  const _BadgePathGroup({
    required this.pathId,
    required this.pathOrder,
    required this.label,
    required this.badges,
  });

  final String pathId;
  final int pathOrder;
  final String label;
  final List<UserBadgeEntry> badges;
}

class _PathOverviewStrip extends StatelessWidget {
  const _PathOverviewStrip({
    required this.groups,
  });

  final List<_BadgePathGroup> groups;

  @override
  Widget build(BuildContext context) {
    if (groups.isEmpty) {
      return const SizedBox.shrink();
    }

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: groups.map((group) {
          final unlocked = group.badges.where((badge) => badge.unlocked).length;
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
                '${group.label} · $unlocked/${group.badges.length}',
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

List<_BadgePathGroup> _groupBadgesByPath(List<UserBadgeEntry> badges) {
  final groupsByPath = <String, List<UserBadgeEntry>>{};

  for (final badge in badges) {
    final key = badge.pathId.isNotEmpty ? badge.pathId : badge.category;
    final list = groupsByPath.putIfAbsent(key, () => <UserBadgeEntry>[]);
    list.add(badge);
  }

  final result = groupsByPath.entries.map((entry) {
    final sortedBadges = [...entry.value]
      ..sort((left, right) {
        if (left.stepIndex != right.stepIndex) {
          return left.stepIndex - right.stepIndex;
        }
        return left.name.compareTo(right.name);
      });

    final first = sortedBadges.isEmpty ? null : sortedBadges.first;
    return _BadgePathGroup(
      pathId: entry.key,
      pathOrder: first?.pathOrder ?? 0,
      label: _pathLabelForBadge(first),
      badges: sortedBadges,
    );
  }).toList();

  result.sort((left, right) {
    if (left.pathOrder != right.pathOrder) {
      return left.pathOrder - right.pathOrder;
    }
    return left.label.compareTo(right.label);
  });

  return result;
}

String _pathLabelForBadge(UserBadgeEntry? badge) {
  if (badge == null) {
    return 'Ruta';
  }

  if (!badge.isPathVisible) {
    return 'RUTA OCULTA';
  }

  switch (badge.pathId) {
    case 'despertar_path':
      return 'Despertar';
    case 'tarot_path':
      return 'Tarot';
    case 'psychology_path':
      return 'Psicología';
    case 'community_path':
      return 'Comunidad';
    case 'purchase_path':
      return 'Compra';
    case 'instructor_path':
      return 'Instructor';
    case 'award_path':
      return 'Premios';
    case 'secret_path':
      return 'RUTA OCULTA';
    default:
      return badge.category;
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
    final iconUrl = badge.displayIconUrl.trim().isNotEmpty
        ? badge.displayIconUrl.trim()
        : badge.iconUrl.trim();
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
                _BadgeArtwork(
                  iconUrl: iconUrl,
                  fallback: symbol,
                  borderColor: borderColor,
                  isLocked: badge.displayLocked,
                ),
                Positioned(
                  right: 4,
                  bottom: 4,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.36),
                      borderRadius: BorderRadius.circular(999),
                      border: Border.all(
                        color: Colors.white.withValues(alpha: 0.08),
                      ),
                    ),
                    child: Text(
                      '${badge.stepIndex}',
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                            color: Colors.white.withValues(alpha: 0.92),
                            fontWeight: FontWeight.w900,
                          ),
                    ),
                  ),
                ),
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
                      label: 'Paso ${badge.stepIndex}/5',
                      color: Colors.white.withValues(alpha: 0.68),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  badge.stepTitle,
                  style: Theme.of(context).textTheme.labelLarge?.copyWith(
                        color: Colors.white.withValues(alpha: 0.82),
                        fontWeight: FontWeight.w900,
                      ),
                ),
                const SizedBox(height: 6),
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
                      : badge.isConditionHidden
                          ? context.l10n.ts(
                              'Esta insignia permanece oculta hasta ser revelada.',
                            )
                          : context.l10n.ts(
                              badge.lockedReason.isEmpty
                                  ? 'Completa el escalón anterior para continuar.'
                                  : badge.lockedReason,
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

class _BadgeArtwork extends StatelessWidget {
  const _BadgeArtwork({
    required this.iconUrl,
    required this.fallback,
    required this.borderColor,
    required this.isLocked,
  });

  final String iconUrl;
  final IconData fallback;
  final Color borderColor;
  final bool isLocked;

  @override
  Widget build(BuildContext context) {
    final localAssetPath = _localAssetPath(iconUrl);
    final isSvg = iconUrl.toLowerCase().endsWith('.svg') ||
        (localAssetPath != null && localAssetPath.toLowerCase().endsWith('.svg'));
    final canRender = _hasRenderableIconUrl(iconUrl) || localAssetPath != null;

    Widget fallbackWidget() {
      return Icon(fallback, color: borderColor, size: 24);
    }

    if (isLocked || !canRender) {
      return fallbackWidget();
    }

    if (localAssetPath != null) {
      if (isSvg) {
        return SvgPicture.asset(
          localAssetPath,
          width: 52,
          height: 52,
          fit: BoxFit.cover,
          placeholderBuilder: (context) => fallbackWidget(),
        );
      }

      return Image.asset(
        localAssetPath,
        width: 52,
        height: 52,
        fit: BoxFit.cover,
        errorBuilder: (context, error, stackTrace) => fallbackWidget(),
      );
    }

    final isHttp = iconUrl.startsWith('http://') || iconUrl.startsWith('https://');
    if (isHttp && isSvg) {
      return SvgPicture.network(
        iconUrl,
        width: 52,
        height: 52,
        fit: BoxFit.cover,
        placeholderBuilder: (context) => fallbackWidget(),
      );
    }

    if (isHttp) {
      return Image.network(
        iconUrl,
        width: 52,
        height: 52,
        fit: BoxFit.cover,
        errorBuilder: (context, error, stackTrace) => fallbackWidget(),
      );
    }

    return fallbackWidget();
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

  switch (badge.pathId) {
    case 'despertar_path':
      return const [
        Icons.visibility_outlined,
        Icons.notifications_active_outlined,
        Icons.remove_red_eye_outlined,
        Icons.door_front_door_outlined,
        Icons.self_improvement_outlined,
      ][badge.stepIndex.clamp(1, 5) - 1];
    case 'tarot_path':
      return const [
        Icons.style_outlined,
        Icons.shield_moon_outlined,
        Icons.dark_mode_outlined,
        Icons.account_tree_outlined,
        Icons.auto_stories_outlined,
      ][badge.stepIndex.clamp(1, 5) - 1];
    case 'psychology_path':
      return const [
        Icons.explore_outlined,
        Icons.face_4_outlined,
        Icons.nights_stay_outlined,
        Icons.radio_button_checked_outlined,
        Icons.autorenew_rounded,
      ][badge.stepIndex.clamp(1, 5) - 1];
    case 'community_path':
      return const [
        Icons.forum_outlined,
        Icons.light_mode_outlined,
        Icons.temple_buddhist_outlined,
        Icons.panorama_fish_eye_outlined,
        Icons.graphic_eq_outlined,
      ][badge.stepIndex.clamp(1, 5) - 1];
    case 'purchase_path':
      return const [
        Icons.shopping_bag_outlined,
        Icons.inventory_2_outlined,
        Icons.local_mall_outlined,
        Icons.home_work_outlined,
        Icons.volunteer_activism_outlined,
      ][badge.stepIndex.clamp(1, 5) - 1];
    case 'instructor_path':
      return const [
        Icons.menu_book_outlined,
        Icons.school_outlined,
        Icons.cast_for_education_outlined,
        Icons.groups_2_outlined,
        Icons.library_books_outlined,
      ][badge.stepIndex.clamp(1, 5) - 1];
    case 'award_path':
      return const [
        Icons.workspace_premium_outlined,
        Icons.brightness_3_outlined,
        Icons.emoji_events_outlined,
        Icons.diamond_outlined,
        Icons.military_tech_outlined,
      ][badge.stepIndex.clamp(1, 5) - 1];
    case 'secret_path':
      return const [
        Icons.style_outlined,
        Icons.key_outlined,
        Icons.meeting_room_outlined,
        Icons.travel_explore_outlined,
        Icons.blur_circular_outlined,
      ][badge.stepIndex.clamp(1, 5) - 1];
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

bool _hasRenderableIconUrl(String iconUrl) {
  return RegExp(r'^(https?:\/\/|data:image\/|blob:|\/assets\/|assets\/)').hasMatch(iconUrl);
}

String? _localAssetPath(String iconUrl) {
  if (iconUrl.startsWith('/assets/')) {
    return iconUrl.substring(1);
  }

  if (iconUrl.startsWith('assets/')) {
    return iconUrl;
  }

  return null;
}
