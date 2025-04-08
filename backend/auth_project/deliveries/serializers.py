from rest_framework import serializers
from .models import Delivery

class DeliverySerializer(serializers.ModelSerializer):
    order_number = serializers.SerializerMethodField()
    customer_name = serializers.SerializerMethodField()
    products_count = serializers.SerializerMethodField()
    total_amount = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()

    class Meta:
        model = Delivery
        fields = [
            'id', 'order_number', 'customer_name', 'delivery_date',
            'products_count', 'total_amount', 'status', 'status_display',
            'driver_name'
        ]
        read_only_fields = ['id', 'delivery_date', 'driver_name']

    def get_order_number(self, obj):
        return obj.order_number

    def get_customer_name(self, obj):
        return obj.customer_name

    def get_products_count(self, obj):
        return obj.products_count

    def get_total_amount(self, obj):
        return obj.total_amount

    def get_status_display(self, obj):
        return obj.status_display 