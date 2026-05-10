import 'dart:async';
import 'dart:math';
import 'dart:ui' show lerpDouble;

import 'package:flutter/material.dart';

import '../../core/branding/renaciente_logo.dart';
import '../../core/config/app_config.dart';
import '../../core/i18n/app_i18n.dart';
import '../../core/theme/app_palette.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/mystic_ui.dart';
import '../../models/app_models.dart';

enum _TarotSpreadFocus {
  daily,
  clarity,
  love,
  work,
}

const _tarotTransitionDuration = Duration(milliseconds: 260);
const _tarotTransitionInCurve = Curves.easeOutCubic;
const _tarotTransitionOutCurve = Curves.easeInCubic;
const _tarotSecondaryText = AppPalette.butterflyInk;
const _tarotMutedText = AppPalette.mutedLavender;

class _TarotCatalog {
  const _TarotCatalog({
    required this.services,
    required this.specialists,
    required this.courses,
    required this.nextBooking,
  });

  const _TarotCatalog.empty()
      : services = const [],
        specialists = const [],
        courses = const [],
        nextBooking = null;

  final List<ServiceOffer> services;
  final List<Specialist> specialists;
  final List<Course> courses;
  final Booking? nextBooking;
}

class TarotScreen extends StatefulWidget {
  const TarotScreen({
    super.key,
    required this.data,
    required this.onRefresh,
    required this.onCreateBooking,
    this.onTrackTarotDraw,
  });

  final AppBootstrap data;
  final Future<void> Function() onRefresh;
  final Future<void> Function(String? initialServiceId) onCreateBooking;
  final Future<void> Function()? onTrackTarotDraw;

  @override
  State<TarotScreen> createState() => _TarotScreenState();
}

class _TarotScreenState extends State<TarotScreen> {
  _TarotCatalog _catalog = const _TarotCatalog.empty();
  bool _isRefreshing = false;

  @override
  void initState() {
    super.initState();
    _refreshCatalog();
  }

  @override
  void didUpdateWidget(covariant TarotScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (identical(oldWidget.data, widget.data)) {
      return;
    }
    _refreshCatalog();
  }

  void _refreshCatalog() {
    _catalog = _buildTarotCatalog(widget.data);
  }

  Future<void> _handleRefresh() async {
    if (_isRefreshing) {
      return;
    }

    setState(() {
      _isRefreshing = true;
    });

    try {
      await widget.onRefresh();
    } finally {
      if (mounted) {
        setState(() {
          _isRefreshing = false;
        });
      }
    }
  }

  void _openDailyCardDetail() {
    final l10n = context.l10n;
    final dailyCard = widget.data.home.cardOfTheDay;
    final card = _TarotCardMeaning(
      name: dailyCard.cardName,
      message: l10n.ts(dailyCard.message),
      action: l10n.ts(dailyCard.ritual),
      caution: _tarotSupportLine(dailyCard.cardName, l10n),
      imageUrl: dailyCard.imageUrl,
    );

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (_) {
        return _TarotCardDetailSheet(
          data: widget.data,
          item: _TarotDrawnCard(
            positionLabel: l10n.tr('cardOfDay'),
            card: card,
          ),
          focus: _TarotSpreadFocus.daily,
        );
      },
    );
  }

  void _openDailyCompleteSpread({
    required String? featuredServiceId,
  }) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => _DailySpreadIntroScreen(
          data: widget.data,
          featuredServiceId: featuredServiceId,
          onCreateBooking: widget.onCreateBooking,
          onTrackTarotDraw: widget.onTrackTarotDraw,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final dailyCard = widget.data.home.cardOfTheDay;
    final tarotServices = _catalog.services;
    final featuredServiceId =
        tarotServices.isEmpty ? null : tarotServices.first.id;

    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            AppPalette.shellGradientTop,
            AppPalette.shellGradientMid,
            AppPalette.shellGradientBottom,
          ],
        ),
      ),
      child: SafeArea(
        child: RefreshIndicator(
          onRefresh: _handleRefresh,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
            children: [
              _TarotHeroCard(
                cardName: dailyCard.cardName,
                cardMessage: dailyCard.message,
                cardRitual: dailyCard.ritual,
                cardImageUrl: dailyCard.imageUrl,
                onTap: _openDailyCardDetail,
                onSchedule: featuredServiceId == null
                    ? null
                    : () => widget.onCreateBooking(featuredServiceId),
                onOpenSpread: () => _openDailyCompleteSpread(
                  featuredServiceId: featuredServiceId,
                ),
                isLoading: _isRefreshing,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

Widget _buildTarotSwitcherTransition(
  Widget child,
  Animation<double> animation,
) {
  final curved = CurvedAnimation(
    parent: animation,
    curve: _tarotTransitionInCurve,
    reverseCurve: _tarotTransitionOutCurve,
  );
  final slide = Tween<Offset>(
    begin: const Offset(0, 0.025),
    end: Offset.zero,
  ).animate(curved);

  return FadeTransition(
    opacity: curved,
    child: SlideTransition(
      position: slide,
      child: child,
    ),
  );
}

class _TarotSkeletonCard extends StatelessWidget {
  const _TarotSkeletonCard({
    required this.height,
  });

  final double height;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      height: height,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppPalette.moonIvory,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppPalette.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: const [
          _TarotSkeletonBox(width: 132, height: 16),
          SizedBox(height: 14),
          _TarotSkeletonBox(width: double.infinity, height: 12),
          SizedBox(height: 8),
          _TarotSkeletonBox(width: double.infinity, height: 12),
          SizedBox(height: 8),
          _TarotSkeletonBox(width: 210, height: 12),
          Spacer(),
          _TarotSkeletonBox(width: 146, height: 34, radius: 16),
        ],
      ),
    );
  }
}

class _TarotSkeletonBox extends StatefulWidget {
  const _TarotSkeletonBox({
    required this.width,
    required this.height,
    this.radius = 10,
  });

  final double width;
  final double height;
  final double radius;

  @override
  State<_TarotSkeletonBox> createState() => _TarotSkeletonBoxState();
}

class _TarotSkeletonBoxState extends State<_TarotSkeletonBox>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        final alpha = 0.08 + (_controller.value * 0.10);
        return Container(
          width: widget.width,
          height: widget.height,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(widget.radius),
            gradient: LinearGradient(
              begin: Alignment.centerLeft,
              end: Alignment.centerRight,
              colors: [
                AppPalette.orchid.withValues(alpha: alpha),
                AppPalette.royalViolet.withValues(alpha: alpha + 0.06),
                AppPalette.orchid.withValues(alpha: alpha),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _TarotHeroCard extends StatelessWidget {
  const _TarotHeroCard({
    required this.cardName,
    required this.cardMessage,
    required this.cardRitual,
    required this.cardImageUrl,
    required this.onTap,
    required this.onSchedule,
    required this.onOpenSpread,
    this.isLoading = false,
  });

  final String cardName;
  final String cardMessage;
  final String cardRitual;
  final String cardImageUrl;
  final VoidCallback onTap;
  final VoidCallback? onSchedule;
  final VoidCallback onOpenSpread;
  final bool isLoading;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return LayoutBuilder(
      builder: (context, constraints) {
        final isCompact = constraints.maxWidth < 700;
        final stackActions = constraints.maxWidth < 520;
        final artWidth = isCompact
            ? min(((constraints.maxWidth - 60) * 0.42), 170.0).toDouble()
            : 186.0;

        final art = SizedBox(
          width: artWidth,
          child: isLoading
              ? const AspectRatio(
                  aspectRatio: 0.64,
                  child: _TarotSkeletonBox(
                    width: double.infinity,
                    height: double.infinity,
                    radius: 28,
                  ),
                )
              : _DailyTarotCardArt(
                  cardName: cardName,
                  cardRitual: cardRitual,
                  imageUrl: cardImageUrl,
                  centerFooter: true,
                  centerHeader: true,
                  showHeader: false,
                  showMetaFooter: false,
                  showRefreshLabel: false,
                  maxFaceHeight: double.infinity,
                  imageFit: BoxFit.contain,
                  imageScale: 1,
                  faceAspectRatio: cardName == 'El Mundo' ? 0.59 : 0.78,
                ),
        );

        final actions = stackActions
            ? Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  FilledButton.icon(
                    onPressed: onSchedule,
                    style: FilledButton.styleFrom(
                      backgroundColor: AppPalette.royalViolet,
                      foregroundColor: Colors.white,
                    ),
                    icon: const Icon(Icons.calendar_month_outlined),
                    label: Text(l10n.tr('tarotScheduleReading')),
                  ),
                  const SizedBox(height: 10),
                  OutlinedButton.icon(
                    onPressed: onOpenSpread,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppPalette.indigo,
                      side: const BorderSide(color: AppPalette.border),
                      backgroundColor: AppPalette.moonIvory,
                    ),
                    icon: const _AnimatedButterflyIcon(size: 18),
                    label: Text(l10n.tr('tarotOpenSpread')),
                  ),
                ],
              )
            : Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  FilledButton.icon(
                    onPressed: onSchedule,
                    style: FilledButton.styleFrom(
                      backgroundColor: AppPalette.royalViolet,
                      foregroundColor: Colors.white,
                    ),
                    icon: const Icon(Icons.calendar_month_outlined),
                    label: Text(l10n.tr('tarotScheduleReading')),
                  ),
                  OutlinedButton.icon(
                    onPressed: onOpenSpread,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppPalette.indigo,
                      side: const BorderSide(color: AppPalette.border),
                      backgroundColor: AppPalette.moonIvory,
                    ),
                    icon: const _AnimatedButterflyIcon(size: 18),
                    label: Text(l10n.tr('tarotOpenSpread')),
                  ),
                ],
              );

        final heroHeader = Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (isLoading)
              const _TarotSkeletonBox(width: 190, height: 24, radius: 12)
            else
              Text(
                l10n.ts(cardName),
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      color: AppPalette.midnight,
                      fontWeight: FontWeight.w900,
                      height: 1.02,
                    ),
              ),
            const SizedBox(height: 10),
            if (isLoading)
              const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _TarotSkeletonBox(
                      width: double.infinity, height: 11, radius: 8),
                  SizedBox(height: 7),
                  _TarotSkeletonBox(width: 220, height: 11, radius: 8),
                ],
              )
            else
              Text(
                l10n.tr('tarotHeroSummary'),
                style: const TextStyle(
                  color: _tarotMutedText,
                  fontSize: 14,
                  height: 1.4,
                ),
              ),
          ],
        );

        final heroDetails = Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (isLoading)
              const _TarotSkeletonCard(height: 126)
            else
              _HeroNoteCard(
                title: l10n.tr('tarotHeroMessageTitle'),
                body: l10n.ts(cardMessage),
                icon: Icons.menu_book_outlined,
                accent: AppPalette.royalViolet,
              ),
            const SizedBox(height: 12),
            if (isLoading)
              const _TarotSkeletonCard(height: 126)
            else
              _HeroNoteCard(
                title: l10n.tr('tarotHeroActionTitle'),
                body: l10n.ts(cardRitual),
                icon: Icons.bolt_outlined,
                accent: AppPalette.flameGold,
              ),
            const SizedBox(height: 16),
            if (isLoading)
              const _TarotSkeletonBox(width: 184, height: 40, radius: 14)
            else
              actions,
          ],
        );

        final copy = Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (isCompact)
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(child: heroHeader),
                  const SizedBox(width: 16),
                  art,
                ],
              )
            else
              heroHeader,
            const SizedBox(height: 18),
            heroDetails,
          ],
        );

        return Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: isLoading ? null : onTap,
            borderRadius: BorderRadius.circular(30),
            child: Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(30),
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    AppPalette.moonIvory,
                    AppPalette.mistLilac,
                    AppPalette.softLilac,
                  ],
                ),
                border: Border.all(color: AppPalette.border),
                boxShadow: [
                  BoxShadow(
                    color: AppPalette.orchid.withValues(alpha: 0.22),
                    blurRadius: 24,
                    offset: const Offset(0, 16),
                  ),
                ],
              ),
              child: isCompact
                  ? copy
                  : Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(child: copy),
                        const SizedBox(width: 18),
                        art,
                      ],
                    ),
            ),
          ),
        );
      },
    );
  }
}

class _AnimatedButterflyIcon extends StatelessWidget {
  const _AnimatedButterflyIcon({
    required this.size,
  });

  final double size;

  @override
  Widget build(BuildContext context) {
    return RepaintBoundary(
      child: RenacienteAnimatedLogoMark(
        size: size,
        accentColor: AppPalette.butterflyInk,
        wingInsetColor: AppPalette.orchid,
        glowColor: AppPalette.roseQuartz,
        surfaceColor: AppPalette.candleGlow,
      ),
    );
  }
}

class _DailySpreadIntroScreen extends StatefulWidget {
  const _DailySpreadIntroScreen({
    required this.data,
    required this.featuredServiceId,
    required this.onCreateBooking,
    required this.onTrackTarotDraw,
  });

  final AppBootstrap data;
  final String? featuredServiceId;
  final Future<void> Function(String? initialServiceId) onCreateBooking;
  final Future<void> Function()? onTrackTarotDraw;

  @override
  State<_DailySpreadIntroScreen> createState() =>
      _DailySpreadIntroScreenState();
}

