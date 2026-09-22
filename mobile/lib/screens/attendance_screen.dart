import 'package:flutter/material.dart';
import '../core/theme.dart';

class AttendanceScreen extends StatefulWidget {
  const AttendanceScreen({super.key});

  @override
  State<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends State<AttendanceScreen> {
  bool _isClockedIn = false;
  double _distanceMeters = 14.5;
  final double _allowedRadius = 300.0;
  String _statusMessage = 'GPS Site Radar Ready';

  void _handleClockIn() {
    setState(() {
      _isClockedIn = true;
      _statusMessage = 'Clock-in Verified at 08:15 AM (14.5m from Site Center)';
    });
  }

  @override
  Widget build(BuildContext context) {
    final isInside = _distanceMeters <= _allowedRadius;

    return Scaffold(
      appBar: AppBar(
        title: const Text('GPS Site Attendance'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Project Location Card
            Card(
              elevation: 0,
              color: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
                side: const BorderSide(color: Color(0xFFE2E8F0)),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  children: [
                    const Icon(Icons.location_on, color: SiteOpsTheme.primaryRed, size: 36),
                    const SizedBox(height: 8),
                    const Text(
                      'Skyline Commercial Towers',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Allowed Radius: ${_allowedRadius.toInt()}m Geofence',
                      style: const TextStyle(color: SiteOpsTheme.textMuted, fontSize: 12),
                    ),
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: isInside ? const Color(0xFFECFDF5) : const Color(0xFFFEF2F2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        isInside 
                          ? 'Inside Geofence (${_distanceMeters.toStringAsFixed(1)}m from center)' 
                          : 'Outside Geofence (${_distanceMeters.toStringAsFixed(1)}m from center)',
                        style: TextStyle(
                          color: isInside ? SiteOpsTheme.emeraldGreen : SiteOpsTheme.primaryRed,
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const Spacer(),

            // Big Action Button (Gloved / Outdoor touch friendly)
            if (!_isClockedIn)
              ElevatedButton.icon(
                onPressed: _handleClockIn,
                icon: const Icon(Icons.touch_app, size: 28),
                label: const Text(
                  'CLOCK IN NOW (GPS)',
                  style: TextStyle(letterSpacing: 1.0),
                ),
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size.fromHeight(68),
                ),
              )
            else
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: const Color(0xFFECFDF5),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.Border.all(color: SiteOpsTheme.emeraldGreen),
                ),
                child: Column(
                  children: [
                    const Icon(Icons.check_circle, color: SiteOpsTheme.emeraldGreen, size: 48),
                    const SizedBox(height: 8),
                    const Text(
                      'Clocked In Successfully',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: SiteOpsTheme.darkCharcoal),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _statusMessage,
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontSize: 12, color: Color(0xFF047857)),
                    ),
                  ],
                ),
              ),

            const SizedBox(height: 16),
            const Center(
              child: Text(
                'Attendance records sync automatically with DRF backend.',
                style: TextStyle(color: SiteOpsTheme.textMuted, fontSize: 11),
              ),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }
}
