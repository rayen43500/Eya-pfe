from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Count
from .models import Delivery
from orders.models import Order
from .serializers import DeliverySerializer
import logging

logger = logging.getLogger(__name__)

# Create your views here.

class DeliveryViewSet(viewsets.ModelViewSet):
    serializer_class = DeliverySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Retourne toutes les livraisons"""
        queryset = Delivery.objects.all()
        logger.info(f"Nombre total de livraisons: {queryset.count()}")
        return queryset

    @action(detail=False, methods=['get'])
    def shipped(self, request):
        """Récupérer toutes les livraisons avec le statut 'shipped'"""
        try:
            # Récupérer toutes les commandes expédiées
            shipped_orders = Order.objects.filter(status='shipped')
            logger.info(f"Nombre de commandes expédiées trouvées: {shipped_orders.count()}")

            # Créer des livraisons pour les commandes qui n'en ont pas
            for order in shipped_orders:
                if not hasattr(order, 'delivery'):
                    logger.info(f"Création d'une livraison pour la commande #{order.id}")
                    Delivery.objects.create(
                        order=order,
                        status='shipped',
                        delivery_date=timezone.now()
                    )

            # Récupérer toutes les livraisons avec le statut 'shipped'
            deliveries = self.get_queryset().filter(status='shipped')
            
            # Log pour le débogage
            logger.info(f"Nombre de livraisons expédiées trouvées: {deliveries.count()}")
            for delivery in deliveries:
                logger.info(f"Livraison trouvée - ID: {delivery.id}, "
                          f"Order: #{delivery.order_number}, "
                          f"Client: {delivery.customer_name}, "
                          f"Status: {delivery.status}")

            serializer = self.get_serializer(deliveries, many=True)
            return Response({
                'status': 'success',
                'count': deliveries.count(),
                'data': serializer.data
            })
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des livraisons: {str(e)}")
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Récupérer les statistiques des livraisons"""
        try:
            today = timezone.now().date()
            
            # S'assurer que toutes les commandes expédiées ont des livraisons
            shipped_orders = Order.objects.filter(status='shipped', delivery__isnull=True)
            for order in shipped_orders:
                Delivery.objects.create(
                    order=order,
                    status='shipped',
                    delivery_date=timezone.now()
                )
            
            # Calculer les statistiques
            today_deliveries = self.get_queryset().filter(delivery_date__date=today)
            shipped_deliveries = self.get_queryset().filter(status='shipped')
            completed_deliveries = self.get_queryset().filter(
                status='delivered',
                delivery_date__date=today
            )

            # Log pour le débogage
            logger.info(f"Statistiques - "
                       f"Aujourd'hui: {today_deliveries.count()}, "
                       f"En cours: {shipped_deliveries.count()}, "
                       f"Terminées: {completed_deliveries.count()}")

            stats = {
                'today': today_deliveries.count(),
                'inProgress': shipped_deliveries.count(),
                'completed': completed_deliveries.count()
            }
            return Response(stats)
        except Exception as e:
            logger.error(f"Erreur lors du calcul des statistiques: {str(e)}")
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['patch'])
    def status(self, request, pk=None):
        """Mettre à jour le statut d'une livraison"""
        try:
            delivery = self.get_object()
            new_status = request.data.get('status')
            
            logger.info(f"Tentative de mise à jour du statut - "
                       f"Livraison ID: {delivery.id}, "
                       f"Ancien statut: {delivery.status}, "
                       f"Nouveau statut: {new_status}")
            
            if new_status not in dict(Delivery.STATUS_CHOICES):
                return Response({
                    'status': 'error',
                    'message': 'Statut invalide'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Mettre à jour le statut de la livraison
            delivery.status = new_status
            delivery.save()
            
            # Mettre à jour le statut de la commande associée
            if new_status == 'delivered':
                delivery.order.status = 'delivered'
            elif new_status == 'cancelled':
                delivery.order.status = 'cancelled'
            delivery.order.save()
            
            serializer = self.get_serializer(delivery)
            return Response({
                'status': 'success',
                'data': serializer.data
            })
        except Exception as e:
            logger.error(f"Erreur lors de la mise à jour du statut: {str(e)}")
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def handle_exception(self, exc):
        """Gérer les exceptions de manière personnalisée"""
        logger.error(f"Exception non gérée: {str(exc)}")
        if isinstance(exc, Exception):
            return Response({
                'status': 'error',
                'message': str(exc)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return super().handle_exception(exc)
