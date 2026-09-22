from rest_framework import serializers
from .models import Lead, LeadActivity

class LeadActivitySerializer(serializers.ModelSerializer):
    performed_by_name = serializers.CharField(source="performed_by.get_full_name", read_only=True)

    class Meta:
        model = LeadActivity
        fields = ["id", "activity_type", "summary", "performed_by", "performed_by_name", "date"]


class LeadSerializer(serializers.ModelSerializer):
    activities = LeadActivitySerializer(many=True, read_only=True)
    assigned_to_name = serializers.CharField(source="assigned_to.get_full_name", read_only=True)
    converted_project_name = serializers.CharField(source="converted_project.name", read_only=True)

    class Meta:
        model = Lead
        fields = [
            "id", "lead_number", "client_name", "contact_person", "phone",
            "email", "project_title", "project_type", "location",
            "estimated_value", "stage", "probability", "assigned_to",
            "assigned_to_name", "converted_project", "converted_project_name",
            "notes", "activities", "created_at"
        ]
