from rest_framework import serializers
from .models import Project, ProjectMember, WBSTask, Drawing
from apps.core.models import User
from apps.core.permissions import can_view_cost

class ProjectMemberSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)
    user_email = serializers.CharField(source="user.email", read_only=True)

    class Meta:
        model = ProjectMember
        fields = ["id", "project", "user", "user_name", "user_email", "project_role", "is_primary_pm"]


class WBSTaskSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.CharField(source="assigned_to.get_full_name", read_only=True)
    subtasks = serializers.SerializerMethodField()

    class Meta:
        model = WBSTask
        fields = [
            "id", "project", "parent", "title", "description",
            "wbs_code", "start_date", "end_date", "duration_days",
            "progress_percentage", "status", "is_milestone",
            "assigned_to", "assigned_to_name", "weightage_percent",
            "subtasks"
        ]

    def get_subtasks(self, obj):
        # Only fetch 1 level if needed to prevent infinite nesting
        if hasattr(obj, "prefetched_subtasks"):
            children = obj.prefetched_subtasks
        else:
            children = obj.subtasks.all()
        return [
            {
                "id": str(child.id),
                "title": child.title,
                "wbs_code": child.wbs_code,
                "status": child.status,
                "progress_percentage": float(child.progress_percentage),
                "start_date": str(child.start_date),
                "end_date": str(child.end_date),
            }
            for child in children
        ]


class DrawingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Drawing
        fields = [
            "id", "project", "title", "drawing_number",
            "discipline", "version", "file",
            "is_approved_for_construction", "remarks", "created_at"
        ]


class ProjectSerializer(serializers.ModelSerializer):
    members = ProjectMemberSerializer(many=True, read_only=True)
    tasks_count = serializers.IntegerField(source="tasks.count", read_only=True)

    class Meta:
        model = Project
        fields = [
            "id", "name", "code", "client_name", "project_type",
            "location", "latitude", "longitude", "geofence_radius_meters",
            "start_date", "expected_end_date", "actual_end_date",
            "estimated_budget", "actual_cost", "progress_percentage",
            "status", "description", "cover_image", "members", "tasks_count",
            "created_at"
        ]

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        request = self.context.get("request")
        if request and hasattr(request, "user"):
            if not can_view_cost(request.user):
                ret.pop("estimated_budget", None)
                ret.pop("actual_cost", None)
        return ret
