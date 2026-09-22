from django.db import models
from django.utils.translation import gettext_lazy as _
from apps.core.models import TenantModel, User, Role

class ApprovalPolicy(TenantModel):
    module = models.CharField(max_length=50, help_text="e.g. PROCUREMENT, BUDGET, FINANCE, SITE_OPS")
    name = models.CharField(max_length=150)
    min_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    max_amount = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True, help_text="Blank for unbounded")
    required_role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name="approval_policies")
    step_order = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ["module", "step_order"]

    def __str__(self):
        return f"{self.name} ({self.module}): Step {self.step_order} -> {self.required_role.name}"


class ApprovalRequest(TenantModel):
    class Status(models.TextChoices):
        PENDING = "PENDING", _("Pending Review")
        APPROVED = "APPROVED", _("Approved")
        REJECTED = "REJECTED", _("Rejected")

    module = models.CharField(max_length=50)
    object_id = models.CharField(max_length=100)
    object_type = models.CharField(max_length=100)
    title = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    requester = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="approval_requests")
    current_step = models.PositiveIntegerField(default=1)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.PENDING)
    current_approver_role = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} ({self.status}) - ₹{self.amount}"


class ApprovalActionLog(TenantModel):
    class Action(models.TextChoices):
        APPROVED = "APPROVED", _("Approved")
        REJECTED = "REJECTED", _("Rejected")

    approval_request = models.ForeignKey(ApprovalRequest, on_delete=models.CASCADE, related_name="actions")
    actor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    step_number = models.PositiveIntegerField(default=1)
    action = models.CharField(max_length=30, choices=Action.choices)
    comments = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["timestamp"]

    def __str__(self):
        return f"{self.actor} - {self.action} on {self.approval_request.title}"
