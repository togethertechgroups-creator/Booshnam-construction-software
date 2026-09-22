from django.utils.deprecation import MiddlewareMixin
from .models import Organization

class TenantMiddleware(MiddlewareMixin):
    def process_request(self, request):
        request.organization = None
        
        # 1. Look for explicit header
        org_id = request.headers.get("X-Organization-ID")
        if org_id:
            try:
                request.organization = Organization.objects.filter(id=org_id, is_active=True).first()
            except Exception:
                pass

        # 2. Fall back to authenticated user's organization
        if not request.organization and getattr(request, "user", None) and request.user.is_authenticated:
            request.organization = getattr(request.user, "organization", None)
            
        return None
