import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';

class AppTextField extends StatefulWidget {
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
  final String? errorText;

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
    this.errorText,
  });

  @override
  State<AppTextField> createState() => _AppTextFieldState();
}

class _AppTextFieldState extends State<AppTextField> {
  late final FocusNode _focusNode = widget.focusNode ?? FocusNode();
  bool _hasFocus = false;

  @override
  void initState() {
    super.initState();
    _focusNode.addListener(_onFocusChange);
  }

  void _onFocusChange() {
    if (mounted) setState(() => _hasFocus = _focusNode.hasFocus);
  }

  @override
  void dispose() {
    _focusNode.removeListener(_onFocusChange);
    if (widget.focusNode == null) _focusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final hasError = widget.errorText != null && widget.errorText!.isNotEmpty;
    final effectiveController =
        widget.controller ?? (widget.initialValue != null ? TextEditingController(text: widget.initialValue) : null);
    final effectiveLabel = widget.labelText ?? widget.decoration?.labelText;
    final effectiveHint = widget.hintText ?? widget.decoration?.hintText;
    final effectivePrefix = widget.prefix ?? widget.decoration?.prefixIcon;
    final effectiveSuffix = widget.suffix ?? widget.decoration?.suffixIcon;

    final borderColor = hasError
        ? AppColors.danger
        : _hasFocus
            ? (isDark ? AppColors.primaryLight : AppColors.primary)
            : (isDark ? AppColors.darkBorder : AppColors.lightBorder);
    final borderWidth = _hasFocus || hasError ? 1.5 : 1.0;

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
              color: isDark ? AppColors.darkTextSecondary : const Color(0xFF475569),
            ),
          ),
          const SizedBox(height: 6),
        ],
        AnimatedContainer(
          duration: const Duration(milliseconds: 120),
          decoration: BoxDecoration(
            color: widget.enabled
                ? (isDark ? AppColors.darkSurface : Colors.white)
                : (isDark ? AppColors.darkBorder.withValues(alpha: 0.3) : const Color(0xFFF1F5F9)),
            borderRadius: BorderRadius.circular(widget.borderRadius),
            border: Border.all(color: borderColor, width: borderWidth),
          ),
          child: Row(
            children: [
              if (effectivePrefix != null) ...[
                const SizedBox(width: 12),
                IconTheme(
                  data: IconThemeData(color: _hasFocus ? AppColors.primary : theme.iconTheme.color),
                  child: effectivePrefix,
                ),
                const SizedBox(width: 8),
              ],
              Expanded(
                child: TextField(
                  controller: effectiveController,
                  focusNode: _focusNode,
                  obscureText: widget.obscureText,
                  keyboardType: widget.keyboardType,
                  textInputAction: widget.textInputAction,
                  onChanged: widget.onChanged,
                  onSubmitted: widget.onSubmitted,
                  maxLines: widget.maxLines,
                  enabled: widget.enabled,
                  readOnly: widget.readOnly,
                  onTap: widget.onTap,
                  style: widget.style ??
                      TextStyle(
                        color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                        fontSize: 14,
                      ),
                  decoration: InputDecoration(
                    hintText: effectiveHint,
                    hintStyle: TextStyle(
                      color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                    ),
                    border: InputBorder.none,
                    contentPadding: widget.contentPadding ?? const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
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
        if (hasError) ...[
          const SizedBox(height: 6),
          Text(
            widget.errorText!,
            style: const TextStyle(fontSize: 12, color: AppColors.danger),
          ),
        ],
      ],
    );
  }
}
