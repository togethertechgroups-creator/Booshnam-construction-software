from datetime import timedelta
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Lead, LeadActivity
from .serializers import LeadSerializer, LeadActivitySerializer
from apps.projects.models import Project, ProjectMember
from apps.core.permissions import HasTenantAccess
from apps.core.models import AuditLog

class LeadViewSet(viewsets.ModelViewSet):
    serializer_class = LeadSerializer
    permission_classes = [permissions.IsAuthenticated, HasTenantAccess]
    module_name = "CRM"

    def get_queryset(self):
        return Lead.objects.filter(organization=self.request.user.organization, is_deleted=False).prefetch_related("activities")

    def perform_create(self, serializer):
        count = Lead.objects.filter(organization=self.request.user.organization).count() + 1
        lead_no = f"LEAD-{count:04d}"
        serializer.save(
            organization=self.request.user.organization,
            lead_number=lead_no,
            assigned_to=self.request.user
        )

    @action(detail=True, methods=["POST"])
    def convert_to_project(self, request, pk=None):
        """Converts won lead directly into an active Project"""
        lead = self.get_object()
        if lead.converted_project:
            return Response({"error": "Lead is already converted into a project", "project_id": str(lead.converted_project.id)}, status=400)

        lead.stage = Lead.Stage.WON
        lead.probability = 100
        
        # Create Project
        proj_count = Project.objects.filter(organization=request.user.organization).count() + 1
        code = f"PRJ-{proj_count:03d}"
        today = timezone.now().date()
        
        new_project = Project.objects.create(
            organization=request.user.organization,
            code=code,
            name=lead.project_title,
            client_name=lead.client_name,
            project_type=Project.ProjectType.COMMERCIAL,
            location=lead.location or "Site Address Pending",
            start_date=today,
            expected_end_date=today + timedelta(days=365),
            estimated_budget=lead.estimated_value,
            status=Project.Status.PLANNING,
            description=f"Generated automatically from CRM Lead {lead.lead_number} ({lead.client_name})."
        )
        
        ProjectMember.objects.create(
            organization=request.user.organization,
            project=new_project,
            user=request.user,
            project_role="Project Manager",
            is_primary_pm=True
        )

        lead.converted_project = new_project
        lead.save(update_fields=["stage", "probability", "converted_project"])

        AuditLog.objects.create(
            organization=request.user.organization,
            user=request.user,
            action="CONVERT_LEAD",
            module="CRM",
            object_id=str(lead.id),
            object_repr=f"Converted Lead {lead.lead_number} to Project {new_project.code}"
        )

        return Response({
            "status": "CONVERTED",
            "project_id": str(new_project.id),
            "project_code": new_project.code,
            "project_name": new_project.name,
            "lead": LeadSerializer(lead).data
        })
