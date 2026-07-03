import 'package:flutter/material.dart';

import '../../core/i18n/app_i18n.dart';
import '../../core/theme/app_palette.dart';
import '../../core/utils/formatters.dart';
import '../../core/utils/natal_chart_profile.dart';
import '../../models/app_models.dart';
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
    required this.onEnterSpecialistMode,
    required this.onExitSpecialistMode,
    required this.currentLocale,
    required this.onChangeLocale,
  });

  final AppBootstrap data;
  final Future<void> Function() onRefresh;
  final Future<void> Function() onEditProfile;
  final VoidCallback onStartPhoneLogin;
  final Future<void> Function() onLogout;
  final Future<void> Function() onOpenAstralChart;
  final Future<String?> Function() onEnterSpecialistMode;
  final Future<String?> Function() onExitSpecialistMode;
  final Locale currentLocale;
  final Future<void> Function(Locale locale) onChangeLocale;

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
                    if (data.user.energyProfile.isAvailable) ...[
                      const SizedBox(height: 20),
                      _EnergyProfileCard(profile: data.user.energyProfile),
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
            _SpecialistModeCard(
              user: data.user,
              isGuestMode: isGuestMode,
              onStartPhoneLogin: onStartPhoneLogin,
              onEditProfile: onEditProfile,
              onEnterSpecialistMode: onEnterSpecialistMode,
              onExitSpecialistMode: onExitSpecialistMode,
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
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      l10n.tr('payments'),
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      l10n.tr(
                        'consultations',
                        {'provider': data.payments.consultationProvider},
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      l10n.tr(
                        'premium',
                        {'provider': data.payments.premiumProvider},
                      ),
                    ),
                    const SizedBox(height: 12),
                    ...data.payments.notes.map(
                      (item) => Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Text('• $item'),
                      ),
                    ),
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
                            builder: (_) => SupportScreen(data: data),
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

class _SpecialistModeCard extends StatelessWidget {
  const _SpecialistModeCard({
    required this.user,
    required this.isGuestMode,
    required this.onStartPhoneLogin,
    required this.onEditProfile,
    required this.onEnterSpecialistMode,
    required this.onExitSpecialistMode,
  });

  final UserProfile user;
  final bool isGuestMode;
  final VoidCallback onStartPhoneLogin;
  final Future<void> Function() onEditProfile;
  final Future<String?> Function() onEnterSpecialistMode;
  final Future<String?> Function() onExitSpecialistMode;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final isSpecialist = user.accountType == 'specialist';
    final buttonLabel =
        isSpecialist ? l10n.ts('Usuario') : l10n.ts('Especialista');

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppPalette.midnight,
            AppPalette.indigo,
            AppPalette.orchid,
          ],
        ),
        boxShadow: [
          BoxShadow(
            color: AppPalette.indigo.withValues(alpha: 0.22),
            blurRadius: 24,
            offset: const Offset(0, 14),
          ),
        ],
      ),
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.14),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: Colors.white.withValues(alpha: 0.18),
                  ),
                ),
                child: const Icon(
                  Icons.workspace_premium_outlined,
                  color: Colors.white,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isSpecialist
                          ? l10n.ts('Vista especialista activa')
                          : l10n.ts('Administrar como especialista'),
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.w900,
                          ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      isSpecialist
                          ? l10n.ts(
                              'Tu cuenta ya puede gestionar cursos, productos, citas, precios y comunidad desde el panel operativo.',
                            )
                          : l10n.ts(
                              'Usa los mismos datos de tu perfil para habilitar gestión de cursos, productos, citas, precios y comunidad.',
                            ),
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: Colors.white.withValues(alpha: 0.82),
                            height: 1.4,
                          ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _SpecialistModePill(label: l10n.ts('Cursos/PDF')),
              _SpecialistModePill(label: l10n.ts('Productos')),
              _SpecialistModePill(label: l10n.ts('Citas')),
              _SpecialistModePill(label: l10n.ts('Comunidad')),
            ],
          ),
          if (!isGuestMode && !_hasRecommendedSpecialistProfileData(user)) ...[
            const SizedBox(height: 12),
            Text(
              l10n.ts(
                'Puedes activar la vista especialista ahora. Completar nacimiento, ciudad, país y zona horaria mejora la ficha pública y la experiencia operativa.',
              ),
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: AppPalette.moonIvory,
                    fontWeight: FontWeight.w700,
                    height: 1.35,
                  ),
            ),
          ],
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: isSpecialist
                  ? () => _handleClientModeTap(context)
                  : () => _handleSpecialistModeTap(context),
              style: FilledButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: AppPalette.butterflyInk,
              ),
              icon: Icon(
                isSpecialist
                    ? Icons.person_outline_rounded
                    : Icons.arrow_forward_rounded,
              ),
              label: Text(buttonLabel),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _handleSpecialistModeTap(BuildContext context) async {
    final l10n = context.l10n;

    if (isGuestMode) {
      final shouldRegister = await showDialog<bool>(
            context: context,
            builder: (dialogContext) {
              return AlertDialog(
                title: Text(l10n.ts('Registro requerido')),
                content: Text(
                  l10n.ts(
                    'Para administrar cursos, productos, citas y comunidad necesitas registrarte primero con tu teléfono.',
                  ),
                ),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.of(dialogContext).pop(false),
                    child: Text(l10n.ts('Cancelar')),
                  ),
                  FilledButton(
                    onPressed: () => Navigator.of(dialogContext).pop(true),
                    child: Text(l10n.ts('Registrarme')),
                  ),
                ],
              );
            },
          ) ??
          false;

      if (shouldRegister && context.mounted) {
        onStartPhoneLogin();
      }
      return;
    }

    if (user.accountType != 'specialist') {
      final confirmed = await showDialog<bool>(
            context: context,
            builder: (dialogContext) {
              return AlertDialog(
                title: Text(l10n.ts('Activar vista especialista')),
                content: Text(
                  l10n.ts(
                    'Se usará este mismo perfil para habilitar el panel de administración de cursos, productos, citas, precios y comunidad. Luego podrás completar o ajustar tus datos sin perder acceso.',
                  ),
                ),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.of(dialogContext).pop(false),
                    child: Text(l10n.ts('Cancelar')),
                  ),
                  FilledButton(
                    onPressed: () => Navigator.of(dialogContext).pop(true),
                    child: Text(l10n.ts('Activar')),
                  ),
                ],
              );
            },
          ) ??
          false;

      if (!confirmed) {
        return;
      }
    }

    final error = await onEnterSpecialistMode();
    if (!context.mounted) {
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          error ??
              l10n.ts(
                'Vista especialista lista para administrar tu operación.',
              ),
        ),
      ),
    );
  }

  Future<void> _handleClientModeTap(BuildContext context) async {
    final l10n = context.l10n;

    final confirmed = await showDialog<bool>(
          context: context,
          builder: (dialogContext) {
            return AlertDialog(
              title: Text(l10n.ts('Volver a vista usuario')),
              content: Text(
                l10n.ts(
                  'Tu perfil y tus datos se mantienen. Solo se ocultará el panel especialista y volverás a la navegación normal de usuario.',
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(dialogContext).pop(false),
                  child: Text(l10n.ts('Cancelar')),
                ),
                FilledButton(
                  onPressed: () => Navigator.of(dialogContext).pop(true),
                  child: Text(l10n.ts('Volver')),
                ),
              ],
            );
          },
        ) ??
        false;

    if (!confirmed) {
      return;
    }

    final error = await onExitSpecialistMode();
    if (!context.mounted) {
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          error ?? l10n.ts('Vista usuario activada.'),
        ),
      ),
    );
  }
}

