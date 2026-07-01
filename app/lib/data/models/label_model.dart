class Label {
  final String id;
  final String name;
  final String color;

  Label({required this.id, required this.name, required this.color});

  factory Label.fromJson(Map<String, dynamic> json) {
    return Label(
      id: json['id'] as String,
      name: json['name'] as String,
      color: json['color'] as String,
    );
  }

  Map<String, dynamic> toJson() => {'id': id, 'name': name, 'color': color};
}
