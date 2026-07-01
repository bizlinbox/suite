class Role {
  final String id;
  final String name;
  final List<String> permissions;
  final bool isSystem;

  Role({
    required this.id,
    required this.name,
    required this.permissions,
    required this.isSystem,
  });

  factory Role.fromJson(Map<String, dynamic> json) {
    return Role(
      id: json['id'] as String,
      name: json['name'] as String,
      permissions: (json['permissions'] as List<dynamic>?)?.cast<String>() ?? [],
      isSystem: json['isSystem'] as bool? ?? false,
    );
  }
}

