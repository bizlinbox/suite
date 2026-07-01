import 'package:flutter/material.dart';

class AppChip extends StatelessWidget {
  final String label;
  final bool selected;
  final ValueChanged<bool>? onSelected;
  final VoidCallback? onDeleted;
  final Color? backgroundColor;
  final Color? selectedColor;
  final Color? labelColor;
  final Color? selectedLabelColor;

  const AppChip({
    super.key,
    required this.label,
    this.selected = false,
    this.onSelected,
    this.onDeleted,
    this.backgroundColor,
    this.selectedColor,
    this.labelColor,
    this.selectedLabelColor,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = selected
        ? (selectedColor ?? const Color(0xFF2563EB))
        : (backgroundColor ?? (isDark ? const Color(0xFF334155) : const Color(0xFFF1F5F9)));
    final fg = selected
        ? (selectedLabelColor ?? Colors.white)
        : (labelColor ?? (isDark ? Colors.white70 : const Color(0xFF475569)));

    Widget chip = Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            label,
            style: TextStyle(
              color: fg,
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
          ),
          if (onDeleted != null) ...[
            const SizedBox(width: 4),
            GestureDetector(
              onTap: onDeleted,
              child: Icon(
                Icons.close,
                size: 14,
                color: fg,
              ),
            ),
          ],
        ],
      ),
    );

    if (onSelected != null) {
      chip = GestureDetector(
        onTap: () => onSelected!(!selected),
        child: chip,
      );
    }

    return chip;
  }
}
