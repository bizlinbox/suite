import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'core/di.dart';
import 'core/services/local_notification_service.dart';
import 'core/theme/app_theme.dart';
import 'data/repositories/conversation_repository.dart';
import 'router.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await setupDependencies();

  runApp(const MyApp());
}

class MyApp extends StatefulWidget {
  const MyApp({super.key});

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  late final GoRouter _router;
  StreamSubscription? _tapSub;
  StreamSubscription? _replySub;

  @override
  void initState() {
    super.initState();
    _router = createRouter();
    _listenToLocalNotifications();
  }

  void _listenToLocalNotifications() {
    final localNotifications = locator<LocalNotificationService>();

    // Handle notification tap -> navigate to chat
    _tapSub = localNotifications.onTap.listen((payload) {
      _router.go('/dashboard/inbox/${payload.conversationId}');
    });

    // Handle quick reply -> send message
    _replySub = localNotifications.onReply.listen((data) async {
      final conversationId = data['conversationId'];
      final reply = data['reply'];
      if (conversationId != null && reply != null && reply.isNotEmpty) {
        final repo = locator<ConversationRepository>();
        await repo.sendMessage(conversationId, reply);
      }
    });
  }

  @override
  void dispose() {
    _tapSub?.cancel();
    _replySub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final overlayStyle = SystemUiOverlayStyle(
      statusBarColor: Colors.white,
      statusBarIconBrightness: Brightness.dark,
      systemNavigationBarColor: Colors.white,
      systemNavigationBarIconBrightness: Brightness.dark,
      systemNavigationBarDividerColor: Colors.transparent,
    );
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: overlayStyle,
      child: MaterialApp.router(
        title: 'BizlInbox',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.lightTheme.copyWith(
          scaffoldBackgroundColor: Colors.white,
          appBarTheme: AppTheme.lightTheme.appBarTheme.copyWith(
            systemOverlayStyle: overlayStyle,
          ),
        ),
        themeMode: ThemeMode.light,
        routerConfig: _router,
      ),
    );
  }
}

