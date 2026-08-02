import 'package:flutter/material.dart';

import '../../models/app_models.dart';
import '../theme/app_palette.dart';

const premiumFeatureSummaries = <String>[
  'Carta Natal: Tránsitos',
  'Carta Natal: Técnica',
  'Carta Natal: Tiempo',
  'Biblioteca',
  'Cursos Premium',
  'Lecturas de Tarot 20% descuento',
];

bool hasPremiumAccess(AppBootstrap data) => data.subscription.isPremiumActive;

class PremiumLockedCard extends StatelessWidget {
  const PremiumLockedCard({
    super.key,
    required this.title,
    required this.message,
    this.compact = false,
  });

  final String title;
  final String message;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: EdgeInsets.all(compact ? 14 : 18),
      decoration: BoxDecoration(
        color: AppPalette.moonIvory,
        borderRadius: BorderRadius.circular(compact ? 18 : 24),
        border: Border.all(color: AppPalette.border),
        boxShadow: [
          BoxShadow(
            color: AppPalette.indigo.withValues(alpha: 0.08),
            blurRadius: compact ? 12 : 18,
            offset: Offset(0, compact ? 8 : 12),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: compact ? 34 : 42,
            height: compact ? 34 : 42,
            decoration: BoxDecoration(
              color: AppPalette.candleGlow,
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Icon(
              Icons.lock_outline_rounded,
              color: AppPalette.midnight,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: AppPalette.butterflyInk,
                        fontWeight: FontWeight.w900,
                      ),
                ),
                const SizedBox(height: 6),
                Text(
                  message,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppPalette.mutedLavender,
                        height: 1.35,
                        fontWeight: FontWeight.w600,
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
