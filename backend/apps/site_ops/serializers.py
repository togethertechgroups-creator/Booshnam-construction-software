from rest_framework import serializers
from .models import DailyProgressReport, DPRManpower, DPRMaterialConsumed, SitePhoto, Snag

class DPRManpowerSerializer(serializers.ModelSerializer):
    class Meta:
        model = DPRManpower
        fields = ["id", "trade_name", "headcount", "total_hours"]


class DPRMaterialConsumedSerializer(serializers.ModelSerializer):
    class Meta:
        model = DPRMaterialConsumed
        fields = ["id", "material_name", "quantity", "unit", "activity"]


class SitePhotoSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source="uploaded_by.get_full_name", read_only=True)

    class Meta:
        model = SitePhoto
        fields = ["id", "project", "dpr", "photo", "caption", "latitude", "longitude", "captured_at", "uploaded_by_name"]


class DPRSerializer(serializers.ModelSerializer):
    manpower_records = DPRManpowerSerializer(many=True, required=False)
    material_consumed = DPRMaterialConsumedSerializer(many=True, required=False)
    photos = SitePhotoSerializer(many=True, read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True)
    supervisor_name = serializers.CharField(source="supervisor.get_full_name", read_only=True)
    approved_by_name = serializers.CharField(source="approved_by.get_full_name", read_only=True)

    class Meta:
        model = DailyProgressReport
        fields = [
            "id", "report_number", "project", "project_name", "date",
            "weather", "temperature_celsius", "work_summary",
            "delay_reasons", "supervisor", "supervisor_name",
            "status", "approved_by", "approved_by_name", "pm_remarks",
            "manpower_records", "material_consumed", "photos", "created_at"
        ]

    def create(self, validated_data):
        manpower_data = validated_data.pop("manpower_records", [])
        material_data = validated_data.pop("material_consumed", [])
        
        dpr = DailyProgressReport.objects.create(**validated_data)
        
        for m in manpower_data:
            DPRManpower.objects.create(organization=dpr.organization, dpr=dpr, **m)
        for mat in material_data:
            DPRMaterialConsumed.objects.create(organization=dpr.organization, dpr=dpr, **mat)
            
        return dpr


class SnagSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source="project.name", read_only=True)
    task_title = serializers.CharField(source="task.title", read_only=True)
    raised_by_name = serializers.CharField(source="raised_by.get_full_name", read_only=True)
    assigned_to_name = serializers.CharField(source="assigned_to.get_full_name", read_only=True)

    class Meta:
        model = Snag
        fields = [
            "id", "snag_number", "project", "project_name", "task",
            "task_title", "title", "description", "location_details",
            "category", "severity", "status", "photo_before",
            "photo_after", "raised_by", "raised_by_name", "assigned_to",
            "assigned_to_name", "due_date", "resolution_notes",
            "closed_at", "created_at"
        ]
