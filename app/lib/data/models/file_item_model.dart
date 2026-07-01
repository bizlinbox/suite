class FileItem {
  final String id;
  final String name;
  final String path;
  final int size;
  final String mimeType;
  final String source;
  final String createdAt;
  final String url;

  FileItem({
    required this.id,
    required this.name,
    required this.path,
    required this.size,
    required this.mimeType,
    required this.source,
    required this.createdAt,
    required this.url,
  });

  factory FileItem.fromJson(Map<String, dynamic> json) {
    return FileItem(
      id: json['id'] as String,
      name: json['name'] as String,
      path: json['path'] as String,
      size: json['size'] as int? ?? 0,
      mimeType: json['mimeType'] as String? ?? 'application/octet-stream',
      source: json['source'] as String? ?? 'upload',
      createdAt: json['createdAt'] as String,
      url: json['url'] as String? ?? '',
    );
  }
}

