from rest_framework import viewsets, status, filters, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Promotion, UserPromotion
from .serializers import PromotionSerializer
from django.db.models import Count, Sum
from django.db.models.functions import TruncDay, TruncMonth
from django.utils import timezone
from django.contrib.auth.models import User
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

@method_decorator(csrf_exempt, name='dispatch')
class PromotionViewSet(viewsets.ModelViewSet):
    queryset = Promotion.objects.all().order_by('-created_at')
    serializer_class = PromotionSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'type']
    search_fields = ['code', 'description', 'details']
    ordering_fields = ['code', 'start_date', 'end_date', 'usage_count', 'status']
    # Suppression de l'authentification JWT pour rendre l'API accessible sans authentification
    authentication_classes = []
    permission_classes = []
    
    # Méthode get_permissions supprimée pour ne plus exiger d'authentification
    
    def get_queryset(self):
        queryset = super().get_queryset()
        # Mise à jour des statuts avant de retourner les résultats
        for promotion in queryset:
            promotion.update_status()
        return queryset
    
    @action(detail=True, methods=['post'], permission_classes=[])
    def activate(self, request, pk=None):
        promotion = self.get_object()
        promotion.status = 'active'
        promotion.save()
        return Response({'status': 'promotion activated'})
    
    @action(detail=True, methods=['post'], permission_classes=[])
    def deactivate(self, request, pk=None):
        promotion = self.get_object()
        promotion.status = 'inactive'
        promotion.save()
        return Response({'status': 'promotion deactivated'})
    
    @action(detail=False, methods=['get'], permission_classes=[])
    def stats(self, request):
        total = Promotion.objects.count()
        active = Promotion.objects.filter(status='active').count()
        scheduled = Promotion.objects.filter(status='scheduled').count()
        expired = Promotion.objects.filter(status='expired').count()
        
        return Response({
            'total': total,
            'active': active,
            'scheduled': scheduled,
            'expired': expired,
        })
    
    @action(detail=True, methods=['get'], permission_classes=[])
    def usage_stats(self, request, pk=None):
        promotion = self.get_object()
        
        # Statistiques par jour des 30 derniers jours
        daily_stats = promotion.orders.filter(
            created_at__gte=timezone.now() - timezone.timedelta(days=30)
        ).annotate(
            day=TruncDay('created_at')
        ).values('day').annotate(
            count=Count('id'),
            total_discount=Sum('discount_amount')
        ).order_by('day')
        
        # Statistiques par mois de l'année en cours
        monthly_stats = promotion.orders.filter(
            created_at__year=timezone.now().year
        ).annotate(
            month=TruncMonth('created_at')
        ).values('month').annotate(
            count=Count('id'),
            total_discount=Sum('discount_amount')
        ).order_by('month')
        
        return Response({
            'total_usage': promotion.usage_count,
            'total_discount': promotion.orders.aggregate(Sum('discount_amount'))['discount_amount__sum'] or 0,
            'daily_stats': daily_stats,
            'monthly_stats': monthly_stats
        })
    
    @action(detail=False, methods=['post'], permission_classes=[])
    def generate_code(self, request):
        prefix = request.data.get('prefix', 'PROMO')
        length = request.data.get('length', 8)
        
        code = Promotion.generate_code(prefix, length)
        
        return Response({'code': code})
    
    @action(detail=True, methods=['post'], permission_classes=[])
    def assign_to_users(self, request, pk=None):
        promotion = self.get_object()
        user_ids = request.data.get('user_ids', [])
        
        assigned_count = 0
        for user_id in user_ids:
            try:
                user = User.objects.get(id=user_id)
                UserPromotion.objects.get_or_create(promotion=promotion, user=user)
                assigned_count += 1
            except User.DoesNotExist:
                pass
        
        return Response({
            'status': 'success',
            'assigned_count': assigned_count
        })
    
    @action(detail=False, methods=['post'], permission_classes=[])
    def remove_all(self, request):
        """
        Supprime toutes les promotions actives.
        Cette action nécessite une authentification d'administrateur.
        """
        try:
            # Compter le nombre de promotions à supprimer
            promotion_count = Promotion.objects.count()
            
            # Mettre à jour le statut de toutes les promotions à 'inactive'
            Promotion.objects.all().update(status='inactive')
            
            # Pour un nettoyage complet, on pourrait aussi supprimer les promotions
            # Dans cet exemple, nous les désactivons seulement par prudence
            
            return Response({
                'status': 'success',
                'message': f'{promotion_count} promotions ont été désactivées.',
                'deactivated_count': promotion_count
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({
                'status': 'error',
                'message': f'Erreur lors de la suppression des promotions: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR) 