import 'package:flutter/material.dart';
import '../core/theme.dart';

class SnagScreen extends StatelessWidget {
  const SnagScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final snags = [
      {
        'id': 'SNAG-0024',
        'title': 'Missing 40mm Cover Blocks on Column C-12',
        'severity': 'CRITICAL',
        'location': 'Tower A, Floor 8',
        'status': 'OPEN'
      },
      {
        'id': 'SNAG-0025',
        'title': 'Cold Water Pipe Pressure Drop in Shaft 3',
        'severity': 'MAJOR',
        'location': 'Tower B, Shaft 3',
        'status': 'IN_PROGRESS'
      },
    ];

    return Scaffold(
      appBar: AppBar(
        title: const Text('eSnagging Observations'),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {},
        backgroundColor: SiteOpsTheme.primaryRed,
        icon: const Icon(Icons.add_a_photo, color: Colors.white),
        label: const Text('Log Snag', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: snags.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (context, index) {
          final s = snags[index];
          final isCritical = s['severity'] == 'CRITICAL';

          return Card(
            elevation: 0,
            color: Colors.white,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
              side: const BorderSide(color: Color(0xFFE2E8F0)),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.between,
                    children: [
                      Text(s['id']!, style: const TextStyle(fontFamily: 'monospace', fontWeight: FontWeight.bold, fontSize: 12)),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: isCritical ? const Color(0xFFFEE2E2) : const Color(0xFFFEF3C7),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          s['severity']!,
                          style: TextStyle(
                            color: isCritical ? SiteOpsTheme.primaryRed : const Color(0xFFB45309),
                            fontWeight: FontWeight.bold,
                            fontSize: 10,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(s['title']!, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.pin_drop, size: 14, color: SiteOpsTheme.textMuted),
                      const SizedBox(width: 4),
                      Text(s['location']!, style: const TextStyle(color: SiteOpsTheme.textMuted, fontSize: 12)),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
