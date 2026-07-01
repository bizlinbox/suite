import 'package:dio/dio.dart';
import '../../core/services/api_service.dart';
import '../../core/utils/api_error.dart';
import '../../core/utils/result.dart';
import '../models/contact_model.dart';

class ContactRepository {
  final ApiService _api;

  ContactRepository(this._api);

  Future<Result<List<Contact>>> getContacts() async {
    try {
      final res = await _api.get('/contacts');
      final list = (res.data['contacts'] as List<dynamic>)
          .map((e) => Contact.fromJson(e as Map<String, dynamic>))
          .toList();
      return Success(list);
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to load contacts'));
    }
  }

  Future<Result<Contact>> createContact(Map<String, dynamic> payload) async {
    try {
      final res = await _api.post('/contacts', data: payload);
      return Success(Contact.fromJson(res.data['contact'] as Map<String, dynamic>));
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to create contact'));
    }
  }

  Future<Result<Contact>> updateContact(String id, Map<String, dynamic> payload) async {
    try {
      final res = await _api.put('/contacts/$id', data: payload);
      return Success(Contact.fromJson(res.data['contact'] as Map<String, dynamic>));
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to update contact'));
    }
  }

  Future<Result<void>> deleteContact(String id) async {
    try {
      await _api.delete('/contacts/$id');
      return const Success(null);
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to delete contact'));
    }
  }

  Future<Result<Map<String, dynamic>>> importContacts(List<int> bytes, String filename) async {
    try {
      final formData = FormData.fromMap({
        'file': MultipartFile.fromBytes(bytes, filename: filename),
      });
      final res = await _api.client.post('/contacts/import', data: formData);
      return Success(res.data as Map<String, dynamic>);
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to import contacts'));
    }
  }

  Future<Result<Map<String, dynamic>>> importContactsFromPath(String filePath) async {
    try {
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(filePath),
      });
      final res = await _api.client.post('/contacts/import', data: formData);
      return Success(res.data as Map<String, dynamic>);
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to import contacts'));
    }
  }

  Future<Result<Contact>> getContact(String id) async {
    try {
      final res = await _api.get('/contacts/$id');
      return Success(Contact.fromJson(res.data['contact'] as Map<String, dynamic>));
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to load contact'));
    }
  }
}