class _DailySpreadIntroScreenState extends State<_DailySpreadIntroScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _shuffleController;
  bool _isShuffling = false;

  @override
  void initState() {
    super.initState();
    _shuffleController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 3200),
    );
  }

  @override
  void dispose() {
    _shuffleController.dispose();
    super.dispose();
  }

  Future<void> _openSpread() async {
    if (_isShuffling) {
      return;
    }

    setState(() {
      _isShuffling = true;
    });

    try {
      await _shuffleController.forward(from: 0).orCancel;
    } on TickerCanceled {
      return;
    }

    if (!mounted) {
      return;
    }

    unawaited(widget.onTrackTarotDraw?.call());

    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => _DailyCompleteSpreadScreen(
          data: widget.data,
          featuredServiceId: widget.featuredServiceId,
          onCreateBooking: widget.onCreateBooking,
        ),
      ),
    );

    if (!mounted) {
      return;
    }

    _shuffleController.reset();
    setState(() {
      _isShuffling = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              AppPalette.shellGradientTop,
              AppPalette.shellGradientMid,
              AppPalette.shellGradientBottom,
            ],
          ),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 14, 20, 26),
            child: Column(
              children: [
                Row(
                  children: [
                    IconButton.filledTonal(
                      onPressed: () => Navigator.of(context).pop(),
                      icon: const Icon(Icons.arrow_back_rounded),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        l10n.tr('tarotOpenSpread'),
                        style:
                            Theme.of(context).textTheme.headlineSmall?.copyWith(
                                  fontWeight: FontWeight.w900,
                                  color: AppPalette.midnight,
                                ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                Expanded(
                  child: Center(
                    child: _DailySpreadIntroArt(
                      isShuffling: _isShuffling,
                      shuffleProgress: _shuffleController,
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: _isShuffling ? null : _openSpread,
                    style: FilledButton.styleFrom(
                      backgroundColor: AppPalette.royalViolet,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 18),
                      textStyle:
                          Theme.of(context).textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.w800,
                                letterSpacing: 0.2,
                              ),
                    ),
                    child: Text(l10n.tr('tarotDrawThreeCards')),
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

class _DailySpreadIntroArt extends StatefulWidget {
  const _DailySpreadIntroArt({
    this.isShuffling = false,
    this.shuffleProgress,
  });

  final bool isShuffling;
  final Animation<double>? shuffleProgress;

  @override
  State<_DailySpreadIntroArt> createState() => _DailySpreadIntroArtState();
}

class _DailySpreadIntroArtState extends State<_DailySpreadIntroArt>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 6200),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final mergedAnimation = Listenable.merge([
      _controller,
      if (widget.shuffleProgress != null) widget.shuffleProgress!,
    ]);

    return LayoutBuilder(
      builder: (context, constraints) {
        final width = min(constraints.maxWidth, 420.0);
        return AnimatedBuilder(
          animation: mergedAnimation,
          builder: (context, _) {
            final phase = _controller.value * pi * 2;
            final cardFloatY = sin(phase * 0.55) * 9;
            final cardRoll = sin(phase * 0.38) * 0.04;

            return SizedBox(
              width: width,
              child: AspectRatio(
                aspectRatio: 0.82,
                child: Stack(
                  clipBehavior: Clip.none,
                  alignment: Alignment.center,
                  children: [
                    Positioned(
                      top: 26,
                      right: width * 0.1,
                      child: _AuraOrb(
                        size: width * 0.26,
                        color: AppPalette.orchid.withValues(alpha: 0.12),
                      ),
                    ),
                    Positioned(
                      left: width * 0.08,
                      bottom: width * 0.08,
                      child: _AuraOrb(
                        size: width * 0.22,
                        color: AppPalette.flameGold.withValues(alpha: 0.1),
                      ),
                    ),
                    AnimatedSwitcher(
                      duration: const Duration(milliseconds: 260),
                      switchInCurve: Curves.easeOutCubic,
                      switchOutCurve: Curves.easeInCubic,
                      transitionBuilder: (child, animation) {
                        return FadeTransition(
                          opacity: animation,
                          child: ScaleTransition(
                            scale: Tween<double>(
                              begin: 0.98,
                              end: 1,
                            ).animate(animation),
                            child: child,
                          ),
                        );
                      },
                      child:
                          widget.isShuffling && widget.shuffleProgress != null
                              ? _DailySpreadShuffleStage(
                                  progress: widget.shuffleProgress!,
                                  showAura: false,
                                  cardWidthOverride: min(width * 0.58, 236.0),
                                )
                              : Transform.translate(
                                  key: const ValueKey('intro-card'),
                                  offset: Offset(0, cardFloatY),
                                  child: Transform.rotate(
                                    angle: cardRoll,
                                    child: const _TarotCardBackPoster(),
                                  ),
                                ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }
}

class _AuraOrb extends StatelessWidget {
  const _AuraOrb({
    required this.size,
    required this.color,
  });

  final double size;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: RadialGradient(
            colors: [
              color,
              color.withValues(alpha: 0),
            ],
          ),
        ),
      ),
    );
  }
}

class _TarotCardBackPoster extends StatelessWidget {
  const _TarotCardBackPoster();

  @override
  Widget build(BuildContext context) {
    final palette = _paletteForCard('La Luna');

    return ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 320),
      child: AspectRatio(
        aspectRatio: 0.64,
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            Positioned(
              left: 16,
              top: 18,
              child: _CardShadowLayer(
                palette: palette,
                opacity: 0.12,
                offset: const Offset(8, 10),
                angle: -0.04,
              ),
            ),
            Positioned(
              left: 6,
              top: 8,
              child: _CardShadowLayer(
                palette: palette,
                opacity: 0.18,
                offset: const Offset(4, 5),
                angle: 0.02,
              ),
            ),
            Positioned.fill(
              child: Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppPalette.moonIvory,
                  borderRadius: BorderRadius.circular(28),
                  border: Border.all(color: AppPalette.border),
                  boxShadow: [
                    BoxShadow(
                      color: AppPalette.indigo.withValues(alpha: 0.16),
                      blurRadius: 28,
                      offset: const Offset(0, 18),
                    ),
                  ],
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(22),
                  child: const _TarotCardBackFace(),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TarotCardBackFace extends StatelessWidget {
  const _TarotCardBackFace();

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppPalette.midnight,
            AppPalette.indigo,
            AppPalette.royalViolet,
            AppPalette.orchid,
          ],
          stops: [0, 0.38, 0.72, 1],
        ),
      ),
      child: Stack(
        fit: StackFit.expand,
        children: [
          Positioned(
            top: -26,
            right: -18,
            child: Container(
              width: 110,
              height: 110,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppPalette.moonIvory.withValues(alpha: 0.06),
              ),
            ),
          ),
          Positioned(
            bottom: -18,
            left: -22,
            child: Container(
              width: 132,
              height: 132,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppPalette.flameGold.withValues(alpha: 0.07),
              ),
            ),
          ),
          CustomPaint(
            painter: const _TarotCardBackPatternPainter(),
          ),
          Align(
            alignment: Alignment.center,
            child: Container(
              width: 108,
              height: 108,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppPalette.moonIvory.withValues(alpha: 0.07),
                border: Border.all(
                  color: AppPalette.moonIvory.withValues(alpha: 0.28),
                ),
                boxShadow: [
                  BoxShadow(
                    color: AppPalette.flameGold.withValues(alpha: 0.12),
                    blurRadius: 24,
                    spreadRadius: 2,
                  ),
                ],
              ),
              child: Center(
                child: RenacienteAnimatedLogoMark(
                  size: 74,
                  accentColor: AppPalette.moonIvory,
                  wingInsetColor: AppPalette.flameGold,
                  glowColor: AppPalette.roseQuartz,
                  surfaceColor: AppPalette.candleGlow,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _TarotCardBackPatternPainter extends CustomPainter {
  const _TarotCardBackPatternPainter();

  @override
  void paint(Canvas canvas, Size size) {
    final outerRect = RRect.fromRectAndRadius(
      Offset.zero & size,
      const Radius.circular(22),
    );
    final innerRect = RRect.fromRectAndRadius(
      Rect.fromLTWH(14, 14, size.width - 28, size.height - 28),
      const Radius.circular(18),
    );
    final outerPaint = Paint()
      ..color = AppPalette.moonIvory.withValues(alpha: 0.22)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.4;
    final innerPaint = Paint()
      ..color = AppPalette.moonIvory.withValues(alpha: 0.12)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;
    canvas.drawRRect(outerRect, outerPaint);
    canvas.drawRRect(innerRect, innerPaint);

    final center = Offset(size.width / 2, size.height / 2);
    final linePaint = Paint()
      ..color = AppPalette.moonIvory.withValues(alpha: 0.18)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.2;
    final goldPaint = Paint()
      ..color = AppPalette.flameGold.withValues(alpha: 0.34)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.1;

    canvas.drawLine(
      Offset(center.dx, 24),
      Offset(center.dx, size.height - 24),
      linePaint,
    );
    canvas.drawCircle(center, size.width * 0.23, linePaint);
    canvas.drawCircle(center, size.width * 0.15, goldPaint);

    final diamond = Path()
      ..moveTo(center.dx, center.dy - size.width * 0.28)
      ..lineTo(center.dx + size.width * 0.18, center.dy)
      ..lineTo(center.dx, center.dy + size.width * 0.28)
      ..lineTo(center.dx - size.width * 0.18, center.dy)
      ..close();
    canvas.drawPath(diamond, linePaint);

    final cornerPaint = Paint()
      ..color = AppPalette.flameGold.withValues(alpha: 0.28)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;

    final cornerRadius = size.width * 0.16;
    final corners = <Rect>[
      Rect.fromCircle(
        center: const Offset(34, 34),
        radius: cornerRadius,
      ),
      Rect.fromCircle(
        center: Offset(size.width - 34, 34),
        radius: cornerRadius,
      ),
      Rect.fromCircle(
        center: Offset(34, size.height - 34),
        radius: cornerRadius,
      ),
      Rect.fromCircle(
        center: Offset(size.width - 34, size.height - 34),
        radius: cornerRadius,
      ),
    ];
    final starts = <double>[0.2, 1.38, -1.02, 2.15];
    for (var i = 0; i < corners.length; i++) {
      canvas.drawArc(corners[i], starts[i], pi / 2.8, false, cornerPaint);
    }

    final starPaint = Paint()
      ..color = AppPalette.moonIvory.withValues(alpha: 0.28)
      ..style = PaintingStyle.fill;
    for (final point in [
      Offset(size.width * 0.24, size.height * 0.24),
      Offset(size.width * 0.76, size.height * 0.24),
      Offset(size.width * 0.24, size.height * 0.76),
      Offset(size.width * 0.76, size.height * 0.76),
      Offset(size.width * 0.5, size.height * 0.16),
      Offset(size.width * 0.5, size.height * 0.84),
    ]) {
      canvas.drawCircle(point, 2.4, starPaint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _DailyCompleteSpreadScreen extends StatefulWidget {
  const _DailyCompleteSpreadScreen({
    required this.data,
    required this.featuredServiceId,
    required this.onCreateBooking,
  });

  final AppBootstrap data;
  final String? featuredServiceId;
  final Future<void> Function(String? initialServiceId) onCreateBooking;

  @override
  State<_DailyCompleteSpreadScreen> createState() =>
      _DailyCompleteSpreadScreenState();
}

class _DailyCompleteSpreadScreenState extends State<_DailyCompleteSpreadScreen>
    with SingleTickerProviderStateMixin {
  late final PageController _pageController;
  late final AnimationController _orbitController;

  List<_TarotDrawnCard> _cards = const [];
  int _activeIndex = 0;
  bool _seededCards = false;
  bool _showAllCards = false;
  bool _isPresentingCardDetail = false;
  double _orbitAngleOffset = 0;

  @override
  void initState() {
    super.initState();
    _pageController = PageController(viewportFraction: 0.72)
      ..addListener(_syncActiveIndex);
    _orbitController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 9600),
    )
      ..addListener(_updateActiveOrbitIndex)
      ..repeat();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_seededCards) {
      return;
    }

    _cards = _buildDailySpreadCards(
      referenceDate: DateTime.now(),
      l10n: context.l10n,
    );
    _seededCards = true;
  }

  @override
  void dispose() {
    _orbitController.removeListener(_updateActiveOrbitIndex);
    _orbitController.dispose();
    _pageController
      ..removeListener(_syncActiveIndex)
      ..dispose();
    super.dispose();
  }

  void _syncActiveIndex() {
    if (!_pageController.hasClients || _cards.isEmpty) {
      return;
    }

    final page = _pageController.page ?? _activeIndex.toDouble();
    final nextIndex = page.round().clamp(0, _cards.length - 1);
    if (nextIndex == _activeIndex) {
      return;
    }

    setState(() {
      _activeIndex = nextIndex;
    });
  }

  void _openCardDetail(_TarotDrawnCard item) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (_) {
        return _TarotCardDetailSheet(
          data: widget.data,
          item: item,
          focus: _TarotSpreadFocus.daily,
        );
      },
    );
  }

  void _updateActiveOrbitIndex() {
    if (_cards.isEmpty) {
      return;
    }

    final baseAngle = (_orbitController.value * pi * 2) + _orbitAngleOffset;
    var nextIndex = _activeIndex;
    var bestDepth = double.negativeInfinity;

    for (var index = 0; index < _cards.length; index++) {
      final angle = baseAngle + (index * ((pi * 2) / _cards.length));
      final depth = cos(angle);
      if (depth > bestDepth) {
        bestDepth = depth;
        nextIndex = index;
      }
    }

    if (nextIndex == _activeIndex) {
      return;
    }

    setState(() {
      _activeIndex = nextIndex;
    });
  }

  void _handleOrbitDragUpdate(double deltaX) {
    setState(() {
      _orbitAngleOffset += deltaX / 180;
    });
    _updateActiveOrbitIndex();
  }

  Future<void> _openOrbitCardDetail(int index) async {
    if (_isPresentingCardDetail) {
      return;
    }

    setState(() {
      _activeIndex = index;
      _isPresentingCardDetail = true;
    });

    try {
      await Future<void>.delayed(const Duration(milliseconds: 140));
      if (!mounted) {
        return;
      }

      final item = _cards[index];
      await showGeneralDialog<void>(
        context: context,
        barrierLabel:
            MaterialLocalizations.of(context).modalBarrierDismissLabel,
        barrierDismissible: true,
        barrierColor: AppPalette.midnight.withValues(alpha: 0.42),
        transitionDuration: const Duration(milliseconds: 340),
        pageBuilder: (dialogContext, _, __) {
          return SafeArea(
            child: Align(
              alignment: Alignment.bottomCenter,
              child: _TarotCardDetailSheet(
                data: widget.data,
                item: item,
                focus: _TarotSpreadFocus.daily,
              ),
            ),
          );
        },
        transitionBuilder:
            (dialogContext, animation, secondaryAnimation, child) {
          final curved = CurvedAnimation(
            parent: animation,
            curve: Curves.easeOutCubic,
            reverseCurve: Curves.easeInCubic,
          );
          return FadeTransition(
            opacity: curved,
            child: SlideTransition(
              position: Tween<Offset>(
                begin: const Offset(0, 0.08),
                end: Offset.zero,
              ).animate(curved),
              child: ScaleTransition(
                scale: Tween<double>(
                  begin: 0.985,
                  end: 1,
                ).animate(curved),
                child: child,
              ),
            ),
          );
        },
      );
    } finally {
      if (mounted) {
        setState(() {
          _isPresentingCardDetail = false;
        });
      } else {
        _isPresentingCardDetail = false;
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    if (_cards.isEmpty) {
      return Scaffold(
        backgroundColor: Colors.transparent,
        body: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                AppPalette.shellGradientTop,
                AppPalette.shellGradientMid,
                AppPalette.shellGradientBottom,
              ],
            ),
          ),
          child: const SafeArea(
            child: Center(
              child: CircularProgressIndicator(),
            ),
          ),
        ),
      );
    }

    final activeCard = _cards[_activeIndex];

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              AppPalette.shellGradientTop,
              AppPalette.shellGradientMid,
              AppPalette.shellGradientBottom,
            ],
          ),
        ),
        child: SafeArea(
          child: AnimatedSwitcher(
            duration: const Duration(milliseconds: 420),
            switchInCurve: Curves.easeOutCubic,
            switchOutCurve: Curves.easeInCubic,
            transitionBuilder: (child, animation) {
              return FadeTransition(
                opacity: animation,
                child: SlideTransition(
                  position: Tween<Offset>(
                    begin: const Offset(0, 0.04),
                    end: Offset.zero,
                  ).animate(animation),
                  child: child,
                ),
              );
            },
            child: _showAllCards
                ? _DailySpreadRevealedView(
                    key: const ValueKey('daily-spread-revealed'),
                    l10n: l10n,
                    cards: _cards,
                    activeIndex: _activeIndex,
                    activeCard: activeCard,
                    pageController: _pageController,
                    onBack: () => Navigator.of(context).pop(),
                    onCardTap: _openCardDetail,
                    onPageChanged: (index) {
                      if (index == _activeIndex) {
                        return;
                      }
                      setState(() {
                        _activeIndex = index;
                      });
                    },
                    onBookReading: widget.featuredServiceId == null
                        ? null
                        : () =>
                            widget.onCreateBooking(widget.featuredServiceId),
                  )
                : _DailySpreadSelectionView(
                    key: const ValueKey('daily-spread-selection'),
                    l10n: l10n,
                    cards: _cards,
                    activeIndex: _activeIndex,
                    orbitProgress: _orbitController,
                    orbitAngleOffset: _orbitAngleOffset,
                    onBack: () => Navigator.of(context).pop(),
                    onCardTap: _openOrbitCardDetail,
                    onOrbitDragUpdate: _handleOrbitDragUpdate,
                    onShowAll: () {
                      setState(() {
                        _showAllCards = true;
                      });
                    },
                  ),
          ),
        ),
      ),
    );
  }
}

class _DailySpreadSelectionView extends StatelessWidget {
  const _DailySpreadSelectionView({
    super.key,
    required this.l10n,
    required this.cards,
    required this.activeIndex,
    required this.orbitProgress,
    required this.orbitAngleOffset,
    required this.onBack,
    required this.onCardTap,
    required this.onOrbitDragUpdate,
    required this.onShowAll,
  });

  final AppLocalizations l10n;
  final List<_TarotDrawnCard> cards;
  final int activeIndex;
  final Animation<double> orbitProgress;
  final double orbitAngleOffset;
  final VoidCallback onBack;
  final ValueChanged<int> onCardTap;
  final ValueChanged<double> onOrbitDragUpdate;
  final VoidCallback onShowAll;

  @override
  Widget build(BuildContext context) {
    final activeCard = cards[activeIndex];

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 14, 20, 28),
      children: [
        Row(
          children: [
            IconButton.filledTonal(
              onPressed: onBack,
              icon: const Icon(Icons.arrow_back_rounded),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                l10n.tr('tarotOpenSpread'),
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w900,
                      color: AppPalette.midnight,
                    ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Text(
          l10n.ts(
            'Toca una carta para abrir su significado o explora la tirada completa cuando quieras.',
          ),
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: _tarotSecondaryText,
                height: 1.45,
              ),
        ),
        const SizedBox(height: 18),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.fromLTRB(18, 18, 18, 20),
          decoration: BoxDecoration(
            color: AppPalette.moonIvory,
            borderRadius: BorderRadius.circular(26),
            border: Border.all(color: AppPalette.border),
          ),
          child: Column(
            children: [
              _DailySpreadOrbitStage(
                cards: cards,
                activeIndex: activeIndex,
                progress: orbitProgress,
                angleOffset: orbitAngleOffset,
                onCardTap: onCardTap,
                onDragUpdate: onOrbitDragUpdate,
              ),
              const SizedBox(height: 18),
              AnimatedSwitcher(
                duration: const Duration(milliseconds: 320),
                switchInCurve: Curves.easeOutCubic,
                switchOutCurve: Curves.easeInCubic,
                transitionBuilder: (child, animation) {
                  return FadeTransition(
                    opacity: animation,
                    child: SlideTransition(
                      position: Tween<Offset>(
                        begin: const Offset(0, 0.06),
                        end: Offset.zero,
                      ).animate(animation),
                      child: child,
                    ),
                  );
                },
                child: Column(
                  key: ValueKey(
                    '${activeCard.positionLabel}-${activeCard.card.name}',
                  ),
                  children: [
                    Text(
                      context.l10n.ts(activeCard.positionLabel),
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: AppPalette.royalViolet,
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.35,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      context.l10n.ts(activeCard.card.name),
                      textAlign: TextAlign.center,
                      style:
                          Theme.of(context).textTheme.headlineSmall?.copyWith(
                                color: const Color(0xFF35203F),
                                fontWeight: FontWeight.w900,
                              ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      context.l10n.ts(activeCard.card.message),
                      textAlign: TextAlign.center,
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: _tarotSecondaryText,
                            height: 1.42,
                          ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 18),
        Row(
          children: [
            Expanded(
              child: FilledButton.icon(
                onPressed: onShowAll,
                icon: const Icon(Icons.view_carousel_outlined),
                label: Text(l10n.ts('Ver todas')),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () => onCardTap(activeIndex),
                icon: const Icon(Icons.menu_book_rounded),
                label: Text(l10n.ts('Ver significado')),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppPalette.royalViolet,
                  side: const BorderSide(color: AppPalette.royalViolet),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _DailySpreadOrbitStage extends StatelessWidget {
  const _DailySpreadOrbitStage({
    required this.cards,
    required this.activeIndex,
    required this.progress,
    required this.angleOffset,
    required this.onCardTap,
    required this.onDragUpdate,
  });

  final List<_TarotDrawnCard> cards;
  final int activeIndex;
  final Animation<double> progress;
  final double angleOffset;
  final ValueChanged<int> onCardTap;
  final ValueChanged<double> onDragUpdate;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = min(constraints.maxWidth, 420.0);
        final cardWidth = min(width * 0.38, 156.0);
        final orbitRadius = width * 0.235;

        return GestureDetector(
          behavior: HitTestBehavior.translucent,
          onHorizontalDragUpdate: (details) {
            final delta = details.primaryDelta;
            if (delta == null) {
              return;
            }
            onDragUpdate(delta);
          },
          child: AnimatedBuilder(
            animation: progress,
            builder: (context, _) {
              final items = cards.asMap().entries.map((entry) {
                final index = entry.key;
                final item = entry.value;
                final angle = (progress.value * pi * 2) +
                    angleOffset +
                    (index * ((pi * 2) / cards.length));
                final depth = (cos(angle) + 1) / 2;
                final scale = lerpDouble(0.84, 1.08, depth)!;
                final translateX = sin(angle) * orbitRadius;
                final translateY = lerpDouble(26, -48, depth)!;
                final tiltY = sin(angle) * 0.38;
                final tiltZ = sin(angle) * 0.06;
                final isHighlighted = index == activeIndex;

                return _OrbitCardSceneItem(
                  depth: depth,
                  child: Transform.translate(
                    offset: Offset(translateX, translateY),
                    child: Transform(
                      alignment: Alignment.center,
                      transform: Matrix4.identity()
                        ..setEntry(3, 2, 0.0015)
                        ..rotateY(tiltY)
                        ..rotateZ(tiltZ)
                        ..scaleByDouble(scale, scale, 1, 1),
                      child: GestureDetector(
                        onTap: () => onCardTap(index),
                        child: AnimatedScale(
                          duration: const Duration(milliseconds: 260),
                          curve: Curves.easeOutCubic,
                          scale: isHighlighted ? 1.06 : 1,
                          child: AnimatedOpacity(
                            duration: const Duration(milliseconds: 260),
                            opacity: isHighlighted ? 1 : 0.94,
                            child: SizedBox(
                              width: cardWidth,
                              child: IgnorePointer(
                                child: _TarotCardPoster(
                                  cardName: item.card.name,
                                  imageUrl: item.card.imageUrl,
                                  framed: false,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                );
              }).toList()
                ..sort((a, b) => a.depth.compareTo(b.depth));

              return SizedBox(
                width: width,
                height: width * 0.98,
                child: Stack(
                  clipBehavior: Clip.none,
                  alignment: Alignment.center,
                  children: [
                    Positioned(
                      bottom: width * 0.12,
                      child: Container(
                        width: width * 0.62,
                        height: width * 0.16,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(999),
                          gradient: RadialGradient(
                            colors: [
                              AppPalette.roseQuartz.withValues(alpha: 0.24),
                              AppPalette.flameGold.withValues(alpha: 0.14),
                              AppPalette.orchid.withValues(alpha: 0),
                            ],
                          ),
                        ),
                      ),
                    ),
                    Positioned(
                      bottom: width * 0.135,
                      child: Container(
                        width: width * 0.5,
                        height: 2,
                        decoration: BoxDecoration(
                          color: AppPalette.royalViolet.withValues(alpha: 0.22),
                          borderRadius: BorderRadius.circular(999),
                        ),
                      ),
                    ),
                    ...items.map((item) => item.child),
                  ],
                ),
              );
            },
          ),
        );
      },
    );
  }
}

class _OrbitCardSceneItem {
  const _OrbitCardSceneItem({
    required this.depth,
    required this.child,
  });

  final double depth;
  final Widget child;
}

class _DailySpreadShuffleStage extends StatelessWidget {
  const _DailySpreadShuffleStage({
    required this.progress,
    this.cardWidthOverride,
    this.showAura = true,
  });

  final Animation<double> progress;
  final double? cardWidthOverride;
  final bool showAura;

  static const int _deckCount = 78;
  static const int _visibleDeckCount = 14;

  static int _logicalIndexForVisual(int visualIndex) {
    final halfVisibleDeck = _visibleDeckCount ~/ 2;
    if (visualIndex < halfVisibleDeck) {
      final ratio =
          halfVisibleDeck == 1 ? 0.0 : visualIndex / (halfVisibleDeck - 1);
      return (ratio * 38).round();
    }

    final rightVisualIndex = visualIndex - halfVisibleDeck;
    final ratio =
        halfVisibleDeck == 1 ? 0.0 : rightVisualIndex / (halfVisibleDeck - 1);
    return 39 + (ratio * 38).round();
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = min(constraints.maxWidth, 430.0);
        final cardWidth = cardWidthOverride ?? min(width * 0.29, 122.0);

        return AnimatedBuilder(
          animation: progress,
          builder: (context, _) {
            final t = progress.value;
            return SizedBox(
              width: width,
              child: AspectRatio(
                aspectRatio: 0.82,
                child: Stack(
                  clipBehavior: Clip.none,
                  alignment: Alignment.center,
                  children: [
                    if (showAura)
                      Positioned(
                        top: 20,
                        right: width * 0.06,
                        child: _AuraOrb(
                          size: width * 0.28,
                          color: AppPalette.orchid.withValues(alpha: 0.14),
                        ),
                      ),
                    if (showAura)
                      Positioned(
                        left: width * 0.03,
                        bottom: width * 0.06,
                        child: _AuraOrb(
                          size: width * 0.24,
                          color: AppPalette.flameGold.withValues(alpha: 0.11),
                        ),
                      ),
                    RepaintBoundary(
                      child: Stack(
                        clipBehavior: Clip.none,
                        alignment: Alignment.center,
                        // Sample the 78-card deck instead of painting every
                        // large card every frame. The motion still follows a
                        // full deck, but the scene stays stable on iPhone.
                        children: List.generate(_visibleDeckCount, (index) {
                          return _ShufflingDeckCard(
                            index: _logicalIndexForVisual(index),
                            progress: t,
                            width: cardWidth,
                          );
                        }),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }
}

class _ShufflingDeckCard extends StatelessWidget {
  const _ShufflingDeckCard({
    required this.index,
    required this.progress,
    required this.width,
  });

  final int index;
  final double progress;
  final double width;

  @override
  Widget build(BuildContext context) {
    final split = Curves.easeOutCubic.transform(
      (progress / 0.18).clamp(0.0, 1.0),
    );
    final riffle = ((progress - 0.18) / 0.46).clamp(0.0, 1.0);
    final bridge = Curves.easeInOutCubic.transform(
      ((progress - 0.64) / 0.18).clamp(0.0, 1.0),
    );
    final square = Curves.easeOutCubic.transform(
      ((progress - 0.82) / 0.18).clamp(0.0, 1.0),
    );

    final side = index < 39 ? -1.0 : 1.0;
    final packetIndex = side < 0 ? 38 - index : index - 39;
    final targetOrder = side < 0 ? packetIndex * 2 : (packetIndex * 2) + 1;
    final orderRatio = targetOrder / (_DailySpreadShuffleStage._deckCount - 1);
    final depthOffset =
        (_DailySpreadShuffleStage._deckCount - targetOrder) * 0.34;
    final packetLift = packetIndex * 0.58;
    final riffleLocal = Curves.easeOutCubic.transform(
      ((riffle * 1.34) - (packetIndex * 0.026)).clamp(0.0, 1.0),
    );
    final flutter = sin((progress * pi * 8) + (packetIndex * 0.52));

    final splitX = side * ((width * 0.34) + (packetIndex * (width * 0.0022)));
    final splitY = (packetIndex - 19) * (width * 0.0036) - packetLift;
    final splitRotation = side * (0.18 + (packetIndex * 0.0022));

    var x = lerpDouble(0, splitX, split)!;
    var y = lerpDouble(-depthOffset, splitY, split)!;
    var rotation = lerpDouble(0, splitRotation, split)!;

    final interleaveX = side * ((width * 0.012) - (packetIndex * 0.004));
    final interleaveY = -depthOffset + ((targetOrder - 39) * (width * 0.00062));
    final interleaveRotation = side * 0.014;

    x = lerpDouble(x, interleaveX, riffleLocal)!;
    y = lerpDouble(y, interleaveY, riffleLocal)!;
    rotation = lerpDouble(rotation, interleaveRotation, riffleLocal)!;

    if (riffleLocal > 0 && bridge == 0) {
      x += side * flutter * 1.6 * (1 - riffleLocal);
      y += flutter * 1.2 * (1 - riffleLocal);
    }

    final bridgeWave = sin(bridge * pi);
    final bridgeArch = sin(orderRatio * pi) * (width * 0.12) * bridgeWave;
    final bridgeTilt = cos(orderRatio * pi) * 0.14 * bridgeWave;
    y -= bridgeArch;
    rotation += bridgeTilt;

    x = lerpDouble(x, 0, square)!;
    y = lerpDouble(y, -depthOffset * 0.22, square)!;
    rotation = lerpDouble(rotation, 0, square)!;

    final scale =
        0.95 + (targetOrder / _DailySpreadShuffleStage._deckCount) * 0.07;

    return IgnorePointer(
      child: Transform(
        alignment: Alignment.center,
        transform: Matrix4.identity()
          ..setEntry(3, 2, 0.0018)
          ..translateByDouble(x, y, -(targetOrder.toDouble()), 1)
          ..rotateZ(rotation)
          ..scaleByDouble(scale, scale, 1, 1),
        child: _TarotDeckBackCard(
          width: width,
          simplified: true,
        ),
      ),
    );
  }
}

class _TarotDeckBackCard extends StatelessWidget {
  const _TarotDeckBackCard({
    required this.width,
    this.simplified = false,
  });

  final double width;
  final bool simplified;

  @override
  Widget build(BuildContext context) {
    if (simplified) {
      return SizedBox(
        width: width,
        child: AspectRatio(
          aspectRatio: 0.64,
          child: Stack(
            fit: StackFit.expand,
            children: [
              DecoratedBox(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: AppPalette.moonIvory.withValues(alpha: 0.24),
                  ),
                  gradient: const LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      AppPalette.midnight,
                      AppPalette.indigo,
                      AppPalette.royalViolet,
                      AppPalette.orchid,
                    ],
                    stops: [0, 0.38, 0.72, 1],
                  ),
                ),
              ),
              Positioned(
                top: -18,
                right: -14,
                child: IgnorePointer(
                  child: Container(
                    width: width * 0.42,
                    height: width * 0.42,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppPalette.moonIvory.withValues(alpha: 0.05),
                    ),
                  ),
                ),
              ),
              Positioned(
                bottom: -14,
                left: -16,
                child: IgnorePointer(
                  child: Container(
                    width: width * 0.48,
                    height: width * 0.48,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppPalette.flameGold.withValues(alpha: 0.06),
                    ),
                  ),
                ),
              ),
              CustomPaint(
                painter: const _TarotCardBackPatternPainter(),
              ),
              Center(
                child: Container(
                  width: width * 0.34,
                  height: width * 0.34,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: AppPalette.moonIvory.withValues(alpha: 0.06),
                    border: Border.all(
                      color: AppPalette.moonIvory.withValues(alpha: 0.22),
                    ),
                  ),
                  child: Center(
                    child: RenacienteLogoMark(
                      size: width * 0.18,
                      accentColor: AppPalette.moonIvory,
                      wingInsetColor: AppPalette.flameGold,
                      glowColor: AppPalette.roseQuartz,
                      surfaceColor: AppPalette.candleGlow,
                      showHalo: false,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      );
    }

    return SizedBox(
      width: width,
      child: AspectRatio(
        aspectRatio: 0.64,
        child: Container(
          padding: const EdgeInsets.all(4.5),
          decoration: BoxDecoration(
            color: AppPalette.moonIvory,
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: AppPalette.border),
            boxShadow: [
              BoxShadow(
                color: AppPalette.indigo.withValues(alpha: 0.12),
                blurRadius: 14,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(18),
            child: DecoratedBox(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    AppPalette.midnight,
                    AppPalette.indigo,
                    AppPalette.royalViolet,
                    AppPalette.orchid,
                  ],
                  stops: [0, 0.38, 0.72, 1],
                ),
              ),
              child: Stack(
                fit: StackFit.expand,
                children: [
                  CustomPaint(
                    painter: const _TarotCardBackPatternPainter(),
                  ),
                  Align(
                    alignment: Alignment.center,
                    child: Container(
                      width: width * 0.28,
                      height: width * 0.28,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: AppPalette.moonIvory.withValues(alpha: 0.08),
                        border: Border.all(
                          color: AppPalette.moonIvory.withValues(alpha: 0.24),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _DailySpreadRevealedView extends StatelessWidget {
  const _DailySpreadRevealedView({
    super.key,
    required this.l10n,
    required this.cards,
    required this.activeIndex,
    required this.activeCard,
    required this.pageController,
    required this.onBack,
    required this.onCardTap,
    required this.onPageChanged,
    required this.onBookReading,
  });

  final AppLocalizations l10n;
  final List<_TarotDrawnCard> cards;
  final int activeIndex;
  final _TarotDrawnCard activeCard;
  final PageController pageController;
  final VoidCallback onBack;
  final ValueChanged<_TarotDrawnCard> onCardTap;
  final ValueChanged<int> onPageChanged;
  final VoidCallback? onBookReading;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 14, 20, 28),
      children: [
        Row(
          children: [
            IconButton.filledTonal(
              onPressed: onBack,
              icon: const Icon(Icons.arrow_back_rounded),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                l10n.tr('tarotOpenSpread'),
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w900,
                      color: AppPalette.midnight,
                    ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 18),
        _SurfaceCard(
          title: l10n.tr('tarotCombinedReadingTitle'),
          titleAccent: AppPalette.royalViolet,
          titleForeground: Colors.white,
          titleIcon: Icons.auto_awesome_rounded,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                _buildDailySpreadSynthesis(cards, l10n),
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: _tarotSecondaryText,
                      height: 1.48,
                    ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 22),
        SizedBox(
          height: 420,
          child: PageView.builder(
            controller: pageController,
            clipBehavior: Clip.none,
            physics: const BouncingScrollPhysics(),
            itemCount: cards.length,
            onPageChanged: onPageChanged,
            itemBuilder: (context, index) {
              final item = cards[index];
              return _DailySpreadCarouselCard(
                controller: pageController,
                index: index,
                item: item,
                isActive: index == activeIndex,
                onTap: () => onCardTap(item),
              );
            },
          ),
        ),
        const SizedBox(height: 12),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(
            cards.length,
            (index) => AnimatedContainer(
              duration: const Duration(milliseconds: 220),
              margin: const EdgeInsets.symmetric(horizontal: 4),
              width: index == activeIndex ? 26 : 8,
              height: 8,
              decoration: BoxDecoration(
                color: index == activeIndex
                    ? AppPalette.royalViolet
                    : AppPalette.border,
                borderRadius: BorderRadius.circular(999),
              ),
            ),
          ),
        ),
        const SizedBox(height: 18),
        AnimatedSwitcher(
          duration: _tarotTransitionDuration,
          switchInCurve: _tarotTransitionInCurve,
          switchOutCurve: _tarotTransitionOutCurve,
          transitionBuilder: _buildTarotSwitcherTransition,
          child: _DailySpreadActivePanel(
            key: ValueKey(
              '${activeCard.positionLabel}-${activeCard.card.name}',
            ),
            item: activeCard,
            index: activeIndex,
            total: cards.length,
            onOpenDetail: () => onCardTap(activeCard),
          ),
        ),
        const SizedBox(height: 18),
        _SurfaceCard(
          title: l10n.tr('tarotDailySequenceTitle'),
          child: Column(
            children: cards.asMap().entries.map((entry) {
              return _DailySpreadSequenceRow(
                item: entry.value,
                showDivider: entry.key < cards.length - 1,
              );
            }).toList(),
          ),
        ),
        if (onBookReading != null) ...[
          const SizedBox(height: 18),
          FilledButton.icon(
            onPressed: onBookReading,
            icon: const Icon(Icons.calendar_month_outlined),
            label: Text(l10n.tr('tarotBookGuidedReading')),
          ),
        ],
      ],
    );
  }
}

class _DailySpreadCarouselCard extends StatelessWidget {
  const _DailySpreadCarouselCard({
    required this.controller,
    required this.index,
    required this.item,
    required this.isActive,
    required this.onTap,
  });

  final PageController controller;
  final int index;
  final _TarotDrawnCard item;
  final bool isActive;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: controller,
      builder: (context, child) {
        var page = controller.initialPage.toDouble();
        if (controller.hasClients && controller.position.haveDimensions) {
          page = controller.page ?? controller.initialPage.toDouble();
        }

        final delta = (index - page).clamp(-1.2, 1.2);
        final absDelta = delta.abs();
        final rotation = delta * -0.58;
        final scale = 1 - (absDelta * 0.12);
        final lift = 1 - (absDelta * 0.08);
        final translateX = delta * 32.0;
        final translateY = absDelta * 18.0;

        return Transform(
          alignment: delta >= 0 ? Alignment.centerLeft : Alignment.centerRight,
          transform: Matrix4.identity()
            ..setEntry(3, 2, 0.0016)
            ..translateByDouble(translateX, translateY, -absDelta * 42, 1)
            ..rotateY(rotation)
            ..scaleByDouble(scale, lift, 1, 1),
          child: Opacity(
            opacity: (1 - (absDelta * 0.42)).clamp(0.58, 1.0),
            child: child,
          ),
        );
      },
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 10),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(28),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(8, 8, 8, 14),
              child: Column(
                children: [
                  Expanded(
                    child: Center(
                      child: Transform.scale(
                        scale: isActive ? 1 : 0.96,
                        child: _TarotCardPoster(
                          cardName: item.card.name,
                          imageUrl: item.card.imageUrl,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Text(
                    context.l10n.ts(item.card.name),
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF35203F),
                        ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _DailySpreadActivePanel extends StatelessWidget {
  const _DailySpreadActivePanel({
    super.key,
    required this.item,
    required this.index,
    required this.total,
    required this.onOpenDetail,
  });

  final _TarotDrawnCard item;
  final int index;
  final int total;
  final VoidCallback onOpenDetail;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Text(
          l10n.tr(
            'tarotCardOfCount',
            {
              'current': '${index + 1}',
              'total': '$total',
            },
          ),
          textAlign: TextAlign.center,
          style: const TextStyle(
            color: AppPalette.royalViolet,
            fontSize: 12,
            fontWeight: FontWeight.w800,
            letterSpacing: 0.35,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          item.positionLabel,
          textAlign: TextAlign.center,
          style: const TextStyle(
            color: AppPalette.flameGold,
            fontSize: 14,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 14),
        OutlinedButton.icon(
          onPressed: onOpenDetail,
          icon: const Icon(Icons.open_in_full_rounded),
          label: Text(l10n.tr('tarotOpenCardDetail')),
        ),
      ],
    );
  }
}

class _DailySpreadSequenceRow extends StatelessWidget {
  const _DailySpreadSequenceRow({
    required this.item,
    required this.showDivider,
  });

  final _TarotDrawnCard item;
  final bool showDivider;

  @override
  Widget build(BuildContext context) {
    final palette = _paletteForCard(item.card.name);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Column(
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: palette.accent.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  palette.icon,
                  size: 18,
                  color: palette.accent,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.positionLabel,
                      style: TextStyle(
                        color: palette.accent,
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.3,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      context.l10n.ts(item.card.name),
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w800,
                            color: AppPalette.midnight,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _tarotSupportLine(item.card.name, context.l10n),
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: _tarotSecondaryText,
                            height: 1.38,
                          ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (showDivider) ...[
            const SizedBox(height: 14),
            const Divider(
              height: 1,
              color: AppPalette.border,
            ),
          ],
        ],
      ),
    );
  }
}

class _HeroNoteCard extends StatelessWidget {
  const _HeroNoteCard({
    required this.title,
    required this.body,
    required this.icon,
    required this.accent,
  });

  final String title;
  final String body;
  final IconData icon;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.78),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: accent.withValues(alpha: 0.16)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: accent.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, size: 18, color: accent),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    color: accent,
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.2,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  body,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: _tarotSecondaryText,
                        height: 1.42,
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

class _DailyTarotCardArt extends StatefulWidget {
  const _DailyTarotCardArt({
    required this.cardName,
    required this.cardRitual,
    this.imageUrl = '',
    this.showHeader = true,
    this.centerFooter = false,
    this.showRefreshLabel = true,
    this.centerHeader = false,
    this.showMetaFooter = true,
    this.maxFaceHeight = 168,
    this.imageFit = BoxFit.contain,
    this.imageScale = 1,
    this.faceAspectRatio = 0.78,
  });

  final String cardName;
  final String cardRitual;
  final String imageUrl;
  final bool showHeader;
  final bool centerFooter;
  final bool showRefreshLabel;
  final bool centerHeader;
  final bool showMetaFooter;
  final double maxFaceHeight;
  final BoxFit imageFit;
  final double imageScale;
  final double faceAspectRatio;

  @override
  State<_DailyTarotCardArt> createState() => _DailyTarotCardArtState();
}

class _DailyTarotCardArtState extends State<_DailyTarotCardArt>
    with TickerProviderStateMixin {
  late final AnimationController _controller;
  late final AnimationController _dragController;
  Animation<double>? _dragAnimation;
  double _dragTurn = 0;
  int _dragSequence = 0;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 9),
    )..repeat(reverse: true);
    _dragController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 360),
    )..addListener(() {
        final dragAnimation = _dragAnimation;
        if (dragAnimation == null || !mounted) {
          return;
        }
        setState(() {
          _dragTurn = dragAnimation.value;
        });
      });
  }

  @override
  void dispose() {
    _dragController.dispose();
    _controller.dispose();
    super.dispose();
  }

  void _handleHorizontalDragStart(DragStartDetails details) {
    _dragSequence += 1;
    if (_dragController.isAnimating) {
      _dragController.stop();
    }
  }

  void _handleHorizontalDragUpdate(DragUpdateDetails details) {
    final delta = details.primaryDelta ?? details.delta.dx;
    final nextTurn = (_dragTurn + (delta * 0.0032)).clamp(-0.24, 0.24);
    if ((nextTurn - _dragTurn).abs() < 0.0001) {
      return;
    }
    if (_dragController.isAnimating) {
      _dragController.stop();
    }
    setState(() {
      _dragTurn = nextTurn;
    });
  }

  Future<void> _handleHorizontalDragEnd(DragEndDetails details) async {
    final sequence = ++_dragSequence;
    final velocityKick = (details.velocity.pixelsPerSecond.dx / 5400)
        .clamp(-0.09, 0.09)
        .toDouble();
    final overshoot = (_dragTurn + velocityKick).clamp(-0.28, 0.28).toDouble();

    await _animateDragTurnTo(
      overshoot,
      duration: const Duration(milliseconds: 110),
      curve: Curves.easeOut,
    );
    if (!mounted || sequence != _dragSequence) {
      return;
    }
    await _animateDragTurnTo(
      0,
      duration: const Duration(milliseconds: 420),
      curve: Curves.easeOutBack,
    );
  }

  Future<void> _handleHorizontalDragCancel() {
    final sequence = ++_dragSequence;
    return _animateBackToCenter(sequence);
  }

  Future<void> _animateBackToCenter(int sequence) async {
    await _animateDragTurnTo(
      0,
      duration: const Duration(milliseconds: 320),
      curve: Curves.easeOutCubic,
    );
    if (!mounted || sequence != _dragSequence) {
      return;
    }
  }

  Future<void> _animateDragTurnTo(
    double target, {
    required Duration duration,
    required Curve curve,
  }) async {
    if ((_dragTurn - target).abs() < 0.0001) {
      if (mounted && target == 0 && _dragTurn != 0) {
        setState(() {
          _dragTurn = 0;
        });
      }
      return;
    }
    _dragAnimation = Tween<double>(
      begin: _dragTurn,
      end: target,
    ).animate(
      CurvedAnimation(
        parent: _dragController,
        curve: curve,
      ),
    );
    _dragController.duration = duration;
    _dragController.reset();
    try {
      await _dragController.forward().orCancel;
    } on TickerCanceled {
      return;
    }
  }

  @override
  Widget build(BuildContext context) {
    final style = _paletteForCard(widget.cardName);
    final trimmedImageUrl = widget.imageUrl.trim();
    final resolvedImageUrl = trimmedImageUrl.isNotEmpty
        ? trimmedImageUrl
        : _buildTarotCardImageUrl(widget.cardName);
    final assetPath = _buildTarotCardAssetPath(widget.cardName);
    final hasImage = assetPath.isNotEmpty || resolvedImageUrl.isNotEmpty;

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onHorizontalDragStart: _handleHorizontalDragStart,
      onHorizontalDragUpdate: _handleHorizontalDragUpdate,
      onHorizontalDragEnd: _handleHorizontalDragEnd,
      onHorizontalDragCancel: _handleHorizontalDragCancel,
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, _) {
          final phase = _controller.value * pi * 2;
          final tiltX = sin(phase) * 0.07;
          final tiltY = cos(phase * 0.86) * 0.12;
          final floatY = sin(phase * 1.35) * 6;
          final glow = 0.12 + (sin(phase * 1.5) + 1) * 0.04;
          final interactiveYaw = -_dragTurn * 1.28;
          final interactiveRoll = _dragTurn * 0.34;
          final interactiveLift = _dragTurn.abs() * 0.05;
          final interactiveShiftX = _dragTurn * 18;

          return Transform(
            alignment: Alignment.center,
            transform: Matrix4.identity()
              ..setEntry(3, 2, 0.0018)
              ..rotateX(tiltX + interactiveLift)
              ..rotateY(tiltY + interactiveYaw)
              ..rotateZ(interactiveRoll)
              ..translateByDouble(interactiveShiftX, floatY, 0.0, 1.0),
            child: AspectRatio(
              aspectRatio: 0.64,
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  Positioned(
                    left: 12,
                    top: 14,
                    child: _CardShadowLayer(
                      palette: style,
                      opacity: 0.12,
                      offset: const Offset(8, 10),
                      angle: -0.03,
                    ),
                  ),
                  Positioned(
                    left: 4,
                    top: 6,
                    child: _CardShadowLayer(
                      palette: style,
                      opacity: 0.18,
                      offset: const Offset(4, 5),
                      angle: 0.02,
                    ),
                  ),
                  Positioned.fill(
                    child: Container(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(28),
                        gradient: LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [
                            style.paperStart,
                            style.paperMid,
                            style.paperEnd,
                          ],
                        ),
                        border: Border.all(
                          color: style.border,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: style.shadow.withValues(alpha: 0.22),
                            blurRadius: 22,
                            offset: const Offset(0, 16),
                          ),
                        ],
                      ),
                      child: Stack(
                        children: [
                          Positioned(
                            top: -18,
                            right: -18,
                            child: Container(
                              width: 84,
                              height: 84,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: style.accent.withValues(alpha: glow),
                              ),
                            ),
                          ),
                          Positioned(
                            left: -24,
                            bottom: 56,
                            child: Container(
                              width: 120,
                              height: 120,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: style.accent.withValues(alpha: 0.05),
                              ),
                            ),
                          ),
                          Padding(
                            padding: EdgeInsets.fromLTRB(
                              14,
                              widget.showHeader ? 14 : 12,
                              14,
                              widget.showMetaFooter ? 16 : 12,
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                if (widget.showHeader) ...[
                                  SizedBox(
                                    width: double.infinity,
                                    child: Stack(
                                      alignment: Alignment.center,
                                      children: [
                                        Align(
                                          alignment: widget.centerHeader
                                              ? Alignment.center
                                              : Alignment.centerLeft,
                                          child: _InfoPill(
                                            label: context.l10n.tr(
                                              'arcanaOfDay',
                                            ),
                                            accent: style.accent,
                                          ),
                                        ),
                                        Positioned(
                                          right: 0,
                                          child: Icon(
                                            style.icon,
                                            color: style.accent,
                                            size: 18,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(height: 12),
                                ],
                                Expanded(
                                  child: _TarotCardFace(
                                    assetPath: assetPath,
                                    imageUrl: resolvedImageUrl,
                                    accent: style.accent,
                                    borderColor:
                                        style.accent.withValues(alpha: 0.16),
                                    maxHeight: widget.maxFaceHeight,
                                    imageFit: widget.imageFit,
                                    imageScale: widget.imageScale,
                                    aspectRatio: widget.faceAspectRatio,
                                    fallback: _TarotCardGlyph(
                                      cardName: widget.cardName,
                                      icon: style.icon,
                                      accent: style.accent,
                                    ),
                                  ),
                                ),
                                if (widget.showMetaFooter) ...[
                                  const SizedBox(height: 12),
                                  SizedBox(
                                    width: double.infinity,
                                    child: Text(
                                      context.l10n.ts(widget.cardName),
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                      textAlign: widget.centerFooter
                                          ? TextAlign.center
                                          : TextAlign.left,
                                      style: const TextStyle(
                                        color: Color(0xFF35203F),
                                        fontSize: 21,
                                        fontWeight: FontWeight.w900,
                                        height: 1.0,
                                        letterSpacing: -0.2,
                                      ),
                                    ),
                                  ),
                                  if (widget.showRefreshLabel) ...[
                                    const SizedBox(height: 8),
                                    SizedBox(
                                      width: double.infinity,
                                      child: Text(
                                        context.l10n
                                            .tr('tarotRefreshAtMidnight'),
                                        textAlign: widget.centerFooter
                                            ? TextAlign.center
                                            : TextAlign.left,
                                        style: TextStyle(
                                          color: _tarotMutedText.withValues(
                                            alpha: 0.88,
                                          ),
                                          fontSize: 12,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                    ),
                                  ],
                                  const SizedBox(height: 10),
                                  Align(
                                    alignment: widget.centerFooter
                                        ? Alignment.center
                                        : Alignment.centerLeft,
                                    child: _InfoPill(
                                      label: hasImage
                                          ? context.l10n.tr('tapToOpen')
                                          : context.l10n.ts(widget.cardRitual),
                                      accent: style.accent,
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                          Positioned(
                            top: 18,
                            left: 18,
                            child: Container(
                              width: 8,
                              height: 8,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: style.accent.withValues(alpha: 0.9),
                              ),
                            ),
                          ),
                          Positioned(
                            bottom: 24,
                            right: 18,
                            child: Container(
                              width: 10,
                              height: 10,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: style.accent.withValues(alpha: 0.5),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _TarotCardFace extends StatelessWidget {
  const _TarotCardFace({
    required this.assetPath,
    required this.imageUrl,
    required this.accent,
    required this.borderColor,
    required this.fallback,
    this.maxHeight = 168,
    this.imageFit = BoxFit.contain,
    this.imageScale = 1,
    this.aspectRatio = 0.78,
  });

  final String assetPath;
  final String imageUrl;
  final Color accent;
  final Color borderColor;
  final Widget fallback;
  final double maxHeight;
  final BoxFit imageFit;
  final double imageScale;
  final double aspectRatio;

  @override
  Widget build(BuildContext context) {
    final hasImage = assetPath.isNotEmpty || imageUrl.isNotEmpty;
    final effectiveScale = hasImage ? imageScale * 1.05 : imageScale;

    return Center(
      child: Container(
        width: double.infinity,
        constraints: BoxConstraints(maxHeight: maxHeight),
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(22),
          color: accent.withValues(alpha: 0.04),
          border: Border.all(color: borderColor),
        ),
        child: AspectRatio(
          aspectRatio: aspectRatio,
          child: hasImage
              ? Stack(
                  fit: StackFit.expand,
                  children: [
                    DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [
                            Colors.white.withValues(alpha: 0.94),
                            accent.withValues(alpha: 0.08),
                            AppPalette.moonIvory.withValues(alpha: 0.88),
                          ],
                          stops: const [0.0, 0.46, 1.0],
                        ),
                      ),
                    ),
                    Align(
                      child: FractionallySizedBox(
                        widthFactor: 0.9,
                        heightFactor: 0.92,
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(18),
                            gradient: RadialGradient(
                              center: Alignment.topCenter,
                              radius: 1.0,
                              colors: [
                                accent.withValues(alpha: 0.2),
                                Colors.white.withValues(alpha: 0.82),
                                Colors.transparent,
                              ],
                              stops: const [0.0, 0.5, 1.0],
                            ),
                          ),
                        ),
                      ),
                    ),
                    Transform.scale(
                      scale: effectiveScale,
                      child: _TarotCardArtwork(
                        assetPath: assetPath,
                        imageUrl: imageUrl,
                        accent: accent,
                        fit: imageFit,
                        fallback: fallback,
                      ),
                    ),
                    DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            Colors.white.withValues(alpha: 0.16),
                            Colors.transparent,
                            accent.withValues(alpha: 0.05),
                          ],
                          stops: const [0.0, 0.58, 1.0],
                        ),
                      ),
                    ),
                  ],
                )
              : fallback,
        ),
      ),
    );
  }
}

class _TarotCardArtwork extends StatelessWidget {
  const _TarotCardArtwork({
    required this.assetPath,
    required this.imageUrl,
    required this.accent,
    required this.fit,
    required this.fallback,
    this.loaderSize = 22,
    this.loaderStrokeWidth = 2.2,
  });

  final String assetPath;
  final String imageUrl;
  final Color accent;
  final BoxFit fit;
  final Widget fallback;
  final double loaderSize;
  final double loaderStrokeWidth;

  @override
  Widget build(BuildContext context) {
    if (assetPath.isNotEmpty) {
      return Image.asset(
        assetPath,
        fit: fit,
        alignment: Alignment.center,
        filterQuality: FilterQuality.high,
        errorBuilder: (_, __, ___) => _buildNetworkFallback(),
      );
    }

    return _buildNetworkFallback();
  }

  Widget _buildNetworkFallback() {
    if (imageUrl.isEmpty) {
      return fallback;
    }

    return Image.network(
      imageUrl,
      fit: fit,
      alignment: Alignment.center,
      filterQuality: FilterQuality.high,
      gaplessPlayback: true,
      errorBuilder: (_, __, ___) => fallback,
      loadingBuilder: (context, child, progress) {
        if (progress == null) {
          return child;
        }

        return Stack(
          fit: StackFit.expand,
          children: [
            const _TarotSkeletonBox(
              width: double.infinity,
              height: double.infinity,
              radius: 16,
            ),
            Align(
              alignment: Alignment.bottomCenter,
              child: Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: SizedBox(
                  width: loaderSize,
                  height: loaderSize,
                  child: CircularProgressIndicator(
                    strokeWidth: loaderStrokeWidth,
                    color: accent.withValues(alpha: 0.85),
                  ),
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}

class _TarotCardGlyph extends StatelessWidget {
  const _TarotCardGlyph({
    required this.cardName,
    required this.icon,
    required this.accent,
  });

  final String cardName;
  final IconData icon;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    final style = _paletteForCard(cardName);

    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            style.paperStart,
            style.paperMid,
            style.paperEnd,
          ],
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(10),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(20),
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.3),
              border: Border.all(color: accent.withValues(alpha: 0.14)),
            ),
            child: _TarotCardScene(
              cardName: cardName,
              icon: icon,
              style: style,
            ),
          ),
        ),
      ),
    );
  }
}

class _TarotCardScene extends StatelessWidget {
  const _TarotCardScene({
    required this.cardName,
    required this.icon,
    required this.style,
  });

  final String cardName;
  final IconData icon;
  final _TarotCardPalette style;

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        Positioned(
          top: -24,
          right: -18,
          child: _TarotSceneOrb(
            size: 78,
            color: style.accent.withValues(alpha: 0.14),
          ),
        ),
        Positioned(
          left: -20,
          bottom: -12,
          child: _TarotSceneOrb(
            size: 94,
            color: style.accent.withValues(alpha: 0.08),
          ),
        ),
        ...switch (cardName) {
          'La Estrella' => _buildStarScene(),
          'La Luna' => _buildMoonScene(),
          'El Sol' => _buildSunScene(),
          'La Sacerdotisa' => _buildPriestessScene(),
          'El Mago' => _buildMagicianScene(),
          'La Emperatriz' => _buildEmpressScene(),
          'El Ermitaño' => _buildHermitScene(),
          'La Rueda' => _buildWheelScene(),
          'La Justicia' => _buildJusticeScene(),
          'La Fuerza' => _buildStrengthScene(),
          'El Colgado' => _buildHangedScene(),
          'El Mundo' => _buildWorldScene(),
          _ => _buildDefaultScene(),
        },
      ],
    );
  }

  List<Widget> _buildStarScene() {
    return [
      Positioned(
        top: 20,
        left: 0,
        right: 0,
        child: Icon(
          Icons.star_rounded,
          size: 74,
          color: style.accent.withValues(alpha: 0.92),
        ),
      ),
      const Positioned(
        top: 28,
        left: 34,
        child: Icon(Icons.star, size: 16, color: Color(0xFFFFFFFF)),
      ),
      Positioned(
        top: 54,
        right: 38,
        child: Icon(
          Icons.star,
          size: 14,
          color: style.accent.withValues(alpha: 0.7),
        ),
      ),
      Positioned(
        bottom: 48,
        left: 26,
        right: 26,
        child: Column(
          children: [
            _TarotWaveBand(color: style.accent.withValues(alpha: 0.22)),
            const SizedBox(height: 8),
            _TarotWaveBand(color: style.accent.withValues(alpha: 0.14)),
          ],
        ),
      ),
    ];
  }

  List<Widget> _buildMoonScene() {
    return [
      Positioned(
        top: 24,
        left: 0,
        right: 0,
        child: Icon(
          Icons.brightness_2_rounded,
          size: 76,
          color: style.accent.withValues(alpha: 0.9),
        ),
      ),
      Positioned(
        bottom: 34,
        left: 24,
        child: _TarotSceneTower(color: style.accent.withValues(alpha: 0.28)),
      ),
      Positioned(
        bottom: 34,
        right: 24,
        child: _TarotSceneTower(color: style.accent.withValues(alpha: 0.24)),
      ),
      Positioned(
        bottom: 18,
        left: 0,
        right: 0,
        child: Center(
          child: Container(
            width: 22,
            height: 62,
            decoration: BoxDecoration(
              color: style.paperEnd.withValues(alpha: 0.96),
              borderRadius: BorderRadius.circular(999),
              border: Border.all(color: style.accent.withValues(alpha: 0.1)),
            ),
          ),
        ),
      ),
    ];
  }

  List<Widget> _buildSunScene() {
    return [
      Positioned(
        top: 18,
        left: 0,
        right: 0,
        child: Center(
          child: Container(
            width: 90,
            height: 90,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: style.accent.withValues(alpha: 0.18),
            ),
            child: Icon(
              Icons.wb_sunny_rounded,
              size: 56,
              color: style.accent,
            ),
          ),
        ),
      ),
      Positioned(
        bottom: 30,
        left: 18,
        right: 18,
        child: _TarotSceneHill(
          color: style.accent.withValues(alpha: 0.18),
          height: 46,
        ),
      ),
      Positioned(
        bottom: 18,
        left: 34,
        right: 34,
        child: _TarotSceneHill(
          color: style.accent.withValues(alpha: 0.1),
          height: 28,
        ),
      ),
    ];
  }

  List<Widget> _buildPriestessScene() {
    return [
      Positioned(
        top: 28,
        left: 26,
        child: _TarotScenePillar(color: style.accent.withValues(alpha: 0.18)),
      ),
      Positioned(
        top: 28,
        right: 26,
        child: _TarotScenePillar(color: style.accent.withValues(alpha: 0.28)),
      ),
      Positioned(
        top: 34,
        left: 0,
        right: 0,
        child: Icon(
          Icons.nightlight_round,
          size: 52,
          color: style.accent,
        ),
      ),
      Positioned(
        bottom: 32,
        left: 42,
        right: 42,
        child: Container(
          height: 56,
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.55),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: style.accent.withValues(alpha: 0.12)),
          ),
          child: Icon(
            Icons.menu_book_rounded,
            color: style.accent.withValues(alpha: 0.75),
            size: 26,
          ),
        ),
      ),
    ];
  }

  List<Widget> _buildMagicianScene() {
    return [
      Positioned(
        top: 26,
        left: 0,
        right: 0,
        child: Icon(
          Icons.auto_awesome_rounded,
          size: 64,
          color: style.accent,
        ),
      ),
      Positioned(
        top: 82,
        left: 0,
        right: 0,
        child: Center(
          child: Transform.rotate(
            angle: -0.35,
            child: Container(
              width: 84,
              height: 8,
              decoration: BoxDecoration(
                color: style.accent.withValues(alpha: 0.72),
                borderRadius: BorderRadius.circular(999),
              ),
            ),
          ),
        ),
      ),
      Positioned(
        bottom: 34,
        left: 24,
        right: 24,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            _TarotSceneMiniSeal(
              icon: Icons.water_drop_rounded,
              color: style.accent,
            ),
            _TarotSceneMiniSeal(
              icon: Icons.change_history_rounded,
              color: style.accent,
            ),
            _TarotSceneMiniSeal(
              icon: Icons.crop_square_rounded,
              color: style.accent,
            ),
            _TarotSceneMiniSeal(
              icon: Icons.circle_outlined,
              color: style.accent,
            ),
          ],
        ),
      ),
    ];
  }

  List<Widget> _buildEmpressScene() {
    return [
      Positioned(
        top: 24,
        left: 0,
        right: 0,
        child: Icon(
          Icons.workspace_premium_rounded,
          size: 64,
          color: style.accent,
        ),
      ),
      Positioned(
        bottom: 42,
        left: 26,
        right: 26,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: List.generate(
            3,
            (index) => Icon(
              Icons.local_florist_rounded,
              size: 28,
              color: style.accent.withValues(alpha: 0.72),
            ),
          ),
        ),
      ),
      Positioned(
        bottom: 18,
        left: 18,
        right: 18,
        child: _TarotSceneHill(
          color: style.accent.withValues(alpha: 0.16),
          height: 24,
        ),
      ),
    ];
  }

  List<Widget> _buildHermitScene() {
    return [
      Positioned(
        top: 26,
        left: 0,
        right: 0,
        child: Icon(
          Icons.emoji_objects_rounded,
          size: 64,
          color: style.accent,
        ),
      ),
      Positioned(
        top: 88,
        left: 0,
        right: 0,
        child: Center(
          child: Container(
            width: 6,
            height: 48,
            decoration: BoxDecoration(
              color: style.accent.withValues(alpha: 0.65),
              borderRadius: BorderRadius.circular(999),
            ),
          ),
        ),
      ),
      Positioned(
        bottom: 18,
        left: 18,
        right: 18,
        child: _TarotSceneHill(
          color: style.accent.withValues(alpha: 0.18),
          height: 38,
        ),
      ),
    ];
  }

  List<Widget> _buildWheelScene() {
    return [
      Positioned.fill(
        child: Center(
          child: Stack(
            alignment: Alignment.center,
            children: [
              Container(
                width: 108,
                height: 108,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: style.accent.withValues(alpha: 0.82),
                    width: 7,
                  ),
                ),
              ),
              ...List.generate(
                8,
                (index) => Transform.rotate(
                  angle: (pi / 4) * index,
                  child: Container(
                    width: 6,
                    height: 96,
                    decoration: BoxDecoration(
                      color: style.accent.withValues(alpha: 0.26),
                      borderRadius: BorderRadius.circular(999),
                    ),
                  ),
                ),
              ),
              Icon(
                Icons.refresh_rounded,
                size: 40,
                color: style.accent,
              ),
            ],
          ),
        ),
      ),
    ];
  }

  List<Widget> _buildJusticeScene() {
    return [
      Positioned(
        top: 28,
        left: 0,
        right: 0,
        child: Icon(
          Icons.balance_rounded,
          size: 70,
          color: style.accent,
        ),
      ),
      Positioned(
        bottom: 28,
        left: 0,
        right: 0,
        child: Center(
          child: Container(
            width: 8,
            height: 76,
            decoration: BoxDecoration(
              color: style.accent.withValues(alpha: 0.7),
              borderRadius: BorderRadius.circular(999),
            ),
          ),
        ),
      ),
      Positioned(
        bottom: 24,
        left: 0,
        right: 0,
        child: Center(
          child: Container(
            width: 32,
            height: 16,
            decoration: BoxDecoration(
              color: style.accent,
              borderRadius: BorderRadius.circular(999),
            ),
          ),
        ),
      ),
    ];
  }

  List<Widget> _buildStrengthScene() {
    return [
      Positioned(
        top: 22,
        left: 0,
        right: 0,
        child: Icon(
          Icons.all_inclusive_rounded,
          size: 60,
          color: style.accent,
        ),
      ),
      Positioned(
        top: 76,
        left: 0,
        right: 0,
        child: Icon(
          Icons.pets_rounded,
          size: 62,
          color: style.accent.withValues(alpha: 0.78),
        ),
      ),
      Positioned(
        bottom: 22,
        left: 0,
        right: 0,
        child: Icon(
          Icons.favorite_rounded,
          size: 34,
          color: style.accent.withValues(alpha: 0.72),
        ),
      ),
    ];
  }

  List<Widget> _buildHangedScene() {
    return [
      Positioned(
        top: 20,
        left: 0,
        right: 0,
        child: Center(
          child: Container(
            width: 112,
            height: 8,
            decoration: BoxDecoration(
              color: style.accent.withValues(alpha: 0.72),
              borderRadius: BorderRadius.circular(999),
            ),
          ),
        ),
      ),
      Positioned(
        top: 28,
        left: 0,
        right: 0,
        child: Center(
          child: Container(
            width: 6,
            height: 34,
            decoration: BoxDecoration(
              color: style.accent.withValues(alpha: 0.72),
              borderRadius: BorderRadius.circular(999),
            ),
          ),
        ),
      ),
      Positioned(
        top: 58,
        left: 0,
        right: 0,
        child: Center(
          child: Transform.rotate(
            angle: pi,
            child: Icon(
              Icons.accessibility_new_rounded,
              size: 66,
              color: style.accent,
            ),
          ),
        ),
      ),
    ];
  }

  List<Widget> _buildWorldScene() {
    return [
      Positioned.fill(
        child: Padding(
          padding: const EdgeInsets.all(10),
          child: Container(
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: RadialGradient(
                colors: [
                  style.paperEnd.withValues(alpha: 0.96),
                  style.paperMid.withValues(alpha: 0.9),
                  style.paperStart.withValues(alpha: 0.82),
                ],
              ),
              border: Border.all(
                color: style.accent.withValues(alpha: 0.74),
                width: 7,
              ),
            ),
            child: Center(
              child: Container(
                width: 96,
                height: 96,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: style.accent.withValues(alpha: 0.12),
                  border: Border.all(
                    color: style.accent.withValues(alpha: 0.18),
                  ),
                ),
                child: Icon(
                  Icons.public_rounded,
                  size: 68,
                  color: style.accent,
                ),
              ),
            ),
          ),
        ),
      ),
      Positioned(
        top: 18,
        left: 20,
        child: Icon(
          Icons.spa_rounded,
          size: 22,
          color: style.accent.withValues(alpha: 0.58),
        ),
      ),
      Positioned(
        top: 18,
        right: 20,
        child: Icon(
          Icons.spa_rounded,
          size: 22,
          color: style.accent.withValues(alpha: 0.58),
        ),
      ),
      Positioned(
        bottom: 18,
        left: 20,
        child: Icon(
          Icons.spa_rounded,
          size: 22,
          color: style.accent.withValues(alpha: 0.58),
        ),
      ),
      Positioned(
        bottom: 18,
        right: 20,
        child: Icon(
          Icons.spa_rounded,
          size: 22,
          color: style.accent.withValues(alpha: 0.58),
        ),
      ),
    ];
  }

  List<Widget> _buildDefaultScene() {
    return [
      Center(
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: Colors.white.withValues(alpha: 0.7),
            border: Border.all(
              color: style.accent.withValues(alpha: 0.16),
            ),
          ),
          child: MysticGlyphBadge(
            kind: MysticGlyphKind.generic,
            icon: icon,
            accent: style.accent,
            background: style.accent.withValues(alpha: 0.12),
            size: 70,
          ),
        ),
      ),
    ];
  }
}

class _TarotSceneOrb extends StatelessWidget {
  const _TarotSceneOrb({
    required this.size,
    required this.color,
  });

  final double size;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: color,
      ),
    );
  }
}

class _TarotSceneTower extends StatelessWidget {
  const _TarotSceneTower({
    required this.color,
  });

  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 26,
      height: 72,
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Align(
        alignment: Alignment.topCenter,
        child: Container(
          width: 16,
          height: 14,
          margin: const EdgeInsets.only(top: 8),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.38),
            borderRadius: BorderRadius.circular(6),
          ),
        ),
      ),
    );
  }
}

class _TarotScenePillar extends StatelessWidget {
  const _TarotScenePillar({
    required this.color,
  });

  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 24,
      height: 106,
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(14),
      ),
    );
  }
}

class _TarotSceneHill extends StatelessWidget {
  const _TarotSceneHill({
    required this.color,
    required this.height,
  });

  final Color color;
  final double height;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(999),
      ),
    );
  }
}

class _TarotWaveBand extends StatelessWidget {
  const _TarotWaveBand({
    required this.color,
  });

  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 16,
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(999),
      ),
    );
  }
}

class _TarotSceneMiniSeal extends StatelessWidget {
  const _TarotSceneMiniSeal({
    required this.icon,
    required this.color,
  });

  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 30,
      height: 30,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: color.withValues(alpha: 0.12),
      ),
      child: Icon(
        icon,
        size: 16,
        color: color,
      ),
    );
  }
}

class _TarotCardPoster extends StatelessWidget {
  const _TarotCardPoster({
    required this.cardName,
    required this.imageUrl,
    this.framed = true,
  });

  final String cardName;
  final String imageUrl;
  final bool framed;

  @override
  Widget build(BuildContext context) {
    final style = _paletteForCard(cardName);
    final trimmedImageUrl = imageUrl.trim();
    final resolvedImageUrl = trimmedImageUrl.isNotEmpty
        ? trimmedImageUrl
        : _buildTarotCardImageUrl(cardName);
    final assetPath = _buildTarotCardAssetPath(cardName);
    final hasImage = assetPath.isNotEmpty || resolvedImageUrl.isNotEmpty;
    final fallback = DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            style.paperStart,
            style.paperMid,
            style.paperEnd,
          ],
        ),
      ),
      child: _TarotCardGlyph(
        cardName: cardName,
        icon: style.icon,
        accent: style.accent,
      ),
    );

    final artwork = hasImage
        ? _TarotCardArtwork(
            assetPath: assetPath,
            imageUrl: resolvedImageUrl,
            accent: style.accent,
            fit: BoxFit.contain,
            fallback: fallback,
            loaderSize: 24,
            loaderStrokeWidth: 2.4,
          )
        : fallback;

    return ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 292),
      child: AspectRatio(
        aspectRatio: 0.64,
        child: framed
            ? Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppPalette.moonIvory,
                  borderRadius: BorderRadius.circular(28),
                  border: Border.all(color: AppPalette.border),
                  boxShadow: [
                    BoxShadow(
                      color: AppPalette.indigo.withValues(alpha: 0.14),
                      blurRadius: 26,
                      offset: const Offset(0, 18),
                    ),
                  ],
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(22),
                  child: ColoredBox(
                    color: AppPalette.moonIvory,
                    child: artwork,
                  ),
                ),
              )
            : DecoratedBox(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(26),
                  boxShadow: [
                    BoxShadow(
                      color: AppPalette.indigo.withValues(alpha: 0.18),
                      blurRadius: 24,
                      offset: const Offset(0, 16),
                    ),
                  ],
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(26),
                  child: artwork,
                ),
              ),
      ),
    );
  }
}

