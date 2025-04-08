from django.contrib import admin
from .models import Order, OrderItem, ShippingAddress

class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0

class ShippingAddressInline(admin.StackedInline):
    model = ShippingAddress
    extra = 0

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'client', 'status', 'total_amount', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('client__username', 'client__email')
    inlines = [OrderItemInline, ShippingAddressInline]
    readonly_fields = ('created_at', 'updated_at')

admin.site.register(OrderItem)
admin.site.register(ShippingAddress) 