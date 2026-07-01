class Flow {
  final String id;
  final String name;
  final String? flowId;
  final String? category;
  final String status;
  final Map<String, dynamic>? flowJson;
  final String createdAt;
  final String updatedAt;

  Flow({
    required this.id,
    required this.name,
    this.flowId,
    this.category,
    required this.status,
    this.flowJson,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Flow.fromJson(Map<String, dynamic> json) {
    return Flow(
      id: json['id'] as String,
      name: json['name'] as String,
      flowId: json['flowId'] as String?,
      category: json['category'] as String?,
      status: json['status'] as String,
      flowJson: json['flowJson'] as Map<String, dynamic>?,
      createdAt: json['createdAt'] as String,
      updatedAt: json['updatedAt'] as String,
    );
  }
}

