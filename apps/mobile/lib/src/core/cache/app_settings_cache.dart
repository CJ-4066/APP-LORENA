import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AppSettingsCache {
  static const _localeKey = 'lo_renaciente.app_locale';
  static const _contentVersionKey = 'lo_renaciente.content_version';

  Future<Locale?> readLocale() async {
    final prefs = await SharedPreferences.getInstance();
    final rawCode = prefs.getString(_localeKey);
    if (rawCode == null || rawCode.isEmpty) {
      return null;
    }

    final parts = rawCode.split('-');
    if (parts.length == 1) {
      return Locale(parts.first);
    }

    return Locale(parts.first, parts.last);
  }

  Future<void> writeLocale(Locale locale) async {
    final prefs = await SharedPreferences.getInstance();
    final code = locale.countryCode == null || locale.countryCode!.isEmpty
        ? locale.languageCode
        : '${locale.languageCode}-${locale.countryCode}';
    await prefs.setString(_localeKey, code);
  }

  Future<String?> readContentVersion() async {
    final prefs = await SharedPreferences.getInstance();
    final version = prefs.getString(_contentVersionKey);
    if (version == null || version.isEmpty) {
      return null;
    }

    return version;
  }

  Future<void> writeContentVersion(String version) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_contentVersionKey, version);
  }
}
