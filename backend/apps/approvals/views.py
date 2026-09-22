from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import ApprovalPolicy, ApprovalRequest, ApprovalActionLog
from .serializers import ApprovalPolicySerializer, ApprovalRequestSerializer, ApprovalActionLogSerializer
from apps.core.permissions import HasTenantAccess
from apps.core.models import AuditLog

class ApprovalPolicyViewSet(viewsets.ModelViewSet):
    serializer_class = ApprovalPolicySerializer
    permission_classes = [permissions.IsAuthenticated, HasTenantAccess]
    module_name = "APPROVALS"

    def get_queryset(self):
        return ApprovalPolicy.objects.filter(organization=self.request.user.organization)

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.organization)


class ApprovalRequestViewSet(viewsets.ModelViewSet):
    serializer_class = ApprovalRequestSerializer
    permission_classes = [permissions.IsAuthenticated, HasTenantAccess]
    module_name = "APPROVALS"

    def get_queryset(self):
        return ApprovalRequest.objects.filter(organization=self.request.user.organization).select_related(
            "requester", "current_approver_role"
        ).prefetch_related("actions__actor")

    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.user.organization,
            requester=self.request.user
        )

    @action(detail=False, methods=["GET"])
    def pending_for_me(self, request):
        user = request.user
        qs = self.get_queryset().filter(status=ApprovalRequest.Status.PENDING)
        if not user.is_superuser and not user.is_org_admin:
            if user.active_role:
                qs = qs.filter(current_approver_role=user.active_role)
            else:
                qs = qs.none()
        return Response(ApprovalRequestSerializer(qs, many=True).data)

    @action(detail=True, methods=["POST"])
    def approve(self, request, pk=None):
        req_obj = self.get_object()
        comments = request.data.get("comments", "Approved")

        ApprovalActionLog.objects.create(
            organization=request.user.organization,
            approval_request=req_obj,
            actor=request.user,
            step_number=req_obj.current_step,
            action=ApprovalActionLog.Action.APPROVED,
            comments=comments
        )

        req_obj.status = ApprovalRequest.Status.APPROVED
        req_obj.save(update_fields=["status"])

        AuditLog.objects.create(
            organization=request.user.organization,
            user=request.user,
            action="APPROVE_REQUEST",
            module="APPROVALS",
            object_id=str(req_obj.id),
            object_repr=f"Approved: {req_obj.title}"
        )
        return Response(ApprovalRequestSerializer(req_obj).data)

    @action(detail=True, methods=["POST"])
    def reject(self, request, pk=None):
        req_obj = self.get_object()
        comments = request.data.get("comments", "Rejected")

        ApprovalActionLog.objects.create(
            organization=request.user.organization,
            approval_request=req_obj,
            actor=request.user,
            step_number=req_obj.current_step,
            action=ApprovalActionLog.Action.REJECTED,
            comments=comments
        )

        req_obj.status = ApprovalRequest.Status.REJECTED
        req_obj.save(update_fields=["status"])

        AuditLog.objects.create(
            organization=request.user.organization,
            user=request.user,
            action="REJECT_REQUEST",
            module="APPROVALS",
            object_id=str(req_obj.id),
            object_repr=f"Rejected: {req_obj.title} ({comments})"
        )
        return Response(ApprovalRequestSerializer(req_obj).data)
