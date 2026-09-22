from django.db import models
from django.utils.translation import gettext_lazy as _
from apps.core.models import TenantModel, User
from apps.projects.models import Project

class DocumentFolder(TenantModel):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="document_folders")
    name = models.CharField(max_length=150)
    parent = models.ForeignKey("self", on_delete=models.CASCADE, null=True, blank=True, related_name="subfolders")

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.project.name} / {self.name}"


class ProjectDocument(TenantModel):
    class Category(models.TextChoices):
        CONTRACT = "CONTRACT", _("Contract & Agreements")
        PERMIT = "PERMIT", _("Government Permits & Approvals")
        DRAWING = "DRAWING", _("Technical Drawings & CAD")
        SPECIFICATION = "SPECIFICATION", _("Technical Specifications")
        SAFETY = "SAFETY", _("Safety & Quality Certifications")
        OTHER = "OTHER", _("General Site Documents")

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="documents")
    folder = models.ForeignKey(DocumentFolder, on_delete=models.SET_NULL, null=True, blank=True, related_name="documents")
    title = models.CharField(max_length=255)
    category = models.CharField(max_length=50, choices=Category.choices, default=Category.OTHER)
    file = models.FileField(upload_to="project_docs/", blank=True, null=True)
    version = models.CharField(max_length=20, default="v1.0")
    file_size_kb = models.PositiveIntegerField(default=150)
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} ({self.version}) - {self.project.name}"
