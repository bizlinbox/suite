class ConversationLabel {
  final String id;
  final String name;
  final String color;

  ConversationLabel({required this.id, required this.name, required this.color});

  factory ConversationLabel.fromJson(Map<String, dynamic> json) {
    return ConversationLabel(
      id: json['id'] as String,
      name: json['name'] as String,
      color: json['color'] as String,
    );
  }
}

class Conversation {
  final String id;
  final String contactId;
  final String contactName;
  final String contactPhone;
  final String lastMessagePreview;
  final String lastMessageAt;
  final int unreadCount;
  final String? assignedAgentName;
  final bool? isPrivate;
  final String? assignedAgentId;
  final List<ConversationLabel>? labels;

  Conversation({
    required this.id,
    required this.contactId,
    required this.contactName,
    required this.contactPhone,
    required this.lastMessagePreview,
    required this.lastMessageAt,
    required this.unreadCount,
    this.assignedAgentName,
    this.isPrivate,
    this.assignedAgentId,
    this.labels,
  });

  factory Conversation.fromJson(Map<String, dynamic> json) {
    return Conversation(
      id: json['id'] as String,
      contactId: json['contactId'] as String,
      contactName: json['contactName'] as String? ?? 'Unknown',
      contactPhone: json['contactPhone'] as String? ?? '',
      lastMessagePreview: json['lastMessagePreview'] as String? ?? '',
      lastMessageAt: json['lastMessageAt'] as String? ?? json['createdAt'] as String? ?? '',
      unreadCount: json['unreadCount'] as int? ?? 0,
      assignedAgentName: json['assignedAgentName'] as String?,
      isPrivate: json['isPrivate'] as bool?,
      assignedAgentId: json['assignedAgentId'] as String?,
      labels: (json['labels'] as List<dynamic>?)
          ?.map((e) => ConversationLabel.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

