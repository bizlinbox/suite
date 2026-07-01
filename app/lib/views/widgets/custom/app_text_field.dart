import 'package:flutter/material.dart';

class AppTextField extends StatelessWidget {
  final TextEditingController? controller;
  final String? initialValue;
  final String? hintText;
  final String? labelText;
  final Widget? prefix;
  final Widget? suffix;
  final bool obscureText;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onSubmitted;
  final int? maxLines;
  final bool enabled;
  final bool readOnly;
  final VoidCallback? onTap;
  final EdgeInsetsGeometry? contentPadding;
  final double borderRadius;
  final FocusNode? focusNode;
  final InputDecoration? decoration;
  final TextStyle? style;

  const AppTextField({
    super.key,
    this.controller,
    this.initialValue,
    this.hintText,
    this.labelText,
    this.prefix,
    this.suffix,
    this.obscureText = false,
    this.keyboardType,
    this.textInputAction,
    this.onChanged,
    this.onSubmitted,
    this.maxLines = 1,
    this.enabled = true,
    this.readOnly = false,
    this.onTap,
    this.contentPadding,
    this.borderRadius = 12,
    this.focusNode,
    this.decoration,
    this.style,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final effectiveController = controller ?? (initialValue != null ? TextEditingController(text: initialValue) : null);
    final effectiveLabel = labelText ?? decoration?.labelText;
    final effectiveHint = hintText ?? decoration?.hintText;
    final effectivePrefix = prefix ?? decoration?.prefixIcon;
    final effectiveSuffix = suffix ?? decoration?.suffixIcon;

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
          child: Row(
            children: [
              if (effectivePrefix != null) ...[
                const SizedBox(width: 12),
                effectivePrefix,
                const SizedBox(width: 8),
              ],
              Expanded(
                child: TextField(
                  controller: effectiveController,
                  obscureText: obscureText,
                  keyboardType: keyboardType,
                  textInputAction: textInputAction,
                  onChanged: onChanged,
                  onSubmitted: onSubmitted,
                  maxLines: maxLines,
                  enabled: enabled,
                  readOnly: readOnly,
                  onTap: onTap,
                  focusNode: focusNode,
                  style: style ?? TextStyle(
                    color: isDark ? Colors.white : const Color(0xFF1E293B),
                    fontSize: 14,
                  ),
                  decoration: InputDecoration(
                    hintText: effectiveHint,
                    hintStyle: TextStyle(
                      color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                    ),
                    border: InputBorder.none,
                    contentPadding: contentPadding ??
                        const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    isDense: true,
                  ),
                ),
              ),
              if (effectiveSuffix != null) ...[
                const SizedBox(width: 8),
                effectiveSuffix,
                const SizedBox(width: 12),
              ],
            ],
          ),
        ),
      ],
    );
  }
}
