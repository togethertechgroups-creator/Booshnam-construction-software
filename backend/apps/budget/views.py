from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, F
from .models import BudgetCategory, CostPlanItem, ChangeOrder
from .serializers import BudgetCategorySerializer, CostPlanItemSerializer, ChangeOrderSerializer
from apps.core.permissions import HasTenantAccess, can_view_cost
from apps.core.models import AuditLog

class BudgetCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = BudgetCategorySerializer
    permission_classes = [permissions.IsAuthenticated, HasTenantAccess]
    module_name = "BUDGET"

    def get_queryset(self):
        user = self.request.user
        if not can_view_cost(user):
            return BudgetCategory.objects.none()
        return BudgetCategory.objects.filter(organization=user.organization)

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.organization)


class CostPlanItemViewSet(viewsets.ModelViewSet):
    serializer_class = CostPlanItemSerializer
    permission_classes = [permissions.IsAuthenticated, HasTenantAccess]
    module_name = "BUDGET"

    def get_queryset(self):
        user = self.request.user
        if not can_view_cost(user):
            return CostPlanItem.objects.none()
        qs = CostPlanItem.objects.filter(organization=user.organization, is_deleted=False)
        project_id = self.request.query_params.get("project")
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs.select_related("category", "project")

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.organization)

    @action(detail=False, methods=["GET"])
    def summary(self, request):
        project_id = request.query_params.get("project")
        if not project_id:
            return Response({"error": "project query param required"}, status=status.HTTP_400_BAD_REQUEST)
        
        items = self.get_queryset().filter(project_id=project_id)
        
        # Category breakdown
        category_breakdown = {}
        for item in items:
            cat_type = item.category.category_type
            if cat_type not in category_breakdown:
                category_breakdown[cat_type] = {
                    "category": cat_type,
                    "planned_total": 0.0,
                    "actual_total": 0.0,
                    "variance": 0.0,
                }
            category_breakdown[cat_type]["planned_total"] += float(item.planned_amount)
            category_breakdown[cat_type]["actual_total"] += float(item.actual_amount)
            category_breakdown[cat_type]["variance"] = (
                category_breakdown[cat_type]["planned_total"] - category_breakdown[cat_type]["actual_total"]
            )

        total_planned = sum(c["planned_total"] for c in category_breakdown.values())
        total_actual = sum(c["actual_total"] for c in category_breakdown.values())

        return Response({
            "total_planned": total_planned,
            "total_actual": total_actual,
            "total_variance": total_planned - total_actual,
            "burn_rate_percent": round((total_actual / total_planned * 100), 1) if total_planned > 0 else 0,
            "categories": list(category_breakdown.values())
        })


class ChangeOrderViewSet(viewsets.ModelViewSet):
    serializer_class = ChangeOrderSerializer
    permission_classes = [permissions.IsAuthenticated, HasTenantAccess]
    module_name = "BUDGET"

    def get_queryset(self):
        user = self.request.user
        if not can_view_cost(user):
            return ChangeOrder.objects.none()
        qs = ChangeOrder.objects.filter(organization=user.organization, is_deleted=False)
        project_id = self.request.query_params.get("project")
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs.select_related("project", "requested_by", "approved_by")

    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.user.organization,
            requested_by=self.request.user
        )

    @action(detail=True, methods=["POST"])
    def approve(self, request, pk=None):
        order = self.get_object()
        order.status = ChangeOrder.Status.APPROVED
        order.approved_by = request.user
        order.approved_at = timezone.now()
        order.save(update_fields=["status", "approved_by", "approved_at"])
        
        # Update project budget
        project = order.project
        project.estimated_budget = F("estimated_budget") + order.cost_impact
        project.save(update_fields=["estimated_budget"])
        project.refresh_from_db()

        AuditLog.objects.create(
            organization=request.user.organization,
            user=request.user,
            action="APPROVE_CHANGE_ORDER",
            module="BUDGET",
            object_id=str(order.id),
            object_repr=f"Approved Change Order {order.order_number}"
        )
        return Response(ChangeOrderSerializer(order).data)

    @action(detail=True, methods=["POST"])
    def reject(self, request, pk=None):
        order = self.get_object()
        reason = request.data.get("reason", "No reason specified")
        order.status = ChangeOrder.Status.REJECTED
        order.rejection_reason = reason
        order.approved_by = request.user
        order.approved_at = timezone.now()
        order.save(update_fields=["status", "rejection_reason", "approved_by", "approved_at"])

        AuditLog.objects.create(
            organization=request.user.organization,
            user=request.user,
            action="REJECT_CHANGE_ORDER",
            module="BUDGET",
            object_id=str(order.id),
            object_repr=f"Rejected Change Order {order.order_number}: {reason}"
        )
        return Response(ChangeOrderSerializer(order).data)
