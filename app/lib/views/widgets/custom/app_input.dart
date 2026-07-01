import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

/// Supported input kinds for the unified [AppInput] widget.
enum AppInputType {
  text,
  email,
  password,
  number,
  phone,
  multiline,
  search,
  dropdown,
  checkbox,
  switchInput,
  date,
}

/// Selectable option for [AppInputType.dropdown].
class AppInputOption<T> {
  final T value;
  final String label;
  final Widget? child;

  const AppInputOption({
    required this.value,
    required this.label,
    this.child,
  });
}

/// A unified, app-wide input widget that renders every form control with the
/// same design tokens (colors, radii, focus states, typography) regardless of the
/// underlying Material widget.
///
/// Use it for text, email, password, number, phone, multiline, search,
/// dropdown, checkbox, switch and date fields. All fields support an optional
/// [label] and [validator] so they work seamlessly inside a [Form].
class AppInput<T> extends StatefulWidget {
  final AppInputType type;
  final String? label;
  final String? hint;
  final TextEditingController? controller;
  final String? initialValue;
  final T? value;
  final List<AppInputOption<T>>? options;
  final ValueChanged<String>? onChanged;
  final ValueChanged<T?>? onSelected;
  final ValueChanged<bool>? onToggled;
  final String? Function(String?)? validator;
  final bool enabled;
  final bool readOnly;
  final Widget? prefix;
  final Widget? suffix;
  final int? maxLines;
  final int? maxLength;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;
  final VoidCallback? onTap;
  final ValueChanged<String>? onSubmitted;
  final EdgeInsetsGeometry? contentPadding;
  final double borderRadius;
  final FocusNode? focusNode;
  final TextStyle? style;
  final String? helperText;
  final String? errorText;
  final AutovalidateMode? autovalidateMode;

  const AppInput({
    super.key,
    this.type = AppInputType.text,
    this.label,
    this.hint,
    this.controller,
    this.initialValue,
    this.value,
    this.options,
    this.onChanged,
    this.onSelected,
    this.onToggled,
    this.validator,
    this.enabled = true,
    this.readOnly = false,
    this.prefix,
    this.suffix,
    this.maxLines,
    this.maxLength,
    this.keyboardType,
    this.textInputAction,
    this.onTap,
    this.onSubmitted,
    this.contentPadding,
    this.borderRadius = 12,
    this.focusNode,
    this.style,
    this.helperText,
    this.errorText,
    this.autovalidateMode,
  });

  const AppInput.text({
    super.key,
    this.label,
    this.hint,
    this.controller,
    this.initialValue,
    this.onChanged,
    this.validator,
    this.enabled = true,
    this.readOnly = false,
    this.prefix,
    this.suffix,
    this.maxLines = 1,
    this.maxLength,
    this.keyboardType,
    this.textInputAction,
    this.onTap,
    this.onSubmitted,
    this.contentPadding,
    this.borderRadius = 12,
    this.focusNode,
    this.style,
    this.helperText,
    this.errorText,
    this.autovalidateMode,
  }) : type = AppInputType.text,
       value = null,
       options = null,
       onSelected = null,
       onToggled = null;

  const AppInput.email({
    super.key,
    this.label,
    this.hint,
    this.controller,
    this.initialValue,
    this.onChanged,
    this.validator,
    this.enabled = true,
    this.readOnly = false,
    this.prefix,
    this.suffix,
    this.maxLength,
    this.textInputAction,
    this.onTap,
    this.onSubmitted,
    this.contentPadding,
    this.borderRadius = 12,
    this.focusNode,
    this.style,
    this.keyboardType,
    this.helperText,
    this.errorText,
    this.autovalidateMode,
  }) : type = AppInputType.email,
       value = null,
       options = null,
       onSelected = null,
       onToggled = null,
       maxLines = 1;

