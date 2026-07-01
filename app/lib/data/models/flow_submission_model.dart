class FlowSubmission {
  final String id;
  final String? flowId;
  final String? flowName;
  final String? conversationId;
  final String? contactId;
  final String? contactName;
  final String? flowToken;
  final Map<String, dynamic>? responseJson;
  final String status;
  final String createdAt;
  final String? completedAt;

  FlowSubmission({
    required this.id,
    this.flowId,
    this.flowName,
    this.conversationId,
    this.contactId,
    this.contactName,
    this.flowToken,
    this.responseJson,
    required this.status,
    required this.createdAt,
    this.completedAt,
  });

  factory FlowSubmission.fromJson(Map<String, dynamic> json) {
    return FlowSubmission(
      id: json['id'] as String,
      flowId: json['flowId'] as String?,
      flowName: json['flowName'] as String?,
      conversationId: json['conversationId'] as String?,
      contactId: json['contactId'] as String?,
      contactName: json['contactName'] as String?,
      flowToken: json['flowToken'] as String?,
      responseJson: json['responseJson'] as Map<String, dynamic>?,
      status: json['status'] as String,
      createdAt: json['createdAt'] as String,
      completedAt: json['completedAt'] as String?,
    );
  }
}

