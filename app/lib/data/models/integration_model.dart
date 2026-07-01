class Integration {
  final String id;
  final String type;
  final String name;
  final bool isActive;
  final Map<String, dynamic> config;
  final String createdAt;
  final String updatedAt;

  Integration({
    required this.id,
    required this.type,
    required this.name,
    required this.isActive,
    required this.config,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Integration.fromJson(Map<String, dynamic> json) {
    return Integration(
      id: json['id'] as String,
      type: json['type'] as String,
      name: json['name'] as String,
      isActive: json['isActive'] as bool? ?? false,
      config: json['config'] as Map<String, dynamic>? ?? {},
      createdAt: json['createdAt'] as String,
      updatedAt: json['updatedAt'] as String,
    );
  }
}

