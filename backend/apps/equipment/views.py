from rest_framework import viewsets, permissions
from .models import Asset, EquipmentAllocation, MaintenanceLog
from .serializers import AssetSerializer, EquipmentAllocationSerializer, MaintenanceLogSerializer
from apps.core.permissions import HasTenantAccess

class AssetViewSet(viewsets.ModelViewSet):
    serializer_class = AssetSerializer
    permission_classes = [permissions.IsAuthenticated, HasTenantAccess]
    module_name = "EQUIPMENT"

    def get_queryset(self):
        qs = Asset.objects.filter(organization=self.request.user.organization, is_deleted=False)
        project_id = self.request.query_params.get("project")
        if project_id:
            qs = qs.filter(current_project_id=project_id)
        return qs.select_related("current_project", "rental_vendor")

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.organization)


class EquipmentAllocationViewSet(viewsets.ModelViewSet):
    serializer_class = EquipmentAllocationSerializer
    permission_classes = [permissions.IsAuthenticated, HasTenantAccess]
    module_name = "EQUIPMENT"

    def get_queryset(self):
        qs = EquipmentAllocation.objects.filter(organization=self.request.user.organization)
        project_id = self.request.query_params.get("project")
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs.select_related("asset", "project")

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.organization)


class MaintenanceLogViewSet(viewsets.ModelViewSet):
    serializer_class = MaintenanceLogSerializer
    permission_classes = [permissions.IsAuthenticated, HasTenantAccess]
    module_name = "EQUIPMENT"

    def get_queryset(self):
        qs = MaintenanceLog.objects.filter(organization=self.request.user.organization)
        asset_id = self.request.query_params.get("asset")
        if asset_id:
            qs = qs.filter(asset_id=asset_id)
        return qs.select_related("asset")

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.organization)
