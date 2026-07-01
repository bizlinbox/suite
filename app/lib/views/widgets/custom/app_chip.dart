import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

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
        ? (selectedColor ?? AppColors.primary)
        : (backgroundColor ?? (isDark ? const Color(0xFF334155) : const Color(0xFFF1F5F9)));
    final fg = selected
        ? (selectedLabelColor ?? Colors.white)
        : (labelColor ?? (isDark ? AppColors.darkTextSecondary : const Color(0xFF475569)));

    Widget content = Container(
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
              child: MouseRegion(
                cursor: SystemMouseCursors.click,
                child: PhosphorIcon(PhosphorIconsRegular.x,
                  size: 14,
                  color: fg,
                ),
              ),
            ),
          ],
        ],
      ),
    );

    Widget chip = content;
    if (onSelected != null) {
      chip = Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(20),
        child: InkWell(
          onTap: () => onSelected!(!selected),
          borderRadius: BorderRadius.circular(20),
          mouseCursor: SystemMouseCursors.click,
          child: content,
        ),
      );
    }

    return chip;
  }
}
