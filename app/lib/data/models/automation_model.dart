class Automation {
  final String id;
  final String name;
  final bool isActive;
  final int stepCount;
  final int executionCount;
  final int failedCount;
  final String? wabaAccountId;
  final String createdAt;
  final String updatedAt;

  Automation({
    required this.id,
    required this.name,
    required this.isActive,
    required this.stepCount,
    required this.executionCount,
    required this.failedCount,
    this.wabaAccountId,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Automation.fromJson(Map<String, dynamic> json) {
    return Automation(
      id: json['id'] as String,
      name: json['name'] as String,
      isActive: json['isActive'] as bool,
      stepCount: json['stepCount'] as int? ?? 0,
      executionCount: json['executionCount'] as int? ?? 0,
      failedCount: json['failedCount'] as int? ?? 0,
      wabaAccountId: json['wabaAccountId'] as String?,
      createdAt: json['createdAt'] as String,
      updatedAt: json['updatedAt'] as String,
    );
  }
}

