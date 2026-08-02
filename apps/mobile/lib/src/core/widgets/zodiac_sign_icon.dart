import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';

class ZodiacSignIcon extends StatelessWidget {
  const ZodiacSignIcon({
    super.key,
    required this.sign,
    required this.color,
    this.size = 20,
  });

  final String sign;
  final Color color;
  final double size;

  @override
  Widget build(BuildContext context) {
    final icon = zodiacFaIconForSign(sign);
    if (icon != null) {
      return FaIcon(
        icon,
        color: color,
        size: size,
        semanticLabel: sign.trim().isEmpty ? null : 'Signo $sign',
      );
    }

    return Icon(
      Icons.auto_awesome_rounded,
      color: color,
      size: size,
      semanticLabel: sign.trim().isEmpty ? null : 'Signo $sign',
    );
  }
}

FaIconData? zodiacFaIconForSign(String sign) {
  switch (foldZodiacSign(sign)) {
    case 'acuario':
      return FontAwesomeIcons.aquarius;
    case 'aries':
      return FontAwesomeIcons.aries;
    case 'cancer':
      return FontAwesomeIcons.cancer;
    case 'capricornio':
      return FontAwesomeIcons.capricorn;
    case 'geminis':
      return FontAwesomeIcons.gemini;
    case 'leo':
      return FontAwesomeIcons.leo;
    case 'libra':
      return FontAwesomeIcons.libra;
    case 'piscis':
      return FontAwesomeIcons.pisces;
    case 'sagitario':
      return FontAwesomeIcons.sagittarius;
    case 'escorpio':
      return FontAwesomeIcons.scorpio;
    case 'tauro':
      return FontAwesomeIcons.taurus;
    case 'virgo':
      return FontAwesomeIcons.virgo;
  }

  return null;
}

String foldZodiacSign(String value) {
  return value
      .trim()
      .toLowerCase()
      .replaceAll('á', 'a')
      .replaceAll('é', 'e')
      .replaceAll('í', 'i')
      .replaceAll('ó', 'o')
      .replaceAll('ú', 'u');
}
