import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

import '../i18n/app_i18n.dart';

class BirthTimeWheelField extends StatefulWidget {
  const BirthTimeWheelField({
    super.key,
    required this.controller,
    this.enabled = true,
  });

  final TextEditingController controller;
  final bool enabled;

  @override
  State<BirthTimeWheelField> createState() => _BirthTimeWheelFieldState();
}

class _BirthTimeWheelFieldState extends State<BirthTimeWheelField> {
  static const double _itemExtent = 34;

  late FixedExtentScrollController _hourScrollController;
  late FixedExtentScrollController _minuteScrollController;

  int _hour12 = 12;
  int _minute = 0;
  bool _isPm = false;
  bool _isWritingController = false;

  @override
  void initState() {
    super.initState();
    final initial = _BirthTimeParts.fromText(widget.controller.text);
    _hour12 = initial.hour12;
    _minute = initial.minute;
    _isPm = initial.isPm;
    _hourScrollController = FixedExtentScrollController(
      initialItem: _hour12 - 1,
    );
    _minuteScrollController = FixedExtentScrollController(
      initialItem: _minute,
    );
    widget.controller.addListener(_syncFromController);
    if (widget.controller.text.trim().isEmpty) {
      _writeController();
    }
  }

  @override
  void didUpdateWidget(covariant BirthTimeWheelField oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.controller == widget.controller) {
      return;
    }

    oldWidget.controller.removeListener(_syncFromController);
    widget.controller.addListener(_syncFromController);
    _syncFromController();
  }

  @override
  void dispose() {
    widget.controller.removeListener(_syncFromController);
    _hourScrollController.dispose();
    _minuteScrollController.dispose();
    super.dispose();
  }

  void _syncFromController() {
    if (_isWritingController) {
      return;
    }

    final parsed = _BirthTimeParts.fromText(widget.controller.text);
    if (parsed.hour12 == _hour12 &&
        parsed.minute == _minute &&
        parsed.isPm == _isPm) {
      return;
    }

    setState(() {
      _hour12 = parsed.hour12;
      _minute = parsed.minute;
      _isPm = parsed.isPm;
    });

    if (_hourScrollController.hasClients) {
      _hourScrollController.jumpToItem(_hour12 - 1);
    }
    if (_minuteScrollController.hasClients) {
      _minuteScrollController.jumpToItem(_minute);
    }
  }

  void _writeController() {
    _isWritingController = true;
    widget.controller.text = _formatForApi();
    _isWritingController = false;
  }

  String _formatForApi() {
    final hour24 = _isPm
        ? (_hour12 == 12 ? 12 : _hour12 + 12)
        : (_hour12 == 12 ? 0 : _hour12);
    return '${hour24.toString().padLeft(2, '0')}:'
        '${_minute.toString().padLeft(2, '0')}';
  }

  void _setPeriod(bool isPm) {
    if (!widget.enabled || _isPm == isPm) {
      return;
    }

    setState(() {
      _isPm = isPm;
    });
    _writeController();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Opacity(
      opacity: widget.enabled ? 1 : 0.58,
      child: IgnorePointer(
        ignoring: !widget.enabled,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              l10n.ts('Hora de nacimiento'),
              style: theme.textTheme.labelLarge?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 8),
            Container(
              height: 144,
              padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
              decoration: BoxDecoration(
                color: colorScheme.surface,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: colorScheme.outlineVariant),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: _WheelColumn(
                      label: l10n.ts('Hora'),
                      child: CupertinoPicker(
                        scrollController: _hourScrollController,
                        itemExtent: _itemExtent,
                        magnification: 1.08,
                        squeeze: 1.08,
                        useMagnifier: true,
                        onSelectedItemChanged: (index) {
                          setState(() {
                            _hour12 = index + 1;
                          });
                          _writeController();
                        },
                        children: [
                          for (var hour = 1; hour <= 12; hour++)
                            Center(
                              child: Text(
                                hour.toString().padLeft(2, '0'),
                                style: theme.textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _WheelColumn(
                      label: l10n.ts('Min'),
                      child: CupertinoPicker.builder(
                        scrollController: _minuteScrollController,
                        itemExtent: _itemExtent,
                        magnification: 1.08,
                        squeeze: 1.08,
                        useMagnifier: true,
                        childCount: 60,
                        onSelectedItemChanged: (index) {
                          setState(() {
                            _minute = index;
                          });
                          _writeController();
                        },
                        itemBuilder: (context, index) {
                          return Center(
                            child: Text(
                              index.toString().padLeft(2, '0'),
                              style: theme.textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  SizedBox(
                    width: 68,
                    child: Column(
                      children: [
                        Text(
                          'AM/PM',
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: colorScheme.onSurfaceVariant,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Expanded(
                          child: Column(
                            children: [
                              Expanded(
                                child: _PeriodButton(
                                  label: 'AM',
                                  selected: !_isPm,
                                  onTap: () => _setPeriod(false),
                                ),
                              ),
                              const SizedBox(height: 8),
                              Expanded(
                                child: _PeriodButton(
                                  label: 'PM',
                                  selected: _isPm,
                                  onTap: () => _setPeriod(true),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
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

class _WheelColumn extends StatelessWidget {
  const _WheelColumn({
    required this.label,
    required this.child,
  });

  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      children: [
        Text(
          label,
          style: theme.textTheme.labelSmall?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 4),
        Expanded(child: child),
      ],
    );
  }
}

class _PeriodButton extends StatelessWidget {
  const _PeriodButton({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final foreground = selected ? colorScheme.onPrimary : colorScheme.primary;

    return Material(
      color: selected ? colorScheme.primary : colorScheme.primaryContainer,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: Center(
          child: FittedBox(
            fit: BoxFit.scaleDown,
            child: Text(
              label,
              style: theme.textTheme.labelLarge?.copyWith(
                color: foreground,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _BirthTimeParts {
  const _BirthTimeParts({
    required this.hour12,
    required this.minute,
    required this.isPm,
  });

  factory _BirthTimeParts.fromText(String value) {
    final trimmed = value.trim();
    if (trimmed.isEmpty) {
      return const _BirthTimeParts(hour12: 12, minute: 0, isPm: false);
    }

    final match = RegExp(
      r'^(\d{1,2}):(\d{1,2})(?::\d{1,2})?\s*([AaPp][Mm])?$',
    ).firstMatch(trimmed);
    if (match == null) {
      return const _BirthTimeParts(hour12: 12, minute: 0, isPm: false);
    }

    final rawHour = int.tryParse(match.group(1)!);
    final minute = int.tryParse(match.group(2)!);
    if (rawHour == null ||
        minute == null ||
        rawHour < 0 ||
        rawHour > 23 ||
        minute < 0 ||
        minute > 59) {
      return const _BirthTimeParts(hour12: 12, minute: 0, isPm: false);
    }

    final period = match.group(3)?.toUpperCase();
    final isPm = period == null ? rawHour >= 12 : period == 'PM';
    final hour24 = period == null
        ? rawHour
        : (rawHour == 12 ? (isPm ? 12 : 0) : (isPm ? rawHour + 12 : rawHour));
    final hour12 = hour24 == 0
        ? 12
        : hour24 > 12
            ? hour24 - 12
            : hour24;

    return _BirthTimeParts(
      hour12: hour12,
      minute: minute,
      isPm: hour24 >= 12,
    );
  }

  final int hour12;
  final int minute;
  final bool isPm;
}