  const AppInput.password({
    super.key,
    this.label,
    this.hint,
    this.controller,
    this.initialValue,
    this.onChanged,
    this.validator,
    this.enabled = true,
    this.readOnly = false,
    this.prefix,
    this.suffix,
    this.maxLength,
    this.textInputAction,
    this.onTap,
    this.onSubmitted,
    this.contentPadding,
    this.borderRadius = 12,
    this.focusNode,
    this.style,
    this.keyboardType,
    this.helperText,
    this.errorText,
    this.autovalidateMode,
  }) : type = AppInputType.password,
       value = null,
       options = null,
       onSelected = null,
       onToggled = null,
       maxLines = 1;

  const AppInput.number({
    super.key,
    this.label,
    this.hint,
    this.controller,
    this.initialValue,
    this.onChanged,
    this.validator,
    this.enabled = true,
    this.readOnly = false,
    this.prefix,
    this.suffix,
    this.maxLength,
    this.textInputAction,
    this.onTap,
    this.onSubmitted,
    this.contentPadding,
    this.borderRadius = 12,
    this.focusNode,
    this.style,
    this.keyboardType,
    this.helperText,
    this.errorText,
    this.autovalidateMode,
  }) : type = AppInputType.number,
       value = null,
       options = null,
       onSelected = null,
       onToggled = null,
       maxLines = 1;

  const AppInput.phone({
    super.key,
    this.label,
    this.hint,
    this.controller,
    this.initialValue,
    this.onChanged,
    this.validator,
    this.enabled = true,
    this.readOnly = false,
    this.prefix,
    this.suffix,
    this.maxLength,
    this.textInputAction,
    this.onTap,
    this.onSubmitted,
    this.contentPadding,
    this.borderRadius = 12,
    this.focusNode,
    this.style,
    this.keyboardType,
    this.helperText,
    this.errorText,
    this.autovalidateMode,
  }) : type = AppInputType.phone,
       value = null,
       options = null,
       onSelected = null,
       onToggled = null,
       maxLines = 1;

  const AppInput.multiline({
    super.key,
    this.label,
    this.hint,
    this.controller,
    this.initialValue,
    this.onChanged,
    this.validator,
    this.enabled = true,
    this.readOnly = false,
    this.prefix,
    this.suffix,
    this.maxLines = 4,
    this.maxLength,
    this.textInputAction,
    this.onTap,
    this.onSubmitted,
    this.contentPadding,
    this.borderRadius = 12,
    this.focusNode,
    this.style,
    this.keyboardType,
    this.helperText,
    this.errorText,
    this.autovalidateMode,
  }) : type = AppInputType.multiline,
       value = null,
       options = null,
       onSelected = null,
       onToggled = null;

  const AppInput.search({
    super.key,
    this.label,
    this.hint,
    this.controller,
    this.initialValue,
    this.onChanged,
    this.validator,
    this.enabled = true,
    this.readOnly = false,
    this.prefix,
    this.suffix,
    this.maxLength,
    this.textInputAction,
    this.onTap,
    this.onSubmitted,
    this.contentPadding,
    this.borderRadius = 12,
    this.focusNode,
    this.style,
    this.keyboardType,
    this.helperText,
    this.errorText,
    this.autovalidateMode,
  }) : type = AppInputType.search,
       value = null,
       options = null,
       onSelected = null,
       onToggled = null,
       maxLines = 1;

  const AppInput.dropdown({
    super.key,
    this.label,
    this.hint,
    this.value,
    this.initialValue,
    required this.options,
    this.onSelected,
    this.enabled = true,
    this.style,
    this.contentPadding,
    this.borderRadius = 12,
    this.helperText,
    this.errorText,
  }) : type = AppInputType.dropdown,
       controller = null,
       onChanged = null,
       validator = null,
       onToggled = null,
       readOnly = false,
       prefix = null,
       suffix = null,
       maxLines = null,
       maxLength = null,
       textInputAction = null,
       onTap = null,
       onSubmitted = null,
       focusNode = null,
       keyboardType = null,
       autovalidateMode = null;

