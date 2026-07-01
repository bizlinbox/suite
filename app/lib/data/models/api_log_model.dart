import 'dart:convert';

class ApiLog {
  final String id;
  final String provider;
  final String direction;
  final String endpoint;
  final int statusCode;
  final int durationMs;
  final String createdAt;
  final String? orgId;
  final String? conversationId;
  final String? method;
  final String? requestBody;
  final String? responseBody;
  final bool? success;
  final String? errorMessage;

  ApiLog({
    required this.id,
    required this.provider,
    required this.direction,
    required this.endpoint,
    required this.statusCode,
    required this.durationMs,
    required this.createdAt,
    this.orgId,
    this.conversationId,
    this.method,
    this.requestBody,
    this.responseBody,
    this.success,
    this.errorMessage,
  });

  factory ApiLog.fromJson(Map<String, dynamic> json) {
    String? formatJson(dynamic value) {
      if (value == null) return null;
      if (value is String) return value;
      try {
        return const JsonEncoder.withIndent('  ').convert(value);
      } catch (_) {
        return value.toString();
      }
    }

    return ApiLog(
      id: json['id'] as String,
      provider: json['provider'] as String? ?? '',
      direction: json['direction'] as String? ?? 'outgoing',
      endpoint: json['endpoint'] as String? ?? '',
      statusCode: json['statusCode'] as int? ?? 0,
      durationMs: json['durationMs'] as int? ?? 0,
      createdAt: json['createdAt'] as String,
      orgId: json['orgId'] as String?,
      conversationId: json['conversationId'] as String?,
      method: json['method'] as String?,
      requestBody: formatJson(json['requestBody']),
      responseBody: formatJson(json['responseBody']),
      success: json['success'] as bool?,
      errorMessage: json['errorMessage'] as String?,
    );
  }
}

