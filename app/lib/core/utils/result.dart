sealed class Result<T> {
  const Result();

  R when<R>({
    required R Function(T data) success,
    required R Function(String message, Exception? exception) error,
  });
}

final class Success<T> extends Result<T> {
  final T data;
  const Success(this.data);

  @override
  R when<R>({
    required R Function(T data) success,
    required R Function(String message, Exception? exception) error,
  }) {
    return success(data);
  }
}

final class Error<T> extends Result<T> {
  final String message;
  final Exception? exception;
  const Error(this.message, {this.exception});

  @override
  R when<R>({
    required R Function(T data) success,
    required R Function(String message, Exception? exception) error,
  }) {
    return error(message, exception);
  }
}
