from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import DailyProgressReport, DPRManpower, DPRMaterialConsumed, SitePhoto, Snag
from .serializers import DPRSerializer, SitePhotoSerializer, SnagSerializer
from apps.core.permissions import HasTenantAccess
from apps.core.models import AuditLog

class DPRViewSet(viewsets.ModelViewSet):
    serializer_class = DPRSerializer
    permission_classes = [permissions.IsAuthenticated, HasTenantAccess]
    module_name = "SITE_OPS"

    def get_queryset(self):
        qs = DailyProgressReport.objects.filter(organization=self.request.user.organization, is_deleted=False)
        project_id = self.request.query_params.get("project")
        date_str = self.request.query_params.get("date")
        if project_id:
            qs = qs.filter(project_id=project_id)
        if date_str:
            qs = qs.filter(date=date_str)
        return qs.select_related("project", "supervisor", "approved_by").prefetch_related("manpower_records", "material_consumed", "photos")

    def perform_create(self, serializer):
        count = DailyProgressReport.objects.filter(organization=self.request.user.organization).count() + 1
        rep_no = f"DPR-{count:04d}"
        serializer.save(
            organization=self.request.user.organization,
            supervisor=self.request.user,
            report_number=rep_no
        )

    @action(detail=True, methods=["POST"])
    def sign_off(self, request, pk=None):
        dpr = self.get_object()
        dpr.status = DailyProgressReport.Status.APPROVED
        dpr.approved_by = request.user
        dpr.pm_remarks = request.data.get("remarks", "Approved by Project Manager")
        dpr.save(update_fields=["status", "approved_by", "pm_remarks"])
        
        AuditLog.objects.create(
            organization=request.user.organization,
            user=request.user,
            action="SIGN_OFF_DPR",
            module="SITE_OPS",
            object_id=str(dpr.id),
            object_repr=f"Signed off {dpr.report_number}"
        )
        return Response(DPRSerializer(dpr).data)


class SnagViewSet(viewsets.ModelViewSet):
    serializer_class = SnagSerializer
    permission_classes = [permissions.IsAuthenticated, HasTenantAccess]
    module_name = "SNAGS"

    def get_queryset(self):
        qs = Snag.objects.filter(organization=self.request.user.organization, is_deleted=False)
        project_id = self.request.query_params.get("project")
        status_val = self.request.query_params.get("status")
        if project_id:
            qs = qs.filter(project_id=project_id)
        if status_val:
            qs = qs.filter(status=status_val)
        return qs.select_related("project", "task", "raised_by", "assigned_to")

    def perform_create(self, serializer):
        count = Snag.objects.filter(organization=self.request.user.organization).count() + 1
        snag_no = f"SNAG-{count:04d}"
        serializer.save(
            organization=self.request.user.organization,
            raised_by=self.request.user,
            snag_number=snag_no
        )

    @action(detail=True, methods=["POST"])
    def mark_resolved(self, request, pk=None):
        snag = self.get_object()
        snag.status = Snag.Status.RESOLVED
        snag.resolution_notes = request.data.get("resolution_notes", "Work finished and ready for inspection")
        if "photo_after" in request.FILES:
            snag.photo_after = request.FILES["photo_after"]
        snag.save()
        return Response(SnagSerializer(snag).data)

    @action(detail=True, methods=["POST"])
    def verify_close(self, request, pk=None):
        snag = self.get_object()
        snag.status = Snag.Status.CLOSED
        snag.closed_at = timezone.now()
        snag.save(update_fields=["status", "closed_at"])
        
        AuditLog.objects.create(
            organization=request.user.organization,
            user=request.user,
            action="CLOSE_SNAG",
            module="SNAGS",
            object_id=str(snag.id),
            object_repr=f"Verified & Closed {snag.snag_number}"
        )
        return Response(SnagSerializer(snag).data)


class SitePhotoViewSet(viewsets.ModelViewSet):
    serializer_class = SitePhotoSerializer
    permission_classes = [permissions.IsAuthenticated, HasTenantAccess]
    module_name = "SITE_OPS"

    def get_queryset(self):
        qs = SitePhoto.objects.filter(organization=self.request.user.organization)
        project_id = self.request.query_params.get("project")
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs.select_related("project", "uploaded_by")

    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.user.organization,
            uploaded_by=self.request.user
        )
