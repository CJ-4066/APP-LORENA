import 'package:flutter/material.dart';

import '../../core/i18n/app_i18n.dart';
import '../../core/theme/app_palette.dart';
import '../../core/utils/formatters.dart';
import '../../core/widgets/specialist_rating_badge.dart';
import '../../models/app_models.dart';
import '../../models/booking_models.dart';

class ScheduleBookingScreen extends StatefulWidget {
  const ScheduleBookingScreen({
    super.key,
    required this.data,
    required this.onSave,
    required this.onLoadAvailability,
    this.initialServiceId,
  });

  final AppBootstrap data;
  final Future<String?> Function(CreateBookingInput input) onSave;
  final Future<List<SpecialistAvailabilitySlot>> Function({
    required String specialistId,
    required DateTime from,
    required DateTime to,
    String? mode,
    String? serviceId,
  }) onLoadAvailability;
  final String? initialServiceId;

  @override
  State<ScheduleBookingScreen> createState() => _ScheduleBookingScreenState();
}

class _ScheduleBookingScreenState extends State<ScheduleBookingScreen> {
  late final TextEditingController _notesController;
  late final List<ServiceOffer> _consultationServices;

  String? _selectedServiceId;
  String? _selectedSpecialistId;
  String? _selectedMode;
  DateTime? _selectedDate;
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
    _notesController = TextEditingController();
    _consultationServices = widget.data.services
        .where((service) =>
            service.durationMinutes > 0 && service.specialistIds.isNotEmpty)
        .toList();
    if (_consultationServices.isNotEmpty) {
      final preferredService = widget.initialServiceId;
      final hasPreferredService = preferredService != null &&
          _consultationServices
              .any((service) => service.id == preferredService);
      _selectedServiceId = hasPreferredService
          ? preferredService
          : _consultationServices.first.id;
      _syncSelection();
      _ensureSelectedDate();
      Future<void>.microtask(_loadAvailabilityForSelection);
    }
  }

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  ServiceOffer? get _selectedService {
    final id = _selectedServiceId;
    if (id == null) {
      return null;
    }

    return _consultationServices
        .where((service) => service.id == id)
        .firstOrNull;
  }

  SpecialistAvailabilitySlot? get _selectedSlot {
    final slotId = _selectedSlotId;
    if (slotId == null) {
      return null;
    }

    return _availabilitySlots.where((slot) => slot.id == slotId).firstOrNull;
  }

  List<Specialist> get _availableSpecialists {
    final service = _selectedService;
    if (service == null) {
      return const [];
    }

    return widget.data.specialists
        .where((specialist) => service.specialistIds.contains(specialist.id))
        .toList();
  }

  List<String> get _availableModes {
    final service = _selectedService;
    final specialistId = _selectedSpecialistId;
    if (service == null) {
      return const [];
    }

    final specialist = widget.data.specialists
        .where((item) => item.id == specialistId)
        .firstOrNull;
    if (specialist == null) {
      return service.deliveryModes;
    }

    return service.deliveryModes
        .where((mode) => specialist.sessionModes.contains(mode))
        .toList();
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate ?? now.add(const Duration(days: 1)),
      firstDate: now,
      lastDate: now.add(const Duration(days: 120)),
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

  void _syncSelection() {
    final specialists = _availableSpecialists;
    if (specialists.isEmpty) {
      _selectedSpecialistId = null;
      _selectedMode = null;
      _resetAvailabilityState();
      return;
    }

    final stillSelected =
        specialists.any((item) => item.id == _selectedSpecialistId);
    _selectedSpecialistId =
        stillSelected ? _selectedSpecialistId : specialists.first.id;

    final modes = _availableModes;
    if (modes.isEmpty) {
      _selectedMode = null;
      _resetAvailabilityState();
      return;
    }

    final stillValidMode = modes.contains(_selectedMode);
    _selectedMode = stillValidMode ? _selectedMode : modes.first;
  }

  void _ensureSelectedDate() {
    if (_selectedDate != null) {
      return;
    }

    final specialist = _availableSpecialists
        .where((item) => item.id == _selectedSpecialistId)
        .firstOrNull;
    final suggestedDate =
        DateTime.tryParse(specialist?.nextAvailableAt ?? '')?.toLocal();
    final fallback = DateTime.now().add(const Duration(days: 1));
    _selectedDate = DateUtils.dateOnly(suggestedDate ?? fallback);
  }

  void _resetAvailabilityState() {
    _availabilitySlots = const [];
    _selectedSlotId = null;
    _availabilityMessage = null;
  }

  Future<void> _loadAvailabilityForSelection() async {
    final serviceId = _selectedServiceId;
    final specialistId = _selectedSpecialistId;
    final mode = _selectedMode;
    final selectedDate = _selectedDate;

    if (serviceId == null ||
        specialistId == null ||
        mode == null ||
        selectedDate == null) {
      if (mounted) {
        setState(_resetAvailabilityState);
      }
      return;
    }

    final requestId = ++_availabilityRequestId;
    final from = DateUtils.dateOnly(selectedDate);
    final to = from.add(const Duration(days: 1));

    setState(() {
      _isLoadingAvailability = true;
      _selectedSlotId = null;
      _availabilityMessage = null;
      _errorMessage = null;
    });

    try {
      final slots = await widget.onLoadAvailability(
        specialistId: specialistId,
        serviceId: serviceId,
        mode: mode,
        from: from,
        to: to,
      );

      if (!mounted || requestId != _availabilityRequestId) {
        return;
      }

      final availableSlots = slots.where((slot) => slot.isAvailable).toList()
        ..sort((left, right) => left.startsAt.compareTo(right.startsAt));

      setState(() {
        _availabilitySlots = availableSlots;
        _selectedSlotId = availableSlots.firstOrNull?.id;
        _availabilityMessage = availableSlots.isEmpty
            ? context.l10n.ts(
                'No encontramos horarios disponibles para ese día. Prueba con otra fecha o modalidad.',
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
    final serviceId = _selectedServiceId;
    final specialistId = _selectedSpecialistId;
    final mode = _selectedMode;
    final slot = _selectedSlot;

    if (serviceId == null ||
        specialistId == null ||
        mode == null ||
        slot == null) {
      setState(() {
        _errorMessage = context.l10n.ts(
          'Selecciona servicio, especialista, modalidad y un horario disponible para agendar la cita.',
        );
      });
      return;
    }

    final scheduledAt = DateTime.tryParse(slot.startsAt);
    if (scheduledAt == null || scheduledAt.isBefore(DateTime.now())) {
      setState(() {
        _errorMessage =
            context.l10n.ts('El horario seleccionado ya no está disponible.');
      });
      return;
    }

    setState(() {
      _isSaving = true;
      _errorMessage = null;
    });

    final errorMessage = await widget.onSave(
      CreateBookingInput(
        specialistId: specialistId,
        serviceId: serviceId,
        scheduledAt: slot.startsAt,
        mode: mode,
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
    final service = _selectedService;
    final specialists = _availableSpecialists;
    final modes = _availableModes;
    final selectedSpecialist = specialists
        .where((item) => item.id == _selectedSpecialistId)
        .firstOrNull;
    final selectedSlot = _selectedSlot;
    final appointmentOverview = [
      _BookingOverviewChip(
        label: l10n.ts('Servicio'),
        value: service?.name ?? l10n.ts('Pendiente'),
        accent:
            service == null ? AppPalette.borderStrong : AppPalette.royalViolet,
      ),
      _BookingOverviewChip(
        label: l10n.ts('Especialista'),
        value: selectedSpecialist?.name ?? l10n.ts('Pendiente'),
        accent: selectedSpecialist == null
            ? AppPalette.borderStrong
            : AppPalette.indigo,
      ),
      _BookingOverviewChip(
        label: l10n.ts('Día'),
        value: _selectedDate == null
            ? l10n.ts('Pendiente')
            : _formatDate(_selectedDate!, l10n),
        accent: _selectedDate == null
            ? AppPalette.borderStrong
            : AppPalette.flameGold,
      ),
      _BookingOverviewChip(
        label: l10n.ts('Hora'),
        value: selectedSlot == null
            ? l10n.ts('Pendiente')
            : formatSchedule(selectedSlot.startsAt),
        accent:
            selectedSlot == null ? AppPalette.borderStrong : AppPalette.success,
      ),
    ];

    return Scaffold(
      backgroundColor: AppPalette.petalSoft,
      appBar: AppBar(
        title: Text(l10n.ts('Agendar cita')),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: SafeArea(
        child: Container(
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
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
            children: [
              RepaintBoundary(
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        l10n.ts('Agendar cita'),
                        style:
                            Theme.of(context).textTheme.headlineSmall?.copyWith(
                                  fontWeight: FontWeight.w800,
                                  color: AppPalette.butterflyInk,
                                ),
                      ),
                    ),
                    FilledButton.tonalIcon(
                      onPressed: _isSaving ? null : _pickDate,
                      icon: const Icon(Icons.calendar_today_rounded, size: 18),
                      label: Text(
                        _selectedDate == null
                            ? l10n.ts('Elegir día')
                            : _formatDate(_selectedDate!, l10n),
                      ),
                      style: FilledButton.styleFrom(
                        foregroundColor: AppPalette.butterflyInk,
                        backgroundColor: AppPalette.moonIvory,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 12,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),
              RepaintBoundary(
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      for (var index = 0;
                          index < appointmentOverview.length;
                          index++) ...[
                        appointmentOverview[index],
                        if (index != appointmentOverview.length - 1)
                          const SizedBox(width: 10),
                      ],
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 18),
              RepaintBoundary(
                child: _BookingStepCard(
                  title: l10n.ts('Servicio'),
                  icon: Icons.auto_awesome_rounded,
                  accent: AppPalette.royalViolet,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      DropdownButtonFormField<String>(
                        key: ValueKey(
                            'service-${_selectedServiceId ?? 'empty'}'),
                        initialValue: _selectedServiceId,
                        decoration:
                            InputDecoration(labelText: l10n.ts('Servicio')),
                        items: _consultationServices
                            .map(
                              (service) => DropdownMenuItem<String>(
                                value: service.id,
                                child: Text(service.name),
                              ),
                            )
                            .toList(),
                        onChanged: _isSaving
                            ? null
                            : (value) {
                                setState(() {
                                  _selectedServiceId = value;
                                  _syncSelection();
                                  _ensureSelectedDate();
                                });
                                _loadAvailabilityForSelection();
                              },
                      ),
                      if (service != null) ...[
                        const SizedBox(height: 14),
                        _SelectionHighlightCard(
                          accent: AppPalette.royalViolet,
                          title: service.name,
                          subtitle: service.description,
                          trailing: Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              _SummaryPill(
                                label: service.category,
                                accent: AppPalette.royalViolet,
                              ),
                              _SummaryPill(
                                label: '${service.durationMinutes} min',
                                accent: AppPalette.flameGold,
                              ),
                              _SummaryPill(
                                label: formatMoney(service.price),
                                accent: AppPalette.success,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              RepaintBoundary(
                child: _BookingStepCard(
                  title: l10n.ts('Especialista'),
                  icon: Icons.person_pin_circle_outlined,
                  accent: AppPalette.indigo,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      DropdownButtonFormField<String>(
                        key: ValueKey(
                          'specialist-${_selectedSpecialistId ?? 'empty'}',
                        ),
                        initialValue: _selectedSpecialistId,
                        decoration:
                            InputDecoration(labelText: l10n.ts('Especialista')),
                        items: specialists
                            .map(
                              (specialist) => DropdownMenuItem<String>(
                                value: specialist.id,
                                child: Text(specialist.name),
                              ),
                            )
                            .toList(),
                        onChanged: _isSaving
                            ? null
                            : (value) {
                                setState(() {
                                  _selectedSpecialistId = value;
                                  _syncSelection();
                                  _ensureSelectedDate();
                                });
                                _loadAvailabilityForSelection();
                              },
                      ),
                      if (selectedSpecialist != null) ...[
                        const SizedBox(height: 14),
                        _SelectionHighlightCard(
                          accent: AppPalette.indigo,
                          title: selectedSpecialist.name,
                          subtitle: selectedSpecialist.headline,
                          trailing: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              SpecialistRatingBadge(
                                rating: selectedSpecialist.rating,
                                maxStars: 5,
                                approvalPercent: selectedSpecialist.name
                                        .toLowerCase()
                                        .contains('lorena')
                                    ? 100
                                    : null,
                                reviewCount: selectedSpecialist.name
                                        .toLowerCase()
                                        .contains('lorena')
                                    ? 45
                                    : selectedSpecialist.reviewCount,
                              ),
                              const SizedBox(height: 10),
                              Text(
                                l10n.ts(
                                  'Próxima disponibilidad sugerida: {date}',
                                  {
                                    'date': formatSchedule(
                                      selectedSpecialist.nextAvailableAt,
                                    ),
                                  },
                                ),
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
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              RepaintBoundary(
                child: _BookingStepCard(
                  title: l10n.ts('Modalidad y día'),
                  icon: Icons.tune_rounded,
                  accent: AppPalette.flameGold,
                  child: Column(
                    children: [
                      DropdownButtonFormField<String>(
                        key: ValueKey('mode-${_selectedMode ?? 'empty'}'),
                        initialValue: _selectedMode,
                        decoration:
                            InputDecoration(labelText: l10n.ts('Modalidad')),
                        items: modes
                            .map(
                              (mode) => DropdownMenuItem<String>(
                                value: mode,
                                child: Text(_modeLabel(mode, l10n)),
                              ),
                            )
                            .toList(),
                        onChanged: _isSaving
                            ? null
                            : (value) {
                                setState(() {
                                  _selectedMode = value;
                                });
                                _loadAvailabilityForSelection();
                              },
                      ),
                      const SizedBox(height: 14),
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton.icon(
                          onPressed: _isSaving ? null : _pickDate,
                          icon: const Icon(Icons.calendar_month_outlined),
                          label: Text(
                            _selectedDate == null
                                ? l10n.ts('Elegir día')
                                : _formatDate(_selectedDate!, l10n),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              RepaintBoundary(
                child: _AvailabilitySection(
                  service: service,
                  selectedDate: _selectedDate,
                  slots: _availabilitySlots,
                  selectedSlotId: _selectedSlotId,
                  isLoading: _isLoadingAvailability,
                  message: _availabilityMessage,
                  onSelected: _isSaving
                      ? null
                      : (slotId) {
                          setState(() {
                            _selectedSlotId = slotId;
                            _errorMessage = null;
                          });
                        },
                ),
              ),
              const SizedBox(height: 16),
              RepaintBoundary(
                child: _BookingStepCard(
                  title: l10n.ts('Notas para la consulta'),
                  icon: Icons.edit_note_rounded,
                  accent: AppPalette.roseDust,
                  child: TextField(
                    controller: _notesController,
                    minLines: 3,
                    maxLines: 5,
                    decoration: InputDecoration(
                      labelText: l10n.ts('Notas para la consulta'),
                      hintText: l10n.ts(
                        'Cuéntanos qué tema quieres trabajar en la sesión',
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              RepaintBoundary(
                child: _BookingSummaryCard(
                  serviceLabel: service == null
                      ? l10n.ts('Sin servicio seleccionado')
                      : service.name,
                  specialistLabel: selectedSpecialist?.name ??
                      l10n.ts('Sin especialista seleccionado'),
                  modeLabel: _selectedMode == null
                      ? l10n.ts('Sin modalidad')
                      : _modeLabel(_selectedMode!, l10n),
                  timeLabel: selectedSlot == null
                      ? l10n.ts('Sin horario confirmado')
                      : formatSchedule(selectedSlot.startsAt),
                ),
              ),
              if (_errorMessage != null) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFECE8),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Text(
                    _errorMessage!,
                    style: const TextStyle(
                      color: Color(0xFF8B2C1F),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 24),
              FilledButton.icon(
                onPressed:
                    _isSaving || _consultationServices.isEmpty ? null : _save,
                style: FilledButton.styleFrom(
                  backgroundColor: AppPalette.midnight,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 18),
                  textStyle: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                ),
                icon: _isSaving
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.calendar_month),
                label: Text(l10n.ts('Confirmar cita')),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _modeLabel(String mode, AppLocalizations l10n) {
    switch (mode) {
      case 'audio':
        return l10n.ts('Audio');
      case 'video':
        return l10n.ts('Video');
      default:
        return l10n.ts('Chat');
    }
  }

  String _formatDate(DateTime date, AppLocalizations l10n) {
    final weekDays = [
      l10n.ts('Lun'),
      l10n.ts('Mar'),
      l10n.ts('Mie'),
      l10n.ts('Jue'),
      l10n.ts('Vie'),
      l10n.ts('Sab'),
      l10n.ts('Dom'),
    ];
    final weekDay = weekDays[date.weekday - 1];
    return '$weekDay ${date.day}/${date.month}/${date.year}';
  }
}

class _AvailabilitySection extends StatelessWidget {
  const _AvailabilitySection({
    required this.service,
    required this.selectedDate,
    required this.slots,
    required this.selectedSlotId,
    required this.isLoading,
    required this.message,
    required this.onSelected,
  });

  final ServiceOffer? service;
  final DateTime? selectedDate;
  final List<SpecialistAvailabilitySlot> slots;
  final String? selectedSlotId;
  final bool isLoading;
  final String? message;
  final ValueChanged<String>? onSelected;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final serviceDuration = service?.durationMinutes;

    return _BookingStepCard(
      title: l10n.ts('Horarios disponibles'),
      icon: Icons.schedule_rounded,
      accent: AppPalette.success,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            selectedDate == null
                ? l10n.ts(
                    'Elige un día para consultar la agenda disponible.',
                  )
                : serviceDuration == null
                    ? l10n.ts('Selecciona un servicio para ver horarios.')
                    : l10n.ts(
                        'Se muestran horarios reales para sesiones de {minutes} minutos.',
                        {'minutes': '$serviceDuration'},
                      ),
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppPalette.mutedLavender,
                  height: 1.4,
                ),
          ),
          const SizedBox(height: 14),
          if (isLoading)
            const Center(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 18),
                child: CircularProgressIndicator(),
              ),
            )
          else if (message != null)
            Text(
              message!,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppPalette.butterflyInk,
                  ),
            )
          else if (slots.isEmpty)
            Text(
              l10n.ts(
                'No hay horarios cargados todavía para esta selección.',
              ),
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppPalette.butterflyInk,
                  ),
            )
          else
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: slots
                  .map(
                    (slot) => ChoiceChip(
                      label: Text(_formatSlotLabel(slot)),
                      selected: slot.id == selectedSlotId,
                      selectedColor: AppPalette.success.withValues(alpha: 0.16),
                      side: BorderSide(
                        color: slot.id == selectedSlotId
                            ? AppPalette.success
                            : AppPalette.border,
                      ),
                      labelStyle: TextStyle(
                        color: slot.id == selectedSlotId
                            ? AppPalette.success
                            : AppPalette.butterflyInk,
                        fontWeight: FontWeight.w700,
                      ),
                      onSelected: onSelected == null
                          ? null
                          : (_) => onSelected!(slot.id),
                    ),
                  )
                  .toList(),
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

    return '${_formatTime(startsAt)} - ${_formatTime(endsAt)}';
  }

  String _formatTime(DateTime value) {
    final hours = value.hour.toString().padLeft(2, '0');
    final minutes = value.minute.toString().padLeft(2, '0');
    return '$hours:$minutes';
  }
}

extension<T> on Iterable<T> {
  T? get firstOrNull => isEmpty ? null : first;
}

class _BookingStepCard extends StatelessWidget {
  const _BookingStepCard({
    required this.title,
    required this.icon,
    required this.accent,
    required this.child,
  });

  final String title;
  final IconData icon;
  final Color accent;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppPalette.moonIvory,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: AppPalette.border),
        boxShadow: [
          BoxShadow(
            color: accent.withValues(alpha: 0.08),
            blurRadius: 18,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 52,
            height: 4,
            decoration: BoxDecoration(
              color: accent.withValues(alpha: 0.32),
              borderRadius: BorderRadius.circular(999),
            ),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: accent.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(15),
                ),
                child: Icon(icon, color: accent),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  title,
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        color: AppPalette.butterflyInk,
                        fontWeight: FontWeight.w900,
                      ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }
}

class _BookingOverviewChip extends StatelessWidget {
  const _BookingOverviewChip({
    required this.label,
    required this.value,
    required this.accent,
  });

  final String label;
  final String value;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(minWidth: 132),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: AppPalette.moonIvory.withValues(alpha: 0.92),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: accent.withValues(alpha: 0.22)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            label,
            style: Theme.of(context).textTheme.labelMedium?.copyWith(
                  color: accent,
                  fontWeight: FontWeight.w800,
                ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppPalette.butterflyInk,
                  fontWeight: FontWeight.w700,
                  height: 1.25,
                ),
          ),
        ],
      ),
    );
  }
}

class _SelectionHighlightCard extends StatelessWidget {
  const _SelectionHighlightCard({
    required this.accent,
    required this.title,
    required this.subtitle,
    required this.trailing,
  });

  final Color accent;
  final String title;
  final String subtitle;
  final Widget trailing;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            accent.withValues(alpha: 0.10),
            Colors.white,
          ],
        ),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: accent.withValues(alpha: 0.18)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: AppPalette.butterflyInk,
                  fontWeight: FontWeight.w800,
                ),
          ),
          if (subtitle.trim().isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              subtitle,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppPalette.mutedLavender,
                    height: 1.42,
                  ),
            ),
          ],
          const SizedBox(height: 12),
          trailing,
        ],
      ),
    );
  }
}

class _SummaryPill extends StatelessWidget {
  const _SummaryPill({
    required this.label,
    required this.accent,
  });

  final String label;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: accent.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: accent.withValues(alpha: 0.14)),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: accent,
          fontSize: 12,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _BookingSummaryCard extends StatelessWidget {
  const _BookingSummaryCard({
    required this.serviceLabel,
    required this.specialistLabel,
    required this.modeLabel,
    required this.timeLabel,
  });

  final String serviceLabel;
  final String specialistLabel;
  final String modeLabel;
  final String timeLabel;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppPalette.midnight,
            AppPalette.indigo,
            AppPalette.royalViolet,
          ],
        ),
        boxShadow: [
          BoxShadow(
            color: AppPalette.indigo.withValues(alpha: 0.18),
            blurRadius: 22,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            l10n.ts('Resumen de la cita'),
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.w900,
                ),
          ),
          const SizedBox(height: 14),
          _SummaryRow(label: l10n.ts('Servicio'), value: serviceLabel),
          const SizedBox(height: 10),
          _SummaryRow(label: l10n.ts('Especialista'), value: specialistLabel),
          const SizedBox(height: 10),
          _SummaryRow(label: l10n.ts('Modalidad'), value: modeLabel),
          const SizedBox(height: 10),
          _SummaryRow(label: l10n.ts('Horario'), value: timeLabel),
        ],
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  const _SummaryRow({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 96,
          child: Text(
            label,
            style: const TextStyle(
              color: Colors.white70,
              fontSize: 12,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.25,
            ),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 14,
              fontWeight: FontWeight.w700,
              height: 1.35,
            ),
          ),
        ),
      ],
    );
  }
}
