from rest_framework import serializers
from .models import ApprovalPolicy, ApprovalRequest, ApprovalActionLog

class ApprovalPolicySerializer(serializers.ModelSerializer):
    role_name = serializers.CharField(source="required_role.name", read_only=True)

    class Meta:
        model = ApprovalPolicy
        fields = ["id", "module", "name", "min_amount", "max_amount", "required_role", "role_name", "step_order"]


class ApprovalActionLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source="actor.get_full_name", read_only=True)

    class Meta:
        model = ApprovalActionLog
        fields = ["id", "actor", "actor_name", "step_number", "action", "comments", "timestamp"]


class ApprovalRequestSerializer(serializers.ModelSerializer):
    requester_name = serializers.CharField(source="requester.get_full_name", read_only=True)
    approver_role_name = serializers.CharField(source="current_approver_role.name", read_only=True)
    actions = ApprovalActionLogSerializer(many=True, read_only=True)

    class Meta:
        model = ApprovalRequest
        fields = [
            "id", "module", "object_id", "object_type", "title",
            "amount", "requester", "requester_name", "current_step",
            "status", "current_approver_role", "approver_role_name",
            "actions", "created_at"
        ]
