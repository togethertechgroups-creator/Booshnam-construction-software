from rest_framework import serializers
from .models import Asset, EquipmentAllocation, MaintenanceLog

class AssetSerializer(serializers.ModelSerializer):
    current_project_name = serializers.CharField(source="current_project.name", read_only=True)
    rental_vendor_name = serializers.CharField(source="rental_vendor.name", read_only=True)

    class Meta:
        model = Asset
        fields = [
            "id", "asset_code", "name", "category", "ownership",
            "rental_vendor", "rental_vendor_name", "serial_number",
            "hourly_cost_rate", "current_project", "current_project_name",
            "status", "meter_hours"
        ]


class EquipmentAllocationSerializer(serializers.ModelSerializer):
    asset_code = serializers.CharField(source="asset.asset_code", read_only=True)
    asset_name = serializers.CharField(source="asset.name", read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True)

    class Meta:
        model = EquipmentAllocation
        fields = [
            "id", "asset", "asset_code", "asset_name", "project",
            "project_name", "start_date", "end_date", "hours_logged",
            "operator_name", "notes"
        ]


class MaintenanceLogSerializer(serializers.ModelSerializer):
    asset_code = serializers.CharField(source="asset.asset_code", read_only=True)

    class Meta:
        model = MaintenanceLog
        fields = ["id", "asset", "asset_code", "service_date", "service_type", "cost", "meter_reading", "notes"]