class _CardShadowLayer extends StatelessWidget {
  const _CardShadowLayer({
    required this.palette,
    required this.opacity,
    required this.offset,
    required this.angle,
  });

  final _TarotCardPalette palette;
  final double opacity;
  final Offset offset;
  final double angle;

  @override
  Widget build(BuildContext context) {
    return Transform.translate(
      offset: offset,
      child: Transform.rotate(
        angle: angle,
        child: Container(
          width: 156,
          height: 244,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(28),
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                palette.paperStart.withValues(alpha: opacity),
                palette.paperMid.withValues(alpha: opacity),
                palette.paperEnd.withValues(alpha: opacity),
              ],
            ),
            border: Border.all(
              color: palette.border.withValues(alpha: opacity * 0.8),
            ),
          ),
        ),
      ),
    );
  }
}

class _TarotCardPalette {
  const _TarotCardPalette({
    required this.paperStart,
    required this.paperMid,
    required this.paperEnd,
    required this.border,
    required this.shadow,
    required this.accent,
    required this.icon,
  });

  final Color paperStart;
  final Color paperMid;
  final Color paperEnd;
  final Color border;
  final Color shadow;
  final Color accent;
  final IconData icon;
}

_TarotCardPalette _paletteForCard(String cardName) {
  final palette = switch (cardName) {
    'La Estrella' => const _TarotCardPalette(
        paperStart: Color(0xFFFFFEFD),
        paperMid: Color(0xFFF7F0FF),
        paperEnd: Color(0xFFFCEFD9),
        border: Color(0xFFE1C8F0),
        shadow: Color(0xFF4F1D72),
        accent: Color(0xFF7B2D94),
        icon: Icons.star_rounded,
      ),
    'La Sacerdotisa' => const _TarotCardPalette(
        paperStart: Color(0xFFFFFEFD),
        paperMid: Color(0xFFF3ECFF),
        paperEnd: Color(0xFFEDEFFD),
        border: Color(0xFFD8D1F4),
        shadow: Color(0xFF4C4A82),
        accent: Color(0xFF6650A8),
        icon: Icons.nightlight_round,
      ),
    'El Mago' => const _TarotCardPalette(
        paperStart: Color(0xFFFFFEFD),
        paperMid: Color(0xFFFFF1E8),
        paperEnd: Color(0xFFF8F5FF),
        border: Color(0xFFF2D3C2),
        shadow: Color(0xFF8A4A1D),
        accent: Color(0xFFEF8A4C),
        icon: Icons.auto_awesome_rounded,
      ),
    'La Emperatriz' => const _TarotCardPalette(
        paperStart: Color(0xFFFFFEFD),
        paperMid: Color(0xFFFDF0F4),
        paperEnd: Color(0xFFF3F9EA),
        border: Color(0xFFE6C8D6),
        shadow: Color(0xFF7A4258),
        accent: Color(0xFFD66C9F),
        icon: Icons.local_florist_rounded,
      ),
    'El Ermitaño' => const _TarotCardPalette(
        paperStart: Color(0xFFFFFEFD),
        paperMid: Color(0xFFF8F3EA),
        paperEnd: Color(0xFFF4F0FF),
        border: Color(0xFFE5D8C4),
        shadow: Color(0xFF6F5B3D),
        accent: Color(0xFFB78641),
        icon: Icons.emoji_objects_rounded,
      ),
    'La Rueda' => const _TarotCardPalette(
        paperStart: Color(0xFFFFFEFD),
        paperMid: Color(0xFFF4F6FF),
        paperEnd: Color(0xFFFFF3E5),
        border: Color(0xFFD9DFFC),
        shadow: Color(0xFF4C5FB5),
        accent: Color(0xFF6A74D9),
        icon: Icons.refresh_rounded,
      ),
    'La Justicia' => const _TarotCardPalette(
        paperStart: Color(0xFFFFFEFD),
        paperMid: Color(0xFFF0F8FF),
        paperEnd: Color(0xFFF7F0FF),
        border: Color(0xFFD8E3F1),
        shadow: Color(0xFF3D5F84),
        accent: Color(0xFF4F82B8),
        icon: Icons.balance_rounded,
      ),
    'La Fuerza' => const _TarotCardPalette(
        paperStart: Color(0xFFFFFEFD),
        paperMid: Color(0xFFFFF0F5),
        paperEnd: Color(0xFFFBEFE6),
        border: Color(0xFFF1D4E1),
        shadow: Color(0xFF91486D),
        accent: Color(0xFFE06A98),
        icon: Icons.favorite_rounded,
      ),
    'El Sol' => const _TarotCardPalette(
        paperStart: Color(0xFFFFFEFD),
        paperMid: Color(0xFFFFF8DF),
        paperEnd: Color(0xFFFFF0E8),
        border: Color(0xFFF2D98E),
        shadow: Color(0xFFB97900),
        accent: Color(0xFFF0B423),
        icon: Icons.wb_sunny_rounded,
      ),
    'La Luna' => const _TarotCardPalette(
        paperStart: Color(0xFFFFFEFD),
        paperMid: Color(0xFFF5F0FF),
        paperEnd: Color(0xFFEDEAFF),
        border: Color(0xFFD9D1F0),
        shadow: Color(0xFF5D4A8D),
        accent: Color(0xFF8B6BD8),
        icon: Icons.nightlight_round,
      ),
    'El Colgado' => const _TarotCardPalette(
        paperStart: Color(0xFFFFFEFD),
        paperMid: Color(0xFFF0FAF8),
        paperEnd: Color(0xFFF7F2FF),
        border: Color(0xFFD2E8E1),
        shadow: Color(0xFF478076),
        accent: Color(0xFF67A39C),
        icon: Icons.sync_alt_rounded,
      ),
    'El Mundo' => const _TarotCardPalette(
        paperStart: Color(0xFFFFFEFD),
        paperMid: Color(0xFFF0FFF7),
        paperEnd: Color(0xFFF7F2FF),
        border: Color(0xFFD2EECF),
        shadow: Color(0xFF4B9070),
        accent: Color(0xFF69B98A),
        icon: Icons.public_rounded,
      ),
    _ => const _TarotCardPalette(
        paperStart: Color(0xFFFFFEFD),
        paperMid: Color(0xFFF8F0FB),
        paperEnd: Color(0xFFFDF3E7),
        border: Color(0xFFE4D3EF),
        shadow: Color(0xFF6A4A83),
        accent: Color(0xFF7B2D94),
        icon: Icons.auto_awesome_rounded,
      ),
  };

  return palette;
}

