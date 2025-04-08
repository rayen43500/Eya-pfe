# products/serializers.py
from rest_framework import serializers
from .models import Product, Cart
from categories.models import Category

class ProductSerializer(serializers.ModelSerializer):
    final_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    has_discount = serializers.BooleanField(read_only=True)
    is_available = serializers.BooleanField(read_only=True)
    category_info = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = '__all__'
        
    def get_category_info(self, obj):
        """Récupère les informations de la catégorie si elle existe."""
        if obj.category:
            try:
                category = Category.objects.get(name=obj.category)
                return {
                    'id': category.id,
                    'name': category.name,
                    'icon': category.icon or 'fa-tag'
                }
            except Category.DoesNotExist:
                pass
        return None

class CartSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    
    class Meta:
        model = Cart
        fields = '__all__'
