import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/i18n/app_i18n.dart';
import '../../core/theme/app_palette.dart';
import '../../core/utils/formatters.dart';
import '../../core/widgets/mystic_ui.dart';
import '../chat/community_chat_screen.dart';
import '../../models/app_models.dart';
import '../../models/booking_models.dart';
import '../../models/chat_models.dart';

class BookingsScreen extends StatefulWidget {
  const BookingsScreen({
    super.key,
    required this.data,
    required this.onRefresh,
    required this.onCreateBooking,
    required this.onLoadAvailability,
    required this.onUpdateBooking,
    required this.onCancelBooking,
    required this.onLoadCommunityChat,
    required this.onSendCommunityChatMessage,
    this.canManageBookings = false,
    this.isAdminView = false,
  });

  final AppBootstrap data;
  final Future<void> Function() onRefresh;
  final Future<void> Function() onCreateBooking;
  final Future<List<SpecialistAvailabilitySlot>> Function({
    required String specialistId,
    required DateTime from,
    required DateTime to,
    String? mode,
    String? serviceId,
  }) onLoadAvailability;
  final Future<String?> Function({
    required String bookingId,
    required UpdateBookingInput input,
  }) onUpdateBooking;
  final Future<String?> Function(String bookingId) onCancelBooking;
  final Future<List<CommunityChatMessage>> Function() onLoadCommunityChat;
  final Future<List<CommunityChatMessage>> Function(
    String body, {
    XFile? imageFile,
  })
      onSendCommunityChatMessage;
  final bool canManageBookings;
  final bool isAdminView;

  @override
  State<BookingsScreen> createState() => _BookingsScreenState();
}

class _BookingsScreenState extends State<BookingsScreen> {
  String? _busyBookingId;

