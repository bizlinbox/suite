import 'package:flutter/material.dart';

class AppDropdownItem<T> {
  final T value;
  final String label;

  AppDropdownItem({required this.value, required this.label});
}

class AppDropdown<T> extends StatelessWidget {
  final T? value;
  final T? initialValue;
  final List<DropdownMenuItem<T>>? items;
  final ValueChanged<T?>? onChanged;
  final String? labelText;
  final String? hintText;
  final Widget? hint;
  final bool isExpanded;
  final bool isDense;
  final double borderRadius;
  final InputDecoration? decoration;

  const AppDropdown({
    super.key,
    this.value,
    this.initialValue,
    this.items,
    this.onChanged,
    this.labelText,
    this.hintText,
    this.hint,
    this.isExpanded = true,
    this.isDense = false,
    this.borderRadius = 8,
    this.decoration,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final effectiveLabel = labelText ?? decoration?.labelText;
    final effectiveValue = value ?? initialValue;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (effectiveLabel != null) ...[
          Text(
            effectiveLabel,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: isDark ? Colors.white70 : const Color(0xFF475569),
            ),
          ),
          const SizedBox(height: 6),
        ],
        Container(
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1E293B) : Colors.white,
            borderRadius: BorderRadius.circular(borderRadius),
            border: Border.all(
              color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
            ),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<T>(
              value: effectiveValue,
              isExpanded: isExpanded,
              isDense: isDense,
              hint: hint ?? (hintText != null
                  ? Text(
                      hintText!,
                      style: TextStyle(
                        color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                      ),
                    )
                  : null),
              icon: Icon(
                Icons.keyboard_arrow_down,
                color: isDark ? Colors.white70 : const Color(0xFF64748B),
              ),
              dropdownColor: isDark ? const Color(0xFF1E293B) : Colors.white,
              style: TextStyle(
                color: isDark ? Colors.white : const Color(0xFF1E293B),
                fontSize: 14,
              ),
              items: items,
              onChanged: onChanged,
            ),
          ),
        ),
      ],
    );
  }
}
