from rest_framework import status, permissions, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes, action
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import (
    UserSerializer, LoginSerializer,
    ClientRegistrationSerializer, LivreurRegistrationSerializer, AdminRegistrationSerializer,
    ClientLoginSerializer, AdminLoginSerializer, AdminCreateSerializer,
    LivreurLoginSerializer, LivreurProfileSerializer, UserDetailSerializer
)
from .models import User, AdminProfile, LivreurProfile
from orders.models import Order
from django.utils import timezone
from datetime import timedelta

# Fonction utilitaire pour générer les tokens JWT
def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }

# API d'enregistrement de base
class BaseRegisterAPI(APIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = None  # À définir dans les sous-classes

    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            tokens = get_tokens_for_user(user)
            return Response({
                "user": UserSerializer(user).data,
                "access": tokens['access'],
                "refresh": tokens['refresh']
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# API d'enregistrement des clients
class ClientRegisterAPI(BaseRegisterAPI):
    serializer_class = ClientRegistrationSerializer

# API d'enregistrement des livreurs
class LivreurRegisterAPI(BaseRegisterAPI):
    serializer_class = LivreurRegistrationSerializer

# API d'enregistrement des admins
class AdminRegisterAPI(BaseRegisterAPI):
    serializer_class = AdminRegistrationSerializer
    permission_classes = [permissions.IsAdminUser]  # Seuls les admins existants peuvent créer d'autres admins

class LoginAPI(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        tokens = get_tokens_for_user(user)
        
        return Response({
            "user": UserSerializer(user).data,
            "access": tokens['access'],
            "refresh": tokens['refresh']
        })

class LogoutAPI(APIView):
    def post(self, request, *args, **kwargs):
        # Pour JWT, le logout côté client efface juste les tokens
        # Côté serveur, on pourrait ajouter le token à une blacklist si nécessaire
        return Response({"message": "Déconnexion réussie."})

class UserProfileAPI(APIView):
    def get(self, request, *args, **kwargs):
        return Response(UserSerializer(request.user).data)

# API pour les administrateurs
class AdminAPI(APIView):
    def get(self, request, *args, **kwargs):
        if not request.user.is_admin_user():
            return Response({"error": "Accès non autorisé"}, status=status.HTTP_403_FORBIDDEN)
        
        # Liste tous les utilisateurs (exemple d'action admin)
        users = User.objects.all()
        return Response(UserSerializer(users, many=True).data)

# API pour les livreurs
class LivreurAPI(APIView):
    def get(self, request, *args, **kwargs):
        if not request.user.is_livreur():
            return Response({"error": "Accès non autorisé"}, status=status.HTTP_403_FORBIDDEN)
        
        # Exemple de données pour un livreur
        return Response({"message": "Données du livreur", "livraisons": []})

# API pour le profil livreur
class LivreurProfileAPI(APIView):
    def get(self, request, *args, **kwargs):
        """Get the current livreur's profile information"""
        if not request.user.is_livreur():
            return Response({"error": "Accès non autorisé"}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            profile = request.user.livreur_profile
            serializer = LivreurProfileSerializer(profile)
            return Response(serializer.data)
        except LivreurProfile.DoesNotExist:
            return Response({"error": "Profil de livreur non trouvé"}, status=status.HTTP_404_NOT_FOUND)

# API pour les statistiques du livreur
class LivreurStatsAPI(APIView):
    def get(self, request, *args, **kwargs):
        """Get statistics for the current livreur"""
        if not request.user.is_livreur():
            return Response({"error": "Accès non autorisé"}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            profile = request.user.livreur_profile
            
            # Count pending deliveries
            pending_deliveries = Order.objects.filter(
                livreur=request.user,
                status='shipped'
            ).count()
            
            return Response({
                "total_deliveries": profile.total_deliveries,
                "total_pending": pending_deliveries,
                "rating": profile.rating,
                "is_available": profile.is_available,
                "vehicle_type": profile.get_vehicle_type_display()
            })
        except LivreurProfile.DoesNotExist:
            return Response({"error": "Profil de livreur non trouvé"}, status=status.HTTP_404_NOT_FOUND)

# API pour les performances du jour du livreur
class LivreurTodayPerformanceAPI(APIView):
    def get(self, request, *args, **kwargs):
        """Get today's performance metrics for the livreur"""
        if not request.user.is_livreur():
            return Response({"error": "Accès non autorisé"}, status=status.HTTP_403_FORBIDDEN)

        # Get today's start and end
        today = timezone.now().date()
        today_start = timezone.make_aware(timezone.datetime.combine(today, timezone.datetime.min.time()))
        today_end = timezone.make_aware(timezone.datetime.combine(today, timezone.datetime.max.time()))
        
        # Get orders delivered today
        delivered_today = Order.objects.filter(
            livreur=request.user,
            status='delivered',
            updated_at__range=(today_start, today_end)
        )
        
        # Calculate metrics
        total_delivered = delivered_today.count()
        total_amount = sum(order.total_amount for order in delivered_today)
        
        return Response({
            "date": today.strftime('%Y-%m-%d'),
            "total_delivered": total_delivered,
            "total_amount": total_amount,
        })

# API pour mettre à jour la disponibilité du livreur
class LivreurAvailabilityAPI(APIView):
    def patch(self, request, *args, **kwargs):
        """Update livreur availability status"""
        if not request.user.is_livreur():
            return Response({"error": "Accès non autorisé"}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            profile = request.user.livreur_profile
            is_available = request.data.get('is_available')
            
            if is_available is None:
                return Response({"error": "is_available field is required"}, status=status.HTTP_400_BAD_REQUEST)
            
            profile.is_available = is_available
            profile.save()
            
            return Response({
                "success": True,
                "is_available": profile.is_available
            })
        except LivreurProfile.DoesNotExist:
            return Response({"error": "Profil de livreur non trouvé"}, status=status.HTTP_404_NOT_FOUND)

# API pour l'historique des livraisons du livreur
class LivreurDeliveryHistoryAPI(APIView):
    def get(self, request, *args, **kwargs):
        """Get livreur's delivery history"""
        if not request.user.is_livreur():
            return Response({"error": "Accès non autorisé"}, status=status.HTTP_403_FORBIDDEN)
        
        # Filtrer les commandes qui ont été livrées par ce livreur
        delivered_orders = Order.objects.filter(
            livreur=request.user,
            status='delivered'
        ).order_by('-updated_at')  # Plus récentes d'abord
        
        # Sérialiser les données (utiliser un sérialiseur d'ordre simplifié)
        from orders.serializers import OrderSerializer
        serializer = OrderSerializer(delivered_orders, many=True)
        
        return Response(serializer.data)

# API pour les clients
class ClientAPI(APIView):
    def get(self, request, *args, **kwargs):
        if not request.user.is_client():
            return Response({"error": "Accès non autorisé"}, status=status.HTTP_403_FORBIDDEN)
        
        # Exemple de données pour un client
        return Response({"message": "Données du client", "commandes": []})

class ClientLoginAPI(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = ClientLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        tokens = get_tokens_for_user(user)
        
        return Response({
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": user.role
            },
            "access": tokens['access'],
            "refresh": tokens['refresh']
        })

class AdminLoginAPI(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = AdminLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        tokens = get_tokens_for_user(user)
        
        return Response({
            "user": UserSerializer(user).data,
            "access": tokens['access'],
            "refresh": tokens['refresh']
        })

class LivreurLoginAPI(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = LivreurLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        tokens = get_tokens_for_user(user)
        
        return Response({
            "user": UserSerializer(user).data,
            "access": tokens['access'],
            "refresh": tokens['refresh']
        })

class AdminCreateAPI(APIView):
    """API pour créer un nouvel administrateur (réservé aux administrateurs)"""
    
    def post(self, request, *args, **kwargs):
        # Vérifier que l'utilisateur est un administrateur
        if not request.user.is_admin_user():
            return Response({"error": "Seuls les administrateurs peuvent créer d'autres administrateurs"}, 
                           status=status.HTTP_403_FORBIDDEN)
        
        serializer = AdminCreateSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            user = serializer.save()
            admin_profile = AdminProfile.objects.get(user=user)
            
            # Construire la réponse
            response_data = UserSerializer(user).data
            response_data['admin_profile'] = {
                'department': admin_profile.department,
                'admin_level': admin_profile.admin_level,
                'created_by': request.user.username if request.user else None,
                'created_at': admin_profile.created_at
            }
            
            return Response(response_data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# ViewSet complet pour la gestion des utilisateurs
class UserViewSet(viewsets.ModelViewSet):
    """
    API endpoint qui permet de gérer les utilisateurs.
    Disponible seulement pour les administrateurs.
    """
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = UserDetailSerializer
    
    def get_permissions(self):
        """
        Seuls les administrateurs peuvent accéder à ces endpoints.
        """
        return [permissions.IsAuthenticated()]
    
    def dispatch(self, request, *args, **kwargs):
        # Vérifier si l'utilisateur est un administrateur
        if request.user.is_authenticated and not request.user.is_admin_user():
            return Response(
                {"error": "Seuls les administrateurs peuvent gérer les utilisateurs"},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().dispatch(request, *args, **kwargs)
    
    @action(detail=True, methods=['post'])
    def set_active(self, request, pk=None):
        """
        Activer ou désactiver un utilisateur
        """
        user = self.get_object()
        is_active = request.data.get('is_active', False)
        
        user.is_active = is_active
        user.save()
        
        return Response({'is_active': user.is_active})
    
    @action(detail=True, methods=['post'])
    def set_staff(self, request, pk=None):
        """
        Définir si un utilisateur est staff (admin)
        """
        user = self.get_object()
        is_staff = request.data.get('is_staff', False)
        
        user.is_staff = is_staff
        if is_staff and user.role != 'admin':
            user.role = 'admin'
        
        user.save()
        
        return Response({'is_staff': user.is_staff})
    
    @action(detail=True, methods=['post'])
    def set_role(self, request, pk=None):
        """
        Changer le rôle d'un utilisateur
        """
        user = self.get_object()
        role = request.data.get('role')
        
        if role not in [r[0] for r in User.ROLE_CHOICES]:
            return Response({'error': 'Rôle invalide'}, status=status.HTTP_400_BAD_REQUEST)
        
        user.role = role
        user.save()
        
        return Response({'role': user.role})
    
    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        """
        Réinitialiser le mot de passe d'un utilisateur
        """
        user = self.get_object()
        password = request.data.get('password')
        
        if not password:
            return Response({'error': 'Mot de passe requis'}, status=status.HTTP_400_BAD_REQUEST)
        
        user.set_password(password)
        user.save()
        
        return Response({'success': 'Mot de passe réinitialisé avec succès'}) 