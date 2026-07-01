class WabaAccount {
  final String id;
  final String name;
  final String? phoneNumberId;
  final String businessAccountId;
  final bool isActive;

  WabaAccount({
    required this.id,
    required this.name,
    this.phoneNumberId,
    required this.businessAccountId,
    required this.isActive,
  });

  factory WabaAccount.fromJson(Map<String, dynamic> json) {
    return WabaAccount(
      id: json['id'] as String,
      name: json['name'] as String,
      phoneNumberId: json['phoneNumberId'] as String?,
      businessAccountId: json['businessAccountId'] as String,
      isActive: json['isActive'] as bool,
    );
  }
}

class User {
  final String id;
  final String email;
  final String name;
  final String role;
  final List<String> permissions;
  final String organizationId;
  final List<WabaAccount> wabaAccounts;

  User({
    required this.id,
    required this.email,
    required this.name,
    required this.role,
    required this.permissions,
    required this.organizationId,
    required this.wabaAccounts,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as String,
      email: json['email'] as String,
      name: json['name'] as String,
      role: json['role'] as String,
      permissions: (json['permissions'] as List<dynamic>?)?.cast<String>() ?? [],
      organizationId: json['organizationId'] as String,
      wabaAccounts: (json['wabaAccounts'] as List<dynamic>?)
              ?.map((e) => WabaAccount.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'name': name,
      'role': role,
      'permissions': permissions,
      'organizationId': organizationId,
      'wabaAccounts': wabaAccounts.map((e) => {
        'id': e.id,
        'name': e.name,
        'phoneNumberId': e.phoneNumberId,
        'businessAccountId': e.businessAccountId,
        'isActive': e.isActive,
      }).toList(),
    };
  }
}

