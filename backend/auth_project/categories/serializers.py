from rest_framework import serializers
from .models import Category
from products.models import Product

class CategorySerializer(serializers.ModelSerializer):
    count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ('id', 'name', 'description', 'icon', 'count', 'created_at')
        read_only_fields = ('id', 'created_at')

    def get_count(self, obj):
        """Retourne le nombre de produits associés à cette catégorie."""
        return Product.objects.filter(category=obj.name).count() 