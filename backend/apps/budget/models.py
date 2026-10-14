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


class BOQ(TenantModel):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", _("Draft")
        ACTIVE = "ACTIVE", _("Active")
        APPROVED = "APPROVED", _("Approved")
        COMPLETED = "COMPLETED", _("Completed")

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="boqs")
    boq_number = models.CharField(max_length=50, help_text="e.g. BOQ-001")
    title = models.CharField(max_length=255)
    client_name = models.CharField(max_length=255, blank=True)
    boq_date = models.DateField(null=True, blank=True)
    boq_value = models.DecimalField(max_digits=14, decimal_places=2, default=0.00, help_text="Planned BOQ total amount")
    billed_value = models.DecimalField(max_digits=14, decimal_places=2, default=0.00, help_text="Approved billed value")
    progress_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.ACTIVE)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]
        unique_together = ("project", "boq_number")

    def __str__(self):
        return f"{self.boq_number} - {self.title} (₹{self.boq_value})"


class BOQItem(TenantModel):
    boq = models.ForeignKey(BOQ, on_delete=models.CASCADE, related_name="items")
    item_name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    unit_of_measurement = models.CharField(max_length=50, default="SQFT")
    quantity = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    unit_rate = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    calculated_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    additional_charges = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    
    # Progress and billing tracking
    linked_task_id = models.CharField(max_length=100, blank=True)
    billed_quantity = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    progress_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    
    # Financial settlement tracking (Allocations / direct work payments)
    settled_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    outstanding_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)

    class Meta:
        ordering = ["id"]

    def save(self, *args, **kwargs):
        qty = self.quantity or 0
        rate = self.unit_rate or 0
        base = qty * rate
        self.calculated_amount = base

        disc_pct = self.discount_percent or 0
        disc = (base * disc_pct) / 100
        self.discount_amount = disc

        after_disc = base - disc
        tax_pct = self.tax_rate or 0
        tax = (after_disc * tax_pct) / 100
        self.tax_amount = tax

        add_chg = self.additional_charges or 0
        self.total_amount = after_disc + tax + add_chg
        self.outstanding_amount = max(0, self.total_amount - (self.settled_amount or 0))
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.item_name} (₹{self.total_amount})"


class BOQMilestone(TenantModel):
    boq = models.ForeignKey(BOQ, on_delete=models.CASCADE, related_name="milestones")
    name = models.CharField(max_length=255)
    percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    amount = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    due_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=50, default="PENDING")
    settled_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return f"{self.name} ({self.percentage}%)"


class FinancialTransaction(TenantModel):
    class TxType(models.TextChoices):
        IN = "IN", _("Payment In / Receipt")
        OUT = "OUT", _("Payment Out / Expense")

    class PaymentCategory(models.TextChoices):
        CLIENT_ADVANCE = "CLIENT_ADVANCE", _("Client Advance")
        WORK_PAYMENT = "WORK_PAYMENT", _("Work Payment")
        MILESTONE_PAYMENT = "MILESTONE_PAYMENT", _("Milestone Payment")
        OTHER_RECEIPT = "OTHER_RECEIPT", _("Other Receipt")
        SUPPLIER_PAYMENT = "SUPPLIER_PAYMENT", _("Supplier Payment")
        SUBCON_PAYMENT = "SUBCON_PAYMENT", _("Subcontractor Payment")
        EXPENSE = "EXPENSE", _("Expense")

    class Status(models.TextChoices):
        APPROVED = "APPROVED", _("Approved")
        PENDING = "PENDING", _("Pending")
        REVERSED = "REVERSED", _("Reversed")
        CANCELLED = "CANCELLED", _("Cancelled")

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="financial_transactions")
    boq = models.ForeignKey(BOQ, on_delete=models.SET_NULL, null=True, blank=True, related_name="transactions")
    party_id = models.CharField(max_length=100, blank=True)
    party_name = models.CharField(max_length=255)
    transaction_number = models.CharField(max_length=100, unique=True)
    transaction_type = models.CharField(max_length=10, choices=TxType.choices, default=TxType.IN)
    payment_category = models.CharField(max_length=50, choices=PaymentCategory.choices, default=PaymentCategory.CLIENT_ADVANCE)
    transaction_date = models.DateField()
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    payment_method = models.CharField(max_length=50, default="Bank Transfer")
    reference_number = models.CharField(max_length=100, blank=True)
    advance_percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    allocated_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    unallocated_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.APPROVED)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="recorded_transactions")

    # Reversal metadata
    is_reversed = models.BooleanField(default=False)
    reversed_at = models.DateTimeField(null=True, blank=True)
    reversed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="reversed_transactions")
    reversal_reason = models.TextField(blank=True)

    class Meta:
        ordering = ["-transaction_date", "-created_at"]
        indexes = [
            models.Index(fields=["project", "transaction_type"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return f"{self.transaction_number} - {self.party_name} (₹{self.amount})"


class TransactionAllocation(TenantModel):
    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", _("Active")
        REVERSED = "REVERSED", _("Reversed")

    source_transaction = models.ForeignKey(FinancialTransaction, on_delete=models.CASCADE, related_name="allocations")
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="allocations")
    boq = models.ForeignKey(BOQ, on_delete=models.CASCADE, related_name="allocations")
    boq_item = models.ForeignKey(BOQItem, on_delete=models.SET_NULL, null=True, blank=True, related_name="allocations")
    milestone = models.ForeignKey(BOQMilestone, on_delete=models.SET_NULL, null=True, blank=True, related_name="allocations")
    allocated_amount = models.DecimalField(max_digits=14, decimal_places=2)
    allocation_date = models.DateField()
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.ACTIVE)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="created_allocations")

    # Reversal metadata
    reversed_at = models.DateTimeField(null=True, blank=True)
    reversed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="reversed_allocations")
    reversal_reason = models.TextField(blank=True)

    class Meta:
        ordering = ["-allocation_date", "-created_at"]

    def __str__(self):
        return f"Alloc {self.id}: ₹{self.allocated_amount} from {self.source_transaction.transaction_number}"


class FinancialAuditLog(TenantModel):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="financial_audit_logs")
    entity_type = models.CharField(max_length=50, help_text="TRANSACTION | ALLOCATION | BOQ | ITEM")
    entity_id = models.CharField(max_length=100)
    action = models.CharField(max_length=50, help_text="CREATE | UPDATE | REVERSE | ALLOCATE")
    amount = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    performed_by = models.CharField(max_length=100)
    details = models.TextField()

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.action} on {self.entity_type} {self.entity_id} by {self.performed_by}"

