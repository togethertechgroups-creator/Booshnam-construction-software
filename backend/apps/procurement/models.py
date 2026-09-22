from django.db import models
from django.utils.translation import gettext_lazy as _
from apps.core.models import TenantModel, User
from apps.projects.models import Project

class Vendor(TenantModel):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50)
    contact_person = models.CharField(max_length=150, blank=True)
    phone = models.CharField(max_length=50, blank=True)
    email = models.EmailField(blank=True)
    tax_id = models.CharField(max_length=100, blank=True, help_text="GST / Tax Identification Number")
    address = models.TextField(blank=True)
    bank_account_no = models.CharField(max_length=100, blank=True)
    bank_name = models.CharField(max_length=100, blank=True)
    bank_ifsc_or_swift = models.CharField(max_length=50, blank=True)
    rating = models.DecimalField(max_digits=3, decimal_places=1, default=4.5)
    current_balance = models.DecimalField(max_digits=14, decimal_places=2, default=0.00, help_text="Outstanding payable balance")

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.code})"


class MaterialRequest(TenantModel):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", _("Draft")
        SUBMITTED = "SUBMITTED", _("Submitted for Approval")
        APPROVED = "APPROVED", _("Approved by PM/Owner")
        PO_CREATED = "PO_CREATED", _("PO Issued")
        REJECTED = "REJECTED", _("Rejected")

    request_number = models.CharField(max_length=50, unique=True)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="material_requests")
    requested_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="material_requests")
    needed_by_date = models.DateField()
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.SUBMITTED)
    total_estimated_cost = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    priority = models.CharField(max_length=20, default="NORMAL", choices=[("URGENT", "Urgent"), ("NORMAL", "Normal"), ("LOW", "Low")])
    site_notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.request_number} - {self.project.name} ({self.status})"


class MaterialRequestItem(TenantModel):
    material_request = models.ForeignKey(MaterialRequest, on_delete=models.CASCADE, related_name="items")
    item_name = models.CharField(max_length=255)
    unit = models.CharField(max_length=50, default="NOS")
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    estimated_rate = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    purpose = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return f"{self.item_name}: {self.quantity} {self.unit}"


class RFQ(TenantModel):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", _("Draft")
        SENT = "SENT", _("Quotes Requested")
        EVALUATION = "EVALUATION", _("Evaluating Quotations")
        AWARDED = "AWARDED", _("Vendor Selected & PO Created")
        CANCELLED = "CANCELLED", _("Cancelled")

    rfq_number = models.CharField(max_length=50, unique=True)
    material_request = models.ForeignKey(MaterialRequest, on_delete=models.SET_NULL, null=True, blank=True, related_name="rfqs")
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="rfqs")
    title = models.CharField(max_length=255)
    deadline_date = models.DateField()
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.SENT)

    def __str__(self):
        return f"{self.rfq_number} - {self.title}"


class RFQVendorQuote(TenantModel):
    rfq = models.ForeignKey(RFQ, on_delete=models.CASCADE, related_name="vendor_quotes")
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name="quotes")
    total_quote_amount = models.DecimalField(max_digits=14, decimal_places=2)
    delivery_days = models.PositiveIntegerField(default=3)
    is_selected = models.BooleanField(default=False)
    quote_reference = models.CharField(max_length=100, blank=True)
    remarks = models.TextField(blank=True)

    class Meta:
        unique_together = ("rfq", "vendor")

    def __str__(self):
        return f"{self.vendor.name} - ₹{self.total_quote_amount} for {self.rfq.rfq_number}"


class PurchaseOrder(TenantModel):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", _("Draft")
        ISSUED = "ISSUED", _("Issued to Vendor")
        PARTIALLY_RECEIVED = "PARTIALLY_RECEIVED", _("Partially Received")
        COMPLETED = "COMPLETED", _("Completed & Received")
        CANCELLED = "CANCELLED", _("Cancelled")

    po_number = models.CharField(max_length=50, unique=True)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="purchase_orders")
    vendor = models.ForeignKey(Vendor, on_delete=models.PROTECT, related_name="purchase_orders")
    material_request = models.ForeignKey(MaterialRequest, on_delete=models.SET_NULL, null=True, blank=True)
    rfq = models.ForeignKey(RFQ, on_delete=models.SET_NULL, null=True, blank=True)
    order_date = models.DateField()
    expected_delivery_date = models.DateField()
    subtotal = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    tax_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.ISSUED)
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    terms_and_conditions = models.TextField(blank=True)

    class Meta:
        ordering = ["-order_date", "-created_at"]

    def __str__(self):
        return f"{self.po_number} - {self.vendor.name} (₹{self.total_amount})"


