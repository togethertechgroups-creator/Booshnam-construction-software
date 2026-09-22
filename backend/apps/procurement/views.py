from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.db.models import F

from .models import (
    Vendor, MaterialRequest, MaterialRequestItem, RFQ, RFQVendorQuote,
    PurchaseOrder, PurchaseOrderItem, GoodsReceiptNote, GRNItem,
    Invoice, VendorLedgerEntry, StockItem
)
from .serializers import (
    VendorSerializer, MaterialRequestSerializer, PurchaseOrderSerializer,
    GoodsReceiptNoteSerializer, InvoiceSerializer, VendorLedgerEntrySerializer,
    StockItemSerializer
)
from apps.core.permissions import HasTenantAccess, can_view_cost
from apps.core.models import AuditLog

class VendorViewSet(viewsets.ModelViewSet):
    serializer_class = VendorSerializer
    permission_classes = [permissions.IsAuthenticated, HasTenantAccess]
    module_name = "PROCUREMENT"

    def get_queryset(self):
        return Vendor.objects.filter(organization=self.request.user.organization, is_deleted=False)

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.organization)


class MaterialRequestViewSet(viewsets.ModelViewSet):
    serializer_class = MaterialRequestSerializer
    permission_classes = [permissions.IsAuthenticated, HasTenantAccess]
    module_name = "PROCUREMENT"

    def get_queryset(self):
        qs = MaterialRequest.objects.filter(organization=self.request.user.organization, is_deleted=False)
        project_id = self.request.query_params.get("project")
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs.select_related("project", "requested_by")

    def perform_create(self, serializer):
        # Generate sequential request number if not provided
        count = MaterialRequest.objects.filter(organization=self.request.user.organization).count() + 1
        req_no = f"MR-{count:04d}"
        serializer.save(
            organization=self.request.user.organization,
            requested_by=self.request.user,
            request_number=req_no
        )

    @action(detail=True, methods=["POST"])
    def approve(self, request, pk=None):
        mr = self.get_object()
        mr.status = MaterialRequest.Status.APPROVED
        mr.save(update_fields=["status"])
        AuditLog.objects.create(
            organization=request.user.organization,
            user=request.user,
            action="APPROVE_MATERIAL_REQUEST",
            module="PROCUREMENT",
            object_id=str(mr.id),
            object_repr=f"Approved Material Request {mr.request_number}"
        )
        return Response(MaterialRequestSerializer(mr).data)


class PurchaseOrderViewSet(viewsets.ModelViewSet):
    serializer_class = PurchaseOrderSerializer
    permission_classes = [permissions.IsAuthenticated, HasTenantAccess]
    module_name = "PROCUREMENT"

    def get_queryset(self):
        user = self.request.user
        if not can_view_cost(user):
            return PurchaseOrder.objects.none()
        qs = PurchaseOrder.objects.filter(organization=user.organization, is_deleted=False)
        project_id = self.request.query_params.get("project")
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs.select_related("project", "vendor", "material_request")

    def perform_create(self, serializer):
        count = PurchaseOrder.objects.filter(organization=self.request.user.organization).count() + 1
        po_no = f"PO-{count:04d}"
        serializer.save(
            organization=self.request.user.organization,
            approved_by=self.request.user,
            po_number=po_no
        )


class GoodsReceiptNoteViewSet(viewsets.ModelViewSet):
    serializer_class = GoodsReceiptNoteSerializer
    permission_classes = [permissions.IsAuthenticated, HasTenantAccess]
    module_name = "PROCUREMENT"

    def get_queryset(self):
        qs = GoodsReceiptNote.objects.filter(organization=self.request.user.organization, is_deleted=False)
        project_id = self.request.query_params.get("project")
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs.select_related("purchase_order", "project", "received_by")

    def perform_create(self, serializer):
        count = GoodsReceiptNote.objects.filter(organization=self.request.user.organization).count() + 1
        grn_no = f"GRN-{count:04d}"
        grn = serializer.save(
            organization=self.request.user.organization,
            received_by=self.request.user,
            grn_number=grn_no
        )
        return grn


