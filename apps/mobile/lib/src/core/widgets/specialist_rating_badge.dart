import 'package:flutter/material.dart';

import '../theme/app_palette.dart';
import '../utils/formatters.dart';

class SpecialistRatingBadge extends StatelessWidget {
  const SpecialistRatingBadge({
    super.key,
    required this.rating,
    this.maxStars = 5,
    this.reviewCount,
    this.approvalPercent,
    this.backgroundColor = AppPalette.moonIvory,
    this.borderColor = AppPalette.border,
    this.filledStarColor = AppPalette.flameGold,
    this.emptyStarColor = AppPalette.softLilac,
    this.textColor = AppPalette.indigo,
  });

  final double rating;
  final int maxStars;
  final int? reviewCount;
  final int? approvalPercent;
  final Color backgroundColor;
  final Color borderColor;
  final Color filledStarColor;
  final Color emptyStarColor;
  final Color textColor;

  @override
  Widget build(BuildContext context) {
    final percent = (approvalPercent ?? specialistRatingPercent(rating))
        .clamp(0, 100)
        .toInt();
    final normalized = (rating / 5).clamp(0.0, 1.0);
    final starsFill = normalized * maxStars;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: borderColor),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisSize: MainAxisSize.min,
            children: List.generate(
              maxStars,
              (index) {
                final starIndex = index + 1;
                final isFull = starsFill >= starIndex;
                final isHalf = !isFull && starsFill >= (starIndex - 0.5);
                return Padding(
                  padding:
                      EdgeInsets.only(right: index == maxStars - 1 ? 0 : 2),
                  child: Icon(
                    isFull
                        ? Icons.star_rounded
                        : isHalf
                            ? Icons.star_half_rounded
                            : Icons.star_border_rounded,
                    size: 16,
                    color: (isFull || isHalf) ? filledStarColor : emptyStarColor,
                  ),
                );
              },
            ),
          ),
          const SizedBox(width: 8),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                '$percent%',
                style: Theme.of(context).textTheme.labelMedium?.copyWith(
                      color: textColor,
                      fontWeight: FontWeight.w800,
                    ),
              ),
              if (reviewCount != null) ...[
                const SizedBox(width: 6),
                Icon(
                  Icons.stars_rounded,
                  size: 14,
                  color: textColor,
                ),
                const SizedBox(width: 2),
                Text(
                  '${reviewCount!.clamp(0, 999)}',
                  style: Theme.of(context).textTheme.labelMedium?.copyWith(
                        color: textColor,
                        fontWeight: FontWeight.w800,
                      ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}
