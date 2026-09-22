from rest_framework import serializers
from .models import (
    Vendor, MaterialRequest, MaterialRequestItem, RFQ, RFQVendorQuote,
    PurchaseOrder, PurchaseOrderItem, GoodsReceiptNote, GRNItem,
    Invoice, VendorLedgerEntry, StockItem
)

class VendorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = [
            "id", "name", "code", "contact_person", "phone", "email",
            "tax_id", "address", "bank_account_no", "bank_name",
            "bank_ifsc_or_swift", "rating", "current_balance"
        ]


class MaterialRequestItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaterialRequestItem
        fields = ["id", "item_name", "unit", "quantity", "estimated_rate", "purpose"]


class MaterialRequestSerializer(serializers.ModelSerializer):
    items = MaterialRequestItemSerializer(many=True, required=False)
    project_name = serializers.CharField(source="project.name", read_only=True)
    requested_by_name = serializers.CharField(source="requested_by.get_full_name", read_only=True)

    class Meta:
        model = MaterialRequest
        fields = [
            "id", "request_number", "project", "project_name", "requested_by",
            "requested_by_name", "needed_by_date", "status", "priority",
            "total_estimated_cost", "site_notes", "items", "created_at"
        ]

    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        request_obj = MaterialRequest.objects.create(**validated_data)
        total_est = 0
        for item in items_data:
            qty = item.get("quantity", 0)
            rate = item.get("estimated_rate", 0)
            total_est += qty * rate
            MaterialRequestItem.objects.create(
                organization=request_obj.organization,
                material_request=request_obj,
                **item
            )
        request_obj.total_estimated_cost = total_est
        request_obj.save(update_fields=["total_estimated_cost"])
        return request_obj


class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PurchaseOrderItem
        fields = ["id", "item_name", "unit", "ordered_quantity", "unit_rate", "total_amount", "received_quantity"]


class PurchaseOrderSerializer(serializers.ModelSerializer):
    items = PurchaseOrderItemSerializer(many=True, required=False)
    vendor_name = serializers.CharField(source="vendor.name", read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True)

    class Meta:
        model = PurchaseOrder
        fields = [
            "id", "po_number", "project", "project_name", "vendor",
            "vendor_name", "material_request", "order_date",
            "expected_delivery_date", "subtotal", "tax_amount",
            "total_amount", "status", "terms_and_conditions", "items", "created_at"
        ]

    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        po = PurchaseOrder.objects.create(**validated_data)
        subtotal = 0
        for item in items_data:
            ordered_qty = item.get("ordered_quantity", 0)
            unit_rate = item.get("unit_rate", 0)
            line_tot = ordered_qty * unit_rate
            subtotal += line_tot
            PurchaseOrderItem.objects.create(
                organization=po.organization,
                purchase_order=po,
                item_name=item.get("item_name"),
                unit=item.get("unit", "NOS"),
                ordered_quantity=ordered_qty,
                unit_rate=unit_rate,
                total_amount=line_tot
            )
        po.subtotal = subtotal
        po.tax_amount = round(subtotal * 0.18, 2)  # 18% standard GST default
        po.total_amount = po.subtotal + po.tax_amount
        po.save()
        return po


class GRNItemSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source="po_item.item_name", read_only=True)
    unit = serializers.CharField(source="po_item.unit", read_only=True)

    class Meta:
        model = GRNItem
        fields = ["id", "po_item", "item_name", "unit", "received_quantity", "accepted_quantity", "rejected_quantity", "remarks"]


class GoodsReceiptNoteSerializer(serializers.ModelSerializer):
    items = GRNItemSerializer(many=True, required=False)
    po_number = serializers.CharField(source="purchase_order.po_number", read_only=True)
    vendor_name = serializers.CharField(source="purchase_order.vendor.name", read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True)

    class Meta:
        model = GoodsReceiptNote
        fields = [
            "id", "grn_number", "purchase_order", "po_number", "vendor_name",
            "project", "project_name", "challan_number", "vehicle_number",
            "receipt_date", "status", "notes", "items", "created_at"
        ]


class InvoiceSerializer(serializers.ModelSerializer):
    vendor_name = serializers.CharField(source="vendor.name", read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True)
    po_number = serializers.CharField(source="purchase_order.po_number", read_only=True)
    grn_number = serializers.CharField(source="grn.grn_number", read_only=True)

    class Meta:
        model = Invoice
        fields = [
            "id", "invoice_number", "vendor_invoice_ref", "purchase_order",
            "po_number", "grn", "grn_number", "project", "project_name",
            "vendor", "vendor_name", "invoice_date", "due_date",
            "subtotal", "tax_amount", "total_amount", "match_status",
            "payment_status", "approved_by", "match_notes", "created_at"
        ]


class VendorLedgerEntrySerializer(serializers.ModelSerializer):
    vendor_name = serializers.CharField(source="vendor.name", read_only=True)

    class Meta:
        model = VendorLedgerEntry
        fields = [
            "id", "vendor", "vendor_name", "project", "entry_type",
            "amount", "running_balance", "reference_number",
            "transaction_date", "notes", "created_at"
        ]


class StockItemSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source="project.name", read_only=True)
    is_low_stock = serializers.SerializerMethodField()

    class Meta:
        model = StockItem
        fields = [
            "id", "project", "project_name", "item_name", "category",
            "unit", "current_quantity", "minimum_threshold",
            "reorder_quantity", "is_low_stock"
        ]

    def get_is_low_stock(self, obj):
        return obj.current_quantity <= obj.minimum_threshold
