import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/di.dart';
import '../../core/utils/result.dart';
import '../../data/models/automation_model.dart';
import '../../data/repositories/automation_repository.dart';
import '../../viewmodels/base_viewmodel.dart';

class AutomationFormViewModel extends BaseViewModel {
  final AutomationRepository _repo;
  AutomationFormViewModel(this._repo);

  Future<Result<Automation>> save(Map<String, dynamic> payload, {String? id}) async {
    setBusy();
    final result = id != null
        ? await _repo.updateAutomation(id, payload)
        : await _repo.createAutomation(payload);
    result.when(
      success: (_) => setSuccess(),
      error: (message, exception) => setError(message),
    );
    setIdle();
    return result;
  }
}

class AutomationFormScreen extends StatelessWidget {
  final Automation? automation;
  const AutomationFormScreen({super.key, this.automation});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AutomationFormViewModel(locator<AutomationRepository>()),
      child: _AutomationFormBody(automation: automation),
    );
  }
}

class _AutomationFormBody extends StatefulWidget {
  final Automation? automation;
  const _AutomationFormBody({this.automation});

  @override
  State<_AutomationFormBody> createState() => _AutomationFormBodyState();
}

class _ConditionItem {
  String field = 'message';
  String operator = 'contains';
  String value = '';
}

class _ActionItem {
  String type = 'send_text';
  String text = '';
  String templateName = '';
  String mediaUrl = '';
  int delaySeconds = 5;
  String tag = '';
  String assignTo = '';
}

