from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from .models import Organization, User, Role, RolePermission, AuditLog
from .serializers import (
    OrganizationSerializer, UserSerializer, UserMeSerializer,
    RoleSerializer, RolePermissionSerializer, AuditLogSerializer
)

@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def me_view(request):
    """Returns current user details, active organization, and role permissions"""
    serializer = UserMeSerializer(request.user)
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def switch_role_view(request):
    """Allows demo/admin switching between roles in the active organization"""
    role_code = request.data.get("role_code")
    role_id = request.data.get("role_id")

    role = None
    if role_id:
        role = Role.objects.filter(id=role_id, organization=request.user.organization).first()
    elif role_code:
        role = Role.objects.filter(code=role_code, organization=request.user.organization).first()

    if not role:
        return Response({"error": "Role not found in current organization"}, status=status.HTTP_404_NOT_FOUND)

    request.user.active_role = role
    request.user.save(update_fields=["active_role"])
    
    AuditLog.objects.create(
        organization=request.user.organization,
        user=request.user,
        action="SWITCH_ROLE",
        module="SETTINGS",
        object_repr=f"Switched to {role.name}"
    )

    return Response(UserMeSerializer(request.user).data)


class OrganizationViewSet(viewsets.ModelViewSet):
    serializer_class = OrganizationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_superuser:
            return Organization.objects.all()
        if self.request.user.organization:
            return Organization.objects.filter(id=self.request.user.organization.id)
        return Organization.objects.none()


class RoleViewSet(viewsets.ModelViewSet):
    serializer_class = RoleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if not self.request.user.organization:
            return Role.objects.none()
        return Role.objects.filter(organization=self.request.user.organization)

    @action(detail=True, methods=["POST"])
    def update_permissions(self, request, pk=None):
        role = self.get_object()
        permissions_data = request.data.get("permissions", [])
        
        for perm in permissions_data:
            module = perm.get("module")
            if not module:
                continue
            RolePermission.objects.update_or_create(
                role=role,
                module=module,
                defaults={
                    "organization": role.organization,
                    "can_view": perm.get("can_view", True),
                    "can_create": perm.get("can_create", False),
                    "can_edit": perm.get("can_edit", False),
                    "can_delete": perm.get("can_delete", False),
                    "can_approve": perm.get("can_approve", False),
                    "approval_limit": perm.get("approval_limit", 0.0),
                }
            )
        return Response(RoleSerializer(role).data)


class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if not self.request.user.organization:
            return User.objects.none()
        return User.objects.filter(organization=self.request.user.organization)


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if not self.request.user.organization:
            return AuditLog.objects.none()
        return AuditLog.objects.filter(organization=self.request.user.organization)
