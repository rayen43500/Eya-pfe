"""
URL configuration for auth_project project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from accounts.api import ClientRegisterAPI, LoginAPI, UserViewSet  # Importez également votre vue API de connexion
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)
from rest_framework.routers import DefaultRouter

# Créer un routeur pour les viewsets
router = DefaultRouter()
router.register(r'users', UserViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('accounts/', include('accounts.urls')),
    
    # Alias pour l'API d'inscription
    path('api/auth/register/', ClientRegisterAPI.as_view(), name='api_auth_register'),
    # Alias pour l'API de connexion
    path('api/auth/login/', LoginAPI.as_view(), name='api_auth_login'),
    
    # URLs pour les nouvelles applications
    path('api/', include('products.urls')),
    path('api/', include('orders.urls')),
    path('api/', include('promotions.urls')),
    path('api/', include('categories.urls')),
    path('api/', include('deliveries.urls')),  # Nouvelles URLs
    
    # Route directe pour les promotions (sans authentification)
    path('api/promotions-direct/', include('promotions.urls')),
    
    # JWT Token endpoints
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    
    # Ajouter les routes du routeur API
    path('api/', include(router.urls)),
]

# Ajouter la configuration pour servir les médias en développement
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
