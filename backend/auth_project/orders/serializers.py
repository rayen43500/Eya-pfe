from rest_framework import serializers
from .models import Order, OrderItem, ShippingAddress
from products.serializers import ProductSerializer
from django.contrib.auth import get_user_model

User = get_user_model()

class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'product_name', 'quantity', 'price', 'subtotal']
        read_only_fields = ['subtotal']

class ShippingAddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShippingAddress
        fields = ['id', 'full_name', 'address', 'city', 'postal_code', 'country', 'phone']

class LivreurInfoSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']

class OrderSerializer(serializers.ModelSerializer):
    status_display = serializers.SerializerMethodField()
    client_info = serializers.SerializerMethodField()
    livreur_info = serializers.SerializerMethodField()
    items = OrderItemSerializer(many=True, read_only=True)
    shipping_address_data = ShippingAddressSerializer(source='shipping_address', read_only=True)
    payment_method_display = serializers.SerializerMethodField()
    total_products = serializers.SerializerMethodField()
    
    class Meta:
        model = Order
        fields = [
            'id', 'client', 'client_info', 'created_at', 'updated_at', 
            'status', 'status_display', 'total_amount', 'discount_amount',
            'delivery_code', 'is_code_validated', 'livreur', 'livreur_info',
            'items', 'shipping_address_data', 'payment_method', 'payment_method_display',
            'total_products'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'status_display']
    
    def get_client_info(self, obj):
        """Return basic info about the client"""
        client = obj.client
        return {
            'id': client.id,
            'username': client.username,
            'email': client.email
        }
    
    def get_livreur_info(self, obj):
        """Return basic info about the livreur"""
        livreur = obj.livreur
        if livreur:
            return {
                'id': livreur.id,
                'username': livreur.username,
                'email': livreur.email
            }
        return None
    
    def get_status_display(self, obj):
        """Return human-readable status"""
        return obj.get_status_display_value()
    
    def get_payment_method_display(self, obj):
        """Return human-readable payment method"""
        return obj.get_payment_method_display()
    
    def get_total_products(self, obj):
        """Return the total number of products in the order"""
        return obj.items.count()
    
    def to_representation(self, instance):
        """Customize the serialized representation based on user role"""
        data = super().to_representation(instance)
        request = self.context.get('request')
        
        # Only the client who owns the order can see the delivery code
        if request and request.user:
            user = request.user
            if user.is_client() and instance.client == user:
                # Client can see their own delivery code
                data['delivery_code'] = instance.delivery_code
            elif user.is_admin_user():
                # Admin can see all delivery codes
                data['delivery_code'] = instance.delivery_code
            else:
                # Remove delivery code for all other users (including livreurs)
                data.pop('delivery_code', None)
                
        return data 