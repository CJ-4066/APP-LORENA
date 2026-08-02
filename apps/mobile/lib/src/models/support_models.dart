class SupportTicketSummary {
  SupportTicketSummary({
    required this.id,
    required this.ticketNumber,
    required this.userId,
    required this.userName,
    required this.userAvatarUrl,
    required this.subject,
    required this.category,
    required this.status,
    required this.priority,
    required this.lastMessagePreview,
    required this.lastMessageAt,
    required this.messageCount,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String ticketNumber;
  final String userId;
  final String userName;
  final String? userAvatarUrl;
  final String subject;
  final String category;
  final String status;
  final String priority;
  final String lastMessagePreview;
  final String? lastMessageAt;
  final int messageCount;
  final String createdAt;
  final String updatedAt;

  factory SupportTicketSummary.fromJson(Map<String, dynamic> json) {
    return SupportTicketSummary(
      id: json['id'] as String? ?? '',
      ticketNumber: json['ticketNumber'] as String? ?? '',
      userId: json['userId'] as String? ?? '',
      userName: json['userName'] as String? ?? '',
      userAvatarUrl: json['userAvatarUrl'] as String?,
      subject: json['subject'] as String? ?? '',
      category: json['category'] as String? ?? '',
      status: json['status'] as String? ?? '',
      priority: json['priority'] as String? ?? '',
      lastMessagePreview: json['lastMessagePreview'] as String? ?? '',
      lastMessageAt: json['lastMessageAt'] as String?,
      messageCount: (json['messageCount'] as num?)?.toInt() ?? 0,
      createdAt: json['createdAt'] as String? ?? '',
      updatedAt: json['updatedAt'] as String? ?? '',
    );
  }
}

class SupportTicketMessage {
  SupportTicketMessage({
    required this.id,
    required this.ticketId,
    required this.authorType,
    required this.authorId,
    required this.authorName,
    required this.body,
    required this.createdAt,
  });

  final String id;
  final String ticketId;
  final String authorType;
  final String authorId;
  final String authorName;
  final String body;
  final String createdAt;

  factory SupportTicketMessage.fromJson(Map<String, dynamic> json) {
    return SupportTicketMessage(
      id: json['id'] as String? ?? '',
      ticketId: json['ticketId'] as String? ?? '',
      authorType: json['authorType'] as String? ?? '',
      authorId: json['authorId'] as String? ?? '',
      authorName: json['authorName'] as String? ?? '',
      body: json['body'] as String? ?? '',
      createdAt: json['createdAt'] as String? ?? '',
    );
  }
}

class SupportTicketDetail {
  SupportTicketDetail({
    required this.ticket,
    required this.messages,
  });

  final SupportTicketSummary ticket;
  final List<SupportTicketMessage> messages;

  factory SupportTicketDetail.fromJson(Map<String, dynamic> json) {
    final messages = json['messages'] as List<dynamic>? ?? const <dynamic>[];
    return SupportTicketDetail(
      ticket: SupportTicketSummary.fromJson(
        json['ticket'] as Map<String, dynamic>? ?? const <String, dynamic>{},
      ),
      messages: messages
          .whereType<Map<String, dynamic>>()
          .map(SupportTicketMessage.fromJson)
          .toList(),
    );
  }
}
