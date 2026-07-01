import 'package:flutter/material.dart';

/// Breakpoints shared across the app so every screen adapts consistently.
class Breakpoints {
  static const double mobile = 768;
  static const double tablet = 1024;
  static const double desktop = 1440;
}

/// Convenience helpers around [MediaQuery] width.
class Responsive {
  static bool isMobile(BuildContext context) =>
      MediaQuery.of(context).size.width < Breakpoints.mobile;

  static bool isTablet(BuildContext context) {
    final w = MediaQuery.of(context).size.width;
    return w >= Breakpoints.mobile && w < Breakpoints.tablet;
  }

  static bool isDesktop(BuildContext context) =>
      MediaQuery.of(context).size.width >= Breakpoints.tablet;

  /// Number of grid columns to use for the available width.
  static int columnsFor(BuildContext context, {int mobileColumns = 1, int tabletColumns = 2, int desktopColumns = 3}) {
    final w = MediaQuery.of(context).size.width;
    if (w >= Breakpoints.tablet) return desktopColumns;
    if (w >= Breakpoints.mobile) return tabletColumns;
    return mobileColumns;
  }
}

/// Centers its [child] with a maximum content width so forms and detail
/// panels don't stretch edge-to-edge on very wide desktop windows.
///
/// On mobile the child takes the full available width.
class CenteredMaxWidth extends StatelessWidget {
  final Widget child;
  final double maxWidth;
  final EdgeInsetsGeometry padding;

  const CenteredMaxWidth({
    super.key,
    required this.child,
    this.maxWidth = 720,
    this.padding = EdgeInsets.zero,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: padding,
      child: Center(
        child: ConstrainedBox(
          constraints: BoxConstraints(maxWidth: maxWidth),
          child: child,
        ),
      ),
    );
  }
}

/// A responsive grid that lays out [children] in columns whose count adapts
/// to the available width. Uses [LayoutBuilder] so it respects the actual
/// width available (e.g. after the sidebar is removed), not the full screen.
class ResponsiveGrid extends StatelessWidget {
  final List<Widget> children;
  final double spacing;
  final double runSpacing;
  final int mobileColumns;
  final int tabletColumns;
  final int desktopColumns;

  const ResponsiveGrid({
    super.key,
    required this.children,
    this.spacing = 12,
    this.runSpacing = 12,
    this.mobileColumns = 1,
    this.tabletColumns = 2,
    this.desktopColumns = 3,
  });

  int _columnsForWidth(double width) {
    if (width >= Breakpoints.tablet) return desktopColumns;
    if (width >= Breakpoints.mobile) return tabletColumns;
    return mobileColumns;
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final columns = _columnsForWidth(constraints.maxWidth);
        final itemWidth =
            ((constraints.maxWidth - spacing * (columns - 1)) / columns)
                .clamp(0.0, double.infinity);
        return Wrap(
          spacing: spacing,
          runSpacing: runSpacing,
          children: children
              .map((item) => SizedBox(width: itemWidth, child: item))
              .toList(),
        );
      },
    );
  }
}
