from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.core.models import Organization, Role, RolePermission, ModuleChoices
from apps.projects.models import Project
from apps.workforce.models import calculate_haversine_distance
from apps.procurement.models import PurchaseOrder, GoodsReceiptNote, Invoice, Vendor

User = get_user_model()

class SiteOpsCoreTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.org1 = Organization.objects.create(name="Org One", slug="org-one")
        self.org2 = Organization.objects.create(name="Org Two", slug="org-two")

        self.role_pm = Role.objects.create(organization=self.org1, name="PM", code=Role.RoleCode.PROJECT_MANAGER)
        self.role_client = Role.objects.create(organization=self.org1, name="Client", code=Role.RoleCode.CLIENT)

        self.user_pm = User.objects.create_user(
            username="pm1", email="pm1@test.com", password="Password123!",
            organization=self.org1, active_role=self.role_pm
        )
        self.user_client = User.objects.create_user(
            username="client1", email="client1@test.com", password="Password123!",
            organization=self.org1, active_role=self.role_client
        )

        self.project_org1 = Project.objects.create(
            organization=self.org1,
            code="PRJ-101",
            name="Project Org 1",
            client_name="Client A",
            start_date="2026-01-01",
            expected_end_date="2026-12-31",
            estimated_budget=Decimal("5000000.00"),
            actual_cost=Decimal("1200000.00")
        )

        from apps.projects.models import ProjectMember
        ProjectMember.objects.create(
            organization=self.org1,
            project=self.project_org1,
            user=self.user_client,
            project_role="Client Viewer"
        )

        self.project_org2 = Project.objects.create(
            organization=self.org2,
            code="PRJ-201",
            name="Project Org 2",
            client_name="Client B",
            start_date="2026-01-01",
            expected_end_date="2026-12-31",
            estimated_budget=Decimal("9000000.00"),
            actual_cost=Decimal("4000000.00")
        )

    def test_multi_tenancy_isolation(self):
        """Ensure users in Org 1 cannot see projects belonging to Org 2"""
        self.client.force_authenticate(user=self.user_pm)
        response = self.client.get("/api/v1/projects/")
        self.assertEqual(response.status_code, 200)
        project_codes = [p["code"] for p in response.data.get("results", response.data)]
        self.assertIn("PRJ-101", project_codes)
        self.assertNotIn("PRJ-201", project_codes)

    def test_field_level_cost_masking_for_client(self):
        """Client role should NOT receive estimated_budget or actual_cost in representation"""
        self.client.force_authenticate(user=self.user_client)
        response = self.client.get(f"/api/v1/projects/{self.project_org1.id}/")
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("estimated_budget", response.data)
        self.assertNotIn("actual_cost", response.data)

    def test_geofence_haversine_distance(self):
        """Test GPS distance formula between site center and clock-in coordinates"""
        # Center of site: 12.971600, 77.594600
        # Clock in nearby: 12.971650, 77.594680 (~10-15m)
        dist_near = calculate_haversine_distance(12.971600, 77.594600, 12.971650, 77.594680)
        self.assertLess(dist_near, 25.0)

        # Far away point (several kilometers away)
        dist_far = calculate_haversine_distance(12.971600, 77.594600, 13.035800, 77.597000)
        self.assertGreater(dist_far, 5000.0)

    def test_procurement_3way_matching(self):
        """Test 3-way match verification endpoint on Invoice"""
        vendor = Vendor.objects.create(organization=self.org1, name="Test Vendor", code="V-01")
        po = PurchaseOrder.objects.create(
            organization=self.org1,
            project=self.project_org1,
            vendor=vendor,
            po_number="PO-TEST-1",
            order_date="2026-03-01",
            expected_delivery_date="2026-03-10",
            total_amount=Decimal("100000.00")
        )
        grn = GoodsReceiptNote.objects.create(
            organization=self.org1,
            purchase_order=po,
            project=self.project_org1,
            challan_number="CH-01",
            receipt_date="2026-03-05",
            status=GoodsReceiptNote.Status.INSPECTED
        )
        invoice = Invoice.objects.create(
            organization=self.org1,
            purchase_order=po,
            grn=grn,
            project=self.project_org1,
            vendor=vendor,
            invoice_number="INV-TEST-1",
            vendor_invoice_ref="V-INV-99",
            invoice_date="2026-03-06",
            due_date="2026-04-06",
            subtotal=Decimal("85000.00"),
            total_amount=Decimal("100000.00"),
            match_status=Invoice.MatchStatus.PENDING
        )

        self.client.force_authenticate(user=self.user_pm)
        resp = self.client.post(f"/api/v1/procurement/invoices/{invoice.id}/verify_3way_match/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["match_status"], Invoice.MatchStatus.MATCHED)
