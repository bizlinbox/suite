class Message {
  final String id;
  final String conversationId;
  final String content;
  final String senderType;
  final String createdAt;
  final String? messageType;
  final String? mediaUrl;
  final String? mediaMimeType;
  final String? filename;
  final bool? voice;
  final String? reactionToMessageId;
  final String? status;
  final String? errorMessage;
  final Map<String, dynamic>? flowJson;

  Message({
    required this.id,
    required this.conversationId,
    required this.content,
    required this.senderType,
    required this.createdAt,
    this.messageType,
    this.mediaUrl,
    this.mediaMimeType,
    this.filename,
    this.voice,
    this.reactionToMessageId,
    this.status,
    this.errorMessage,
    this.flowJson,
  });

  factory Message.fromJson(Map<String, dynamic> json) {
    return Message(
      id: json['id'] as String,
      conversationId: json['conversationId'] as String,
      content: json['content'] as String? ?? '',
      senderType: json['senderType'] as String,
      createdAt: json['createdAt'] as String,
      messageType: json['messageType'] as String?,
      mediaUrl: json['mediaUrl'] as String?,
      mediaMimeType: json['mediaMimeType'] as String?,
      filename: json['filename'] as String?,
      voice: json['voice'] as bool?,
      reactionToMessageId: json['reactionToMessageId'] as String?,
      status: json['status'] as String?,
      errorMessage: json['errorMessage'] as String?,
      flowJson: json['flowJson'] as Map<String, dynamic>?,
    );
  }
}

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
}
