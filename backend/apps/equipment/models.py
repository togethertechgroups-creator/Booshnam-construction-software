from django.db import models
from django.utils.translation import gettext_lazy as _
from apps.core.models import TenantModel
from apps.projects.models import Project
from apps.procurement.models import Vendor

class Asset(TenantModel):
    class Category(models.TextChoices):
        EARTHMOVING = "EARTHMOVING", _("Excavator / Backhoe / Bulldozer")
        LIFTING = "LIFTING", _("Tower Crane / Hydra / Forklift")
        CONCRETING = "CONCRETING", _("Transit Mixer / Concrete Pump")
        POWER = "POWER", _("Diesel Generator / Compressor")
        SURVEY = "SURVEY", _("Total Station / Dumpy Level / GPS")
        SCAFFOLDING = "SCAFFOLDING", _("Cuplock / Staging / Shuttering Sets")

    class Ownership(models.TextChoices):
        OWNED = "OWNED", _("Company Owned")
        RENTED = "RENTED", _("Rented / Leased")

    class Status(models.TextChoices):
        AVAILABLE = "AVAILABLE", _("Available in Yard")
        IN_USE = "IN_USE", _("Deployed on Site")
        MAINTENANCE = "MAINTENANCE", _("Under Maintenance / Repair")
        DECOMMISSIONED = "DECOMMISSIONED", _("Decommissioned")

    asset_code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=50, choices=Category.choices, default=Category.EARTHMOVING)
    ownership = models.CharField(max_length=30, choices=Ownership.choices, default=Ownership.OWNED)
    rental_vendor = models.ForeignKey(Vendor, on_delete=models.SET_NULL, null=True, blank=True)
    serial_number = models.CharField(max_length=100, blank=True)
    hourly_cost_rate = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    current_project = models.ForeignKey(Project, on_delete=models.SET_NULL, null=True, blank=True, related_name="allocated_assets")
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.AVAILABLE)
    meter_hours = models.DecimalField(max_digits=10, decimal_places=1, default=0.0)

    class Meta:
        ordering = ["asset_code"]

    def __str__(self):
        return f"{self.asset_code} - {self.name} ({self.status})"


class EquipmentAllocation(TenantModel):
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name="allocations")
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="equipment_allocations")
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    hours_logged = models.DecimalField(max_digits=8, decimal_places=1, default=0.0)
    operator_name = models.CharField(max_length=150, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-start_date"]

    def __str__(self):
        return f"{self.asset.asset_code} -> {self.project.name} ({self.start_date})"


class MaintenanceLog(TenantModel):
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name="maintenance_logs")
    service_date = models.DateField()
    service_type = models.CharField(max_length=100, default="Preventive Maintenance")
    cost = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    meter_reading = models.DecimalField(max_digits=10, decimal_places=1, default=0.0)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-service_date"]

    def __str__(self):
        return f"{self.asset.asset_code} - {self.service_type} on {self.service_date}"