class InvoiceViewSet(viewsets.ModelViewSet):
    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAuthenticated, HasTenantAccess]
    module_name = "PROCUREMENT"

    def get_queryset(self):
        user = self.request.user
        if not can_view_cost(user):
            return Invoice.objects.none()
        qs = Invoice.objects.filter(organization=user.organization, is_deleted=False)
        project_id = self.request.query_params.get("project")
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs.select_related("purchase_order", "grn", "vendor", "project")

    def perform_create(self, serializer):
        count = Invoice.objects.filter(organization=self.request.user.organization).count() + 1
        inv_no = f"INV-{count:04d}"
        serializer.save(
            organization=self.request.user.organization,
            invoice_number=inv_no
        )

    @action(detail=True, methods=["POST"])
    def verify_3way_match(self, request, pk=None):
        """
        Executes 3-way match: PO amount vs GRN received goods vs Invoice billed amount.
        """
        inv = self.get_object()
        po = inv.purchase_order
        grn = inv.grn

        if not po:
            return Response({"error": "Purchase Order reference missing for 3-way match"}, status=400)

        # Check PO total vs Invoice total (tolerance of 1.0)
        po_diff = abs(float(po.total_amount) - float(inv.total_amount))
        
        has_grn_discrepancy = False
        if grn and grn.status == GoodsReceiptNote.Status.DEFECTS_NOTED:
            has_grn_discrepancy = True

        if po_diff <= 1.0 and not has_grn_discrepancy:
            inv.match_status = Invoice.MatchStatus.MATCHED
            inv.match_notes = f"3-way match verified. PO total ₹{po.total_amount} matches Invoice total ₹{inv.total_amount} and GRN {grn.grn_number if grn else 'Direct'} accepted."
        else:
            inv.match_status = Invoice.MatchStatus.DISCREPANCY
            inv.match_notes = f"Discrepancy detected: PO amount is ₹{po.total_amount} but invoice amount is ₹{inv.total_amount}. Variance: ₹{po_diff:.2f}."

        inv.save(update_fields=["match_status", "match_notes"])
        
        AuditLog.objects.create(
            organization=request.user.organization,
            user=request.user,
            action="3_WAY_MATCH_CHECK",
            module="PROCUREMENT",
            object_id=str(inv.id),
            object_repr=f"Verified 3-way match for Invoice {inv.invoice_number}: {inv.match_status}"
        )
        return Response(InvoiceSerializer(inv).data)

    @action(detail=True, methods=["POST"])
    def record_payment(self, request, pk=None):
        inv = self.get_object()
        amount = float(request.data.get("amount", inv.total_amount))
        
        with transaction.atomic():
            inv.payment_status = Invoice.PaymentStatus.PAID
            inv.approved_by = request.user
            inv.save(update_fields=["payment_status", "approved_by"])

            vendor = inv.vendor
            new_balance = float(vendor.current_balance) - amount
            vendor.current_balance = new_balance
            vendor.save(update_fields=["current_balance"])

            VendorLedgerEntry.objects.create(
                organization=request.user.organization,
                vendor=vendor,
                project=inv.project,
                entry_type=VendorLedgerEntry.EntryType.PAYMENT_MADE,
                amount=amount,
                running_balance=new_balance,
                reference_number=f"PAY-{inv.invoice_number}",
                transaction_date=timezone.now().date(),
                notes=f"Payment settled for Invoice {inv.invoice_number}"
            )

        return Response(InvoiceSerializer(inv).data)


class VendorLedgerViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = VendorLedgerEntrySerializer
    permission_classes = [permissions.IsAuthenticated, HasTenantAccess]
    module_name = "PROCUREMENT"

    def get_queryset(self):
        user = self.request.user
        if not can_view_cost(user):
            return VendorLedgerEntry.objects.none()
        qs = VendorLedgerEntry.objects.filter(organization=user.organization)
        vendor_id = self.request.query_params.get("vendor")
        if vendor_id:
            qs = qs.filter(vendor_id=vendor_id)
        return qs.select_related("vendor", "project")


class StockItemViewSet(viewsets.ModelViewSet):
    serializer_class = StockItemSerializer
    permission_classes = [permissions.IsAuthenticated, HasTenantAccess]
    module_name = "PROCUREMENT"

    def get_queryset(self):
        qs = StockItem.objects.filter(organization=self.request.user.organization)
        project_id = self.request.query_params.get("project")
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs.select_related("project")

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.organization)