  Future<void> _openCommunityChat() async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => CommunityChatScreen(
          onLoadMessages: widget.onLoadCommunityChat,
          onSendMessage: widget.onSendCommunityChatMessage,
        ),
      ),
    );
  }

  void _openSpecialistProfile(Specialist specialist) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      backgroundColor: AppPalette.petalSoft,
      builder: (_) {
        final specialistServices = widget.data.services
            .where((service) => service.specialistIds.contains(specialist.id))
            .toList();
        final sessionModes = specialist.sessionModes.isEmpty
            ? const ['online']
            : specialist.sessionModes;

        return DraggableScrollableSheet(
          expand: false,
          initialChildSize: 0.86,
          minChildSize: 0.55,
          maxChildSize: 0.96,
          builder: (context, scrollController) {
            return Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    AppPalette.petalSoft,
                    Colors.white,
                  ],
                ),
              ),
              child: ListView(
                controller: scrollController,
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 66,
                        height: 66,
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [
                              AppPalette.indigo,
                              AppPalette.royalViolet,
                            ],
                          ),
                          borderRadius: BorderRadius.circular(22),
                        ),
                        child: Center(
                          child: Text(
                            specialist.name.trim().isEmpty
                                ? 'S'
                                : specialist.name.trim().substring(0, 1).toUpperCase(),
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w900,
                              fontSize: 24,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              specialist.name,
                              style: Theme.of(context)
                                  .textTheme
                                  .headlineSmall
                                  ?.copyWith(
                                    fontWeight: FontWeight.w900,
                                    color: AppPalette.butterflyInk,
                                  ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              specialist.headline,
                              style: Theme.of(context)
                                  .textTheme
                                  .bodyMedium
                                  ?.copyWith(
                                    color: AppPalette.mutedLavender,
                                    height: 1.35,
                                  ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      _ProfileChip(
                        icon: Icons.star_rounded,
                        label: '${specialist.rating.toStringAsFixed(1)} · ${specialist.reviewCount} reseñas',
                      ),
                      _ProfileChip(
                        icon: Icons.work_outline_rounded,
                        label: '${specialist.yearsExperience} años de experiencia',
                      ),
                      _ProfileChip(
                        icon: Icons.schedule_rounded,
                        label: specialist.nextAvailableAt.trim().isEmpty
                            ? 'Próxima agenda por definir'
                            : 'Disponible ${formatSchedule(specialist.nextAvailableAt)}',
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),
                  Text(
                    'Perfil completo',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w900,
                          color: AppPalette.butterflyInk,
                        ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    specialist.bio.trim().isEmpty
                        ? 'Sin biografía disponible.'
                        : specialist.bio,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          height: 1.5,
                          color: AppPalette.butterflyInk,
                        ),
                  ),
                  const SizedBox(height: 18),
                  _ProfileSection(
                    title: 'Especialidades',
                    children: specialist.specialties
                        .map((item) => _ProfileChip(label: item))
                        .toList(),
                  ),
                  const SizedBox(height: 18),
                  _ProfileSection(
                    title: 'Modalidades',
                    children: sessionModes
                        .map(
                          (mode) => _ProfileChip(
                            label: _modeLabel(context, mode),
                          ),
                        )
                        .toList(),
                  ),
                  const SizedBox(height: 18),
                  _ProfileSection(
                    title: 'Idiomas',
                    children: specialist.languages
                        .map((item) => _ProfileChip(label: item))
                        .toList(),
                  ),
                  const SizedBox(height: 18),
                  Text(
                    'Servicios vinculados',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w900,
                          color: AppPalette.butterflyInk,
                        ),
                  ),
                  const SizedBox(height: 12),
                  if (specialistServices.isEmpty)
                    Text(
                      'No hay servicios asociados aún.',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: AppPalette.mutedLavender,
                          ),
                    )
                  else
                    ...specialistServices.map(
                      (service) => Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: _LinkedServiceCard(service: service),
                      ),
                    ),
                  const SizedBox(height: 10),
                  FilledButton.icon(
                    onPressed: () {
                      Navigator.of(context).pop();
                      widget.onCreateBooking();
                    },
                    icon: const Icon(Icons.calendar_month_outlined),
                    label: Text(context.l10n.ts('Agendar nueva consulta')),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  bool _canManageBooking(Booking booking) {
    return booking.status != 'cancelled' && booking.status != 'completed';
  }

  Future<void> _handleCancelBooking(Booking booking) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: Text(context.l10n.ts('Cancelar reserva')),
          content: Text(
            context.l10n.ts(
              'Se cancelará {service} con {specialist}. Esta acción no se puede deshacer desde la app.',
              {
                'service': booking.serviceName,
                'specialist': booking.specialistName,
              },
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(false),
              child: Text(context.l10n.ts('Volver')),
            ),
            FilledButton(
              onPressed: () => Navigator.of(dialogContext).pop(true),
              child: Text(context.l10n.ts('Cancelar reserva')),
            ),
          ],
        );
      },
    );

    if (confirmed != true || !mounted) {
      return;
    }

    setState(() {
      _busyBookingId = booking.id;
    });

    final errorMessage = await widget.onCancelBooking(booking.id);
    if (!mounted) {
      return;
    }

    setState(() {
      _busyBookingId = null;
    });

    _showSnackBar(
      errorMessage ??
          context.l10n.ts(
            'La reserva fue cancelada y ya no aparece como activa.',
          ),
    );
  }

  Future<void> _handleRescheduleBooking(Booking booking) async {
    final service = widget.data.services
        .where((item) => item.id == booking.serviceId)
        .firstOrNull;
    if (service == null) {
      _showSnackBar(
        context.l10n.ts(
          'No encontramos el servicio para reprogramar esta reserva.',
        ),
      );
      return;
    }

    final changed = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: AppPalette.petalSoft,
      builder: (_) => _RescheduleBookingSheet(
        booking: booking,
        service: service,
        onLoadAvailability: widget.onLoadAvailability,
        onSave: (input) async {
          setState(() {
            _busyBookingId = booking.id;
          });

          final errorMessage = await widget.onUpdateBooking(
            bookingId: booking.id,
            input: input,
          );

          if (!mounted) {
            return errorMessage;
          }

          setState(() {
            _busyBookingId = null;
          });

          if (errorMessage == null) {
            _showSnackBar(
              context.l10n.ts('La cita fue reprogramada correctamente.'),
            );
          }
          return errorMessage;
        },
      ),
    );

    if (changed == true && mounted) {
      setState(() {
        _busyBookingId = null;
      });
    }
  }

  Future<void> _handleSpecialistStatus(Booking booking, String status) async {
    setState(() {
      _busyBookingId = booking.id;
    });

    final errorMessage = await widget.onUpdateBooking(
      bookingId: booking.id,
      input: UpdateBookingInput(status: status),
    );

    if (!mounted) {
      return;
    }

    setState(() {
      _busyBookingId = null;
    });

    _showSnackBar(
      errorMessage ??
          context.l10n.ts(
            'Cita actualizada a {status}.',
            {'status': _statusLabel(context, status)},
          ),
    );
  }

  void _showBookingDetail(Booking booking) {
    showModalBottomSheet<void>(
      context: context,
      useSafeArea: true,
      showDragHandle: true,
      builder: (_) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                booking.serviceName,
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 8),
              Text(
                '${booking.specialistName} · ${_modeLabel(context, booking.mode)}',
              ),
              const SizedBox(height: 6),
              Text(formatSchedule(booking.scheduledAt)),
              const SizedBox(height: 6),
              Text(
                context.l10n.ts(
                  'Estado: {status}',
                  {'status': _statusLabel(context, booking.status)},
                ),
              ),
              const SizedBox(height: 12),
              Text(
                booking.notes.trim().isEmpty
                    ? context.l10n.ts(
                        'Sin notas añadidas para esta consulta.',
                      )
                    : booking.notes,
              ),
            ],
          ),
        );
      },
    );
  }

  void _showSnackBar(String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  Widget _buildSpecialistAgenda({
    required int confirmedCount,
    required int pendingPaymentCount,
    required int cancelledCount,
  }) {
    final l10n = context.l10n;
    final activeBookings = widget.data.bookings
        .where((booking) => booking.status != 'cancelled')
        .toList(growable: false);

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
          onRefresh: widget.onRefresh,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
            children: [
              MysticBannerCard(
                eyebrow: l10n.ts('Agenda especialista'),
                title: l10n.ts('Citas recibidas'),
                subtitle: l10n.ts(
                  'Gestiona pagos, confirmaciones y cierre de sesiones sin crear reservas como cliente.',
                ),
                glyphKind: MysticGlyphKind.agenda,
                gradient: AppPalette.darkBrandGradient,
                tags: [
                  l10n.ts(
                    '{count} reservas',
                    {'count': '${widget.data.bookings.length}'},
                  ),
                  l10n.ts('{count} confirmadas', {'count': '$confirmedCount'}),
                  l10n.ts('{count} pendientes', {
                    'count': '$pendingPaymentCount',
                  }),
                  if (cancelledCount > 0)
                    l10n.ts('{count} canceladas', {
                      'count': '$cancelledCount',
                    }),
                ],
                primaryLabel: l10n.ts('Chat comunidad'),
                onPrimaryTap: _openCommunityChat,
              ),
              const SizedBox(height: 20),
              Text(
                l10n.ts('Operación de citas'),
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      color: AppPalette.butterflyInk,
                      fontWeight: FontWeight.w900,
                    ),
              ),
              const SizedBox(height: 12),
              if (activeBookings.isEmpty)
                MysticMiniBanner(
                  title: l10n.ts('Sin citas activas'),
                  subtitle: l10n.ts(
                    'Cuando un cliente reserve una consulta, aparecerá aquí para cambiar estado y revisar notas.',
                  ),
                  glyphKind: MysticGlyphKind.agenda,
                  accent: AppPalette.orchid,
                )
              else
                ...activeBookings.map(
                  (booking) => Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: _SpecialistAgendaBookingCard(
                      booking: booking,
                      busy: _busyBookingId == booking.id,
                      onOpen: () => _showBookingDetail(booking),
                      onStatusSelected: (status) =>
                          _handleSpecialistStatus(booking, status),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAdminAgenda({
    required int confirmedCount,
    required int pendingPaymentCount,
    required int cancelledCount,
  }) {
    final l10n = context.l10n;
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
          onRefresh: widget.onRefresh,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
            children: [
              MysticBannerCard(
                eyebrow: l10n.ts('Agenda global'),
                title: l10n.ts('Vista usuario madre'),
                subtitle: l10n.ts(
                  'Lectura transversal de las citas de la plataforma sin mezclarlas con el rol del cliente o del especialista.',
                ),
                glyphKind: MysticGlyphKind.agenda,
                gradient: AppPalette.darkBrandGradient,
                tags: [
                  l10n.ts(
                    '{count} visibles',
                    {'count': '${widget.data.bookings.length}'},
                  ),
                  l10n.ts('{count} confirmadas', {'count': '$confirmedCount'}),
                  l10n.ts('{count} pendientes', {
                    'count': '$pendingPaymentCount',
                  }),
                  if (cancelledCount > 0)
                    l10n.ts('{count} canceladas', {
                      'count': '$cancelledCount',
                    }),
                ],
                primaryLabel: l10n.ts('Chat comunidad'),
                onPrimaryTap: _openCommunityChat,
              ),
              const SizedBox(height: 20),
              if (widget.data.bookings.isEmpty)
                MysticMiniBanner(
                  title: l10n.ts('Sin reservas globales'),
                  subtitle: l10n.ts(
                    'Cuando la API devuelva reservas, aquí aparecerán de forma consolidada para supervisión.',
                  ),
                  glyphKind: MysticGlyphKind.agenda,
                  accent: AppPalette.orchid,
                )
              else
                ...widget.data.bookings.map(
                  (booking) => Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: MysticMiniBanner(
                      title:
                          '${booking.specialistName} · ${booking.serviceName}',
                      subtitle:
                          '${formatSchedule(booking.scheduledAt)} · ${formatMoney(booking.price)}\n${_modeLabel(context, booking.mode)} · ${_statusLabel(context, booking.status)}',
                      glyphKind: booking.mode == 'video'
                          ? MysticGlyphKind.video
                          : booking.mode == 'audio'
                              ? MysticGlyphKind.audio
                              : MysticGlyphKind.chat,
                      accent: _statusAccent(booking.status),
                      onTap: () => _showBookingDetail(booking),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final tarotSpecialists = widget.data.specialists.where((specialist) {
      return specialist.specialties.any(
        (item) => item.toLowerCase().contains('tarot'),
      );
    }).toList();
    final confirmedCount = widget.data.bookings
        .where((booking) => booking.status == 'confirmed')
        .length;
    final pendingPaymentCount = widget.data.bookings
        .where((booking) => booking.status == 'pending_payment')
        .length;
    final cancelledCount = widget.data.bookings
        .where((booking) => booking.status == 'cancelled')
        .length;

    if (widget.canManageBookings) {
      return _buildSpecialistAgenda(
        confirmedCount: confirmedCount,
        pendingPaymentCount: pendingPaymentCount,
        cancelledCount: cancelledCount,
      );
    }

    if (widget.isAdminView) {
      return _buildAdminAgenda(
        confirmedCount: confirmedCount,
        pendingPaymentCount: pendingPaymentCount,
        cancelledCount: cancelledCount,
      );
    }

    return Scaffold(
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
          child: RefreshIndicator(
            onRefresh: widget.onRefresh,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 120),
              children: [
                Text(
                  l10n.ts('Atajos de citas'),
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                ),
                const SizedBox(height: 12),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      MysticMenuTile(
                        glyphKind: MysticGlyphKind.chat,
                        label: l10n.ts('Chat general'),
                        caption: l10n.ts(
                          'Espacio abierto para que toda la gente comente.',
                        ),
                        accent: const Color(0xFF9A5A33),
                        onTap: _openCommunityChat,
                      ),
                    ],
                  ),
                ),
                if (tarotSpecialists.isNotEmpty) ...[
                  const SizedBox(height: 20),
                  Text(
                    l10n.ts('Especialistas sugeridos'),
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                  ),
                  const SizedBox(height: 12),
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        for (final specialist in tarotSpecialists.take(6)) ...[
                          _SpecialistButtonCard(
                            specialist: specialist,
                            onTap: () => _openSpecialistProfile(specialist),
                          ),
                          const SizedBox(width: 12),
                        ],
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: 20),
                if (widget.data.bookings.isEmpty)
                  MysticMiniBanner(
                    title: l10n.ts('Aún no tienes citas agendadas'),
                    subtitle: l10n.ts(
                      'Crea tu primera consulta y elige el día y la hora que mejor te funcione.',
                    ),
                    glyphKind: MysticGlyphKind.agenda,
                    accent: AppPalette.orchid,
                    onTap: () => widget.onCreateBooking(),
                  )
                else
                  ...widget.data.bookings.map(
                    (booking) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Column(
                        children: [
                          MysticMiniBanner(
                            title:
                                '${booking.specialistName} · ${booking.serviceName}',
                            subtitle:
                                '${formatSchedule(booking.scheduledAt)} · ${formatMoney(booking.price)}\n${_modeLabel(context, booking.mode)}',
                            glyphKind: booking.mode == 'video'
                                ? MysticGlyphKind.video
                                : booking.mode == 'audio'
                                    ? MysticGlyphKind.audio
                                    : MysticGlyphKind.chat,
                            accent: _statusAccent(booking.status),
                            onTap: () => _showBookingDetail(booking),
                            trailing: _BookingStatusPill(booking: booking),
                          ),
                          if (_canManageBooking(booking)) ...[
                            const SizedBox(height: 10),
                            Row(
                              children: [
                                Expanded(
                                  child: OutlinedButton.icon(
                                    onPressed: _busyBookingId == booking.id
                                        ? null
                                        : () =>
                                            _handleRescheduleBooking(booking),
                                    icon: _busyBookingId == booking.id
                                        ? const SizedBox(
                                            width: 16,
                                            height: 16,
                                            child: CircularProgressIndicator(
                                              strokeWidth: 2,
                                            ),
                                          )
                                        : const Icon(
                                            Icons.calendar_month_outlined,
                                          ),
                                    label: Text(l10n.ts('Reprogramar')),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: FilledButton.tonalIcon(
                                    onPressed: _busyBookingId == booking.id
                                        ? null
                                        : () => _handleCancelBooking(booking),
                                    icon: const Icon(Icons.close_rounded),
                                    label: Text(l10n.ts('Cancelar')),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
      bottomNavigationBar: SafeArea(
        top: false,
        child: Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            border: Border(
              top: BorderSide(color: AppPalette.borderSoft),
            ),
          ),
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
          child: SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: () => widget.onCreateBooking(),
              style: FilledButton.styleFrom(
                backgroundColor: AppPalette.royalViolet,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(
                  horizontal: 18,
                  vertical: 16,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20),
                ),
              ),
              icon: const Icon(Icons.add_circle_outline),
              label: Text(l10n.ts('Agendar nueva consulta')),
            ),
          ),
        ),
      ),
    );
  }
}

class _SpecialistButtonCard extends StatelessWidget {
  const _SpecialistButtonCard({
    required this.specialist,
    required this.onTap,
  });

  final Specialist specialist;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(22),
        child: Ink(
          width: 220,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: AppPalette.borderSoft),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 16,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [
                      AppPalette.indigo,
                      AppPalette.royalViolet,
                    ],
                  ),
                  borderRadius: BorderRadius.circular(18),
                ),
                child: Center(
                  child: Text(
                    specialist.name.trim().isEmpty
                        ? 'S'
                        : specialist.name.trim().substring(0, 1).toUpperCase(),
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w900,
                      fontSize: 20,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      specialist.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w900,
                            color: AppPalette.butterflyInk,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      specialist.headline,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: AppPalette.mutedLavender,
                            height: 1.3,
                          ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Ver perfil',
                      style: Theme.of(context).textTheme.labelMedium?.copyWith(
                            color: AppPalette.royalViolet,
                            fontWeight: FontWeight.w800,
                          ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              const Icon(
                Icons.arrow_forward_ios_rounded,
                size: 16,
                color: AppPalette.royalViolet,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ProfileSection extends StatelessWidget {
  const _ProfileSection({
    required this.title,
    required this.children,
  });

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w900,
                color: AppPalette.butterflyInk,
              ),
        ),
        const SizedBox(height: 10),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: children,
        ),
      ],
    );
  }
}

class _ProfileChip extends StatelessWidget {
  const _ProfileChip({
    this.icon,
    required this.label,
  });

  final IconData? icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: AppPalette.mistLilac,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: AppPalette.borderSoft),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 16, color: AppPalette.royalViolet),
            const SizedBox(width: 6),
          ],
          Text(
            label,
            style: Theme.of(context).textTheme.labelMedium?.copyWith(
                  color: AppPalette.butterflyInk,
                  fontWeight: FontWeight.w700,
                ),
          ),
        ],
      ),
    );
  }
}