class _SurfaceCard extends StatelessWidget {
  const _SurfaceCard({
    required this.title,
    required this.child,
    this.titleAccent,
    this.titleForeground,
    this.titleIcon,
  });

  final String title;
  final Widget child;
  final Color? titleAccent;
  final Color? titleForeground;
  final IconData? titleIcon;

  @override
  Widget build(BuildContext context) {
    final accent = titleAccent;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppPalette.moonIvory,
        borderRadius: BorderRadius.circular(26),
        border: Border.all(color: AppPalette.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (accent == null)
            Text(
              title,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
            )
          else
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(18),
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    accent,
                    Color.lerp(accent, AppPalette.indigo, 0.42) ?? accent,
                  ],
                ),
                boxShadow: [
                  BoxShadow(
                    color: accent.withValues(alpha: 0.18),
                    blurRadius: 18,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (titleIcon != null) ...[
                    Icon(
                      titleIcon,
                      size: 18,
                      color: titleForeground ?? Colors.white,
                    ),
                    const SizedBox(width: 8),
                  ],
                  Text(
                    title,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          color: titleForeground ?? Colors.white,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.2,
                        ),
                  ),
                ],
              ),
            ),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }
}

class _TarotCardDetailSheet extends StatelessWidget {
  const _TarotCardDetailSheet({
    required this.data,
    required this.item,
    required this.focus,
  });