class PurchaseOrderItem(TenantModel):
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name="items")
    item_name = models.CharField(max_length=255)
    unit = models.CharField(max_length=50, default="NOS")
    ordered_quantity = models.DecimalField(max_digits=12, decimal_places=2)
    unit_rate = models.DecimalField(max_digits=12, decimal_places=2)
    total_amount = models.DecimalField(max_digits=14, decimal_places=2)
    received_quantity = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    def __str__(self):
        return f"{self.item_name} ({self.ordered_quantity} {self.unit})"


class GoodsReceiptNote(TenantModel):
    class Status(models.TextChoices):
        RECEIVED = "RECEIVED", _("Received at Site")
        INSPECTED = "INSPECTED", _("Inspected & Accepted")
        DEFECTS_NOTED = "DEFECTS_NOTED", _("Discrepancy / Damaged")

    grn_number = models.CharField(max_length=50, unique=True)
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name="grns")
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="grns")
    received_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="received_grns")
    challan_number = models.CharField(max_length=100, help_text="Delivery Challan / Gate Pass No")
    vehicle_number = models.CharField(max_length=50, blank=True)
    receipt_date = models.DateField()
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.INSPECTED)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-receipt_date", "-created_at"]

    def __str__(self):
        return f"{self.grn_number} for PO {self.purchase_order.po_number}"


class GRNItem(TenantModel):
    grn = models.ForeignKey(GoodsReceiptNote, on_delete=models.CASCADE, related_name="items")
    po_item = models.ForeignKey(PurchaseOrderItem, on_delete=models.CASCADE, related_name="grn_entries")
    received_quantity = models.DecimalField(max_digits=12, decimal_places=2)
    accepted_quantity = models.DecimalField(max_digits=12, decimal_places=2)
    rejected_quantity = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    remarks = models.TextField(blank=True)

    def __str__(self):
        return f"{self.po_item.item_name}: Accepted {self.accepted_quantity}"


class Invoice(TenantModel):
    class MatchStatus(models.TextChoices):
        PENDING = "PENDING", _("Pending 3-Way Verification")
        MATCHED = "MATCHED", _("3-Way Match Verified")
        DISCREPANCY = "DISCREPANCY", _("Price/Quantity Discrepancy")

    class PaymentStatus(models.TextChoices):
        UNPAID = "UNPAID", _("Unpaid")
        PARTIALLY_PAID = "PARTIALLY_PAID", _("Partially Paid")
        PAID = "PAID", _("Paid")

    invoice_number = models.CharField(max_length=50, unique=True)
    vendor_invoice_ref = models.CharField(max_length=100)
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name="invoices")
    grn = models.ForeignKey(GoodsReceiptNote, on_delete=models.SET_NULL, null=True, blank=True, related_name="invoices")
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="invoices")
    vendor = models.ForeignKey(Vendor, on_delete=models.PROTECT, related_name="invoices")
    invoice_date = models.DateField()
    due_date = models.DateField()
    subtotal = models.DecimalField(max_digits=14, decimal_places=2)
    tax_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    total_amount = models.DecimalField(max_digits=14, decimal_places=2)
    match_status = models.CharField(max_length=30, choices=MatchStatus.choices, default=MatchStatus.PENDING)
    payment_status = models.CharField(max_length=30, choices=PaymentStatus.choices, default=PaymentStatus.UNPAID)
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="approved_invoices")
    match_notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-invoice_date", "-created_at"]

    def __str__(self):
        return f"INV-{self.invoice_number} ({self.vendor.name} - ₹{self.total_amount})"


class VendorLedgerEntry(TenantModel):
    class EntryType(models.TextChoices):
        INVOICE_BOOKED = "INVOICE_BOOKED", _("Invoice Booked (Credit)")
        PAYMENT_MADE = "PAYMENT_MADE", _("Payment Made (Debit)")
        CREDIT_NOTE = "CREDIT_NOTE", _("Credit Note (Debit)")

    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name="ledger_entries")
    project = models.ForeignKey(Project, on_delete=models.SET_NULL, null=True, blank=True)
    entry_type = models.CharField(max_length=30, choices=EntryType.choices)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    running_balance = models.DecimalField(max_digits=14, decimal_places=2)
    reference_number = models.CharField(max_length=100)
    transaction_date = models.DateField()
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-transaction_date", "-created_at"]

    def __str__(self):
        return f"{self.vendor.name} - {self.entry_type}: ₹{self.amount}"


class StockItem(TenantModel):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="stock_items")
    item_name = models.CharField(max_length=255)
    category = models.CharField(max_length=100, default="Civil")
    unit = models.CharField(max_length=50, default="NOS")
    current_quantity = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    minimum_threshold = models.DecimalField(max_digits=12, decimal_places=2, default=10.00)
    reorder_quantity = models.DecimalField(max_digits=12, decimal_places=2, default=50.00)

    class Meta:
        unique_together = ("project", "item_name")
        ordering = ["item_name"]

    def __str__(self):
        return f"{self.item_name} @ {self.project.name}: {self.current_quantity} {self.unit}"
