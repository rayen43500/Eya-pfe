# products/views.py
from rest_framework import viewsets, status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework_simplejwt.authentication import JWTAuthentication
from .models import Product, Cart
from .serializers import ProductSerializer, CartSerializer
from django.db.models import Min, Max

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()  # Récupérer tous les produits
    serializer_class = ProductSerializer  # Serializer pour formater les données
    parser_classes = (MultiPartParser, FormParser)
    authentication_classes = [JWTAuthentication]
    
    def get_permissions(self):
        """
        Permet l'accès public en lecture seule (GET) et requiert l'authentification pour les autres actions
        """
        if self.action in ['list', 'retrieve', 'categories', 'price_range']:
            # Permettre l'accès public pour afficher les produits
            return [AllowAny()]
        # Pour toutes les autres actions (create, update, delete), requérir l'authentification
        return [IsAdminUser()]

    @action(detail=False, methods=['get'])
    def categories(self, request):
        """Retourne la liste des catégories distinctes de produits."""
        categories = Product.objects.values_list('category', flat=True).distinct()
        return Response(list(categories))

    @action(detail=False, methods=['get'])
    def price_range(self, request):
        """Retourne le prix minimum et maximum des produits."""
        price_range = Product.objects.aggregate(min_price=Min('price'), max_price=Max('price'))
        return Response(price_range)

    @action(detail=False, methods=['post'], permission_classes=[IsAdminUser])
    def apply_promotion_all(self, request):
        """Appliquer une promotion à tous les produits."""
        discount_percentage = request.data.get('discount_percentage')
        
        if not discount_percentage:
            return Response({"error": "Le pourcentage de remise est requis"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            discount = float(discount_percentage)
            if discount <= 0 or discount > 99:
                return Response({"error": "Le pourcentage de remise doit être entre 0 et 99"}, status=status.HTTP_400_BAD_REQUEST)
                
            products = Product.objects.all()
            products.update(discount_percentage=discount, is_on_promotion=True)
            
            return Response({"message": f"Promotion de {discount}% appliquée à tous les produits"})
        except ValueError:
            return Response({"error": "Format de pourcentage invalide"}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'], permission_classes=[IsAdminUser])
    def apply_promotion_category(self, request):
        """Appliquer une promotion à une catégorie spécifique de produits."""
        discount_percentage = request.data.get('discount_percentage')
        category = request.data.get('category')
        
        if not discount_percentage or not category:
            return Response({"error": "Le pourcentage de remise et la catégorie sont requis"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            discount = float(discount_percentage)
            if discount <= 0 or discount > 99:
                return Response({"error": "Le pourcentage de remise doit être entre 0 et 99"}, status=status.HTTP_400_BAD_REQUEST)
                
            products = Product.objects.filter(category=category)
            if not products.exists():
                return Response({"error": "Aucun produit trouvé dans cette catégorie"}, status=status.HTTP_404_NOT_FOUND)
                
            products.update(discount_percentage=discount, is_on_promotion=True)
            
            return Response({"message": f"Promotion de {discount}% appliquée à la catégorie {category}"})
        except ValueError:
            return Response({"error": "Format de pourcentage invalide"}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'], permission_classes=[IsAdminUser])
    def remove_all_promotions(self, request):
        """Supprimer toutes les promotions."""
        Product.objects.all().update(discount_percentage=0, is_on_promotion=False)
        return Response({"message": "Toutes les promotions ont été supprimées"})

class CartViewSet(viewsets.ModelViewSet):
    serializer_class = CartSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    
    def get_queryset(self):
        return Cart.objects.filter(user_id=self.request.user.id)
    
    def perform_create(self, serializer):
        serializer.save(user_id=self.request.user.id)