  final AppBootstrap data;
  final _TarotDrawnCard item;
  final _TarotSpreadFocus focus;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final userName = _displayUserName(data.user);
    final interpretation = _tarotInterpretationLine(
      item.card.name,
      focus,
      l10n,
    );
    final keywords = _tarotKeywords(item.card.name, l10n);
    final reflectionQuestion = _tarotReflectionQuestion(
      item.card.name,
      focus,
      l10n,
    );

    return FractionallySizedBox(
      heightFactor: 0.92,
      child: Container(
        decoration: const BoxDecoration(
          color: AppPalette.moonIvory,
          borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
        ),
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 10, 20, 28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 48,
                  height: 5,
                  decoration: BoxDecoration(
                    color: AppPalette.border,
                    borderRadius: BorderRadius.circular(99),
                  ),
                ),
              ),
              const SizedBox(height: 18),
              Center(
                child: _TarotCardPoster(
                  cardName: item.card.name,
                  imageUrl: item.card.imageUrl,
                ),
              ),
              const SizedBox(height: 20),
              _DetailSectionLabel(label: l10n.tr('tarotGentleInterpretation')),
              const SizedBox(height: 8),
              Text(
                userName.isEmpty
                    ? interpretation
                    : '$userName, $interpretation',
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: _tarotSecondaryText,
                      height: 1.45,
                    ),
              ),
              const SizedBox(height: 16),
              _DetailSectionLabel(label: l10n.tr('tarotMoreAboutCard')),
              const SizedBox(height: 10),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: keywords
                    .map(
                      (keyword) => _InfoPill(
                        label: keyword,
                        accent: AppPalette.royalViolet,
                      ),
                    )
                    .toList(),
              ),
              const SizedBox(height: 14),
              _TarotInsightCard(
                title: l10n.tr('tarotWhatAsksToday'),
                body: l10n.ts(item.card.action),
                accent: AppPalette.royalViolet,
                icon: Icons.bolt_rounded,
              ),
              const SizedBox(height: 10),
              _TarotInsightCard(
                title: l10n.tr('tarotWhatAvoidToday'),
                body: l10n.ts(item.card.caution),
                accent: AppPalette.flameGold,
                icon: Icons.visibility_outlined,
              ),
              const SizedBox(height: 10),
              _TarotInsightCard(
                title: l10n.tr('tarotGuidingQuestion'),
                body: reflectionQuestion,
                accent: AppPalette.indigo,
                icon: Icons.help_outline_rounded,
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}

