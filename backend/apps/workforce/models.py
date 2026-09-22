import math
from django.db import models
from django.utils.translation import gettext_lazy as _
from apps.core.models import TenantModel, User
from apps.projects.models import Project

def calculate_haversine_distance(lat1, lon1, lat2, lon2):
    """Calculates distance between two GPS coordinates in meters"""
    r = 6371000  # radius of Earth in meters
    phi1 = math.radians(float(lat1))
    phi2 = math.radians(float(lat2))
    delta_phi = math.radians(float(lat2) - float(lat1))
    delta_lambda = math.radians(float(lon2) - float(lon1))

    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(r * c, 2)


class Worker(TenantModel):
    class WorkerType(models.TextChoices):
        INTERNAL = "INTERNAL", _("Direct Company Labor")
        SUBCONTRACT = "SUBCONTRACT", _("Subcontractor Crew")
        SUPERVISOR = "SUPERVISOR", _("Site Supervisor / Foreman")

    class TradeSkill(models.TextChoices):
        MASON = "MASON", _("Mason / Bricklayer")
        CARPENTER = "CARPENTER", _("Carpenter / Shuttering")
        STEEL_FIXER = "STEEL_FIXER", _("Bar Bender / Steel Fixer")
        ELECTRICIAN = "ELECTRICIAN", _("Electrician")
        PLUMBER = "PLUMBER", _("Plumber / Pipefitter")
        PAINTER = "PAINTER", _("Painter / Finisher")
        OPERATOR = "OPERATOR", _("Heavy Equipment Operator")
        HELPER = "HELPER", _("General Site Helper")

    employee_id = models.CharField(max_length=50, unique=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    phone = models.CharField(max_length=50, blank=True)
    worker_type = models.CharField(max_length=30, choices=WorkerType.choices, default=WorkerType.INTERNAL)
    trade_skill = models.CharField(max_length=30, choices=TradeSkill.choices, default=TradeSkill.HELPER)
    subcontractor_name = models.CharField(max_length=150, blank=True)
    daily_wage_rate = models.DecimalField(max_digits=10, decimal_places=2, default=800.00)
    hourly_overtime_rate = models.DecimalField(max_digits=10, decimal_places=2, default=150.00)
    assigned_project = models.ForeignKey(Project, on_delete=models.SET_NULL, null=True, blank=True, related_name="assigned_workers")
    photo = models.ImageField(upload_to="workers/", blank=True, null=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["first_name", "last_name"]

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    def __str__(self):
        return f"{self.employee_id} - {self.full_name} ({self.get_trade_skill_display()})"


class AttendanceRecord(TenantModel):
    class Status(models.TextChoices):
        PRESENT = "PRESENT", _("Present (Full Day)")
        HALF_DAY = "HALF_DAY", _("Half Day")
        OVERTIME = "OVERTIME", _("Present + Overtime")
        ABSENT = "ABSENT", _("Absent")

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="attendance_records")
    worker = models.ForeignKey(Worker, on_delete=models.CASCADE, related_name="attendance_records")
    date = models.DateField(db_index=True)
    clock_in_time = models.TimeField(null=True, blank=True)
    clock_out_time = models.TimeField(null=True, blank=True)
    clock_in_latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    clock_in_longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    distance_from_site_meters = models.FloatField(default=0.0)
    is_inside_geofence = models.BooleanField(default=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PRESENT)
    regular_hours = models.DecimalField(max_digits=4, decimal_places=2, default=8.0)
    overtime_hours = models.DecimalField(max_digits=4, decimal_places=2, default=0.0)
    verification_photo = models.ImageField(upload_to="attendance_snaps/", blank=True, null=True)
    supervisor_override = models.BooleanField(default=False)
    override_reason = models.TextField(blank=True)

    class Meta:
        unique_together = ("worker", "date")
        ordering = ["-date", "-clock_in_time"]

    def __str__(self):
        return f"{self.worker.full_name} - {self.date}: {self.status} (Inside: {self.is_inside_geofence})"


class PayrollBatch(TenantModel):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", _("Draft")
        APPROVED = "APPROVED", _("Approved by Accounts/PM")
        PAID = "PAID", _("Disbursed")

    batch_number = models.CharField(max_length=50, unique=True)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="payroll_batches")
    period_start = models.DateField()
    period_end = models.DateField()
    total_workers = models.PositiveIntegerField(default=0)
    total_gross_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.DRAFT)
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-period_end"]

    def __str__(self):
        return f"{self.batch_number} ({self.period_start} to {self.period_end}) - ₹{self.total_gross_amount}"


class PayrollItem(TenantModel):
    payroll_batch = models.ForeignKey(PayrollBatch, on_delete=models.CASCADE, related_name="items")
    worker = models.ForeignKey(Worker, on_delete=models.PROTECT)
    present_days = models.DecimalField(max_digits=4, decimal_places=1, default=0.0)
    regular_wage = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    overtime_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0.0)
    overtime_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    deductions = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    net_payable = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    def __str__(self):
        return f"{self.worker.full_name} - Net: ₹{self.net_payable}"
