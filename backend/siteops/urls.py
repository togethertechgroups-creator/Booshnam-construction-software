from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

# Core views
from apps.core.views import me_view, switch_role_view, OrganizationViewSet, RoleViewSet, UserViewSet, AuditLogViewSet
# Project views
from apps.projects.views import ProjectViewSet, ProjectMemberViewSet, WBSTaskViewSet, DrawingViewSet
# Budget views
from apps.budget.views import BudgetCategoryViewSet, CostPlanItemViewSet, ChangeOrderViewSet
# Procurement views
from apps.procurement.views import (
    VendorViewSet, MaterialRequestViewSet, PurchaseOrderViewSet,
    GoodsReceiptNoteViewSet, InvoiceViewSet, VendorLedgerViewSet, StockItemViewSet
)
# Workforce views
from apps.workforce.views import WorkerViewSet, AttendanceViewSet, PayrollBatchViewSet
# Equipment views
from apps.equipment.views import AssetViewSet, EquipmentAllocationViewSet, MaintenanceLogViewSet
# Site Ops views
from apps.site_ops.views import DPRViewSet, SnagViewSet, SitePhotoViewSet
# Approvals views
from apps.approvals.views import ApprovalPolicyViewSet, ApprovalRequestViewSet
# Documents views
from apps.documents.views import DocumentFolderViewSet, ProjectDocumentViewSet
# CRM views
from apps.crm.views import LeadViewSet
# Analytics views
from apps.analytics.views import PortfolioSummaryView, ExportFinancialSummaryExcelView

router = DefaultRouter()

# Core
router.register(r"orgs", OrganizationViewSet, basename="organization")
router.register(r"roles", RoleViewSet, basename="role")
router.register(r"users", UserViewSet, basename="user")
router.register(r"audit-logs", AuditLogViewSet, basename="audit-log")

# Projects & Planning
router.register(r"projects", ProjectViewSet, basename="project")
router.register(r"project-members", ProjectMemberViewSet, basename="project-member")
router.register(r"tasks", WBSTaskViewSet, basename="task")
router.register(r"drawings", DrawingViewSet, basename="drawing")

# Budget & Estimation
router.register(r"budget/categories", BudgetCategoryViewSet, basename="budget-category")
router.register(r"budget/cost-plan", CostPlanItemViewSet, basename="cost-plan-item")
router.register(r"budget/change-orders", ChangeOrderViewSet, basename="change-order")

# Procurement & Materials
router.register(r"procurement/vendors", VendorViewSet, basename="vendor")
router.register(r"procurement/material-requests", MaterialRequestViewSet, basename="material-request")
router.register(r"procurement/purchase-orders", PurchaseOrderViewSet, basename="purchase-order")
router.register(r"procurement/grn", GoodsReceiptNoteViewSet, basename="grn")
router.register(r"procurement/invoices", InvoiceViewSet, basename="invoice")
router.register(r"procurement/vendor-ledger", VendorLedgerViewSet, basename="vendor-ledger")
router.register(r"procurement/stock", StockItemViewSet, basename="stock")

# Workforce & Attendance
router.register(r"workforce/workers", WorkerViewSet, basename="worker")
router.register(r"workforce/attendance", AttendanceViewSet, basename="attendance")
router.register(r"workforce/payroll", PayrollBatchViewSet, basename="payroll")

# Equipment & Assets
router.register(r"equipment/assets", AssetViewSet, basename="asset")
router.register(r"equipment/allocations", EquipmentAllocationViewSet, basename="equipment-allocation")
router.register(r"equipment/maintenance", MaintenanceLogViewSet, basename="maintenance-log")

# Site Ops & Quality
router.register(r"site/dpr", DPRViewSet, basename="dpr")
router.register(r"site/snags", SnagViewSet, basename="snag")
router.register(r"site/photos", SitePhotoViewSet, basename="site-photo")

# Approvals
router.register(r"approvals/policies", ApprovalPolicyViewSet, basename="approval-policy")
router.register(r"approvals/requests", ApprovalRequestViewSet, basename="approval-request")

# Documents
router.register(r"documents/folders", DocumentFolderViewSet, basename="document-folder")
router.register(r"documents/files", ProjectDocumentViewSet, basename="project-document")

# CRM
router.register(r"crm/leads", LeadViewSet, basename="lead")

urlpatterns = [
    path("admin/", admin.site.urls),
    
    # Auth endpoints
    path("api/v1/auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/v1/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/v1/auth/me/", me_view, name="auth_me"),
    path("api/v1/auth/switch-role/", switch_role_view, name="auth_switch_role"),

    # Analytics summary
    path("api/v1/analytics/portfolio-summary/", PortfolioSummaryView.as_view(), name="portfolio_summary"),
    path("api/v1/analytics/export-financial-summary/", ExportFinancialSummaryExcelView.as_view(), name="export_financial_summary"),

    # Router endpoints
    path("api/v1/", include(router.urls)),

    # OpenAPI Schema & Swagger UI
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger_ui"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