  const AppInput.checkbox({
    super.key,
    this.label,
    this.hint,
    required this.value,
    this.onToggled,
    this.enabled = true,
    this.errorText,
    this.helperText,
  }) : type = AppInputType.checkbox,
       controller = null,
       initialValue = null,
       options = null,
       onChanged = null,
       onSelected = null,
       validator = null,
       readOnly = false,
       prefix = null,
       suffix = null,
       maxLines = null,
       maxLength = null,
       textInputAction = null,
       onTap = null,
       onSubmitted = null,
       style = null,
       contentPadding = null,
       borderRadius = 12,
       focusNode = null,
       keyboardType = null,
       autovalidateMode = null;

  const AppInput.switchInput({
    super.key,
    this.label,
    this.hint,
    required this.value,
    this.onToggled,
    this.enabled = true,
    this.errorText,
    this.helperText,
  }) : type = AppInputType.switchInput,
       controller = null,
       initialValue = null,
       options = null,
       onChanged = null,
       onSelected = null,
       validator = null,
       readOnly = false,
       prefix = null,
       suffix = null,
       maxLines = null,
       maxLength = null,
       textInputAction = null,
       onTap = null,
       onSubmitted = null,
       style = null,
       contentPadding = null,
       borderRadius = 12,
       focusNode = null,
       keyboardType = null,
       autovalidateMode = null;

  const AppInput.date({
    super.key,
    this.label,
    this.hint,
    this.controller,
    this.initialValue,
    this.onChanged,
    this.validator,
    this.enabled = true,
    this.prefix,
    this.suffix,
    this.textInputAction,
    this.onTap,
    this.onSubmitted,
    this.contentPadding,
    this.borderRadius = 12,
    this.focusNode,
    this.style,
    this.keyboardType,
    this.helperText,
    this.errorText,
    this.autovalidateMode,
  }) : type = AppInputType.date,
       value = null,
       options = null,
       onSelected = null,
       onToggled = null,
       readOnly = true,
       maxLines = 1,
       maxLength = null;

  bool get _obscureText => type == AppInputType.password;

  TextInputType? get _keyboardType {
    if (keyboardType != null) return keyboardType;
    switch (type) {
      case AppInputType.email:
        return TextInputType.emailAddress;
      case AppInputType.number:
        return TextInputType.number;
      case AppInputType.phone:
        return TextInputType.phone;
      case AppInputType.multiline:
        return TextInputType.multiline;
      default:
        return TextInputType.text;
    }
  }

  @override
  State<AppInput<T>> createState() => _AppInputState<T>();
}

class _AppInputState<T> extends State<AppInput<T>> {
  late final FocusNode _focusNode = widget.focusNode ?? FocusNode();
  bool _hasFocus = false;
  late final TextEditingController _fallbackController;
  bool _obscureText = true;

  TextEditingController get _effectiveController {
    if (widget.controller != null) return widget.controller!;
    if (_fallbackController.text.isEmpty && widget.initialValue != null) {
      _fallbackController.text = widget.initialValue!;
    }
    return _fallbackController;
  }

  @override
  void initState() {
    super.initState();
    _fallbackController = TextEditingController(text: widget.initialValue ?? '');
    _focusNode.addListener(_onFocusChange);
    _obscureText = widget._obscureText;
  }

  void _onFocusChange() {
    if (mounted) setState(() => _hasFocus = _focusNode.hasFocus);
  }

  @override
  void dispose() {
    _focusNode.removeListener(_onFocusChange);
    if (widget.focusNode == null) _focusNode.dispose();
    if (widget.controller == null) _fallbackController.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final current = DateTime.tryParse(_effectiveController.text) ?? DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: current,
      firstDate: DateTime(1900),
      lastDate: DateTime(2100),
    );
    if (picked == null || !mounted) return;
    final text = '${picked.year.toString().padLeft(4, '0')}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}';
    _effectiveController.text = text;
    widget.onChanged?.call(text);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final effectiveLabel = widget.label;
    final effectiveError = widget.errorText;
    final hasError = effectiveError != null && effectiveError.isNotEmpty;

