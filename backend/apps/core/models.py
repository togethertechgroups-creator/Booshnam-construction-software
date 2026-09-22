import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _

class Organization(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    registration_no = models.CharField(max_length=100, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    currency = models.CharField(max_length=10, default="INR")
    logo = models.ImageField(upload_to="org_logos/", blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class TenantModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="%(app_label)s_%(class)s_set",
        db_index=True
    )
    is_deleted = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Role(TenantModel):
    class RoleCode(models.TextChoices):
        SUPER_ADMIN = "SUPER_ADMIN", _("Super Admin")
        OWNER = "OWNER", _("Owner / Director")
        PROJECT_MANAGER = "PROJECT_MANAGER", _("Project Manager (PM)")
        SITE_ENGINEER = "SITE_ENGINEER", _("Site Engineer / Supervisor")
        FINANCE = "FINANCE", _("Finance / Accounts")
        PROCUREMENT = "PROCUREMENT", _("Procurement / Purchase Officer")
        STORE_KEEPER = "STORE_KEEPER", _("Store / Warehouse Keeper")
        LABOR = "LABOR", _("Labor / Site Staff")
        SUBCONTRACTOR = "SUBCONTRACTOR", _("Subcontractor")
        CLIENT = "CLIENT", _("Client / Customer (Viewer)")
        AUDITOR = "AUDITOR", _("Auditor (View-only)")

    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50, choices=RoleCode.choices)
    description = models.TextField(blank=True)
    is_system_role = models.BooleanField(default=False)

    class Meta:
        unique_together = ("organization", "code")
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.organization.name})"


class ModuleChoices(models.TextChoices):
    PROJECTS = "PROJECTS", _("Projects & Scheduling")
    BUDGET = "BUDGET", _("Estimation & Budgeting")
    PROCUREMENT = "PROCUREMENT", _("Material & Procurement")
    WORKFORCE = "WORKFORCE", _("Workforce & Attendance")
    EQUIPMENT = "EQUIPMENT", _("Equipment & Assets")
    SITE_OPS = "SITE_OPS", _("DPR & Site Execution")
    SNAGS = "SNAGS", _("Snag Lists & Quality")
    DOCUMENTS = "DOCUMENTS", _("Drawings & Documents")
    CRM = "CRM", _("CRM & Leads")
    APPROVALS = "APPROVALS", _("Approvals Engine")
    REPORTS = "REPORTS", _("Reports & Analytics")
    SETTINGS = "SETTINGS", _("Admin & Settings")


class RolePermission(TenantModel):
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name="permissions")
    module = models.CharField(max_length=50, choices=ModuleChoices.choices)
    can_view = models.BooleanField(default=True)
    can_create = models.BooleanField(default=False)
    can_edit = models.BooleanField(default=False)
    can_delete = models.BooleanField(default=False)
    can_approve = models.BooleanField(default=False)
    approval_limit = models.DecimalField(max_digits=14, decimal_places=2, default=0.00, help_text="Maximum approval limit in org currency")

    class Meta:
        unique_together = ("role", "module")

    def __str__(self):
        return f"{self.role.name} - {self.module}"


class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(_("email address"), unique=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    organization = models.ForeignKey(
        Organization,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="users"
    )
    active_role = models.ForeignKey(
        Role,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="users"
    )
    avatar = models.ImageField(upload_to="avatars/", blank=True, null=True)
    is_org_admin = models.BooleanField(default=False)
    is_site_worker = models.BooleanField(default=False)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username", "first_name", "last_name"]

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.email})"


class AuditLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="audit_logs")
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=50)  # CREATE, UPDATE, DELETE, APPROVE, REJECT
    module = models.CharField(max_length=50)
    object_id = models.CharField(max_length=100, blank=True, null=True)
    object_repr = models.CharField(max_length=255, blank=True, null=True)
    details = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-timestamp"]

    def __str__(self):
        return f"{self.action} on {self.module} by {self.user} at {self.timestamp}"
