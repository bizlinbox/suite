import 'package:flutter/material.dart';
import '../../core/di.dart';
import '../../data/models/label_model.dart';
import '../../data/repositories/settings_repository.dart';
import 'custom/custom_widgets.dart';

class LabelSwitcher extends StatefulWidget {
  final List<String> selectedTags;
  final ValueChanged<List<String>> onChanged;

  const LabelSwitcher({
    super.key,
    this.selectedTags = const [],
    required this.onChanged,
  });

  @override
  State<LabelSwitcher> createState() => _LabelSwitcherState();
}

class _LabelSwitcherState extends State<LabelSwitcher> {
  List<Label> _labels = [];
  bool _isLoading = true;
  String? _error;
  late Set<String> _selected;

  @override
  void initState() {
    super.initState();
    _selected = Set<String>.from(widget.selectedTags);
    _loadLabels();
  }

  @override
  void didUpdateWidget(covariant LabelSwitcher oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!const ListEquality<String>().equals(oldWidget.selectedTags, widget.selectedTags)) {
      _selected = Set<String>.from(widget.selectedTags);
    }
  }

  Future<void> _loadLabels() async {
    final repo = locator<SettingsRepository>();
    final result = await repo.getLabels();
    if (!mounted) return;
    result.when(
      success: (labels) {
        setState(() {
          _labels = labels;
          _isLoading = false;
        });
      },
      error: (message, exception) {
        setState(() {
          _error = message;
          _isLoading = false;
        });
      },
    );
  }

  void _toggleLabel(String name) {
    setState(() {
      if (_selected.contains(name)) {
        _selected.remove(name);
      } else {
        _selected.add(name);
      }
    });
    widget.onChanged(_selected.toList());
  }

  Color _parseColor(String hex) {
    return Color(int.parse(hex.replaceFirst('#', '0xFF')));
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const SizedBox(
        height: 40,
        child: Center(child: AppProgressIndicator(size: 20)),
      );
    }

    if (_error != null) {
      return Text(_error!, style: const TextStyle(color: Colors.red, fontSize: 12));
    }

    if (_labels.isEmpty) {
      return const Text('No labels available. Create labels in Settings > Labels.',
        style: TextStyle(color: Colors.grey, fontSize: 12));
    }

    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: _labels.map((label) {
        final isSelected = _selected.contains(label.name);
        final bg = _parseColor(label.color);
        return GestureDetector(
          onTap: () => _toggleLabel(label.name),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: isSelected ? bg : bg.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: isSelected ? bg : Colors.grey.withValues(alpha: 0.3),
                width: 1,
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (isSelected)
                  const Padding(
                    padding: EdgeInsets.only(right: 4),
                    child: Icon(Icons.check, size: 14, color: Colors.white),
                  ),
                Text(
                  label.name,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: isSelected ? Colors.white : bg,
                  ),
                ),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }
}

class ListEquality<T> {
  const ListEquality();
  bool equals(List<T>? a, List<T>? b) {
    if (a == null) return b == null;
    if (b == null || a.length != b.length) return false;
    for (int i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }
}
