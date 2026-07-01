class TemplateComponent {
  final String type;
  final String? text;
  final String? format;
  final Map<String, dynamic>? example;

  TemplateComponent({required this.type, this.text, this.format, this.example});

  factory TemplateComponent.fromJson(Map<String, dynamic> json) {
    return TemplateComponent(
      type: json['type'] as String,
      text: json['text'] as String?,
      format: json['format'] as String?,
      example: json['example'] as Map<String, dynamic>?,
    );
  }
}

class Template {
  final String id;
  final String templateName;
  final String category;
  final String language;
  final List<TemplateComponent> components;
  final String status;
  final String? metaTemplateId;
  final String createdAt;
  final String updatedAt;
  final String wabaAccountId;

  Template({
    required this.id,
    required this.templateName,
    required this.category,
    required this.language,
    required this.components,
    required this.status,
    this.metaTemplateId,
    required this.createdAt,
    required this.updatedAt,
    required this.wabaAccountId,
  });

  factory Template.fromJson(Map<String, dynamic> json) {
    return Template(
      id: json['id'] as String,
      templateName: json['templateName'] as String,
      category: json['category'] as String,
      language: json['language'] as String,
      components: (json['components'] as List<dynamic>?)
              ?.map((e) => TemplateComponent.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      status: json['status'] as String,
      metaTemplateId: json['metaTemplateId'] as String?,
      createdAt: json['createdAt'] as String,
      updatedAt: json['updatedAt'] as String,
      wabaAccountId: json['wabaAccountId'] as String,
    );
  }
}

