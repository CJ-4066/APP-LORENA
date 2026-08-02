import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../i18n/app_i18n.dart';

class BirthDateInputControllers {
  BirthDateInputControllers({
    String year = '',
    String day = '',
    String month = '',
  })  : year = TextEditingController(text: year),
        day = TextEditingController(text: day),
        month = TextEditingController(text: month);

  factory BirthDateInputControllers.fromDate(String value) {
    final parts = _BirthDateParts.fromText(value);
    return BirthDateInputControllers(
      year: parts.year,
      day: parts.day,
      month: parts.month,
    );
  }

  final TextEditingController year;
  final TextEditingController day;
  final TextEditingController month;

  void setFromDate(String value) {
    final parts = _BirthDateParts.fromText(value);
    year.text = parts.year;
    day.text = parts.day;
    month.text = parts.month;
  }

  String? normalizedIsoDate() {
    final yearText = year.text.trim();
    final dayText = day.text.trim();
    final monthText = month.text.trim();

    if (yearText.length != 4 || dayText.isEmpty || monthText.isEmpty) {
      return null;
    }

    final parsedYear = int.tryParse(yearText);
    final parsedDay = int.tryParse(dayText);
    final parsedMonth = int.tryParse(monthText);

    if (parsedYear == null || parsedDay == null || parsedMonth == null) {
      return null;
    }

    final normalized = '${parsedYear.toString().padLeft(4, '0')}-'
        '${parsedMonth.toString().padLeft(2, '0')}-'
        '${parsedDay.toString().padLeft(2, '0')}';
    final date = DateTime.tryParse(normalized);

    if (date == null ||
        date.year != parsedYear ||
        date.month != parsedMonth ||
        date.day != parsedDay) {
      return null;
    }

    return normalized;
  }

  void dispose() {
    year.dispose();
    day.dispose();
    month.dispose();
  }
}

class BirthDateFields extends StatelessWidget {
  const BirthDateFields({
    super.key,
    required this.controllers,
    this.enabled = true,
  });

  final BirthDateInputControllers controllers;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          l10n.ts('Fecha de nacimiento'),
          style: Theme.of(context).textTheme.labelLarge?.copyWith(
                fontWeight: FontWeight.w700,
              ),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              flex: 2,
              child: _BirthDatePartField(
                controller: controllers.year,
                enabled: enabled,
                label: l10n.ts('Año'),
                hintText: '2000',
                maxLength: 4,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _BirthDatePartField(
                controller: controllers.day,
                enabled: enabled,
                label: l10n.ts('Día'),
                hintText: '28',
                maxLength: 2,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _BirthDatePartField(
                controller: controllers.month,
                enabled: enabled,
                label: l10n.ts('Mes'),
                hintText: '11',
                maxLength: 2,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _BirthDatePartField extends StatelessWidget {
  const _BirthDatePartField({
    required this.controller,
    required this.enabled,
    required this.label,
    required this.hintText,
    required this.maxLength,
  });

  final TextEditingController controller;
  final bool enabled;
  final String label;
  final String hintText;
  final int maxLength;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      enabled: enabled,
      keyboardType: TextInputType.number,
      maxLength: maxLength,
      autocorrect: false,
      enableSuggestions: false,
      spellCheckConfiguration: const SpellCheckConfiguration.disabled(),
      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
      decoration: InputDecoration(
        labelText: label,
        hintText: hintText,
        counterText: '',
        isDense: true,
      ),
    );
  }
}

class _BirthDateParts {
  const _BirthDateParts({
    required this.year,
    required this.day,
    required this.month,
  });

  factory _BirthDateParts.fromText(String value) {
    final trimmed = value.trim();
    final isoMatch =
        RegExp(r'^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$').firstMatch(trimmed);

    if (isoMatch != null) {
      return _BirthDateParts(
        year: isoMatch.group(1)!,
        month: isoMatch.group(2)!,
        day: isoMatch.group(3)!,
      );
    }

    final dayFirstMatch =
        RegExp(r'^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$').firstMatch(trimmed);

    if (dayFirstMatch != null) {
      return _BirthDateParts(
        day: dayFirstMatch.group(1)!,
        month: dayFirstMatch.group(2)!,
        year: dayFirstMatch.group(3)!,
      );
    }

    return const _BirthDateParts(year: '', day: '', month: '');
  }

  final String year;
  final String day;
  final String month;
}
