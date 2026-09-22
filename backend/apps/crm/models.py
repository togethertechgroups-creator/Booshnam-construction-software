from django.db import models
from django.utils.translation import gettext_lazy as _
from apps.core.models import TenantModel, User
from apps.projects.models import Project

class Lead(TenantModel):
    class Stage(models.TextChoices):
        NEW = "NEW", _("New Inquiry")
        CONTACTED = "CONTACTED", _("Contacted / Discovery")
        PROPOSAL = "PROPOSAL", _("Proposal / BOQ Shared")
        NEGOTIATION = "NEGOTIATION", _("Negotiation & Contract Review")
        WON = "WON", _("Won (Converted to Project)")
        LOST = "LOST", _("Lost / Closed")

    lead_number = models.CharField(max_length=50, unique=True)
    client_name = models.CharField(max_length=255)
    contact_person = models.CharField(max_length=150)
    phone = models.CharField(max_length=50)
    email = models.EmailField(blank=True)
    project_title = models.CharField(max_length=255)
    project_type = models.CharField(max_length=50, default="Commercial")
    location = models.CharField(max_length=255, blank=True)
    estimated_value = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    stage = models.CharField(max_length=30, choices=Stage.choices, default=Stage.NEW)
    probability = models.PositiveIntegerField(default=30)
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="assigned_leads")
    converted_project = models.OneToOneField(Project, on_delete=models.SET_NULL, null=True, blank=True, related_name="source_lead")
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.lead_number} - {self.client_name} ({self.stage})"


class LeadActivity(TenantModel):
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name="activities")
    activity_type = models.CharField(max_length=50, default="Call")
    summary = models.CharField(max_length=255)
    performed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    date = models.DateField()

    class Meta:
        ordering = ["-date", "-created_at"]