class _AutomationFormBodyState extends State<_AutomationFormBody> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameController;
  bool _isActive = true;
  String _triggerType = 'new_chat';
  final List<_ConditionItem> _conditions = [];
  final List<_ActionItem> _actions = [];

  final List<String> _triggerTypes = ['new_chat', 'schedule'];
  final List<String> _operators = ['contains', 'exact_match', 'starts_with', 'ends_with'];
  final List<String> _actionTypes = ['send_text', 'send_template', 'send_media', 'delay', 'tag_contact', 'assign_agent'];

  @override
  void initState() {
    super.initState();
    final a = widget.automation;
    _nameController = TextEditingController(text: a?.name ?? '');
    _isActive = a?.isActive ?? true;
    // Since the list model doesn't include trigger/conditions/actions, we start fresh for edit
    // In a real app, you'd fetch the full automation details by ID
    if (a != null) {
      // Keep defaults; backend list view is limited
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  void _addCondition() {
    setState(() => _conditions.add(_ConditionItem()));
  }

  void _removeCondition(int index) {
    setState(() => _conditions.removeAt(index));
  }

  void _addAction() {
    setState(() => _actions.add(_ActionItem()));
  }

  void _removeAction(int index) {
    setState(() => _actions.removeAt(index));
  }

  Future<void> _submit(AutomationFormViewModel vm) async {
    if (!_formKey.currentState!.validate()) return;

    final payload = <String, dynamic>{
      'name': _nameController.text.trim(),
      'isActive': _isActive,
      'trigger': {'type': _triggerType},
      'conditions': _conditions.map((c) => {
        'field': c.field,
        'operator': c.operator,
        'value': c.value,
      }).toList(),
      'actions': _actions.map((a) {
        final map = <String, dynamic>{'type': a.type};
        switch (a.type) {
          case 'send_text':
            map['text'] = a.text;
            break;
          case 'send_template':
            map['templateName'] = a.templateName;
            break;
          case 'send_media':
            map['mediaUrl'] = a.mediaUrl;
            break;
          case 'delay':
            map['duration'] = a.delaySeconds;
            break;
          case 'tag_contact':
            map['tag'] = a.tag;
            break;
          case 'assign_agent':
            map['assignTo'] = a.assignTo;
            break;
        }
        return map;
      }).toList(),
    };

    final result = await vm.save(payload, id: widget.automation?.id);
    if (!mounted) return;
    result.when(
      success: (_) => Navigator.pop(context, true),
      error: (message, exception) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(message), backgroundColor: Colors.red),
        );
      },
    );
  }

  Widget _buildConditionCard(int index) {
    final condition = _conditions[index];
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            Row(
              children: [
                const Expanded(child: Text('Condition', style: TextStyle(fontWeight: FontWeight.bold))),
                IconButton(
                  icon: const Icon(Icons.delete_outline, color: Colors.red),
                  onPressed: () => _removeCondition(index),
                ),
              ],
            ),
            DropdownButtonFormField<String>(
              initialValue: condition.field,
              decoration: const InputDecoration(labelText: 'Field'),
              items: ['message'].map((f) => DropdownMenuItem(value: f, child: Text(f))).toList(),
              onChanged: (v) => setState(() => condition.field = v ?? 'message'),
            ),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              initialValue: condition.operator,
              decoration: const InputDecoration(labelText: 'Operator'),
              items: _operators
                  .map((op) => DropdownMenuItem(
                        value: op,
                        child: Text(op.replaceAll('_', ' ')),
                      ))
                  .toList(),
              onChanged: (v) => setState(() => condition.operator = v ?? 'contains'),
            ),
            const SizedBox(height: 8),
            TextFormField(
              initialValue: condition.value,
              decoration: const InputDecoration(labelText: 'Value'),
              onChanged: (v) => condition.value = v,
              validator: (v) => v == null || v.isEmpty ? 'Required' : null,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionCard(int index) {
    final action = _actions[index];
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            Row(
              children: [
                const Expanded(child: Text('Action', style: TextStyle(fontWeight: FontWeight.bold))),
                IconButton(
                  icon: const Icon(Icons.delete_outline, color: Colors.red),
                  onPressed: () => _removeAction(index),
                ),
              ],
            ),
            DropdownButtonFormField<String>(
              initialValue: action.type,
              decoration: const InputDecoration(labelText: 'Action Type'),
              items: _actionTypes
                  .map((t) => DropdownMenuItem(
                        value: t,
                        child: Text(t.replaceAll('_', ' ')),
                      ))
                  .toList(),
              onChanged: (v) => setState(() => action.type = v ?? 'send_text'),
            ),
            const SizedBox(height: 8),
            if (action.type == 'send_text')
              TextFormField(
                initialValue: action.text,
                decoration: const InputDecoration(labelText: 'Text'),
                onChanged: (v) => action.text = v,
                validator: (v) => v == null || v.isEmpty ? 'Required' : null,
              ),
            if (action.type == 'send_template')
              TextFormField(
                initialValue: action.templateName,
                decoration: const InputDecoration(labelText: 'Template Name'),
                onChanged: (v) => action.templateName = v,
                validator: (v) => v == null || v.isEmpty ? 'Required' : null,
              ),
            if (action.type == 'send_media')
              TextFormField(
                initialValue: action.mediaUrl,
                decoration: const InputDecoration(labelText: 'Media URL'),
                onChanged: (v) => action.mediaUrl = v,
                validator: (v) => v == null || v.isEmpty ? 'Required' : null,
              ),
            if (action.type == 'delay')
              TextFormField(
                initialValue: '${action.delaySeconds}',
                decoration: const InputDecoration(labelText: 'Delay (seconds)'),
                keyboardType: TextInputType.number,
                onChanged: (v) => action.delaySeconds = int.tryParse(v) ?? 5,
              ),
            if (action.type == 'tag_contact')
              TextFormField(
                initialValue: action.tag,
                decoration: const InputDecoration(labelText: 'Tag'),
                onChanged: (v) => action.tag = v,
                validator: (v) => v == null || v.isEmpty ? 'Required' : null,
              ),
            if (action.type == 'assign_agent')
              TextFormField(
                initialValue: action.assignTo,
                decoration: const InputDecoration(labelText: 'Assign To (agent ID or email)'),
                onChanged: (v) => action.assignTo = v,
                validator: (v) => v == null || v.isEmpty ? 'Required' : null,
              ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final vm = context.watch<AutomationFormViewModel>();
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.automation == null ? 'New Automation' : 'Edit Automation'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextFormField(
                controller: _nameController,
                decoration: const InputDecoration(labelText: 'Name'),
                validator: (v) => v == null || v.isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: 12),
              SwitchListTile(
                title: const Text('Active'),
                value: _isActive,
                onChanged: (v) => setState(() => _isActive = v),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: _triggerType,
                decoration: const InputDecoration(labelText: 'Trigger Type'),
                items: _triggerTypes
                    .map((t) => DropdownMenuItem(value: t, child: Text(t.replaceAll('_', ' '))))
                    .toList(),
                onChanged: (v) => setState(() => _triggerType = v ?? 'new_chat'),
              ),
              const SizedBox(height: 24),
              Row(
                children: [
                  const Expanded(
                    child: Text('Conditions', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  ),
                  IconButton(
                    icon: const Icon(Icons.add_circle, color: Color(0xFF2563EB)),
                    onPressed: _addCondition,
                  ),
                ],
              ),
              const SizedBox(height: 8),
              ..._conditions.asMap().entries.map((e) => _buildConditionCard(e.key)),
              if (_conditions.isEmpty)
                const Padding(
                  padding: EdgeInsets.only(bottom: 12),
                  child: Text('No conditions. The automation will trigger for all events.', style: TextStyle(color: Colors.grey)),
                ),
              const SizedBox(height: 16),
              Row(
                children: [
                  const Expanded(
                    child: Text('Actions', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  ),
                  IconButton(
                    icon: const Icon(Icons.add_circle, color: Color(0xFF2563EB)),
                    onPressed: _addAction,
                  ),
                ],
              ),
              const SizedBox(height: 8),
              ..._actions.asMap().entries.map((e) => _buildActionCard(e.key)),
              if (_actions.isEmpty)
                const Padding(
                  padding: EdgeInsets.only(bottom: 12),
                  child: Text('No actions added yet.', style: TextStyle(color: Colors.grey)),
                ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: vm.isBusy ? null : () => _submit(vm),
                  child: vm.isBusy
                      ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Save Automation'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
