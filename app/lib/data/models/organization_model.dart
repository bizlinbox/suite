class Organization {
  final String id;
  final String name;
  final String timezone;
  final String platformName;
  final String? platformLogo;
  final bool enablePublicRegistration;
  final String createdAt;

  Organization({
    required this.id,
    required this.name,
    required this.timezone,
    required this.platformName,
    this.platformLogo,
    required this.enablePublicRegistration,
    required this.createdAt,
  });

  factory Organization.fromJson(Map<String, dynamic> json) {
    return Organization(
      id: json['id'] as String,
      name: json['name'] as String,
      timezone: json['timezone'] as String? ?? 'UTC',
      platformName: json['platform_name'] as String? ?? 'BizlInbox',
      platformLogo: json['platform_logo'] as String?,
      enablePublicRegistration: json['enable_public_registration'] as bool? ?? true,
      createdAt: json['created_at'] as String,
    );
  }
}
