from django.db import models
from django.utils.translation import gettext_lazy as _
from apps.core.models import TenantModel, User
from apps.projects.models import Project

class BudgetCategory(TenantModel):
    class CategoryType(models.TextChoices):
        MATERIAL = "MATERIAL", _("Material")
        LABOR = "LABOR", _("Labor & Workforce")
        EQUIPMENT = "EQUIPMENT", _("Machinery & Equipment")
        SUBCONTRACT = "SUBCONTRACT", _("Subcontracting Work")
        OVERHEAD = "OVERHEAD", _("Site Overhead & Admin")

    name = models.CharField(max_length=100)
    category_type = models.CharField(max_length=50, choices=CategoryType.choices, default=CategoryType.MATERIAL)
    code = models.CharField(max_length=50)
    description = models.TextField(blank=True)

    class Meta:
        unique_together = ("organization", "code")
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.get_category_type_display()})"


class CostPlanItem(TenantModel):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="cost_plan_items")
    category = models.ForeignKey(BudgetCategory, on_delete=models.PROTECT, related_name="cost_items")
    item_code = models.CharField(max_length=50, help_text="e.g. BOQ-CIVIL-01")
    description = models.CharField(max_length=255)
    unit = models.CharField(max_length=50, default="SQFT", help_text="e.g. SQFT, CUM, MT, BAG, NOS, HR")
    planned_quantity = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    planned_rate = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    planned_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    
    actual_quantity = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    actual_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)

    class Meta:
        ordering = ["item_code"]

    def save(self, *args, **kwargs):
        self.planned_amount = self.planned_quantity * self.planned_rate
        super().save(*args, **kwargs)

    @property
    def variance_amount(self):
        return self.planned_amount - self.actual_amount

    @property
    def variance_percentage(self):
        if self.planned_amount > 0:
            return round(((self.planned_amount - self.actual_amount) / self.planned_amount) * 100, 2)
        return 0.0

    def __str__(self):
        return f"{self.item_code} - {self.description}"


class ChangeOrder(TenantModel):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", _("Draft")
        SUBMITTED = "SUBMITTED", _("Submitted for Review")
        APPROVED = "APPROVED", _("Approved")
        REJECTED = "REJECTED", _("Rejected")

    class Reason(models.TextChoices):
        DESIGN_CHANGE = "DESIGN_CHANGE", _("Architectural / Design Revision")
        CLIENT_REQUEST = "CLIENT_REQUEST", _("Client Scope Addition")
        SITE_CONDITION = "SITE_CONDITION", _("Unforeseen Site Condition")
        SUBSTITUTION = "SUBSTITUTION", _("Material / Method Substitution")

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="change_orders")
    order_number = models.CharField(max_length=50, help_text="e.g. CO-001")
    title = models.CharField(max_length=255)
    description = models.TextField()
    reason = models.CharField(max_length=50, choices=Reason.choices, default=Reason.CLIENT_REQUEST)
    cost_impact = models.DecimalField(max_digits=14, decimal_places=2, default=0.00, help_text="Positive for cost addition")
    schedule_impact_days = models.IntegerField(default=0, help_text="Days added/reduced to project timeline")
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.DRAFT)
    requested_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="requested_change_orders")
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="approved_change_orders")
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.order_number} - {self.title} ({self.status})"
