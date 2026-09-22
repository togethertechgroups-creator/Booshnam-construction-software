from django.db import models
from django.utils.translation import gettext_lazy as _
from apps.core.models import TenantModel, User
from apps.projects.models import Project, WBSTask

class DailyProgressReport(TenantModel):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", _("Draft")
        SUBMITTED = "SUBMITTED", _("Submitted for PM Review")
        APPROVED = "APPROVED", _("Signed Off by PM")
        REJECTED = "REJECTED", _("Revision Requested")

    class Weather(models.TextChoices):
        SUNNY = "SUNNY", _("Clear / Sunny")
        OVERCAST = "OVERCAST", _("Overcast / Cloudy")
        RAINY = "RAINY", _("Rain / Wet Ground")
        EXTREME_HEAT = "EXTREME_HEAT", _("Extreme Heat / Warning")

    report_number = models.CharField(max_length=50, unique=True)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="dprs")
    date = models.DateField(db_index=True)
    weather = models.CharField(max_length=30, choices=Weather.choices, default=Weather.SUNNY)
    temperature_celsius = models.DecimalField(max_digits=4, decimal_places=1, default=30.0)
    work_summary = models.TextField(help_text="Detailed summary of activities completed today")
    delay_reasons = models.TextField(blank=True, help_text="Any site stoppages, power cuts, material delays")
    supervisor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="submitted_dprs")
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.SUBMITTED)
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="approved_dprs")
    pm_remarks = models.TextField(blank=True)

    class Meta:
        unique_together = ("project", "date")
        ordering = ["-date"]

    def __str__(self):
        return f"{self.report_number} - {self.project.name} ({self.date})"


class DPRManpower(TenantModel):
    dpr = models.ForeignKey(DailyProgressReport, on_delete=models.CASCADE, related_name="manpower_records")
    trade_name = models.CharField(max_length=100)
    headcount = models.PositiveIntegerField(default=1)
    total_hours = models.DecimalField(max_digits=6, decimal_places=1, default=8.0)

    def __str__(self):
        return f"{self.trade_name}: {self.headcount} workers"


class DPRMaterialConsumed(TenantModel):
    dpr = models.ForeignKey(DailyProgressReport, on_delete=models.CASCADE, related_name="material_consumed")
    material_name = models.CharField(max_length=255)
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    unit = models.CharField(max_length=50, default="BAGS")
    activity = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return f"{self.material_name}: {self.quantity} {self.unit}"


class SitePhoto(TenantModel):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="site_photos")
    dpr = models.ForeignKey(DailyProgressReport, on_delete=models.SET_NULL, null=True, blank=True, related_name="photos")
    photo = models.ImageField(upload_to="site_photos/")
    caption = models.CharField(max_length=255, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    captured_at = models.DateTimeField(auto_now_add=True)
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

    class Meta:
        ordering = ["-captured_at"]

    def __str__(self):
        return f"Photo {self.id} at {self.project.name}"


class Snag(TenantModel):
    class Status(models.TextChoices):
        OPEN = "OPEN", _("Open / Reported")
        IN_PROGRESS = "IN_PROGRESS", _("Rectification In Progress")
        RESOLVED = "RESOLVED", _("Resolved / Ready for Verification")
        CLOSED = "CLOSED", _("Verified & Closed")

    class Severity(models.TextChoices):
        CRITICAL = "CRITICAL", _("Critical (Stops Work / Structural)")
        MAJOR = "MAJOR", _("Major Defect")
        MINOR = "MINOR", _("Minor Snag / Cosmetic")

    class Category(models.TextChoices):
        CIVIL = "CIVIL", _("Civil & Structural")
        FINISHING = "FINISHING", _("Tiling / Paint / Finishing")
        ELECTRICAL = "ELECTRICAL", _("Electrical & Wiring")
        PLUMBING = "PLUMBING", _("Plumbing & Drainage")
        SAFETY = "SAFETY", _("Safety Hazard / PPE Violation")

    snag_number = models.CharField(max_length=50, unique=True)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="snags")
    task = models.ForeignKey(WBSTask, on_delete=models.SET_NULL, null=True, blank=True, related_name="snags")
    title = models.CharField(max_length=255)
    description = models.TextField()
    location_details = models.CharField(max_length=255, help_text="e.g. Tower B, Floor 4, Flat 402 Kitchen")
    category = models.CharField(max_length=50, choices=Category.choices, default=Category.CIVIL)
    severity = models.CharField(max_length=30, choices=Severity.choices, default=Severity.MAJOR)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.OPEN)
    
    photo_before = models.ImageField(upload_to="snags_before/", blank=True, null=True)
    photo_after = models.ImageField(upload_to="snags_after/", blank=True, null=True)
    
    raised_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="raised_snags")
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="assigned_snags")
    due_date = models.DateField(null=True, blank=True)
    resolution_notes = models.TextField(blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.snag_number} - {self.title} ({self.status})"