    final labelWidget = effectiveLabel != null
        ? Text(
            effectiveLabel,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: isDark ? AppColors.darkTextSecondary : const Color(0xFF475569),
            ),
          )
        : null;

    final helperText = widget.helperText;
    final helperWidget = helperText != null
        ? Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Text(
              helperText,
              style: TextStyle(
                fontSize: 12,
                color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
              ),
            ),
          )
        : null;

    final errorWidget = hasError
        ? Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Text(
              effectiveError,
              style: const TextStyle(fontSize: 12, color: AppColors.danger),
            ),
          )
        : null;

    Widget input;
    switch (widget.type) {
      case AppInputType.checkbox:
        input = _buildCheckbox(isDark);
        break;
      case AppInputType.switchInput:
        input = _buildSwitch(isDark);
        break;
      case AppInputType.dropdown:
        input = _buildDropdown(isDark);
        break;
      default:
        input = _buildTextField(theme, isDark, hasError);
        break;
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (widget.type != AppInputType.checkbox &&
            widget.type != AppInputType.switchInput &&
            labelWidget != null) ...[
          labelWidget,
          const SizedBox(height: 6),
        ],
        input,
        ?helperWidget,
        ?errorWidget,
      ],
    );
  }

  Widget _buildTextField(ThemeData theme, bool isDark, bool hasError) {
    final borderColor = hasError
        ? AppColors.danger
        : _hasFocus
            ? (isDark ? AppColors.primaryLight : AppColors.primary)
            : (isDark ? AppColors.darkBorder : AppColors.lightBorder);
    final borderWidth = _hasFocus || hasError ? 1.5 : 1.0;

    Widget? effectiveSuffix;
    if (widget.type == AppInputType.password) {
      effectiveSuffix = widget.suffix ??
          GestureDetector(
            onTap: () => setState(() => _obscureText = !_obscureText),
            child: Icon(
              _obscureText ? PhosphorIconsRegular.eyeSlash : PhosphorIconsRegular.eye,
              size: 20,
              color: _hasFocus ? AppColors.primary : theme.iconTheme.color,
            ),
          );
    } else {
      effectiveSuffix = widget.suffix;
    }

    Widget textField = TextFormField(
      controller: _effectiveController,
      focusNode: _focusNode,
      obscureText: _obscureText,
      keyboardType: widget._keyboardType,
      textInputAction: widget.textInputAction,
      maxLines: widget.type == AppInputType.multiline ? (widget.maxLines ?? 4) : 1,
      maxLength: widget.maxLength,
      enabled: widget.enabled,
      readOnly: widget.readOnly || widget.type == AppInputType.date,
      onTap: widget.type == AppInputType.date ? _pickDate : widget.onTap,
      onChanged: widget.onChanged,
      onFieldSubmitted: widget.onSubmitted,
      validator: widget.validator,
      autovalidateMode: widget.autovalidateMode,
      style: widget.style ?? TextStyle(
        color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
        fontSize: 14,
      ),
      decoration: InputDecoration(
        hintText: widget.hint,
        hintStyle: TextStyle(
          color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
        ),
        border: InputBorder.none,
        contentPadding: widget.contentPadding ?? const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        isDense: true,
      ),
    );

    return AnimatedContainer(
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
          if (widget.prefix != null) ...[
            const SizedBox(width: 12),
            IconTheme(
              data: IconThemeData(color: _hasFocus ? AppColors.primary : theme.iconTheme.color),
              child: widget.prefix!,
            ),
            const SizedBox(width: 8),
          ],
          Expanded(child: textField),
          if (effectiveSuffix != null) ...[
            const SizedBox(width: 8),
            effectiveSuffix,
            const SizedBox(width: 12),
          ],
        ],
      ),
    );
  }

  Widget _buildDropdown(bool isDark) {
    final borderColor = hasFieldError
        ? AppColors.danger
        : (isDark ? AppColors.darkBorder : AppColors.lightBorder);
    final effectiveValue = widget.value;
    final items = widget.options?.map((o) => DropdownMenuItem<T>(
      value: o.value as T?,
      child: o.child ?? Text(o.label),
    )).toList() ?? [];

    return Container(
      decoration: BoxDecoration(
        color: widget.enabled
            ? (isDark ? AppColors.darkSurface : Colors.white)
            : (isDark ? AppColors.darkBorder.withValues(alpha: 0.3) : const Color(0xFFF1F5F9)),
        borderRadius: BorderRadius.circular(widget.borderRadius),
        border: Border.all(color: borderColor, width: 1),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 12),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<T>(
          value: effectiveValue,
          isExpanded: true,
          borderRadius: BorderRadius.circular(widget.borderRadius),
          hint: widget.hint != null
              ? Text(
                  widget.hint!,
                  style: TextStyle(
                    color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                  ),
                )
              : null,
          icon: PhosphorIcon(PhosphorIconsRegular.caretDown,
            color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
          ),
          dropdownColor: isDark ? AppColors.darkSurface : Colors.white,
          style: TextStyle(
            color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
            fontSize: 14,
          ),
          items: items,
          onChanged: widget.enabled ? widget.onSelected : null,
        ),
      ),
    );
  }

  Widget _buildCheckbox(bool isDark) {
    final bool checked = (widget.value as bool?) ?? false;
    final targetColor = AppColors.primary;
    return MouseRegion(
      cursor: widget.enabled ? SystemMouseCursors.click : SystemMouseCursors.basic,
      child: GestureDetector(
        onTap: widget.enabled ? () => widget.onToggled?.call(!checked) : null,
        child: Row(
          children: [
            AnimatedContainer(
              duration: const Duration(milliseconds: 120),
              width: 22,
              height: 22,
              decoration: BoxDecoration(
                color: checked ? targetColor : Colors.transparent,
                borderRadius: BorderRadius.circular(6),
                border: Border.all(
                  color: checked
                      ? targetColor
                      : (isDark ? const Color(0xFF64748B) : const Color(0xFFCBD5E1)),
                  width: 2,
                ),
              ),
              child: checked
                  ? const Icon(Icons.check, size: 14, color: Colors.white)
                  : null,
            ),
            if (widget.label != null) ...[
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  widget.label!,
                  style: TextStyle(
                    fontSize: 14,
                    color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildSwitch(bool isDark) {
    final bool value = (widget.value as bool?) ?? false;
    final activeColor = AppColors.primary;
    final trackColor = value ? activeColor : (isDark ? const Color(0xFF475569) : const Color(0xFFD1D5DB));
    return MouseRegion(
      cursor: widget.enabled ? SystemMouseCursors.click : SystemMouseCursors.basic,
      child: GestureDetector(
        onTap: widget.enabled ? () => widget.onToggled?.call(!value) : null,
        child: Row(
          children: [
            if (widget.label != null)
              Expanded(
                child: Text(
                  widget.label!,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: isDark ? Colors.white : const Color(0xFF1E293B),
                  ),
                ),
              ),
            AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              width: 44,
              height: 26,
              decoration: BoxDecoration(
                color: trackColor,
                borderRadius: BorderRadius.circular(13),
              ),
              padding: const EdgeInsets.all(3),
              child: AnimatedAlign(
                duration: const Duration(milliseconds: 200),
                curve: Curves.easeInOut,
                alignment: value ? Alignment.centerRight : Alignment.centerLeft,
                child: Container(
                  width: 20,
                  height: 20,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.15),
                        blurRadius: 2,
                        offset: const Offset(0, 1),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  bool get hasFieldError {
    final effectiveError = widget.errorText;
    return effectiveError != null && effectiveError.isNotEmpty;
  }
}