class _LinkedServiceCard extends StatelessWidget {
  const _LinkedServiceCard({
    required this.service,
  });

  final ServiceOffer service;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppPalette.borderSoft),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            service.name,
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w900,
                  color: AppPalette.butterflyInk,
                ),
          ),
          const SizedBox(height: 4),
          Text(
            '${service.category} · ${formatMoney(service.price)}',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: AppPalette.mutedLavender,
                ),
          ),
          if (service.description.trim().isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              service.description,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppPalette.butterflyInk,
                    height: 1.45,
                  ),
            ),
          ],
        ],
      ),
    );
  }
}

class _BookingStatusPill extends StatelessWidget {
  const _BookingStatusPill({
    required this.booking,
  });

  final Booking booking;

  @override
  Widget build(BuildContext context) {
    final accent = _statusAccent(booking.status);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: accent.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        _statusLabel(context, booking.status),
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w800,
          color: accent,
        ),
      ),
    );
  }
}

class _SpecialistAgendaBookingCard extends StatelessWidget {
  const _SpecialistAgendaBookingCard({
    required this.booking,
    required this.busy,
    required this.onOpen,
    required this.onStatusSelected,
  });

  final Booking booking;
  final bool busy;
  final VoidCallback onOpen;
  final ValueChanged<String> onStatusSelected;