class _EnergyProfileCard extends StatelessWidget {
  const _EnergyProfileCard({
    required this.profile,
  });

  final EnergyProfile profile;

  @override
  Widget build(BuildContext context) {
    final swatch = _parseProfileEnergyHex(profile.powerColorHex);

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Colors.white,
            swatch.withValues(alpha: 0.12),
            AppPalette.mistLilac,
          ],
        ),
        border: Border.all(color: AppPalette.border),
      ),
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
                      'Perfil energético',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            color: AppPalette.butterflyInk,
                            fontWeight: FontWeight.w900,
                          ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      profile.energyTheme,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: AppPalette.mutedLavender,
                            height: 1.4,
                          ),
                    ),
                  ],
                ),
              ),
              Container(
                width: 16,
                height: 16,
                decoration: BoxDecoration(
                  color: swatch,
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: AppPalette.butterflyInk.withValues(alpha: 0.08),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              _ProfileEnergyPill(label: 'Signo', value: profile.sign),
              _ProfileEnergyPill(label: 'Elemento', value: profile.element),
              _ProfileEnergyPill(label: 'Modalidad', value: profile.modality),
              _ProfileEnergyPill(
                label: 'Planeta',
                value: profile.rulingPlanet,
              ),
              _ProfileEnergyPill(
                label: 'Color',
                value: profile.powerColorName,
              ),
              _ProfileEnergyPill(
                label: 'Número',
                value: '${profile.energyNumber}',
              ),
              _ProfileEnergyPill(
                label: 'Piedra',
                value: profile.energyStone,
              ),
              _ProfileEnergyPill(label: 'Enfoque', value: profile.focusArea),
            ],
          ),
          const SizedBox(height: 16),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.8),
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: AppPalette.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Ritual sugerido',
                  style: Theme.of(context).textTheme.labelLarge?.copyWith(
                        color: AppPalette.butterflyInk,
                        fontWeight: FontWeight.w800,
                      ),
                ),
                const SizedBox(height: 6),
                Text(
                  profile.ritual,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppPalette.butterflyInk,
                        height: 1.45,
                      ),
                ),
                const SizedBox(height: 12),
                Text(
                  'Afirmación',
                  style: Theme.of(context).textTheme.labelLarge?.copyWith(
                        color: AppPalette.butterflyInk,
                        fontWeight: FontWeight.w800,
                      ),
                ),
                const SizedBox(height: 6),
                Text(
                  profile.affirmation,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppPalette.mutedLavender,
                        fontStyle: FontStyle.italic,
                        height: 1.45,
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

class _ProfileEnergyPill extends StatelessWidget {
  const _ProfileEnergyPill({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.8),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppPalette.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            label,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: AppPalette.mutedLavender,
                  fontWeight: FontWeight.w700,
                ),
          ),
          const SizedBox(height: 2),
          Text(
            value,
            style: Theme.of(context).textTheme.labelLarge?.copyWith(
                  color: AppPalette.butterflyInk,
                  fontWeight: FontWeight.w800,
                ),
          ),
        ],
      ),
    );
  }
}

class _SpecialistModePill extends StatelessWidget {
  const _SpecialistModePill({
    required this.label,
  });

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
          color: AppPalette.moonIvory.withValues(alpha: 0.22),
        ),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.w900,
            ),
      ),
    );
  }
}

Color _parseProfileEnergyHex(String value) {
  final normalized = value.replaceAll('#', '').trim();
  if (normalized.length == 6) {
    return Color(int.parse('FF$normalized', radix: 16));
  }

  return AppPalette.royalViolet;
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

bool _hasRecommendedSpecialistProfileData(UserProfile user) {
  return user.id.trim().isNotEmpty &&
      user.firstName.trim().isNotEmpty &&
      user.lastName.trim().isNotEmpty &&
      hasCompleteNatalProfileData(user.natalChart);
}
