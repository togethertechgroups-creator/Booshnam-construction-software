from rest_framework import serializers
from .models import Organization, User, Role, RolePermission, AuditLog

class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = [
            "id", "name", "slug", "registration_no", "address",
            "phone", "email", "currency", "logo", "is_active",
            "created_at"
        ]


class RolePermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = RolePermission
        fields = [
            "id", "module", "can_view", "can_create",
            "can_edit", "can_delete", "can_approve", "approval_limit"
        ]


class RoleSerializer(serializers.ModelSerializer):
    permissions = RolePermissionSerializer(many=True, read_only=True)

    class Meta:
        model = Role
        fields = ["id", "name", "code", "description", "is_system_role", "permissions"]


class UserSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source="organization.name", read_only=True)
    role_name = serializers.CharField(source="active_role.name", read_only=True)
    role_code = serializers.CharField(source="active_role.code", read_only=True)

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "first_name", "last_name",
            "phone", "organization", "organization_name",
            "active_role", "role_name", "role_code",
            "avatar", "is_org_admin", "is_site_worker"
        ]
        read_only_fields = ["id", "organization_name", "role_name", "role_code"]


class UserMeSerializer(UserSerializer):
    organization = OrganizationSerializer(read_only=True)
    active_role = RoleSerializer(read_only=True)
    permission_matrix = serializers.SerializerMethodField()

    class Meta(UserSerializer.Meta):
        fields = UserSerializer.Meta.fields + ["permission_matrix"]

    def get_permission_matrix(self, obj):
        if not obj.active_role:
            return {}
        perms = RolePermission.objects.filter(role=obj.active_role)
        return {
            p.module: {
                "can_view": p.can_view,
                "can_create": p.can_create,
                "can_edit": p.can_edit,
                "can_delete": p.can_delete,
                "can_approve": p.can_approve,
                "approval_limit": float(p.approval_limit),
            }
            for p in perms
        }


class AuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)
    user_email = serializers.CharField(source="user.email", read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            "id", "user", "user_name", "user_email", "action",
            "module", "object_id", "object_repr", "details",
            "ip_address", "timestamp"
        ]
