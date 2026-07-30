class PushEngagementTemplate {
  PushEngagementTemplate({
    required this.id,
    required this.title,
    required this.body,
    required this.audience,
    required this.trigger,
    required this.deepLink,
    required this.minHoursBetweenSends,
    required this.eligible,
  });

  final String id;
  final String title;
  final String body;
  final String audience;
  final String trigger;
  final String deepLink;
  final int minHoursBetweenSends;
  final bool eligible;

  factory PushEngagementTemplate.fromJson(Map<String, dynamic> json) {
    return PushEngagementTemplate(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? '',
      body: json['body'] as String? ?? '',
      audience: json['audience'] as String? ?? '',
      trigger: json['trigger'] as String? ?? '',
      deepLink: json['deepLink'] as String? ?? '',
      minHoursBetweenSends:
          (json['minHoursBetweenSends'] as num?)?.toInt() ?? 24,
      eligible: json['eligible'] as bool? ?? false,
    );
  }
}
