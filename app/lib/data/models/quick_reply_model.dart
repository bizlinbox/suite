class QuickReply {
  final String id;
  final String shortcut;
  final String content;
  final String? messageType;
  final Map<String, dynamic>? metadata;

  QuickReply({
    required this.id,
    required this.shortcut,
    required this.content,
    this.messageType,
    this.metadata,
  });

  factory QuickReply.fromJson(Map<String, dynamic> json) {
    return QuickReply(
      id: json['id'] as String,
      shortcut: json['shortcut'] as String,
      content: json['content'] as String,
      messageType: json['messageType'] as String?,
      metadata: json['metadata'] as Map<String, dynamic>?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'shortcut': shortcut,
      'content': content,
      'messageType': messageType,
      'metadata': metadata,
    };
  }
}
