import 'package:dio/dio.dart';

/// Extracts a user-friendly error message from an exception.
///
/// The backend returns errors in the shape `{ error: "message" }`.
/// This helper prioritizes that message, then falls back to well-known
/// network/dio descriptions, and finally a safe generic message so
/// raw exception dumps never leak into the UI.
String extractApiError(Object? error, {String fallback = 'Something went wrong. Please try again.'}) {
  if (error is DioException) {
    // 1. Backend sent a structured error response
    final responseData = error.response?.data;
    if (responseData is Map<String, dynamic>) {
      final msg = responseData['error'] as String?;
      if (msg != null && msg.isNotEmpty) {
        return msg;
      }
    }

    // 2. No response at all (network/offline)
    if (error.response == null) {
      switch (error.type) {
        case DioExceptionType.connectionTimeout:
        case DioExceptionType.sendTimeout:
        case DioExceptionType.receiveTimeout:
          return 'Request timed out. Please check your connection and try again.';
        case DioExceptionType.connectionError:
        case DioExceptionType.unknown:
          return 'No internet connection. Please check your network and try again.';
        default:
          break;
      }
    }

    // 3. We have a response but no structured error message
    final statusCode = error.response?.statusCode;
    if (statusCode != null) {
      if (statusCode >= 500) {
        return 'Server error. Please try again later.';
      }
      if (statusCode == 401) {
        return 'Session expired. Please sign in again.';
      }
      if (statusCode == 403) {
        return 'You do not have permission to perform this action.';
      }
      if (statusCode == 404) {
        return 'Resource not found.';
      }
      if (statusCode == 409) {
        return 'Conflict. The resource may already exist.';
      }
      if (statusCode == 422) {
        return 'Invalid input. Please check your data and try again.';
      }
    }
  }

  // 4. Plain string
  if (error is String) {
    return error.isNotEmpty ? error : fallback;
  }

  // 5. Anything else – never show raw toString() in UI
  final raw = error?.toString() ?? '';
  if (raw.isEmpty || raw.contains('DioException') || raw.contains('SocketException')) {
    return fallback;
  }
  return raw;
}
