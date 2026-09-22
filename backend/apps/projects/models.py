from django.db import models
from django.utils.translation import gettext_lazy as _
from apps.core.models import TenantModel, User

class Project(TenantModel):
    class Status(models.TextChoices):
        PLANNING = "PLANNING", _("Planning & Pre-Con")
        ACTIVE = "ACTIVE", _("Active Site Execution")
        ON_HOLD = "ON_HOLD", _("On Hold")
        COMPLETED = "COMPLETED", _("Completed & Handed Over")

    class ProjectType(models.TextChoices):
        COMMERCIAL = "COMMERCIAL", _("Commercial Complex")
        RESIDENTIAL = "RESIDENTIAL", _("Residential Towers / Villas")
        INFRASTRUCTURE = "INFRASTRUCTURE", _("Roads / Bridges / Metro")
        INTERIOR = "INTERIOR", _("Interior Fitout")
        INDUSTRIAL = "INDUSTRIAL", _("Warehouse / Industrial")

    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, unique=True)
    client_name = models.CharField(max_length=255)
    project_type = models.CharField(max_length=50, choices=ProjectType.choices, default=ProjectType.COMMERCIAL)
    location = models.CharField(max_length=255)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, default=12.971600, help_text="Site center lat")
    longitude = models.DecimalField(max_digits=9, decimal_places=6, default=77.594600, help_text="Site center lng")
    geofence_radius_meters = models.PositiveIntegerField(default=250, help_text="Radius for GPS check-in")
    start_date = models.DateField()
    expected_end_date = models.DateField()
    actual_end_date = models.DateField(blank=True, null=True)
    estimated_budget = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    actual_cost = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    progress_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.ACTIVE)
    description = models.TextField(blank=True)
    cover_image = models.ImageField(upload_to="project_covers/", blank=True, null=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.code} - {self.name}"


class ProjectMember(TenantModel):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="members")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="project_memberships")
    project_role = models.CharField(max_length=100, default="Member")
    is_primary_pm = models.BooleanField(default=False)

    class Meta:
        unique_together = ("project", "user")

    def __str__(self):
        return f"{self.user.get_full_name() or self.user.username} - {self.project.name} ({self.project_role})"


class WBSTask(TenantModel):
    class TaskStatus(models.TextChoices):
        TODO = "TODO", _("To Do")
        IN_PROGRESS = "IN_PROGRESS", _("In Progress")
        BLOCKED = "BLOCKED", _("Blocked")
        COMPLETED = "COMPLETED", _("Completed")

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="tasks")
    parent = models.ForeignKey("self", on_delete=models.CASCADE, null=True, blank=True, related_name="subtasks")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    wbs_code = models.CharField(max_length=50, blank=True, help_text="e.g. 1.1.2")
    start_date = models.DateField()
    end_date = models.DateField()
    duration_days = models.PositiveIntegerField(default=1)
    progress_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    status = models.CharField(max_length=30, choices=TaskStatus.choices, default=TaskStatus.TODO)
    is_milestone = models.BooleanField(default=False)
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="assigned_tasks")
    weightage_percent = models.DecimalField(max_digits=5, decimal_places=2, default=1.0)

    class Meta:
        ordering = ["wbs_code", "start_date"]

    def __str__(self):
        return f"{self.project.code} - {self.title} ({self.progress_percentage}%)"


class Drawing(TenantModel):
    class Discipline(models.TextChoices):
        ARCHITECTURAL = "ARCHITECTURAL", _("Architectural")
        STRUCTURAL = "STRUCTURAL", _("Structural")
        MEP = "MEP", _("Mechanical / Electrical / Plumbing")
        CIVIL = "CIVIL", _("Civil / Site Plan")
        INTERIOR = "INTERIOR", _("Interior Details")

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="drawings")
    title = models.CharField(max_length=255)
    drawing_number = models.CharField(max_length=100)
    discipline = models.CharField(max_length=50, choices=Discipline.choices, default=Discipline.ARCHITECTURAL)
    version = models.CharField(max_length=20, default="R0")
    file = models.FileField(upload_to="drawings/", blank=True, null=True)
    is_approved_for_construction = models.BooleanField(default=False)
    remarks = models.TextField(blank=True)

    class Meta:
        ordering = ["drawing_number", "-version"]

    def __str__(self):
        return f"{self.drawing_number} - {self.title} ({self.version})"
