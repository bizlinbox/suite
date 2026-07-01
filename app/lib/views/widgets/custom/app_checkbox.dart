import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';

class AppCheckbox extends StatelessWidget {
  final bool value;
  final ValueChanged<bool?>? onChanged;
  final double size;
  final Color? activeColor;

  const AppCheckbox({
    super.key,
    required this.value,
    this.onChanged,
    this.size = 22,
    this.activeColor,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final targetColor = activeColor ?? AppColors.primary;
    final isDark = theme.brightness == Brightness.dark;

    return MouseRegion(
      cursor: onChanged != null ? SystemMouseCursors.click : SystemMouseCursors.basic,
      child: GestureDetector(
        onTap: onChanged != null ? () => onChanged!(!value) : null,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 120),
          width: size,
          height: size,
          decoration: BoxDecoration(
            color: value ? targetColor : Colors.transparent,
            borderRadius: BorderRadius.circular(6),
            border: Border.all(
              color: value
                  ? targetColor
                  : (isDark ? const Color(0xFF64748B) : const Color(0xFFCBD5E1)),
              width: 2,
            ),
          ),
          child: value
              ? Icon(
                  Icons.check,
                  size: size * 0.65,
                  color: Colors.white,
                )
              : null,
        ),
      ),
    );
  }
}