class _DetailSectionLabel extends StatelessWidget {
  const _DetailSectionLabel({
    required this.label,
  });

  final String label;

  @override
  Widget build(BuildContext context) {
    return Text(
      label,
      style: const TextStyle(
        color: AppPalette.royalViolet,
        fontSize: 12,
        fontWeight: FontWeight.w800,
        letterSpacing: 0.35,
      ),
    );
  }
}

class _TarotInsightCard extends StatelessWidget {
  const _TarotInsightCard({
    required this.title,
    required this.body,
    required this.accent,
    required this.icon,
  });

  final String title;
  final String body;
  final Color accent;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: accent.withValues(alpha: 0.14)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: accent.withValues(alpha: 0.10),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              icon,
              size: 18,
              color: accent,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    color: accent,
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.2,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  body,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: _tarotSecondaryText,
                        height: 1.4,
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

class _InfoPill extends StatelessWidget {
  const _InfoPill({
    required this.label,
    this.accent,
  });

  final String label;
  final Color? accent;

  @override
  Widget build(BuildContext context) {
    final chipAccent = accent ?? AppPalette.mutedLavender;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: chipAccent.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
          color: chipAccent.withValues(alpha: 0.14),
        ),
      ),
      child: Text(
        label,
        maxLines: 2,
        overflow: TextOverflow.ellipsis,
        softWrap: true,
        style: TextStyle(
          fontFamily: AppTheme.displayFontFamily,
          color: chipAccent,
          fontSize: 13,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.18,
        ),
      ),
    );
  }
}

