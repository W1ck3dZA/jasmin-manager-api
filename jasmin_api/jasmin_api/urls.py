from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

from rest_framework.routers import DefaultRouter

from rest_api.views import (
    GroupViewSet, UserViewSet, MORouterViewSet, SMPPCCMViewSet, HTTPCCMViewSet, MTRouterViewSet, FiltersViewSet
)

router = DefaultRouter(trailing_slash=False)
router.register(r'groups', GroupViewSet, basename='groups')
router.register(r'users', UserViewSet, basename='users')
router.register(r'morouters', MORouterViewSet, basename='morouters')
router.register(r'mtrouters', MTRouterViewSet, basename='mtrouters')
router.register(r'smppsconns', SMPPCCMViewSet, basename='smppcons')
router.register(r'httpsconns', HTTPCCMViewSet, basename='httpcons')
router.register(r'filters', FiltersViewSet, basename='filters')

urlpatterns = [
    path('api/', include(router.urls)),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]
