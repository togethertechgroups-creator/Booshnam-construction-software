import 'package:flutter/material.dart';
import 'core/theme.dart';
import 'screens/attendance_screen.dart';
import 'screens/dpr_entry_screen.dart';
import 'screens/snag_screen.dart';

void main() {
  runApp(const SiteOpsMobileApp());
}

class SiteOpsMobileApp extends StatelessWidget {
  const SiteOpsMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SiteOps Mobile',
      debugShowCheckedModeBanner: false,
      theme: SiteOpsTheme.lightTheme,
      home: const MainMobileNavigation(),
    );
  }
}

class MainMobileNavigation extends StatefulWidget {
  const MainMobileNavigation({super.key});

  @override
  State<MainMobileNavigation> createState() => _MainMobileNavigationState();
}

class _MainMobileNavigationState extends State<MainMobileNavigation> {
  int _currentIndex = 0;

  final List<Widget> _screens = const [
    AttendanceScreen(),
    DPREntryScreen(),
    SnagScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _screens[_currentIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.location_on_outlined),
            activeIcon: Icon(Icons.location_on),
            label: 'Attendance',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.assignment_outlined),
            activeIcon: Icon(Icons.assignment),
            label: 'DPR Log',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.camera_alt_outlined),
            activeIcon: Icon(Icons.camera_alt),
            label: 'Snags',
          ),
        ],
      ),
    );
  }
}
