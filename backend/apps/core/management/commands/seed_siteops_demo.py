import os
from datetime import date, timedelta, time
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model

from apps.core.models import Organization, Role, RolePermission, ModuleChoices, AuditLog
from apps.projects.models import Project, ProjectMember, WBSTask, Drawing
from apps.budget.models import BudgetCategory, CostPlanItem, ChangeOrder
from apps.procurement.models import (
    Vendor, MaterialRequest, MaterialRequestItem, PurchaseOrder,
    PurchaseOrderItem, GoodsReceiptNote, GRNItem, Invoice,
    VendorLedgerEntry, StockItem
)
from apps.workforce.models import Worker, AttendanceRecord, PayrollBatch, PayrollItem
from apps.equipment.models import Asset, EquipmentAllocation
from apps.site_ops.models import DailyProgressReport, DPRManpower, DPRMaterialConsumed, Snag
from apps.approvals.models import ApprovalPolicy, ApprovalRequest, ApprovalActionLog
from apps.documents.models import DocumentFolder, ProjectDocument
from apps.crm.models import Lead, LeadActivity

User = get_user_model()

class Command(BaseCommand):
    help = "Seed SiteOps with complete enterprise construction dataset modeled on Onsite Teams"

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Initializing SiteOps demo seed..."))

        # 1. Organization
        org, _ = Organization.objects.get_or_create(
            slug="apex-builders",
            defaults={
                "name": "Apex Builders & Infrastructure Ltd.",
                "registration_no": "U45200KA2018PTC112345",
                "address": "Level 6, Tech Park Towers, Whitefield, Bengaluru - 560066",
                "phone": "+91 80 4123 9800",
                "email": "hq@apexbuilders.io",
                "currency": "INR",
                "is_active": True,
            }
        )
        self.stdout.write(self.style.SUCCESS(f"Organization: {org.name}"))

        # 2. Roles & Permissions
        role_definitions = [
            ("Super Admin", Role.RoleCode.SUPER_ADMIN, "Full system and organization administration", 50000000),
            ("Owner / Director", Role.RoleCode.OWNER, "Company executive and portfolio owner", 25000000),
            ("Project Manager (PM)", Role.RoleCode.PROJECT_MANAGER, "Project lifecycle & budget lead", 500000),
            ("Site Engineer / Supervisor", Role.RoleCode.SITE_ENGINEER, "Daily site operations & progress logging", 25000),
            ("Finance / Accounts", Role.RoleCode.FINANCE, "Invoices, cashflow, and vendor disbursements", 5000000),
            ("Procurement / Purchase Officer", Role.RoleCode.PROCUREMENT, "Vendor quotes, POs, and supply orders", 200000),
            ("Store / Warehouse Keeper", Role.RoleCode.STORE_KEEPER, "Inventory receipt (GRN) and material dispatch", 0),
            ("Labor / Site Staff", Role.RoleCode.LABOR, "Field labor clock-in and work tasks", 0),
            ("Subcontractor", Role.RoleCode.SUBCONTRACTOR, "Specialist trade contractor scope", 0),
            ("Client / Customer (Viewer)", Role.RoleCode.CLIENT, "Client owner milestone & photo portal", 0),
            ("Auditor (View-only)", Role.RoleCode.AUDITOR, "Read-only compliance & audit trails", 0),
        ]

        roles = {}
        for name, code, desc, limit in role_definitions:
            r, _ = Role.objects.get_or_create(
                organization=org,
                code=code,
                defaults={"name": name, "description": desc, "is_system_role": True}
            )
            roles[code] = r

            # Setup permissions across modules
            for mod in ModuleChoices.values:
                can_view = True
                can_create = code in [Role.RoleCode.SUPER_ADMIN, Role.RoleCode.OWNER, Role.RoleCode.PROJECT_MANAGER]
                can_edit = can_create
                can_delete = code in [Role.RoleCode.SUPER_ADMIN, Role.RoleCode.OWNER]
                can_approve = code in [Role.RoleCode.SUPER_ADMIN, Role.RoleCode.OWNER, Role.RoleCode.PROJECT_MANAGER, Role.RoleCode.FINANCE]

                if code == Role.RoleCode.SITE_ENGINEER and mod in ["SITE_OPS", "SNAGS", "WORKFORCE", "PROCUREMENT"]:
                    can_create = True
                    can_edit = True
                elif code == Role.RoleCode.FINANCE and mod in ["BUDGET", "PROCUREMENT"]:
                    can_create = True
                    can_edit = True
                    can_approve = True
                elif code == Role.RoleCode.PROCUREMENT and mod == "PROCUREMENT":
                    can_create = True
                    can_edit = True
                elif code in [Role.RoleCode.CLIENT, Role.RoleCode.AUDITOR]:
                    can_create = can_edit = can_delete = can_approve = False

                RolePermission.objects.update_or_create(
                    role=r,
                    module=mod,
                    defaults={
                        "organization": org,
                        "can_view": can_view,
                        "can_create": can_create,
                        "can_edit": can_edit,
                        "can_delete": can_delete,
                        "can_approve": can_approve,
                        "approval_limit": Decimal(limit),
                    }
                )

        # 3. Users for each primary persona
        users_data = [
            ("admin@siteops.io", "admin", "Arjun", "Reddy", Role.RoleCode.SUPER_ADMIN, True, False),
            ("owner@siteops.io", "vikram", "Vikramaditya", "Singhania", Role.RoleCode.OWNER, False, False),
            ("pm@siteops.io", "rajesh", "Rajesh", "Kumar", Role.RoleCode.PROJECT_MANAGER, False, False),
            ("site@siteops.io", "arun", "Arun", "Verma", Role.RoleCode.SITE_ENGINEER, False, True),
            ("finance@siteops.io", "priya", "Priya", "Sharma", Role.RoleCode.FINANCE, False, False),
            ("procure@siteops.io", "karthik", "Karthik", "Nair", Role.RoleCode.PROCUREMENT, False, False),
            ("store@siteops.io", "ramesh", "Ramesh", "Patel", Role.RoleCode.STORE_KEEPER, False, True),
            ("client@siteops.io", "aditya", "Aditya", "Birla (Rep)", Role.RoleCode.CLIENT, False, False),
        ]

        users = {}
        for email, uname, fn, ln, r_code, is_admin, is_worker in users_data:
            u = User.objects.filter(email=email).first()
            if not u:
                u = User.objects.create_user(
                    username=uname,
                    email=email,
                    password="Password123!",
                    first_name=fn,
                    last_name=ln,
                    organization=org,
                    active_role=roles[r_code],
                    is_org_admin=is_admin,
                    is_site_worker=is_worker
                )
            else:
                u.organization = org
                u.active_role = roles[r_code]
                u.save()
            users[r_code] = u

        # 4. Projects
        p1, _ = Project.objects.update_or_create(
            code="PRJ-001",
            organization=org,
            defaults={
                "name": "Skyline Commercial Towers",
                "client_name": "Prestige Horizon Estates",
                "project_type": Project.ProjectType.COMMERCIAL,
                "location": "ITPL Main Road, Whitefield, Bengaluru",
                "latitude": Decimal("12.971600"),
                "longitude": Decimal("77.594600"),
                "geofence_radius_meters": 300,
                "start_date": date.today() - timedelta(days=120),
                "expected_end_date": date.today() + timedelta(days=240),
                "estimated_budget": Decimal("185000000.00"),
                "actual_cost": Decimal("72400000.00"),
                "progress_percentage": Decimal("44.50"),
                "status": Project.Status.ACTIVE,
                "description": "Twin 18-storey Grade-A commercial office towers with double basement parking and IGBC Gold certification."
            }
        )

        p2, _ = Project.objects.update_or_create(
            code="PRJ-002",
            organization=org,
            defaults={
                "name": "Greenfield Luxury Villas Phase 2",
                "client_name": "Salarpuria Luxury Living",
                "project_type": Project.ProjectType.RESIDENTIAL,
                "location": "Sarjapur-Outer Ring Road Corridor, Bengaluru",
                "latitude": Decimal("12.910000"),
                "longitude": Decimal("77.680000"),
                "geofence_radius_meters": 250,
                "start_date": date.today() - timedelta(days=210),
                "expected_end_date": date.today() + timedelta(days=90),
                "estimated_budget": Decimal("68000000.00"),
                "actual_cost": Decimal("41200000.00"),
                "progress_percentage": Decimal("68.00"),
                "status": Project.Status.ACTIVE,
                "description": "32 bespoke 4BHK triplex luxury villas with private gardens and clubhouse."
            }
        )

        p3, _ = Project.objects.update_or_create(
            code="PRJ-003",
            organization=org,
            defaults={
                "name": "Metro Viaduct Elevated Section P4",
                "client_name": "Bangalore Metro Rail Corporation (BMRCL)",
                "project_type": Project.ProjectType.INFRASTRUCTURE,
                "location": "Hebbal Outer Ring Road, Bengaluru",
                "latitude": Decimal("13.035800"),
                "longitude": Decimal("77.597000"),
                "geofence_radius_meters": 500,
                "start_date": date.today() - timedelta(days=30),
                "expected_end_date": date.today() + timedelta(days=550),
                "estimated_budget": Decimal("340000000.00"),
                "actual_cost": Decimal("24500000.00"),
                "progress_percentage": Decimal("8.50"),
                "status": Project.Status.ACTIVE,
                "description": "4.2 km elevated viaduct with 3 stations, including cast-in-situ pier caps and precast U-girders."
            }
        )

        # Team assignments
        ProjectMember.objects.get_or_create(organization=org, project=p1, user=users[Role.RoleCode.PROJECT_MANAGER], defaults={"project_role": "Senior PM", "is_primary_pm": True})
        ProjectMember.objects.get_or_create(organization=org, project=p1, user=users[Role.RoleCode.SITE_ENGINEER], defaults={"project_role": "Site Incharge", "is_primary_pm": False})
        ProjectMember.objects.get_or_create(organization=org, project=p1, user=users[Role.RoleCode.STORE_KEEPER], defaults={"project_role": "Store Incharge", "is_primary_pm": False})
        ProjectMember.objects.get_or_create(organization=org, project=p1, user=users[Role.RoleCode.CLIENT], defaults={"project_role": "Client Representative", "is_primary_pm": False})

        # 5. WBS Tasks
        tasks_data = [
            ("1.0", "Substructure & Piling", date.today() - timedelta(days=120), date.today() - timedelta(days=70), 100, WBSTask.TaskStatus.COMPLETED, True),
            ("1.1", "Bored Cast-In-Situ Piles", date.today() - timedelta(days=120), date.today() - timedelta(days=90), 100, WBSTask.TaskStatus.COMPLETED, False),
            ("1.2", "Raft Foundation Casting M40", date.today() - timedelta(days=89), date.today() - timedelta(days=70), 100, WBSTask.TaskStatus.COMPLETED, False),
            ("2.0", "Superstructure RCC Works", date.today() - timedelta(days=69), date.today() + timedelta(days=60), 55, WBSTask.TaskStatus.IN_PROGRESS, False),
            ("2.1", "Tower A - Columns & Core Walls L1-L8", date.today() - timedelta(days=69), date.today() - timedelta(days=10), 100, WBSTask.TaskStatus.COMPLETED, False),
            ("2.2", "Tower A - Post-Tensioned Slab Floor 9", date.today() - timedelta(days=9), date.today() + timedelta(days=12), 40, WBSTask.TaskStatus.IN_PROGRESS, False),
            ("2.3", "Tower B - Columns Floor 6", date.today() - timedelta(days=5), date.today() + timedelta(days=18), 25, WBSTask.TaskStatus.IN_PROGRESS, False),
            ("3.0", "Masonry & Plastering", date.today() - timedelta(days=20), date.today() + timedelta(days=90), 30, WBSTask.TaskStatus.IN_PROGRESS, False),
            ("3.1", "AAC Block Masonry Floor 1 to 4", date.today() - timedelta(days=20), date.today() + timedelta(days=30), 65, WBSTask.TaskStatus.IN_PROGRESS, False),
            ("4.0", "Façade & Curtain Wall Glazing", date.today() + timedelta(days=40), date.today() + timedelta(days=150), 0, WBSTask.TaskStatus.TODO, True),
        ]

        for wbs, title, s_dt, e_dt, prog, st, mile in tasks_data:
            WBSTask.objects.get_or_create(
                organization=org,
                project=p1,
                wbs_code=wbs,
                defaults={
                    "title": title,
                    "start_date": s_dt,
                    "end_date": e_dt,
                    "duration_days": (e_dt - s_dt).days,
                    "progress_percentage": Decimal(prog),
                    "status": st,
                    "is_milestone": mile,
                    "assigned_to": users[Role.RoleCode.SITE_ENGINEER]
                }
            )

        # 6. Budget Categories & BOQ Items
        cat_mat, _ = BudgetCategory.objects.get_or_create(organization=org, code="CAT-MAT", defaults={"name": "Raw Materials", "category_type": BudgetCategory.CategoryType.MATERIAL})
        cat_lab, _ = BudgetCategory.objects.get_or_create(organization=org, code="CAT-LAB", defaults={"name": "Site Labor & Subcontract", "category_type": BudgetCategory.CategoryType.LABOR})
        cat_eqp, _ = BudgetCategory.objects.get_or_create(organization=org, code="CAT-EQP", defaults={"name": "Plant & Machinery", "category_type": BudgetCategory.CategoryType.EQUIPMENT})
        cat_ovh, _ = BudgetCategory.objects.get_or_create(organization=org, code="CAT-OVH", defaults={"name": "Site Overheads & Admin", "category_type": BudgetCategory.CategoryType.OVERHEAD})

        boq_data = [
            (cat_mat, "BOQ-01", "Fe500D TMT Reinforcement Steel", "MT", 1200, 68000, 580, 39440000),
            (cat_mat, "BOQ-02", "Ready Mix Concrete M40 Grade", "CUM", 4500, 5200, 2100, 10920000),
            (cat_mat, "BOQ-03", "AAC Lightweight Blocks 600x200x150mm", "CUM", 800, 3100, 320, 992000),
            (cat_lab, "BOQ-04", "Structural Shuttering & Bar Bending Gang", "SQFT", 120000, 48, 54000, 2592000),
            (cat_eqp, "BOQ-05", "Tower Crane 25T Operation & Rental", "MONTHS", 12, 280000, 4, 1120000),
            (cat_ovh, "BOQ-06", "Site Office, Electricity & Quality Testing", "MONTHS", 12, 120000, 4, 480000),
        ]

        for cat, code, desc, unit, p_qty, p_rate, a_qty, a_amt in boq_data:
            CostPlanItem.objects.get_or_create(
                organization=org,
                project=p1,
                item_code=code,
                defaults={
                    "category": cat,
                    "description": desc,
                    "unit": unit,
                    "planned_quantity": Decimal(p_qty),
                    "planned_rate": Decimal(p_rate),
                    "planned_amount": Decimal(p_qty * p_rate),
                    "actual_quantity": Decimal(a_qty),
                    "actual_amount": Decimal(a_amt),
                }
            )

        # Change Order
        ChangeOrder.objects.get_or_create(
            organization=org,
            project=p1,
            order_number="CO-001",
            defaults={
                "title": "Upgrade Basement Raft Concrete from M35 to M40 with Waterproofing Admixture",
                "description": "High water table encountered during excavation; structural consultant mandated M40 with integral crystalline waterproofing.",
                "reason": ChangeOrder.Reason.SITE_CONDITION,
                "cost_impact": Decimal("1850000.00"),
                "schedule_impact_days": 7,
                "status": ChangeOrder.Status.APPROVED,
                "requested_by": users[Role.RoleCode.PROJECT_MANAGER],
                "approved_by": users[Role.RoleCode.OWNER],
                "approved_at": timezone.now() - timedelta(days=45)
            }
        )

        # 7. Vendors
        v1, _ = Vendor.objects.get_or_create(
            organization=org,
            code="VEND-001",
            defaults={
                "name": "Tata Tiscon Rebars Corporation",
                "contact_person": "Sanjay Deshmukh",
                "phone": "+91 98450 11223",
                "email": "orders@tatatiscon-distrib.com",
                "tax_id": "29AAACT2876G1ZU",
                "address": "Peenya Industrial Area, Bengaluru",
                "current_balance": Decimal("1450000.00"),
                "rating": Decimal("4.8")
            }
        )

        v2, _ = Vendor.objects.get_or_create(
            organization=org,
            code="VEND-002",
            defaults={
                "name": "UltraTech Concrete Solutions",
                "contact_person": "Manish Tiwari",
                "phone": "+91 99800 44556",
                "email": "sales.blr@ultratechrmc.com",
                "tax_id": "29AAACU9912A1ZX",
                "address": "Hosur Road Batching Plant, Bengaluru",
                "current_balance": Decimal("880000.00"),
                "rating": Decimal("4.9")
            }
        )

        # 8. Complete Procurement 7-Step Demonstration Flow
        mr1, _ = MaterialRequest.objects.get_or_create(
            organization=org,
            request_number="MR-0012",
            defaults={
                "project": p1,
                "requested_by": users[Role.RoleCode.SITE_ENGINEER],
                "needed_by_date": date.today() + timedelta(days=5),
                "status": MaterialRequest.Status.APPROVED,
                "priority": "URGENT",
                "total_estimated_cost": Decimal("2720000.00"),
                "site_notes": "40 MT Fe500D 16mm and 20mm rebars required for Floor 9 slab casting schedule."
            }
        )

        MaterialRequestItem.objects.get_or_create(
            organization=org,
            material_request=mr1,
            item_name="16mm TMT Fe500D Rebars",
            defaults={"unit": "MT", "quantity": Decimal("25.00"), "estimated_rate": Decimal("68000.00"), "purpose": "Main bottom reinforcement"}
        )
        MaterialRequestItem.objects.get_or_create(
            organization=org,
            material_request=mr1,
            item_name="20mm TMT Fe500D Rebars",
            defaults={"unit": "MT", "quantity": Decimal("15.00"), "estimated_rate": Decimal("68000.00"), "purpose": "Column splice & beam cage"}
        )

        po1, _ = PurchaseOrder.objects.get_or_create(
            organization=org,
            po_number="PO-0089",
            defaults={
                "project": p1,
                "vendor": v1,
                "material_request": mr1,
                "order_date": date.today() - timedelta(days=4),
                "expected_delivery_date": date.today() + timedelta(days=1),
                "subtotal": Decimal("2720000.00"),
                "tax_amount": Decimal("489600.00"),
                "total_amount": Decimal("3209600.00"),
                "status": PurchaseOrder.Status.ISSUED,
                "approved_by": users[Role.RoleCode.PROJECT_MANAGER],
                "terms_and_conditions": "Payment within 30 days of verified GRN receipt and test mill certificate."
            }
        )

        poi1, _ = PurchaseOrderItem.objects.get_or_create(
            organization=org,
            purchase_order=po1,
            item_name="16mm TMT Fe500D Rebars",
            defaults={"unit": "MT", "ordered_quantity": Decimal("25.00"), "unit_rate": Decimal("68000.00"), "total_amount": Decimal("1700000.00"), "received_quantity": Decimal("25.00")}
        )

        grn1, _ = GoodsReceiptNote.objects.get_or_create(
            organization=org,
            grn_number="GRN-0045",
            defaults={
                "purchase_order": po1,
                "project": p1,
                "received_by": users[Role.RoleCode.STORE_KEEPER],
                "challan_number": "DC-TATA-9982",
                "vehicle_number": "KA-04-E-8821",
                "receipt_date": date.today() - timedelta(days=1),
                "status": GoodsReceiptNote.Status.INSPECTED,
                "notes": "Weighbridge slip verified (Tare: 9.8T, Gross: 34.8T, Net: 25.0T). Mill test certificate attached."
            }
        )

        GRNItem.objects.get_or_create(
            organization=org,
            grn=grn1,
            po_item=poi1,
            defaults={"received_quantity": Decimal("25.00"), "accepted_quantity": Decimal("25.00"), "rejected_quantity": Decimal("0.00"), "remarks": "Physical diameter and rib deformation verified OK."}
        )

        inv1, _ = Invoice.objects.get_or_create(
            organization=org,
            invoice_number="INV-2026-081",
            defaults={
                "vendor_invoice_ref": "TATA-BLR-09823",
                "purchase_order": po1,
                "grn": grn1,
                "project": p1,
                "vendor": v1,
                "invoice_date": date.today() - timedelta(days=1),
                "due_date": date.today() + timedelta(days=29),
                "subtotal": Decimal("1700000.00"),
                "tax_amount": Decimal("306000.00"),
                "total_amount": Decimal("2006000.00"),
                "match_status": Invoice.MatchStatus.MATCHED,
                "payment_status": Invoice.PaymentStatus.UNPAID,
                "match_notes": "3-Way match verified: PO rate ₹68,000 matches invoice. Quantity 25.0 MT accepted on GRN-0045."
            }
        )

        # Stock
        StockItem.objects.get_or_create(
            organization=org,
            project=p1,
            item_name="16mm TMT Fe500D Rebars",
            defaults={"category": "Steel", "unit": "MT", "current_quantity": Decimal("48.50"), "minimum_threshold": Decimal("15.00"), "reorder_quantity": Decimal("30.00")}
        )
        StockItem.objects.get_or_create(
            organization=org,
            project=p1,
            item_name="M40 Ready Mix Concrete",
            defaults={"category": "Concrete", "unit": "CUM", "current_quantity": Decimal("0.00"), "minimum_threshold": Decimal("0.00"), "reorder_quantity": Decimal("50.00")}
        )
        StockItem.objects.get_or_create(
            organization=org,
            project=p1,
            item_name="PPC 53 Grade Cement Bags",
            defaults={"category": "Cement", "unit": "BAGS", "current_quantity": Decimal("140.00"), "minimum_threshold": Decimal("200.00"), "reorder_quantity": Decimal("500.00")}
        )

        # 9. Workforce & Daily Attendance
        workers_list = [
            ("EMP-0101", "Murugan", "Subramanian", Worker.WorkerType.INTERNAL, Worker.TradeSkill.MASON, 950),
            ("EMP-0102", "Dharmendra", "Yadav", Worker.WorkerType.INTERNAL, Worker.TradeSkill.STEEL_FIXER, 900),
            ("EMP-0103", "Shivaji", "Bhosale", Worker.WorkerType.INTERNAL, Worker.TradeSkill.CARPENTER, 920),
            ("EMP-0104", "Mohammed", "Irfan", Worker.WorkerType.INTERNAL, Worker.TradeSkill.ELECTRICIAN, 1000),
            ("EMP-0105", "Basavaraj", "Patil", Worker.WorkerType.INTERNAL, Worker.TradeSkill.OPERATOR, 1200),
            ("EMP-0106", "Ravi", "Kumar", Worker.WorkerType.SUBCONTRACT, Worker.TradeSkill.HELPER, 650),
            ("EMP-0107", "Santosh", "Manjhi", Worker.WorkerType.SUBCONTRACT, Worker.TradeSkill.HELPER, 650),
            ("EMP-0108", "Rupesh", "Singh", Worker.WorkerType.INTERNAL, Worker.TradeSkill.STEEL_FIXER, 900),
            ("EMP-0109", "Anil", "Gowda", Worker.WorkerType.INTERNAL, Worker.TradeSkill.CARPENTER, 920),
            ("EMP-0110", "Gopal", "Mandal", Worker.WorkerType.SUBCONTRACT, Worker.TradeSkill.MASON, 950),
        ]

        for eid, fn, ln, wtype, skill, wage in workers_list:
            w, _ = Worker.objects.get_or_create(
                organization=org,
                employee_id=eid,
                defaults={
                    "first_name": fn,
                    "last_name": ln,
                    "worker_type": wtype,
                    "trade_skill": skill,
                    "daily_wage_rate": Decimal(wage),
                    "hourly_overtime_rate": Decimal(round(wage / 8 * 1.5, 2)),
                    "assigned_project": p1,
                    "is_active": True
                }
            )

            # Record today's GPS attendance (inside geofence)
            AttendanceRecord.objects.get_or_create(
                organization=org,
                project=p1,
                worker=w,
                date=date.today(),
                defaults={
                    "clock_in_time": time(8, 15),
                    "clock_in_latitude": Decimal("12.971650"),
                    "clock_in_longitude": Decimal("77.594680"),
                    "distance_from_site_meters": 12.4,
                    "is_inside_geofence": True,
                    "status": AttendanceRecord.Status.PRESENT,
                    "regular_hours": Decimal("8.00"),
                    "overtime_hours": Decimal("1.50") if eid in ["EMP-0102", "EMP-0108"] else Decimal("0.00")
                }
            )

        # 10. Equipment Assets
        Asset.objects.get_or_create(
            organization=org,
            asset_code="EQ-TC-01",
            defaults={
                "name": "Potain MCi 85 A Tower Crane (25T)",
                "category": Asset.Category.LIFTING,
                "ownership": Asset.Ownership.OWNED,
                "current_project": p1,
                "status": Asset.Status.IN_USE,
                "meter_hours": Decimal("1840.5"),
                "hourly_cost_rate": Decimal("1200.00")
            }
        )
        Asset.objects.get_or_create(
            organization=org,
            asset_code="EQ-EXC-02",
            defaults={
                "name": "JCB 3DX Super Backhoe Loader",
                "category": Asset.Category.EARTHMOVING,
                "ownership": Asset.Ownership.RENTED,
                "rental_vendor": v1,
                "current_project": p1,
                "status": Asset.Status.IN_USE,
                "meter_hours": Decimal("920.0"),
                "hourly_cost_rate": Decimal("850.00")
            }
        )

        # 11. Daily Progress Report (DPR)
        dpr1, _ = DailyProgressReport.objects.get_or_create(
            organization=org,
            project=p1,
            date=date.today(),
            defaults={
                "report_number": "DPR-0118",
                "weather": DailyProgressReport.Weather.SUNNY,
                "temperature_celsius": Decimal("29.5"),
                "work_summary": "1. Tower A: Fixed bottom and top rebar mesh for Floor 9 slab (Grid lines A1 to D6).\n2. Tower B: Column formwork alignment checked by structural engineer.\n3. MEP: Embedded PVC electrical conduits routed in slab zone B.",
                "delay_reasons": "Concrete batching plant power trip delayed pump setup by 45 minutes. Resumed normally.",
                "supervisor": users[Role.RoleCode.SITE_ENGINEER],
                "status": DailyProgressReport.Status.SUBMITTED,
            }
        )

        DPRManpower.objects.get_or_create(organization=org, dpr=dpr1, trade_name="Masons", defaults={"headcount": 8, "total_hours": Decimal("64.0")})
        DPRManpower.objects.get_or_create(organization=org, dpr=dpr1, trade_name="Steel Fixers", defaults={"headcount": 14, "total_hours": Decimal("112.0")})
        DPRManpower.objects.get_or_create(organization=org, dpr=dpr1, trade_name="Carpenters", defaults={"headcount": 12, "total_hours": Decimal("96.0")})
        DPRManpower.objects.get_or_create(organization=org, dpr=dpr1, trade_name="General Helpers", defaults={"headcount": 16, "total_hours": Decimal("128.0")})

        DPRMaterialConsumed.objects.get_or_create(organization=org, dpr=dpr1, material_name="TMT Steel 16mm", defaults={"quantity": Decimal("6.20"), "unit": "MT", "activity": "Floor 9 slab reinforcement"})
        DPRMaterialConsumed.objects.get_or_create(organization=org, dpr=dpr1, material_name="Binding Wire 18 Gauge", defaults={"quantity": Decimal("85.00"), "unit": "KG", "activity": "Rebar tying"})

        # 12. Snag Lists (eSnagging)
        Snag.objects.get_or_create(
            organization=org,
            project=p1,
            snag_number="SNAG-0024",
            defaults={
                "title": "Missing 40mm Cover Blocks on Peripheral Column C-12",
                "description": "Outer column rebar touching shuttering ply. Needs 40mm concrete cover blocks installed prior to concrete pour.",
                "location_details": "Tower A, 8th Floor, North-East Grid Corner",
                "category": Snag.Category.CIVIL,
                "severity": Snag.Severity.CRITICAL,
                "status": Snag.Status.OPEN,
                "raised_by": users[Role.RoleCode.SITE_ENGINEER],
                "assigned_to": users[Role.RoleCode.PROJECT_MANAGER],
                "due_date": date.today() + timedelta(days=1)
            }
        )

        Snag.objects.get_or_create(
            organization=org,
            project=p1,
            snag_number="SNAG-0025",
            defaults={
                "title": "Cold Water Pipe Pressure Drop in Shaft 3",
                "description": "Hydrostatic pressure test on PPR pipe shaft dropped from 10 bar to 7 bar after 2 hours. Suspected loose solvent weld.",
                "location_details": "Tower B, Service Shaft 3, Floor 3",
                "category": Snag.Category.PLUMBING,
                "severity": Snag.Severity.MAJOR,
                "status": Snag.Status.IN_PROGRESS,
                "raised_by": users[Role.RoleCode.SITE_ENGINEER],
                "assigned_to": users[Role.RoleCode.PROJECT_MANAGER],
                "due_date": date.today() + timedelta(days=2)
            }
        )

        # 13. Approvals Engine
        app_req1, _ = ApprovalRequest.objects.get_or_create(
            organization=org,
            title="Purchase Order PO-0089 Authorization (Tata Tiscon Rebars)",
            defaults={
                "module": "PROCUREMENT",
                "object_id": str(po1.id),
                "object_type": "PurchaseOrder",
                "amount": po1.total_amount,
                "requester": users[Role.RoleCode.PROCUREMENT],
                "current_step": 1,
                "status": ApprovalRequest.Status.PENDING,
                "current_approver_role": roles[Role.RoleCode.PROJECT_MANAGER]
            }
        )

        app_req2, _ = ApprovalRequest.objects.get_or_create(
            organization=org,
            title="Change Order CO-001 Approval (Basement Raft M40 Concrete)",
            defaults={
                "module": "BUDGET",
                "object_id": "CO-001",
                "object_type": "ChangeOrder",
                "amount": Decimal("1850000.00"),
                "requester": users[Role.RoleCode.PROJECT_MANAGER],
                "current_step": 1,
                "status": ApprovalRequest.Status.PENDING,
                "current_approver_role": roles[Role.RoleCode.OWNER]
            }
        )

        # 14. CRM Leads
        Lead.objects.get_or_create(
            organization=org,
            lead_number="LEAD-0101",
            defaults={
                "client_name": "Godrej Tech Park Ventures",
                "contact_person": "Rohan Mehra",
                "phone": "+91 98200 77112",
                "email": "rohan.m@godrejtpv.com",
                "project_title": "Eco-Innovation Campus Block D",
                "project_type": "Commercial",
                "location": "Electronic City Phase 1, Bengaluru",
                "estimated_value": Decimal("142000000.00"),
                "stage": Lead.Stage.PROPOSAL,
                "probability": 70,
                "assigned_to": users[Role.RoleCode.SUPER_ADMIN],
                "notes": "Client requested detailed BOQ and BIM 4D schedule proposal."
            }
        )

        self.stdout.write(self.style.SUCCESS("Successfully seeded SiteOps enterprise dataset!"))
        self.stdout.write(self.style.SUCCESS("Default credentials: admin@siteops.io / Password123!"))
