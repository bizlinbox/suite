import 'package:dio/dio.dart';
import '../../core/services/api_service.dart';
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
      return Error('Failed to load contacts: $e');
    }
  }

  Future<Result<Contact>> createContact(Map<String, dynamic> payload) async {
    try {
      final res = await _api.post('/contacts', data: payload);
      return Success(Contact.fromJson(res.data['contact'] as Map<String, dynamic>));
    } catch (e) {
      return Error('Failed to create contact: $e');
    }
  }

  Future<Result<Contact>> updateContact(String id, Map<String, dynamic> payload) async {
    try {
      final res = await _api.put('/contacts/$id', data: payload);
      return Success(Contact.fromJson(res.data['contact'] as Map<String, dynamic>));
    } catch (e) {
      return Error('Failed to update contact: $e');
    }
  }

  Future<Result<void>> deleteContact(String id) async {
    try {
      await _api.delete('/contacts/$id');
      return const Success(null);
    } catch (e) {
      return Error('Failed to delete contact: $e');
    }
  }

  Future<Result<Map<String, dynamic>>> importContacts(String filePath) async {
    try {
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(filePath),
      });
      final res = await _api.client.post('/contacts/import', data: formData);
      return Success(res.data as Map<String, dynamic>);
    } catch (e) {
      return Error('Failed to import contacts: $e');
    }
  }

  Future<Result<Contact>> getContact(String id) async {
    try {
      final res = await _api.get('/contacts/$id');
      return Success(Contact.fromJson(res.data['contact'] as Map<String, dynamic>));
    } catch (e) {
      return Error('Failed to load contact: $e');
    }
  }
}
