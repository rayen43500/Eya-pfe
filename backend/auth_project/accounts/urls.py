from django.urls import path
from . import views
from . import api

urlpatterns = [
    path('', views.home_view, name='home'),
    path('register/', views.register_view, name='register'),
    path('login/', views.login_view, name='login'),
    path('login/livreur/', views.login_livreur_view, name='login_livreur'),
    path('login/client/', views.login_client_view, name='login_client'),
    path('logout/', views.logout_view, name='logout'),
    path('admin-dashboard/', views.admin_dashboard, name='admin_dashboard'),
    path('livreur-dashboard/', views.livreur_dashboard, name='livreur_dashboard'),
    path('client-dashboard/', views.client_dashboard, name='client_dashboard'),
    
    path('api/login/', api.LoginAPI.as_view(), name='api_login'),
    path('api/logout/', api.LogoutAPI.as_view(), name='api_logout'),
    
    path('api/register/client/', api.ClientRegisterAPI.as_view(), name='api_register_client'),
    path('api/register/livreur/', api.LivreurRegisterAPI.as_view(), name='api_register_livreur'),
    path('api/register/admin/', api.AdminRegisterAPI.as_view(), name='api_register_admin'),
    
    path('api/profile/', api.UserProfileAPI.as_view(), name='api_profile'),
    
    path('api/admin/users/', api.AdminAPI.as_view(), name='api_admin_users'),
    path('api/livreur/data/', api.LivreurAPI.as_view(), name='api_livreur_data'),
    path('api/client/data/', api.ClientAPI.as_view(), name='api_client_data'),
    
    path('register/livreur/', views.register_livreur_view, name='register_livreur'),
    
    # API de connexion client
    path('api/login/client/', api.ClientLoginAPI.as_view(), name='api_login_client'),
    
    # API de connexion admin
    path('api/login/admin/', api.AdminLoginAPI.as_view(), name='api_login_admin'),

    # API de connexion livreur
    path('api/login/livreur/', api.LivreurLoginAPI.as_view(), name='api_login_livreur'),
    
    # Livreur specific APIs
    path('api/livreur/profile/', api.LivreurProfileAPI.as_view(), name='api_livreur_profile'),
    path('api/livreur/stats/', api.LivreurStatsAPI.as_view(), name='api_livreur_stats'),
    path('api/livreur/today-performance/', api.LivreurTodayPerformanceAPI.as_view(), name='api_livreur_today_performance'),
    path('api/livreur/availability/', api.LivreurAvailabilityAPI.as_view(), name='api_livreur_availability'),
    path('api/livreur/delivery-history/', api.LivreurDeliveryHistoryAPI.as_view(), name='api_livreur_delivery_history'),
    
    # API pour créer un administrateur
    path('api/admin/create/', api.AdminCreateAPI.as_view(), name='api_admin_create'),
] 