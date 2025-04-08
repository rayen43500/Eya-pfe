from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PromotionViewSet

router = DefaultRouter()
router.register(r'promotions', PromotionViewSet)

urlpatterns = [
    path('', include(router.urls)),
] 