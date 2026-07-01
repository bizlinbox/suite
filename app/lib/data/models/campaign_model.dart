class Campaign {
  final String id;
  final String name;
  final String messageType;
  final String content;
  final String? templateName;
  final List<String> templateVariables;
  final String status;
  final String? scheduledAt;
  final String? startedAt;
  final String? completedAt;
  final int totalRecipients;
  final int sentCount;
  final int deliveredCount;
  final int readCount;
  final int failedCount;
  final String createdAt;

  Campaign({
    required this.id,
    required this.name,
    required this.messageType,
    required this.content,
    this.templateName,
    required this.templateVariables,
    required this.status,
    this.scheduledAt,
    this.startedAt,
    this.completedAt,
    required this.totalRecipients,
    required this.sentCount,
    required this.deliveredCount,
    required this.readCount,
    required this.failedCount,
    required this.createdAt,
  });

  factory Campaign.fromJson(Map<String, dynamic> json) {
    return Campaign(
      id: json['id'] as String,
      name: json['name'] as String,
      messageType: json['messageType'] as String,
      content: json['content'] as String,
      templateName: json['templateName'] as String?,
      templateVariables: (json['templateVariables'] as List<dynamic>?)?.cast<String>() ?? [],
      status: json['status'] as String,
      scheduledAt: json['scheduledAt'] as String?,
      startedAt: json['startedAt'] as String?,
      completedAt: json['completedAt'] as String?,
      totalRecipients: json['totalRecipients'] as int? ?? 0,
      sentCount: json['sentCount'] as int? ?? 0,
      deliveredCount: json['deliveredCount'] as int? ?? 0,
      readCount: json['readCount'] as int? ?? 0,
      failedCount: json['failedCount'] as int? ?? 0,
      createdAt: json['createdAt'] as String,
    );
  }
}
