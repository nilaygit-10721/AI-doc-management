from django.contrib import admin
from django.urls import path, include  # Add 'include' to the import
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from documents.views import register
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/register/', register),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/', include('documents.urls')),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)