from datetime import datetime, time
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction

from .models import Worker, AttendanceRecord, PayrollBatch, PayrollItem, calculate_haversine_distance
from .serializers import WorkerSerializer, AttendanceRecordSerializer, PayrollBatchSerializer, PayrollItemSerializer
from apps.projects.models import Project
from apps.core.permissions import HasTenantAccess, can_view_cost
from apps.core.models import AuditLog

class WorkerViewSet(viewsets.ModelViewSet):
    serializer_class = WorkerSerializer
    permission_classes = [permissions.IsAuthenticated, HasTenantAccess]
    module_name = "WORKFORCE"

    def get_queryset(self):
        qs = Worker.objects.filter(organization=self.request.user.organization, is_deleted=False)
        project_id = self.request.query_params.get("project")
        if project_id:
            qs = qs.filter(assigned_project_id=project_id)
        return qs

    def perform_create(self, serializer):
        count = Worker.objects.filter(organization=self.request.user.organization).count() + 1
        emp_id = f"EMP-{count:04d}"
        serializer.save(
            organization=self.request.user.organization,
            employee_id=emp_id
        )


class AttendanceViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceRecordSerializer
    permission_classes = [permissions.IsAuthenticated, HasTenantAccess]
    module_name = "WORKFORCE"

    def get_queryset(self):
        qs = AttendanceRecord.objects.filter(organization=self.request.user.organization)
        project_id = self.request.query_params.get("project")
        date_str = self.request.query_params.get("date")
        if project_id:
            qs = qs.filter(project_id=project_id)
        if date_str:
            qs = qs.filter(date=date_str)
        return qs.select_related("worker", "project")

    @action(detail=False, methods=["POST"])
    def clock_in(self, request):
        """
        GPS-based Clock-in with Geofence verification.
        """
        worker_id = request.data.get("worker_id")
        project_id = request.data.get("project_id")
        lat = request.data.get("latitude")
        lng = request.data.get("longitude")
        override = request.data.get("override", False)
        override_reason = request.data.get("override_reason", "")

        if not worker_id or not project_id or lat is None or lng is None:
            return Response({"error": "worker_id, project_id, latitude and longitude are required"}, status=400)

        project = Project.objects.filter(id=project_id, organization=request.user.organization).first()
        worker = Worker.objects.filter(id=worker_id, organization=request.user.organization).first()

        if not project or not worker:
            return Response({"error": "Invalid project or worker"}, status=404)

        # Calculate distance to project geocenter
        distance = calculate_haversine_distance(lat, lng, project.latitude, project.longitude)
        inside_geofence = distance <= project.geofence_radius_meters

        today = timezone.now().date()
        now_time = timezone.now().time()

        if not inside_geofence and not override:
            return Response({
                "status": "GEOFENCE_VIOLATION",
                "message": f"Worker is {distance}m away from site. Maximum allowed radius is {project.geofence_radius_meters}m.",
                "distance_meters": distance,
                "allowed_radius_meters": project.geofence_radius_meters,
                "requires_supervisor_override": True
            }, status=status.HTTP_400_BAD_REQUEST)

        record, created = AttendanceRecord.objects.update_or_create(
            organization=request.user.organization,
            project=project,
            worker=worker,
            date=today,
            defaults={
                "clock_in_time": now_time,
                "clock_in_latitude": lat,
                "clock_in_longitude": lng,
                "distance_from_site_meters": distance,
                "is_inside_geofence": inside_geofence,
                "status": AttendanceRecord.Status.PRESENT,
                "supervisor_override": override,
                "override_reason": override_reason,
            }
        )

        return Response(AttendanceRecordSerializer(record).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=False, methods=["GET"])
    def roster(self, request):
        """Today's headcount summary grouped by trade skill"""
        project_id = request.query_params.get("project")
        today = request.query_params.get("date", timezone.now().date())
        qs = AttendanceRecord.objects.filter(organization=request.user.organization, date=today)
        if project_id:
            qs = qs.filter(project_id=project_id)

        records = qs.select_related("worker")
        total_present = records.count()
        inside_geofence_count = records.filter(is_inside_geofence=True).count()
        overridden_count = records.filter(supervisor_override=True).count()

        by_trade = {}
        for r in records:
            trade = r.worker.get_trade_skill_display()
            by_trade[trade] = by_trade.get(trade, 0) + 1

        return Response({
            "date": str(today),
            "total_present": total_present,
            "inside_geofence": inside_geofence_count,
            "supervisor_overrides": overridden_count,
            "trade_breakdown": [{"trade": k, "count": v} for k, v in by_trade.items()]
        })


class PayrollBatchViewSet(viewsets.ModelViewSet):
    serializer_class = PayrollBatchSerializer
    permission_classes = [permissions.IsAuthenticated, HasTenantAccess]
    module_name = "WORKFORCE"

    def get_queryset(self):
        user = self.request.user
        if not can_view_cost(user):
            return PayrollBatch.objects.none()
        qs = PayrollBatch.objects.filter(organization=user.organization)
        project_id = self.request.query_params.get("project")
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs.select_related("project", "approved_by")

    @action(detail=False, methods=["POST"])
    def generate(self, request):
        project_id = request.data.get("project_id")
        start_date = request.data.get("start_date")
        end_date = request.data.get("end_date")

        if not project_id or not start_date or not end_date:
            return Response({"error": "project_id, start_date, end_date required"}, status=400)

        project = Project.objects.filter(id=project_id, organization=request.user.organization).first()
        if not project:
            return Response({"error": "Project not found"}, status=404)

        with transaction.atomic():
            count = PayrollBatch.objects.filter(organization=request.user.organization).count() + 1
            batch = PayrollBatch.objects.create(
                organization=request.user.organization,
                project=project,
                batch_number=f"PAYROLL-{count:04d}",
                period_start=start_date,
                period_end=end_date,
            )

            # Query attendance records in date range
            records = AttendanceRecord.objects.filter(
                organization=request.user.organization,
                project=project,
                date__gte=start_date,
                date__lte=end_date
            ).select_related("worker")

            worker_map = {}
            for r in records:
                wid = str(r.worker.id)
                if wid not in worker_map:
                    worker_map[wid] = {
                        "worker": r.worker,
                        "days": 0.0,
                        "ot_hours": 0.0
                    }
                worker_map[wid]["days"] += 1.0 if r.status in [AttendanceRecord.Status.PRESENT, AttendanceRecord.Status.OVERTIME] else 0.5
                worker_map[wid]["ot_hours"] += float(r.overtime_hours)

            total_gross = 0.0
            for wid, item in worker_map.items():
                w = item["worker"]
                reg_wage = float(w.daily_wage_rate) * item["days"]
                ot_amt = float(w.hourly_overtime_rate) * item["ot_hours"]
                gross = reg_wage + ot_amt
                net = gross  # deductions = 0 default

                PayrollItem.objects.create(
                    organization=request.user.organization,
                    payroll_batch=batch,
                    worker=w,
                    present_days=item["days"],
                    regular_wage=reg_wage,
                    overtime_hours=item["ot_hours"],
                    overtime_amount=ot_amt,
                    deductions=0.0,
                    net_payable=net
                )
                total_gross += gross

            batch.total_workers = len(worker_map)
            batch.total_gross_amount = total_gross
            batch.save(update_fields=["total_workers", "total_gross_amount"])

        return Response(PayrollBatchSerializer(batch).data, status=status.HTTP_201_CREATED)
