import '../core/services/local_storage_service.dart';
import '../core/utils/result.dart';
import 'base_viewmodel.dart';

class DomainViewModel extends BaseViewModel {
  final LocalStorageService _storage;

  DomainViewModel(this._storage);

  String? get savedDomain => _storage.getDomain();

  Future<Result<void>> saveDomain(String domain) async {
    setBusy();
    try {
      String normalized = domain.trim();
      if (normalized.isEmpty) {
        setError('Domain cannot be empty');
        return Error('Domain cannot be empty');
      }
      if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
        normalized = 'https://$normalized';
      }
      await _storage.setDomain(normalized);
      setSuccess();
      return const Success(null);
    } catch (e) {
      setError(e.toString());
      return Error(e.toString());
    }
  }
}
