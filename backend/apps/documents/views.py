from rest_framework import viewsets, permissions
from .models import DocumentFolder, ProjectDocument
from .serializers import DocumentFolderSerializer, ProjectDocumentSerializer
from apps.core.permissions import HasTenantAccess

class DocumentFolderViewSet(viewsets.ModelViewSet):
    serializer_class = DocumentFolderSerializer
    permission_classes = [permissions.IsAuthenticated, HasTenantAccess]
    module_name = "DOCUMENTS"

    def get_queryset(self):
        qs = DocumentFolder.objects.filter(organization=self.request.user.organization)
        project_id = self.request.query_params.get("project")
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.organization)


class ProjectDocumentViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectDocumentSerializer
    permission_classes = [permissions.IsAuthenticated, HasTenantAccess]
    module_name = "DOCUMENTS"

    def get_queryset(self):
        qs = ProjectDocument.objects.filter(organization=self.request.user.organization, is_deleted=False)
        project_id = self.request.query_params.get("project")
        folder_id = self.request.query_params.get("folder")
        if project_id:
            qs = qs.filter(project_id=project_id)
        if folder_id:
            qs = qs.filter(folder_id=folder_id)
        return qs.select_related("project", "uploaded_by")

    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.user.organization,
            uploaded_by=self.request.user
        )