  @override
  Widget build(BuildContext context) {
    final accent = _statusAccent(booking.status);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(24),
        onTap: onOpen,
        child: Ink(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: AppPalette.borderSoft),
          ),
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(
                  color: accent.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Icon(Icons.event_available_outlined, color: accent),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      booking.serviceName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            color: AppPalette.butterflyInk,
                            fontWeight: FontWeight.w900,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${formatSchedule(booking.scheduledAt)} · ${formatMoney(booking.price)}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: AppPalette.mutedLavender,
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${_modeLabel(context, booking.mode)} · ${booking.notes.trim().isEmpty ? context.l10n.ts('Sin notas') : booking.notes.trim()}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: AppPalette.mutedLavender,
                          ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 10),
              busy
                  ? const SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : PopupMenuButton<String>(
                      tooltip: context.l10n.ts('Cambiar estado'),
                      onSelected: onStatusSelected,
                      itemBuilder: (context) => [
                        PopupMenuItem(
                          value: 'pending_payment',
                          child: Text(context.l10n.ts('Pendiente de pago')),
                        ),
                        PopupMenuItem(
                          value: 'confirmed',
                          child: Text(context.l10n.ts('Confirmada')),
                        ),
                        PopupMenuItem(
                          value: 'completed',
                          child: Text(context.l10n.ts('Completada')),
                        ),
                        PopupMenuItem(
                          value: 'cancelled',
                          child: Text(context.l10n.ts('Cancelada')),
                        ),
                      ],
                      child: _BookingStatusPill(booking: booking),
                    ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RescheduleBookingSheet extends StatefulWidget {
  const _RescheduleBookingSheet({
    required this.booking,
    required this.service,
    required this.onLoadAvailability,
    required this.onSave,
  });

  final Booking booking;
  final ServiceOffer service;
  final Future<List<SpecialistAvailabilitySlot>> Function({
    required String specialistId,
    required DateTime from,
    required DateTime to,
    String? mode,
    String? serviceId,
  }) onLoadAvailability;
  final Future<String?> Function(UpdateBookingInput input) onSave;

  @override
  State<_RescheduleBookingSheet> createState() =>
      _RescheduleBookingSheetState();
}

class _RescheduleBookingSheetState extends State<_RescheduleBookingSheet> {
  late final TextEditingController _notesController;
  late String _selectedMode;
  late DateTime _selectedDate;
  String? _selectedSlotId;
  String? _errorMessage;
  String? _availabilityMessage;
  bool _isSaving = false;
  bool _isLoadingAvailability = false;
  int _availabilityRequestId = 0;
  List<SpecialistAvailabilitySlot> _availabilitySlots = const [];

  @override
  void initState() {
    super.initState();
    _notesController = TextEditingController(text: widget.booking.notes);
    _selectedDate = DateUtils.dateOnly(
      DateTime.tryParse(widget.booking.scheduledAt)?.toLocal() ??
          DateTime.now().add(const Duration(days: 1)),
    );
    _selectedMode = widget.service.deliveryModes.contains(widget.booking.mode)
        ? widget.booking.mode
        : widget.service.deliveryModes.firstOrNull ?? widget.booking.mode;
    Future<void>.microtask(_loadAvailabilityForSelection);
  }

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 120)),
    );
    if (picked == null) {
      return;
    }

    setState(() {
      _selectedDate = DateUtils.dateOnly(picked);
      _selectedSlotId = null;
      _availabilityMessage = null;
      _errorMessage = null;
    });

    await _loadAvailabilityForSelection();
  }

  SpecialistAvailabilitySlot? get _selectedSlot {
    final slotId = _selectedSlotId;
    if (slotId == null) {
      return null;
    }

    return _availabilitySlots.where((slot) => slot.id == slotId).firstOrNull;
  }

  Future<void> _loadAvailabilityForSelection() async {
    final requestId = ++_availabilityRequestId;
    final from = DateUtils.dateOnly(_selectedDate);
    final to = from.add(const Duration(days: 1));

    setState(() {
      _isLoadingAvailability = true;
      _selectedSlotId = null;
      _availabilityMessage = null;
      _errorMessage = null;
    });

    try {
      final slots = await widget.onLoadAvailability(
        specialistId: widget.booking.specialistId,
        serviceId: widget.service.id,
        mode: _selectedMode,
        from: from,
        to: to,
      );

      if (!mounted || requestId != _availabilityRequestId) {
        return;
      }

      final availableSlots = slots
          .where((slot) => slot.isAvailable)
          .toList()
        ..sort((left, right) => left.startsAt.compareTo(right.startsAt));

      setState(() {
        _availabilitySlots = availableSlots;
        _selectedSlotId = availableSlots.firstOrNull?.id;
        _availabilityMessage = availableSlots.isEmpty
            ? context.l10n.ts(
                'No hay horarios disponibles para reprogramar en ese día.',
              )
            : null;
        _isLoadingAvailability = false;
      });
    } catch (error) {
      if (!mounted || requestId != _availabilityRequestId) {
        return;
      }

      setState(() {
        _availabilitySlots = const [];
        _selectedSlotId = null;
        _availabilityMessage = error.toString().replaceFirst('Exception: ', '');
        _isLoadingAvailability = false;
      });
    }
  }

  Future<void> _save() async {
    final selectedSlot = _selectedSlot;
    final scheduledAt = DateTime.tryParse(selectedSlot?.startsAt ?? '');
    if (selectedSlot == null ||
        scheduledAt == null ||
        scheduledAt.isBefore(DateTime.now())) {
      setState(() {
        _errorMessage =
            context.l10n.ts(
              'Elige un horario disponible y futuro para reprogramar la cita.',
            );
      });
      return;
    }

    setState(() {
      _isSaving = true;
      _errorMessage = null;
    });

    final errorMessage = await widget.onSave(
      UpdateBookingInput(
        scheduledAt: selectedSlot.startsAt,
        mode: _selectedMode,
        notes: _notesController.text.trim(),
      ),
    );

    if (!mounted) {
      return;
    }

    if (errorMessage == null) {
      Navigator.of(context).pop(true);
      return;
    }

    setState(() {
      _isSaving = false;
      _errorMessage = errorMessage;
    });
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return Padding(
      padding: EdgeInsets.fromLTRB(
        20,
        12,
        20,
        MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: ListView(
        shrinkWrap: true,
        children: [
          Text(
            l10n.ts('Reprogramar cita'),
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 8),
          Text(
            '${widget.booking.serviceName} con ${widget.booking.specialistName}',
          ),
          const SizedBox(height: 18),
          DropdownButtonFormField<String>(
            initialValue: _selectedMode,
            decoration: InputDecoration(labelText: l10n.ts('Modalidad')),
            items: widget.service.deliveryModes
                .map(
                  (mode) => DropdownMenuItem<String>(
                    value: mode,
                    child: Text(_modeLabel(context, mode)),
                  ),
                )
                .toList(),
            onChanged: _isSaving
                ? null
                : (value) {
                    if (value == null) {
                      return;
                    }
                    setState(() {
                      _selectedMode = value;
                      _selectedSlotId = null;
                      _availabilityMessage = null;
                    });
                    _loadAvailabilityForSelection();
                  },
          ),
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: _isSaving ? null : _pickDate,
            icon: const Icon(Icons.calendar_month_outlined),
            label: Text(
              '${_selectedDate.day}/${_selectedDate.month}/${_selectedDate.year}',
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    l10n.ts('Horarios disponibles'),
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 6),
                  Text(
                    l10n.ts(
                      'Selecciona un nuevo horario para {minutes} minutos.',
                      {'minutes': '${widget.service.durationMinutes}'},
                    ),
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const SizedBox(height: 14),
                  if (_isLoadingAvailability)
                    const Center(
                      child: Padding(
                        padding: EdgeInsets.symmetric(vertical: 18),
                        child: CircularProgressIndicator(),
                      ),
                    )
                  else if (_availabilityMessage != null)
                    Text(_availabilityMessage!)
                  else if (_availabilitySlots.isEmpty)
                    Text(
                      l10n.ts(
                        'No hay horarios disponibles para esta selección.',
                      ),
                    )
                  else
                    Wrap(
                      spacing: 10,
                      runSpacing: 10,
                      children: _availabilitySlots
                          .map(
                            (slot) => ChoiceChip(
                              label: Text(_formatSlotLabel(slot)),
                              selected: slot.id == _selectedSlotId,
                              onSelected: _isSaving
                                  ? null
                                  : (_) {
                                      setState(() {
                                        _selectedSlotId = slot.id;
                                        _errorMessage = null;
                                      });
                                    },
                            ),
                          )
                          .toList(),
                    ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _notesController,
            minLines: 3,
            maxLines: 5,
            decoration: InputDecoration(
              labelText: l10n.ts('Notas actualizadas'),
              hintText: l10n.ts(
                'Aclara el enfoque o el contexto de esta sesión',
              ),
            ),
          ),
          if (_errorMessage != null) ...[
            const SizedBox(height: 16),
            Text(
              _errorMessage!,
              style: const TextStyle(
                color: Color(0xFF8B2C1F),
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
          const SizedBox(height: 22),
          FilledButton.icon(
            onPressed: _isSaving ? null : _save,
            icon: _isSaving
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.check_circle_outline),
            label: Text(l10n.ts('Guardar cambios')),
          ),
        ],
      ),
    );
  }

  String _formatSlotLabel(SpecialistAvailabilitySlot slot) {
    final startsAt = DateTime.tryParse(slot.startsAt)?.toLocal();
    final endsAt = DateTime.tryParse(slot.endsAt)?.toLocal();
    if (startsAt == null || endsAt == null) {
      return slot.startsAt;
    }

    return '${_formatHour(startsAt)} - ${_formatHour(endsAt)}';
  }

  String _formatHour(DateTime value) {
    return '${value.hour.toString().padLeft(2, '0')}:${value.minute.toString().padLeft(2, '0')}';
  }
}

Color _statusAccent(String status) {
  switch (status) {
    case 'confirmed':
      return AppPalette.royalViolet;
    case 'cancelled':
      return AppPalette.berry;
    case 'completed':
      return AppPalette.indigo;
    default:
      return AppPalette.warning;
  }
}

String _statusLabel(BuildContext context, String status) {
  switch (status) {
    case 'confirmed':
      return context.l10n.ts('Confirmada');
    case 'pending_payment':
      return context.l10n.ts('Pend. pago');
    case 'completed':
      return context.l10n.ts('Completada');
    case 'cancelled':
      return context.l10n.ts('Cancelada');
    default:
      return status;
  }
}

String _modeLabel(BuildContext context, String mode) {
  switch (mode) {
    case 'audio':
      return context.l10n.ts('Audio');
    case 'video':
      return context.l10n.ts('Video');
    default:
      return context.l10n.ts('Chat');
  }
}

extension<T> on Iterable<T> {
  T? get firstOrNull => isEmpty ? null : first;
}
