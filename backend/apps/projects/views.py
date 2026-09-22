from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Project, ProjectMember, WBSTask, Drawing
from .serializers import ProjectSerializer, ProjectMemberSerializer, WBSTaskSerializer, DrawingSerializer
from apps.core.permissions import HasTenantAccess, HasModulePermission

class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated, HasTenantAccess]
    module_name = "PROJECTS"

    def get_queryset(self):
        user = self.request.user
        if not user.organization:
            return Project.objects.none()
        
        qs = Project.objects.filter(organization=user.organization, is_deleted=False)
        
        # If user is project-restricted (e.g. Subcontractor, Client, Site Engineer)
        if user.active_role and user.active_role.code in ["SUBCONTRACTOR", "CLIENT", "SITE_ENGINEER"]:
            assigned_project_ids = ProjectMember.objects.filter(
                user=user, organization=user.organization
            ).values_list("project_id", flat=True)
            qs = qs.filter(id__in=assigned_project_ids)
            
        return qs

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.organization)

    @action(detail=True, methods=["GET"])
    def dashboard(self, request, pk=None):
        project = self.get_object()
        tasks = project.tasks.filter(is_deleted=False)
        total_tasks = tasks.count()
        completed_tasks = tasks.filter(status=WBSTask.TaskStatus.COMPLETED).count()
        in_progress_tasks = tasks.filter(status=WBSTask.TaskStatus.IN_PROGRESS).count()
        
        # Calculate budget variance
        est = float(project.estimated_budget)
        act = float(project.actual_cost)
        variance = est - act
        burn_rate = round((act / est * 100), 1) if est > 0 else 0

        data = {
            "project_id": str(project.id),
            "name": project.name,
            "code": project.code,
            "status": project.status,
            "progress_percentage": float(project.progress_percentage),
            "tasks_summary": {
                "total": total_tasks,
                "completed": completed_tasks,
                "in_progress": in_progress_tasks,
                "blocked": tasks.filter(status=WBSTask.TaskStatus.BLOCKED).count(),
            },
            "financial_summary": {
                "estimated_budget": est,
                "actual_cost": act,
                "variance": variance,
                "burn_percentage": burn_rate,
                "is_over_budget": act > est,
            },
            "team_count": project.members.count(),
            "drawings_count": project.drawings.count(),
        }
        return Response(data)


class ProjectMemberViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectMemberSerializer
    permission_classes = [permissions.IsAuthenticated, HasTenantAccess]

    def get_queryset(self):
        project_id = self.request.query_params.get("project")
        qs = ProjectMember.objects.filter(organization=self.request.user.organization)
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.organization)


class WBSTaskViewSet(viewsets.ModelViewSet):
    serializer_class = WBSTaskSerializer
    permission_classes = [permissions.IsAuthenticated, HasTenantAccess]
    module_name = "PROJECTS"

    def get_queryset(self):
        user = self.request.user
        qs = WBSTask.objects.filter(organization=user.organization, is_deleted=False)
        project_id = self.request.query_params.get("project")
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs.select_related("assigned_to", "project")

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.organization)


class DrawingViewSet(viewsets.ModelViewSet):
    serializer_class = DrawingSerializer
    permission_classes = [permissions.IsAuthenticated, HasTenantAccess]
    module_name = "DOCUMENTS"

    def get_queryset(self):
        user = self.request.user
        qs = Drawing.objects.filter(organization=user.organization, is_deleted=False)
        project_id = self.request.query_params.get("project")
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.organization)
