from rest_framework import serializers
from .models import Worker, AttendanceRecord, PayrollBatch, PayrollItem
from apps.core.permissions import can_view_cost

class WorkerSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    assigned_project_name = serializers.CharField(source="assigned_project.name", read_only=True)

    class Meta:
        model = Worker
        fields = [
            "id", "employee_id", "first_name", "last_name", "full_name",
            "phone", "worker_type", "trade_skill", "subcontractor_name",
            "daily_wage_rate", "hourly_overtime_rate", "assigned_project",
            "assigned_project_name", "photo", "is_active"
        ]

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        request = self.context.get("request")
        if request and hasattr(request, "user") and not can_view_cost(request.user):
            ret.pop("daily_wage_rate", None)
            ret.pop("hourly_overtime_rate", None)
        return ret


class AttendanceRecordSerializer(serializers.ModelSerializer):
    worker_name = serializers.CharField(source="worker.full_name", read_only=True)
    worker_code = serializers.CharField(source="worker.employee_id", read_only=True)
    worker_skill = serializers.CharField(source="worker.trade_skill", read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True)

    class Meta:
        model = AttendanceRecord
        fields = [
            "id", "project", "project_name", "worker", "worker_name",
            "worker_code", "worker_skill", "date", "clock_in_time",
            "clock_out_time", "clock_in_latitude", "clock_in_longitude",
            "distance_from_site_meters", "is_inside_geofence", "status",
            "regular_hours", "overtime_hours", "verification_photo",
            "supervisor_override", "override_reason"
        ]


class PayrollItemSerializer(serializers.ModelSerializer):
    worker_name = serializers.CharField(source="worker.full_name", read_only=True)
    worker_code = serializers.CharField(source="worker.employee_id", read_only=True)
    trade_skill = serializers.CharField(source="worker.trade_skill", read_only=True)

    class Meta:
        model = PayrollItem
        fields = [
            "id", "worker", "worker_name", "worker_code", "trade_skill",
            "present_days", "regular_wage", "overtime_hours",
            "overtime_amount", "deductions", "net_payable"
        ]


class PayrollBatchSerializer(serializers.ModelSerializer):
    items = PayrollItemSerializer(many=True, read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True)
    approved_by_name = serializers.CharField(source="approved_by.get_full_name", read_only=True)

    class Meta:
        model = PayrollBatch
        fields = [
            "id", "batch_number", "project", "project_name", "period_start",
            "period_end", "total_workers", "total_gross_amount",
            "status", "approved_by", "approved_by_name", "notes", "items"
        ]
