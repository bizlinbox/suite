import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class LocalStorageService {
  static const String _domainKey = 'bizlinbox:domain';
  static const String _userKey = 'bizlinbox:user';
  static const String _wabaKey = 'bizlinbox:waba';
  static const String _notificationsKey = 'bizlinbox:notifications';
  static const String _themeKey = 'bizlinbox:theme';
  static const String _cookiesKey = 'bizlinbox:cookies';

  late final SharedPreferences _prefs;

  Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
  }

  // Domain
  String? getDomain() => _prefs.getString(_domainKey);
  Future<bool> setDomain(String domain) => _prefs.setString(_domainKey, domain);
  Future<bool> clearDomain() => _prefs.remove(_domainKey);

  // User
  Map<String, dynamic>? getUser() {
    final raw = _prefs.getString(_userKey);
    if (raw == null) return null;
    try {
      return jsonDecode(raw) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  Future<bool> setUser(Map<String, dynamic> user) => _prefs.setString(_userKey, jsonEncode(user));
  Future<bool> clearUser() => _prefs.remove(_userKey);

  // WABA
  String? getWabaId() => _prefs.getString(_wabaKey);
  Future<bool> setWabaId(String id) => _prefs.setString(_wabaKey, id);
  Future<bool> clearWaba() => _prefs.remove(_wabaKey);

  // Notifications
  bool getNotificationsEnabled() => _prefs.getBool(_notificationsKey) ?? false;
  Future<bool> setNotificationsEnabled(bool value) => _prefs.setBool(_notificationsKey, value);

  // Theme
  String? getTheme() => _prefs.getString(_themeKey);
  Future<bool> setTheme(String theme) => _prefs.setString(_themeKey, theme);

  // Cookies (for non-web cookie-based auth)
  String? getCookies() => _prefs.getString(_cookiesKey);
  Future<bool> setCookies(String cookies) => _prefs.setString(_cookiesKey, cookies);
  Future<bool> clearCookies() => _prefs.remove(_cookiesKey);

  // Clear all bizlinbox data
  Future<void> clearAll() async {
    final keys = _prefs.getKeys().where((k) => k.startsWith('bizlinbox:')).toList();
    for (final key in keys) {
      await _prefs.remove(key);
    }
  }
}