class _TarotFocusConfig {
  const _TarotFocusConfig({
    required this.title,
    required this.subtitle,
    required this.prompt,
    required this.positions,
  });

  final String title;
  final String subtitle;
  final String prompt;
  final List<String> positions;
}

const _tarotKeyword = 'tarot';

bool _containsTarot(String value) {
  return value.toLowerCase().contains(_tarotKeyword);
}

bool _isTarotCategory(String category) {
  return category.toLowerCase() == _tarotKeyword;
}

_TarotCatalog _buildTarotCatalog(AppBootstrap data) {
  final services = <ServiceOffer>[];
  final specialistIds = <String>{};

  for (final service in data.services) {
    if (!_isTarotCategory(service.category)) {
      continue;
    }
    services.add(service);
    specialistIds.addAll(service.specialistIds);
  }

  final specialists = <Specialist>[];
  for (final specialist in data.specialists) {
    final hasTarotSpecialty = specialist.specialties.any(_containsTarot);
    if (!hasTarotSpecialty && !specialistIds.contains(specialist.id)) {
      continue;
    }
    specialists.add(specialist);
  }

  final courses = <Course>[];
  for (final course in data.courses) {
    if (_containsTarot(course.category)) {
      courses.add(course);
    }
  }

  Booking? nextBooking;
  for (final booking in data.bookings) {
    if (_containsTarot(booking.serviceName)) {
      nextBooking = booking;
      break;
    }
  }

  return _TarotCatalog(
    services: services,
    specialists: specialists,
    courses: courses,
    nextBooking: nextBooking,
  );
}

String _displayUserName(UserProfile user) {
  final nickname = user.nickname.trim();
  if (nickname.isNotEmpty) {
    return nickname;
  }

  final firstName = user.firstName.trim();
  if (firstName.isNotEmpty) {
    return firstName;
  }

  return '';
}

