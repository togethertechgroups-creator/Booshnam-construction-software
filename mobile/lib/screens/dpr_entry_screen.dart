import 'package:flutter/material.dart';
import '../core/theme.dart';

class DPREntryScreen extends StatefulWidget {
  const DPREntryScreen({super.key});

  @override
  State<DPREntryScreen> createState() => _DPREntryScreenState();
}

class _DPREntryScreenState extends State<DPREntryScreen> {
  final _workSummaryController = TextEditingController(
    text: 'Fixed reinforcement rebar mesh for Floor 9 slab. Concrete pump pipeline connected.',
  );
  int _headcount = 38;
  bool _isSubmitted = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Quick DPR Entry'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Weather & Manpower row
            Row(
              children: [
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: const Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Weather', style: TextStyle(color: SiteOpsTheme.textMuted, fontSize: 11)),
                        SizedBox(height: 2),
                        Text('Clear 30°C', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Labor On Site', style: TextStyle(color: SiteOpsTheme.textMuted, fontSize: 11)),
                        const SizedBox(height: 2),
                        Text('$_headcount Workers', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Work Summary Field
            const Text('Work Completed Today', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
            const SizedBox(height: 6),
            TextField(
              controller: _workSummaryController,
              maxLines: 5,
              style: const TextStyle(fontSize: 14),
              decoration: InputDecoration(
                fillColor: Colors.white,
                filled: true,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                ),
                hintText: 'Describe activities executed on site today...',
              ),
            ),
            const SizedBox(height: 20),

            // Camera attachments placeholder
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.camera_alt_outlined, color: SiteOpsTheme.primaryRed),
                  SizedBox(width: 8),
                  Text('Attach Geo-tagged Site Photos (2 Added)', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                ],
              ),
            ),
            const SizedBox(height: 32),

            if (!_isSubmitted)
              ElevatedButton(
                onPressed: () {
                  setState(() {
                    _isSubmitted = true;
                  });
                },
                child: const Text('SUBMIT DPR FOR PM REVIEW'),
              )
            else
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFFECFDF5),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: SiteOpsTheme.emeraldGreen),
                ),
                child: const Center(
                  child: Text(
                    'DPR Logged & Queued for Cloud Sync!',
                    style: TextStyle(fontWeight: FontWeight.bold, color: SiteOpsTheme.emeraldGreen),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
