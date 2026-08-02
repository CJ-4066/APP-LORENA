import 'package:flutter/material.dart';

import '../../core/i18n/app_i18n.dart';
import '../../core/theme/app_palette.dart';
import '../../core/utils/formatters.dart';
import '../../models/app_models.dart';
import '../../models/support_models.dart';
import 'account_center_screens.dart';
import 'profile_badges_screen.dart';
import 'profile_avatar.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({
    super.key,
    required this.data,
    required this.onRefresh,
    required this.onEditProfile,
    required this.onStartPhoneLogin,
    required this.onLogout,
    required this.onOpenAstralChart,
    required this.currentLocale,
    required this.onChangeLocale,
    required this.onLoadSupportTickets,
    required this.onCreateSupportTicket,
    required this.onLoadSupportTicket,
    required this.onSendSupportTicketMessage,
  });

  final AppBootstrap data;
  final Future<void> Function() onRefresh;
  final Future<void> Function() onEditProfile;
  final VoidCallback onStartPhoneLogin;
  final Future<void> Function() onLogout;
  final Future<void> Function() onOpenAstralChart;
  final Locale currentLocale;
  final Future<void> Function(Locale locale) onChangeLocale;
  final Future<List<SupportTicketSummary>> Function() onLoadSupportTickets;
  final Future<SupportTicketDetail> Function({
    required String subject,
    required String category,
    required String body,
  }) onCreateSupportTicket;
  final Future<SupportTicketDetail> Function(String ticketId)
      onLoadSupportTicket;
  final Future<SupportTicketDetail> Function(String ticketId, String body)
      onSendSupportTicketMessage;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final currentLanguage =
        AppLocalizations.languageOptionForLocale(currentLocale);
    final canManageSubscription =
        data.plans.isNotEmpty && data.subscription.platform.trim().isNotEmpty;
    final canOpenPrivacy = data.user.id.trim().isNotEmpty;
    final canOpenSupport = data.admin.activeUsers >= 0;
    final isGuestMode = data.user.id.trim().isEmpty;
    final isAdmin = data.user.roles.contains('admin');
    final badgeProfile = data.badges;
    final unlockedBadges = badgeProfile.unlockedBadges;

    return SafeArea(
      child: RefreshIndicator(
        onRefresh: onRefresh,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
          children: [
            Text(
              l10n.tr('profileTitle'),
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: 18),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        ProfileAvatar(
                          firstName: data.user.firstName,
                          lastName: data.user.lastName,
                          avatarUrl: data.user.avatarUrl,
                          radius: 28,
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                displayUserName(data.user),
                                style: Theme.of(context).textTheme.titleLarge,
                              ),
                              const SizedBox(height: 4),
                              if (data.user.nickname.trim().isNotEmpty)
                                Text(
                                  '@${data.user.nickname.trim()}',
                                  style: Theme.of(context).textTheme.bodyMedium,
                                ),
                              if (data.user.nickname.trim().isNotEmpty)
                                const SizedBox(height: 4),
                              Text(
                                l10n.tr(
                                  'currentPlan',
                                  {'plan': data.subscription.planName},
                                ),
                              ),
                              const SizedBox(height: 8),
                              Wrap(
                                spacing: 8,
                                runSpacing: 8,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 10,
                                      vertical: 6,
                                    ),
                                    decoration: BoxDecoration(
                                      color: AppPalette.softLilac,
                                      borderRadius: BorderRadius.circular(999),
                                    ),
                                    child: Text(
                                      '${badgeProfile.unlockedCount}/${badgeProfile.totalCount} insignias',
                                      style: Theme.of(context)
                                          .textTheme
                                          .labelMedium
                                          ?.copyWith(
                                            color: AppPalette.butterflyInk,
                                            fontWeight: FontWeight.w900,
                                          ),
                                    ),
                                  ),
                                  if (isAdmin)
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 10,
                                        vertical: 6,
                                      ),
                                      decoration: BoxDecoration(
                                        color: AppPalette.orchid.withValues(
                                          alpha: 0.15,
                                        ),
                                        borderRadius:
                                            BorderRadius.circular(999),
                                      ),
                                      child: Text(
                                        l10n.ts('Usuario madre'),
                                        style: Theme.of(context)
                                            .textTheme
                                            .labelMedium
                                            ?.copyWith(
                                              color: AppPalette.indigo,
                                              fontWeight: FontWeight.w900,
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
                    const SizedBox(height: 20),
                    Text(
                      l10n.tr('email'),
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      data.user.email.isEmpty
                          ? l10n.tr('noEmail')
                          : data.user.email,
                    ),
                    const SizedBox(height: 20),
                    Text(
                      l10n.tr('location'),
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      data.user.location.isEmpty
                          ? l10n.tr('noLocation')
                          : data.user.location,
                    ),
                    const SizedBox(height: 20),
                    Text(
                      l10n.tr('natalData'),
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '${data.user.natalChart.birthDate} · ${data.user.natalChart.birthTime}',
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${data.user.natalChart.city}, ${data.user.natalChart.country}',
                    ),
                    if (data.user.natalChart.utcOffset.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        l10n.tr(
                          'utcOffset',
                          {'offset': data.user.natalChart.utcOffset},
                        ),
                      ),
                    ],
                    if (data.user.natalChart.latitude != null &&
                        data.user.natalChart.longitude != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        l10n.tr(
                          'coords',
                          {
                            'lat': '${data.user.natalChart.latitude}',
                            'lng': '${data.user.natalChart.longitude}',
                          },
                        ),
                      ),
                    ],
                    const SizedBox(height: 20),
                    if (isGuestMode) ...[
                      Text(
                        l10n.tr('guestModeTitle'),
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 8),
                      Text(l10n.tr('guestModeSubtitle')),
                      const SizedBox(height: 20),
                    ],
                    Wrap(
                      spacing: 10,
                      runSpacing: 10,
                      children: [
                        if (isGuestMode)
                          FilledButton(
                            onPressed: onStartPhoneLogin,
                            child: Text(l10n.tr('guestModeAction')),
                          )
                        else
                          FilledButton(
                            onPressed: onEditProfile,
                            child: Text(l10n.tr('editProfile')),
                          ),
                        FilledButton.tonal(
                          onPressed: onOpenAstralChart,
                          child: Text(l10n.tr('astralChart')),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                l10n.ts('Insignias'),
                                style: Theme.of(context)
                                    .textTheme
                                    .titleMedium
                                    ?.copyWith(fontWeight: FontWeight.w900),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                l10n.ts(
                                  'Desbloqueadas: {count} · ocultas: {hidden}',
                                  {
                                    'count': '${badgeProfile.unlockedCount}',
                                    'hidden': '${badgeProfile.hiddenCount}',
                                  },
                                ),
                                style: Theme.of(context)
                                    .textTheme
                                    .bodyMedium
                                    ?.copyWith(
                                      color: AppPalette.mutedLavender,
                                    ),
                              ),
                            ],
                          ),
                        ),
                        FilledButton.tonalIcon(
                          onPressed: () async {
                            await Navigator.of(context).push(
                              MaterialPageRoute<void>(
                                builder: (_) => ProfileBadgesScreen(data: data),
                              ),
                            );
                          },
                          icon: const Icon(Icons.auto_awesome_outlined),
                          label: Text(l10n.ts('Ver todas')),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    if (unlockedBadges.isEmpty)
                      Text(
                        l10n.ts(
                          'Todavía no has desbloqueado insignias. Las primeras se activan con uso real de la app.',
                        ),
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: AppPalette.mutedLavender,
                              height: 1.45,
                            ),
                      )
                    else
                      Wrap(
                        spacing: 10,
                        runSpacing: 10,
                        children: unlockedBadges.take(3).map((badge) {
                          return Container(
                            constraints: const BoxConstraints(minWidth: 108),
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 10,
                            ),
                            decoration: BoxDecoration(
                              color: _badgeRarityTint(badge.rarity),
                              borderRadius: BorderRadius.circular(18),
                              border: Border.all(
                                color: _badgeRarityColor(badge.rarity)
                                    .withValues(alpha: 0.28),
                              ),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  badge.displayName,
                                  style: Theme.of(context)
                                      .textTheme
                                      .labelLarge
                                      ?.copyWith(
                                        color: AppPalette.butterflyInk,
                                        fontWeight: FontWeight.w800,
                                      ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  badge.rarity,
                                  style: Theme.of(context)
                                      .textTheme
                                      .labelSmall
                                      ?.copyWith(
                                        color: _badgeRarityColor(badge.rarity),
                                        fontWeight: FontWeight.w900,
                                      ),
                                ),
                              ],
                            ),
                          );
                        }).toList(),
                      ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      l10n.tr('preferences'),
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        ...data.user.preferences.focusAreas
                            .map((item) => Chip(label: Text(item))),
                        ...data.user.preferences.preferredSessionModes
                            .map((item) => Chip(label: Text(item))),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      l10n.tr('subscription'),
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      l10n.tr(
                        'status',
                        {'status': data.subscription.status},
                      ),
                      style: Theme.of(context).textTheme.bodyLarge,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      l10n.tr(
                        'billing',
                        {'provider': data.subscription.billingProvider},
                      ),
                    ),
                    if (data.subscription.renewsAt != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        l10n.tr(
                          'renewsOn',
                          {
                            'date': formatSchedule(data.subscription.renewsAt!),
                          },
                        ),
                      ),
                    ],
                    const SizedBox(height: 12),
                    ...data.subscription.entitlements
                        .take(5)
                        .map((item) => Padding(
                              padding: const EdgeInsets.only(bottom: 6),
                              child: Text('• $item'),
                            )),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            Card(
              child: Column(
                children: [
                  ListTile(
                    leading: const Icon(Icons.language_outlined),
                    title: Text(l10n.tr('language')),
                    subtitle: Text(
                      '${currentLanguage.nativeLabel} · ${l10n.tr('languageDescription')}',
                    ),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () async {
                      await showModalBottomSheet<void>(
                        context: context,
                        showDragHandle: true,
                        builder: (sheetContext) {
                          final sheetL10n = sheetContext.l10n;
                          return SafeArea(
                            child: ListView(
                              shrinkWrap: true,
                              children: [
                                ListTile(
                                  title: Text(sheetL10n.tr('chooseLanguage')),
                                  subtitle: Text(
                                    sheetL10n.tr('languageDescription'),
                                  ),
                                ),
                                ...supportedAppLanguages.map(
                                  (option) => ListTile(
                                    leading: Icon(
                                      option.locale.languageCode ==
                                              currentLocale.languageCode
                                          ? Icons.radio_button_checked
                                          : Icons.radio_button_off,
                                    ),
                                    title: Text(option.nativeLabel),
                                    subtitle: Text(option.label),
                                    onTap: () async {
                                      Navigator.of(sheetContext).pop();
                                      await onChangeLocale(option.locale);
                                    },
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      );
                    },
                  ),
                  const Divider(height: 1),
                  if (canManageSubscription) ...[
                    ListTile(
                      leading: const Icon(Icons.workspace_premium_outlined),
                      title: Text(l10n.tr('manageSubscription')),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () async {
                        await Navigator.of(context).push(
                          MaterialPageRoute<void>(
                            builder: (_) =>
                                SubscriptionOverviewScreen(data: data),
                          ),
                        );
                      },
                    ),
                    const Divider(height: 1),
                  ],
                  if (canOpenPrivacy) ...[
                    ListTile(
                      leading: const Icon(Icons.lock_outline),
                      title: Text(l10n.tr('privacyData')),
                      subtitle: Text(data.user.email),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () async {
                        await Navigator.of(context).push(
                          MaterialPageRoute<void>(
                            builder: (_) => PrivacyDataScreen(
                              user: data.user,
                              onEditProfile: onEditProfile,
                            ),
                          ),
                        );
                      },
                    ),
                    const Divider(height: 1),
                  ],
                  ListTile(
                    leading: const Icon(Icons.military_tech_outlined),
                    title: Text(l10n.ts('Insignias')),
                    subtitle: Text(
                      l10n.ts(
                        '{count} desbloqueadas · {hidden} ocultas',
                        {
                          'count': '${badgeProfile.unlockedCount}',
                          'hidden': '${badgeProfile.hiddenCount}',
                        },
                      ),
                    ),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () async {
                      await Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) => ProfileBadgesScreen(data: data),
                        ),
                      );
                    },
                  ),
                  if (canOpenSupport ||
                      !isGuestMode ||
                      canManageSubscription ||
                      canOpenPrivacy)
                    const Divider(height: 1),
                  if (canOpenSupport)
                    ListTile(
                      leading: const Icon(Icons.support_agent),
                      title: Text(l10n.tr('support')),
                      subtitle: Text(
                        l10n.tr(
                          'activeUsers',
                          {'count': '${data.admin.activeUsers}'},
                        ),
                      ),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () async {
                        await Navigator.of(context).push(
                          MaterialPageRoute<void>(
                            builder: (_) => SupportScreen(
                              data: data,
                              onLoadTickets: onLoadSupportTickets,
                              onCreateTicket: onCreateSupportTicket,
                              onLoadTicket: onLoadSupportTicket,
                              onSendMessage: onSendSupportTicketMessage,
                            ),
                          ),
                        );
                      },
                    ),
                ],
              ),
            ),
            if (!isGuestMode) ...[
              const SizedBox(height: 16),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        l10n.ts('Sesión'),
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        l10n.ts(
                          'Cierra tu sesión en este dispositivo cuando termines de usar la app.',
                        ),
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: AppPalette.mutedLavender,
                            ),
                      ),
                      const SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton.icon(
                          onPressed: () async {
                            final confirmed = await showDialog<bool>(
                                  context: context,
                                  builder: (dialogContext) {
                                    return AlertDialog(
                                      title: Text(l10n.ts('Cerrar sesión')),
                                      content: Text(
                                        l10n.ts(
                                          'Se cerrará tu sesión en este dispositivo.',
                                        ),
                                      ),
                                      actions: [
                                        TextButton(
                                          onPressed: () {
                                            Navigator.of(dialogContext)
                                                .pop(false);
                                          },
                                          child: Text(l10n.ts('Cancelar')),
                                        ),
                                        FilledButton(
                                          onPressed: () {
                                            Navigator.of(dialogContext)
                                                .pop(true);
                                          },
                                          child: Text(
                                            l10n.ts('Cerrar sesión'),
                                          ),
                                        ),
                                      ],
                                    );
                                  },
                                ) ??
                                false;
                            if (!confirmed) {
                              return;
                            }

                            await onLogout();
                          },
                          icon: const Icon(Icons.logout_rounded),
                          label: Text(l10n.ts('Cerrar sesión')),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppPalette.berry,
                            side: const BorderSide(color: AppPalette.berry),
                            padding: const EdgeInsets.symmetric(vertical: 14),
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
    );
  }
}

Color _badgeRarityColor(String rarity) {
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
      return AppPalette.indigo;
  }
}

Color _badgeRarityTint(String rarity) {
  switch (rarity.toUpperCase()) {
    case 'MYTHIC':
      return AppPalette.candleGlow;
    case 'LEGENDARY':
      return AppPalette.petal;
    case 'EPIC':
      return AppPalette.softLilac;
    case 'RARE':
      return AppPalette.mistLilac;
    case 'COMMON':
    default:
      return AppPalette.petalSoft;
  }
}
