import 'package:flutter/material.dart';
import '../../data/models/quick_reply_model.dart';

class QuickReplyPicker extends StatelessWidget {
  final List<QuickReply> quickReplies;
  final ValueChanged<QuickReply> onSelected;
  final VoidCallback onDismiss;

  const QuickReplyPicker({
    super.key,
    required this.quickReplies,
    required this.onSelected,
    required this.onDismiss,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
      ),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                children: [
                  const Expanded(
                    child: Text(
                      'Quick Replies',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: onDismiss,
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            if (quickReplies.isEmpty)
              const Padding(
                padding: EdgeInsets.all(24),
                child: Text('No quick replies found'),
              )
            else
              Flexible(
                child: ListView.builder(
                  shrinkWrap: true,
                  itemCount: quickReplies.length,
                  itemBuilder: (context, index) {
                    final qr = quickReplies[index];
                    return ListTile(
                      title: Text(qr.shortcut),
                      subtitle: Text(
                        qr.content,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      onTap: () {
                        onSelected(qr);
                        Navigator.pop(context);
                      },
                    );
                  },
                ),
              ),
          ],
        ),
      ),
    );
  }
}
