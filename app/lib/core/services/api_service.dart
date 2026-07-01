import 'dart:async';
import 'package:dio/dio.dart';
import 'local_storage_service.dart';

class ApiService {
  late Dio _dio;
  final LocalStorageService _localStorage;
  bool _isRefreshing = false;
  final List<Function(String? error)> _refreshSubscribers = [];

  /// Paths that should NOT trigger token refresh on 401.
  static const _publicPaths = {
    '/auth/login',
    '/auth/register',
    '/auth/setup',
    '/auth/setup-required',
    '/auth/public-settings',
    '/agents/accept-invite',
  };

  /// Called when token refresh fails and the user should be logged out.
  void Function()? onAuthFailure;

  ApiService(this._localStorage) {
    _initDio();
  }

  void _initDio() {
    final domain = _localStorage.getDomain();
    final baseUrl = domain != null && domain.isNotEmpty
        ? (domain.endsWith('/api/v1') ? domain : '$domain/api/v1')
        : 'http://localhost:3000/api/v1';

    _dio = Dio(
      BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: const Duration(seconds: 30),
        receiveTimeout: const Duration(seconds: 30),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        // Required for cookie-based auth in Flutter web
        extra: {'withCredentials': true},
      ),
    );

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          final wabaId = _localStorage.getWabaId();
          if (wabaId != null) {
            options.headers['x-waba-account-id'] = wabaId;
          }
          return handler.next(options);
        },
        onError: (error, handler) async {
          if (error.response?.statusCode == 401 &&
              error.requestOptions.path != '/auth/refresh' &&
              !_publicPaths.contains(error.requestOptions.path)) {
            if (!_isRefreshing) {
              _isRefreshing = true;
              try {
                await _dio.post('/auth/refresh');
                _isRefreshing = false;
                _onTokenRefreshed();
                return handler.resolve(await _dio.fetch(error.requestOptions));
              } catch (refreshError) {
                _isRefreshing = false;
                _onTokenRefreshed(refreshError.toString());
                // Notify app about auth failure and clear local state
                try {
                  await _localStorage.clearAll();
                } catch (_) {}
                onAuthFailure?.call();
                return handler.reject(error);
              }
            }

            return handler.resolve(
              await _retryWithTokenRefresh(error.requestOptions),
            );
          }
          return handler.next(error);
        },
      ),
    );
  }

  void _onTokenRefreshed([String? error]) {
    for (final callback in _refreshSubscribers) {
      callback(error);
    }
    _refreshSubscribers.clear();
  }

  Future<Response<dynamic>> _retryWithTokenRefresh(RequestOptions options) async {
    final completer = Completer<Response<dynamic>>();
    _refreshSubscribers.add((error) async {
      if (error != null) {
        completer.completeError(DioException(requestOptions: options));
      } else {
        completer.complete(await _dio.fetch(options));
      }
    });
    return completer.future;
  }

  void updateBaseUrl(String domain) {
    final baseUrl = domain.endsWith('/api/v1') ? domain : '$domain/api/v1';
    _dio.options.baseUrl = baseUrl;
  }

  Dio get client => _dio;

  Future<Response<T>> get<T>(String path, {Map<String, dynamic>? queryParameters}) async {
    return _dio.get<T>(path, queryParameters: queryParameters);
  }

  Future<Response<T>> post<T>(String path, {dynamic data}) async {
    return _dio.post<T>(path, data: data);
  }

  Future<Response<T>> put<T>(String path, {dynamic data}) async {
    return _dio.put<T>(path, data: data);
  }

  Future<Response<T>> patch<T>(String path, {dynamic data}) async {
    return _dio.patch<T>(path, data: data);
  }

  Future<Response<T>> delete<T>(String path, {dynamic data}) async {
    return _dio.delete<T>(path, data: data);
  }

  Future<Response<T>> uploadFile<T>(String path, FormData data) async {
    return _dio.post<T>(
      path,
      data: data,
      options: Options(headers: {'Content-Type': 'multipart/form-data'}),
    );
  }
}


