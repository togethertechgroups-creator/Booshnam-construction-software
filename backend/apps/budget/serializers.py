from rest_framework import serializers
from .models import BudgetCategory, CostPlanItem, ChangeOrder

class BudgetCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = BudgetCategory
        fields = ["id", "name", "category_type", "code", "description"]


class CostPlanItemSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    category_type = serializers.CharField(source="category.category_type", read_only=True)
    variance_amount = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    variance_percentage = serializers.FloatField(read_only=True)

    class Meta:
        model = CostPlanItem
        fields = [
            "id", "project", "category", "category_name", "category_type",
            "item_code", "description", "unit", "planned_quantity",
            "planned_rate", "planned_amount", "actual_quantity",
            "actual_amount", "variance_amount", "variance_percentage"
        ]


class ChangeOrderSerializer(serializers.ModelSerializer):
    requested_by_name = serializers.CharField(source="requested_by.get_full_name", read_only=True)
    approved_by_name = serializers.CharField(source="approved_by.get_full_name", read_only=True)

    class Meta:
        model = ChangeOrder
        fields = [
            "id", "project", "order_number", "title", "description",
            "reason", "cost_impact", "schedule_impact_days", "status",
            "requested_by", "requested_by_name", "approved_by",
            "approved_by_name", "approved_at", "rejection_reason",
            "created_at"
        ]
