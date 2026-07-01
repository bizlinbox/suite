import 'package:flutter/material.dart';

class HelpScreen extends StatelessWidget {
  const HelpScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Help')),
      body: const Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Help & Support', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            SizedBox(height: 12),
            Text('For support, please contact your administrator or visit the documentation.'),
            SizedBox(height: 16),
            Card(
              child: ListTile(
                leading: Icon(Icons.email),
                title: Text('Contact Support'),
                subtitle: Text('support@bizlinbox.com'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
