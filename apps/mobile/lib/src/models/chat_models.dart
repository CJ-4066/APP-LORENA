class CommunityChatMessage {
  CommunityChatMessage({
    required this.id,
    required this.authorName,
    required this.authorRole,
    required this.body,
    required this.imageUrl,
    required this.createdAt,
  });

  final String id;
  final String authorName;
  final String authorRole;
  final String body;
  final String? imageUrl;
  final String createdAt;

  factory CommunityChatMessage.fromJson(Map<String, dynamic> json) {
    return CommunityChatMessage(
      id: json['id'] as String? ?? '',
      authorName: json['authorName'] as String? ?? '',
      authorRole: json['authorRole'] as String? ?? '',
      body: json['body'] as String? ?? '',
      imageUrl: json['imageUrl'] as String?,
      createdAt: json['createdAt'] as String? ?? '',
    );
  }
}

class ChatThreadSummary {
  ChatThreadSummary({
    required this.id,
    required this.userId,
    required this.specialistId,
    required this.specialistName,
    required this.bookingId,
    required this.orderId,
    required this.status,
    required this.lastMessagePreview,
    required this.lastMessageAt,
    required this.messageCount,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String userId;
  final String specialistId;
  final String specialistName;
  final String? bookingId;
  final String? orderId;
  final String status;
  final String lastMessagePreview;
  final String? lastMessageAt;
  final int messageCount;
  final String createdAt;
  final String updatedAt;

  factory ChatThreadSummary.fromJson(Map<String, dynamic> json) {
    return ChatThreadSummary(
      id: json['id'] as String? ?? '',
      userId: json['userId'] as String? ?? '',
      specialistId: json['specialistId'] as String? ?? '',
      specialistName: json['specialistName'] as String? ?? '',
      bookingId: json['bookingId'] as String?,
      orderId: json['orderId'] as String?,
      status: json['status'] as String? ?? '',
      lastMessagePreview: json['lastMessagePreview'] as String? ?? '',
      lastMessageAt: json['lastMessageAt'] as String?,
      messageCount: (json['messageCount'] as num?)?.toInt() ?? 0,
      createdAt: json['createdAt'] as String? ?? '',
      updatedAt: json['updatedAt'] as String? ?? '',
    );
  }
}

class ChatMessage {
  ChatMessage({
    required this.id,
    required this.threadId,
    required this.authorType,
    required this.authorId,
    required this.body,
    required this.createdAt,
  });

  final String id;
  final String threadId;
  final String authorType;
  final String authorId;
  final String body;
  final String createdAt;

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    return ChatMessage(
      id: json['id'] as String? ?? '',
      threadId: json['threadId'] as String? ?? '',
      authorType: json['authorType'] as String? ?? '',
      authorId: json['authorId'] as String? ?? '',
      body: json['body'] as String? ?? '',
      createdAt: json['createdAt'] as String? ?? '',
    );
  }
}

class ChatThreadDetail {
  ChatThreadDetail({
    required this.thread,
    required this.messages,
  });

  final ChatThreadSummary thread;
  final List<ChatMessage> messages;

  factory ChatThreadDetail.fromJson(Map<String, dynamic> json) {
    final messages = json['messages'] as List<dynamic>? ?? const <dynamic>[];
    return ChatThreadDetail(
      thread: ChatThreadSummary.fromJson(
        json['thread'] as Map<String, dynamic>? ?? const <String, dynamic>{},
      ),
      messages: messages
          .whereType<Map<String, dynamic>>()
          .map(ChatMessage.fromJson)
          .toList(),
    );
  }
}
