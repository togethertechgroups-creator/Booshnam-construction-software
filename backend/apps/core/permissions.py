from rest_framework import permissions
from .models import RolePermission, Role

class HasTenantAccess(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return bool(request.user.organization or request.user.is_superuser)


class HasModulePermission(permissions.BasePermission):
    """
    Checks role-based matrix: (module, view/create/edit/delete/approve)
    """
    action_map = {
        "list": "can_view",
        "retrieve": "can_view",
        "create": "can_create",
        "update": "can_edit",
        "partial_update": "can_edit",
        "destroy": "can_delete",
        "approve": "can_approve",
        "reject": "can_approve",
    }

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.user.is_superuser or request.user.is_org_admin:
            return True

        module = getattr(view, "module_name", None)
        if not module:
            return True

        role = request.user.active_role
        if not role:
            return False

        required_perm = self.action_map.get(view.action, "can_view")
        perm = RolePermission.objects.filter(role=role, module=module).first()
        if not perm:
            return False

        return getattr(perm, required_perm, False)


def can_view_cost(user):
    """Check whether a user role is permitted to see financial/cost fields"""
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser or user.is_org_admin:
        return True
    if not user.active_role:
        return False
    # Site engineers, laborers, clients, subcontractors cannot view cost fields
    restricted_codes = [
        Role.RoleCode.LABOR,
        Role.RoleCode.SUBCONTRACTOR,
        Role.RoleCode.CLIENT,
    ]
    return user.active_role.code not in restricted_codes
