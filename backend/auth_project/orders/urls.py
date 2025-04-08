from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    OrderViewSet, 
    OrderListView, 
    OrderDetailView,
    AssignOrderToLivreurView,
    ValidateDeliveryView,
    PendingDeliveriesView,
    AvailableDeliveriesView
)

router = DefaultRouter()
router.register(r'orders', OrderViewSet)

urlpatterns = [
    # ViewSet URLs (inclut automatiquement les méthodes POST, GET, etc.)
    path('', include(router.urls)),
    
    # Custom order endpoints
    path('orders/', OrderListView.as_view(), name='order-list'),
    path('orders/<int:order_id>/', OrderDetailView.as_view(), name='order-detail'),
    
    # Livreur-specific URLs
    path('orders/<int:order_id>/assign/', AssignOrderToLivreurView.as_view(), name='assign-order'),
    path('orders/<int:order_id>/validate/', ValidateDeliveryView.as_view(), name='validate-delivery'),
    path('livreur/pending-deliveries/', PendingDeliveriesView.as_view(), name='pending-deliveries'),
    path('livreur/available-deliveries/', AvailableDeliveriesView.as_view(), name='available-deliveries'),
] 