String _tarotInterpretationLine(
  String cardName,
  _TarotSpreadFocus focus,
  AppLocalizations l10n,
) {
  final text = switch (cardName) {
    'La Estrella' =>
      'Tu calma vuelve a abrirte camino y te ayuda a confiar sin correr.',
    'La Sacerdotisa' =>
      'Tu intuición ya recoge señales valiosas; escuchar un poco más te dará una respuesta más nítida.',
    'El Mago' =>
      'Tienes recursos reales para mover esto si eliges un solo frente de acción.',
    'La Emperatriz' =>
      'Lo que nutres hoy puede crecer con suavidad y dejar mejores frutos.',
    'El Ermitaño' =>
      'La pausa te devuelve una claridad que el ruido suele esconder.',
    'La Rueda' =>
      'Un giro favorable ya está en marcha y te conviene leerlo con flexibilidad.',
    'La Justicia' =>
      'Cuando ordenas hechos y límites, todo empieza a alinearse contigo.',
    'La Fuerza' =>
      'La verdadera fuerza hoy es sostenerte con calma y sin perder sensibilidad.',
    'El Sol' =>
      'Hay claridad para mostrarte con confianza y ver resultados más visibles.',
    'La Luna' =>
      'Tu intuición trabaja a favor; si bajas el ruido, la respuesta aparece con más nitidez.',
    'El Colgado' =>
      'Mirarlo desde otro ángulo te ayuda a desbloquear una respuesta útil.',
    'El Mundo' =>
      'Hay una sensación clara de cierre positivo y de avance al siguiente nivel.',
    _ =>
      'Esta carta te acompaña con una señal amable para leer tu momento con más claridad.',
  };
  return l10n.ts(text);
}

String _tarotSupportLine(String cardName, AppLocalizations l10n) {
  final text = switch (cardName) {
    'La Estrella' => 'Recupera calma y avanza con un gesto simple.',
    'La Sacerdotisa' => 'Escucha primero; la respuesta madura sola.',
    'El Mago' => 'Elige una prioridad y ejecútala hoy.',
    'La Emperatriz' => 'Nutre primero lo que quieres ver crecer.',
    'El Ermitaño' => 'Haz pausa, revisa y luego responde.',
    'La Rueda' => 'Ajusta expectativa y toma el giro a tiempo.',
    'La Justicia' => 'Ordena, define o pon una regla clara.',
    'La Fuerza' => 'Canaliza impulso sin perder ternura.',
    'El Sol' => 'Muestra tu verdad con sencillez.',
    'La Luna' => 'Pon nombre a la emoción antes de actuar.',
    'El Colgado' => 'Suspende una reacción automática y mira distinto.',
    'El Mundo' =>
      'Cierra el ciclo con conciencia y prepara el siguiente nivel.',
    _ => 'Avanza con un paso pequeño y coherente.',
  };
  return l10n.ts(text);
}

List<String> _tarotKeywords(String cardName, AppLocalizations l10n) {
  final keywords = switch (cardName) {
    'La Estrella' => ['Calma', 'Confianza', 'Reparación'],
    'La Sacerdotisa' => ['Intuición', 'Silencio', 'Observación'],
    'El Mago' => ['Foco', 'Iniciativa', 'Recursos'],
    'La Emperatriz' => ['Nutrir', 'Expansión', 'Cuerpo'],
    'El Ermitaño' => ['Pausa', 'Claridad', 'Honestidad'],
    'La Rueda' => ['Cambio', 'Timing', 'Adaptación'],
    'La Justicia' => ['Orden', 'Límites', 'Decisión'],
    'La Fuerza' => ['Templanza', 'Coraje', 'Regulación'],
    'El Sol' => ['Claridad', 'Visibilidad', 'Alegría'],
    'La Luna' => ['Emoción', 'Intuición', 'Neblina'],
    'El Colgado' => ['Perspectiva', 'Entrega', 'Reencuadre'],
    'El Mundo' => ['Cierre', 'Integración', 'Madurez'],
    _ => ['Claridad', 'Señal', 'Movimiento'],
  };
  return keywords.map(l10n.ts).toList(growable: false);
}

String _tarotReflectionQuestion(
  String cardName,
  _TarotSpreadFocus focus,
  AppLocalizations l10n,
) {
  final suffix = switch (focus) {
    _TarotSpreadFocus.daily => l10n.ts('hoy'),
    _TarotSpreadFocus.clarity =>
      l10n.ts('para ver esta situación con más claridad'),
    _TarotSpreadFocus.love => l10n.ts('en este vínculo'),
    _TarotSpreadFocus.work => l10n.ts('en trabajo o dinero'),
  };

  final text = switch (cardName) {
    'La Estrella' => '¿Qué gesto pequeño puede devolverte confianza {suffix}?',
    'La Sacerdotisa' =>
      '¿Qué necesitas observar un poco más antes de responder {suffix}?',
    'El Mago' =>
      '¿Dónde sí tienes recursos reales y dónde te estás dispersando {suffix}?',
    'La Emperatriz' => '¿Qué necesita más cuidado para crecer mejor {suffix}?',
    'El Ermitaño' =>
      '¿Qué ruido conviene bajar para escuchar mejor tu verdad {suffix}?',
    'La Rueda' => '¿Qué cambio ya empezó y te pide ajustar el paso {suffix}?',
    'La Justicia' =>
      '¿Qué decisión se vuelve más simple si ordenas los hechos {suffix}?',
    'La Fuerza' =>
      '¿Cómo puedes sostenerte con firmeza sin endurecerte {suffix}?',
    'El Sol' => '¿Qué puedes mostrar con más naturalidad y confianza {suffix}?',
    'La Luna' =>
      '¿Qué emoción necesita nombre antes de tomar una decisión {suffix}?',
    'El Colgado' => '¿Desde qué otro ángulo podrías mirar esto {suffix}?',
    'El Mundo' => '¿Qué vale cerrar bien para liberar energía nueva {suffix}?',
    _ => '¿Qué te está queriendo mostrar esta carta {suffix}?',
  };
  return l10n.ts(text, {'suffix': suffix});
}

class _TarotCardMeaning {
  const _TarotCardMeaning({
    required this.name,
    required this.message,
    required this.action,
    required this.caution,
    this.imageUrl = '',
  });

  final String name;
  final String message;
  final String action;
  final String caution;
  final String imageUrl;
}

class _TarotDrawnCard {
  const _TarotDrawnCard({
    required this.positionLabel,
    required this.card,
  });

  final String positionLabel;
  final _TarotCardMeaning card;
}

_TarotFocusConfig _focusConfig(_TarotSpreadFocus focus, AppLocalizations l10n) {
  switch (focus) {
    case _TarotSpreadFocus.daily:
      return _TarotFocusConfig(
        title: l10n.tr('tarotDailyReadingTitle'),
        subtitle: l10n.tr('tarotDailyReadingSubtitle'),
        prompt: l10n.tr('tarotDailyReadingPrompt'),
        positions: [
          l10n.tr('tarotPosRelease'),
          l10n.tr('tarotPosDayPulse'),
          l10n.tr('tarotPosConsciousAction'),
        ],
      );
    case _TarotSpreadFocus.clarity:
      return _TarotFocusConfig(
        title: l10n.tr('tarotClarityTitle'),
        subtitle: l10n.tr('tarotClaritySubtitle'),
        prompt: l10n.tr('tarotClarityPrompt'),
        positions: [
          l10n.tr('tarotPosRoot'),
          l10n.tr('tarotPosCurrentKnot'),
          l10n.tr('tarotPosNextStep'),
        ],
      );
    case _TarotSpreadFocus.love:
      return _TarotFocusConfig(
        title: l10n.tr('tarotBondsTitle'),
        subtitle: l10n.tr('tarotBondsSubtitle'),
        prompt: l10n.tr('tarotBondsPrompt'),
        positions: [
          l10n.tr('tarotPosFeeling'),
          l10n.tr('tarotPosActivated'),
          l10n.tr('tarotPosHealthyMovement'),
        ],
      );
    case _TarotSpreadFocus.work:
      return _TarotFocusConfig(
        title: l10n.tr('tarotWorkMoneyTitle'),
        subtitle: l10n.tr('tarotWorkMoneySubtitle'),
        prompt: l10n.tr('tarotWorkMoneyPrompt'),
        positions: [
          l10n.tr('tarotPosAvailableEnergy'),
          l10n.tr('tarotPosRisk'),
          l10n.tr('tarotPosSmartBet'),
        ],
      );
  }
}

const _tarotCardSlugAliases = <String, String>{
  'la-fuerza': 'fuerza',
  'la-templanza': 'templanza',
  'la-justicia': 'justicia',
  'el-juicio': 'juicio',
  'la-muerte': 'muerte',
  'la-rueda': 'rueda-de-la-fortuna',
  'la-rueda-de-la-fortuna': 'rueda-de-la-fortuna',
};

String _buildTarotCardImageUrl(String cardName) {
  final slug = _resolveTarotCardSlug(cardName);
  if (slug.isEmpty) {
    return '';
  }

  final path = '/api/tarot/cards/$slug/image';
  return Uri.parse(AppConfig.apiBaseUrl).resolve(path).toString();
}

String _buildTarotCardAssetPath(String cardName) {
  final slug = _resolveTarotCardSlug(cardName);
  if (slug.isEmpty) {
    return '';
  }

  return 'assets/tarot_cards/$slug.png';
}

String _resolveTarotCardSlug(String cardName) {
  final normalized = _slugifyTarotCardName(cardName);
  if (normalized.isEmpty) {
    return '';
  }

  return _tarotCardSlugAliases[normalized] ?? normalized;
}

String _slugifyTarotCardName(String value) {
  const replacements = <String, String>{
    'á': 'a',
    'é': 'e',
    'í': 'i',
    'ó': 'o',
    'ú': 'u',
    'ü': 'u',
    'ñ': 'n',
  };

  final normalized = value
      .trim()
      .toLowerCase()
      .split('')
      .map((char) => replacements[char] ?? char)
      .join();

  return normalized
      .replaceAll(RegExp(r'[^a-z0-9]+'), '-')
      .replaceAll(RegExp(r'-+'), '-')
      .replaceAll(RegExp(r'^-|-$'), '');
}

List<_TarotDrawnCard> _buildDailySpreadCards({
  required DateTime referenceDate,
  required AppLocalizations l10n,
}) {
  final dailySeed = (referenceDate.year * 10000) +
      (referenceDate.month * 100) +
      referenceDate.day;
  final random = Random(dailySeed);
  final pool = [..._tarotDeck]..shuffle(random);
  final labels = _focusConfig(_TarotSpreadFocus.daily, l10n).positions;

  return List.generate(
    labels.length,
    (index) => _TarotDrawnCard(
      positionLabel: labels[index],
      card: pool[index],
    ),
  );
}

String _buildDailySpreadSynthesis(
  List<_TarotDrawnCard> cards,
  AppLocalizations l10n,
) {
  if (cards.length < 3) {
    return l10n.ts('Tu tirada del día todavía se está preparando.');
  }

  final release = cards[0];
  final pulse = cards[1];
  final action = cards[2];

  return l10n.ts(
    'Hoy el recorrido empieza en {release}, donde conviene aflojar una carga o una reacción automática; luego pasa por {pulse}, que marca el tono emocional y mental del día; y aterriza en {action}, que te pide una acción concreta, sobria y consciente.',
    {
      'release': l10n.ts(release.card.name),
      'pulse': l10n.ts(pulse.card.name),
      'action': l10n.ts(action.card.name),
    },
  );
}

const _tarotDeck = <_TarotCardMeaning>[
  _TarotCardMeaning(
    name: 'La Estrella',
    message:
        'Hay una capa de calma y confianza que conviene recuperar antes de hacer algo grande.',
    action: 'Vuelve a tu intención central y avanza con un gesto simple.',
    caution: 'No prometas más de lo que hoy puedes sostener.',
  ),
  _TarotCardMeaning(
    name: 'La Sacerdotisa',
    message:
        'La información clave aún no está completa. Observa más antes de exponerlo todo.',
    action: 'Escucha, registra señales y deja espacio a lo sutil.',
    caution: 'No fuerces definiciones por ansiedad.',
  ),
  _TarotCardMeaning(
    name: 'El Mago',
    message:
        'Tienes recursos para mover la situación si concentras energía y dejas de dispersarte.',
    action: 'Elige una prioridad y ejecútala hoy.',
    caution: 'Evita manipular o sobreactuar para lograr atención.',
  ),
  _TarotCardMeaning(
    name: 'La Emperatriz',
    message:
        'La expansión viene mejor cuando cuidas el proceso, el cuerpo y el entorno.',
    action: 'Nutre primero lo que quieres ver crecer.',
    caution: 'No confundas sostener con cargar con todo.',
  ),
  _TarotCardMeaning(
    name: 'El Ermitaño',
    message:
        'La claridad baja cuando reduces ruido y vuelves a una voz más profunda y honesta.',
    action: 'Haz pausa, revisa tus motivos y después responde.',
    caution: 'No te aísles por completo ni congeles decisiones urgentes.',
  ),
  _TarotCardMeaning(
    name: 'La Rueda',
    message:
        'Hay un cambio de ritmo en marcha. Lo mejor es leer el momento en lugar de resistirlo.',
    action: 'Ajusta expectativa y toma el giro a tiempo.',
    caution: 'No te aferres a un escenario que ya cambió.',
  ),
  _TarotCardMeaning(
    name: 'La Justicia',
    message:
        'Hoy conviene mirar hechos, límites y consecuencias con menos fantasía y más rigor.',
    action: 'Ordena, firma, define o pon una regla clara.',
    caution: 'No castigues ni te castigues más de la cuenta.',
  ),
  _TarotCardMeaning(
    name: 'La Fuerza',
    message:
        'No necesitas imponerte; necesitas regular tu energía para sostener la dirección.',
    action: 'Canaliza impulso sin perder ternura ni firmeza.',
    caution: 'Evita explotar por acumulación.',
  ),
  _TarotCardMeaning(
    name: 'El Sol',
    message:
        'La lectura abre una etapa de visibilidad, alivio y validación más directa.',
    action: 'Muestra tu trabajo o tu verdad con sencillez.',
    caution: 'No minimices lo que sí está funcionando.',
  ),
  _TarotCardMeaning(
    name: 'La Luna',
    message:
        'Hay emoción, intuición y algo de neblina. No todo lo que sientes debe decidirse hoy.',
    action: 'Pon nombre a la emoción antes de actuar.',
    caution: 'No confundas miedo con certeza.',
  ),
  _TarotCardMeaning(
    name: 'El Colgado',
    message:
        'La situación pide otro ángulo. Lo productivo ahora no es apurar sino reencuadrar.',
    action:
        'Suspende una reacción automática y revisa la escena desde otro lugar.',
    caution: 'No te quedes inmóvil por puro desgaste.',
  ),
  _TarotCardMeaning(
    name: 'El Mundo',
    message:
        'Hay cierre, integración y capacidad de completar algo con más madurez.',
    action: 'Cierra el ciclo con conciencia y prepara el siguiente nivel.',
    caution: 'No vuelvas a abrir lo que ya estaba listo para concluir.',
  ),
];
