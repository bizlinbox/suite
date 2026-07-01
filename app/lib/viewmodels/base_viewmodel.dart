import 'package:flutter/material.dart';

enum ViewState { idle, busy, error, success }

class BaseViewModel extends ChangeNotifier {
  ViewState _state = ViewState.idle;
  String _errorMessage = '';

  ViewState get state => _state;
  String get errorMessage => _errorMessage;
  bool get isBusy => _state == ViewState.busy;
  bool get isError => _state == ViewState.error;
  bool get isSuccess => _state == ViewState.success;
  bool get isIdle => _state == ViewState.idle;

  void setState(ViewState viewState) {
    _state = viewState;
    notifyListeners();
  }

  void setError(String message) {
    _errorMessage = message;
    _state = ViewState.error;
    notifyListeners();
  }

  void setSuccess() {
    _state = ViewState.success;
    notifyListeners();
  }

  void setBusy() {
    _state = ViewState.busy;
    notifyListeners();
  }

  void setIdle() {
    _state = ViewState.idle;
    notifyListeners();
  }

  Future<void> runAsync(Future<void> Function() action) async {
    try {
      setBusy();
      await action();
      setSuccess();
    } catch (e) {
      setError(e.toString());
    }
  }
}
