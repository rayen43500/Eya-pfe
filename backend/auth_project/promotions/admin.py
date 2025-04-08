from django.contrib import admin
from .models import Promotion, UserPromotion

class UserPromotionInline(admin.TabularInline):
    model = UserPromotion
    extra = 0

@admin.register(Promotion)
class PromotionAdmin(admin.ModelAdmin):
    list_display = ('code', 'description', 'type', 'value', 'start_date', 'end_date', 'status', 'usage_count')
    list_filter = ('status', 'type', 'start_date', 'end_date')
    search_fields = ('code', 'description')
    readonly_fields = ('usage_count', 'created_at', 'updated_at')
    inlines = [UserPromotionInline]
    actions = ['make_active', 'make_inactive']
    
    def make_active(self, request, queryset):
        queryset.update(status='active')
    make_active.short_description = "Activer les promotions sélectionnées"
    
    def make_inactive(self, request, queryset):
        queryset.update(status='inactive')
    make_inactive.short_description = "Désactiver les promotions sélectionnées"

@admin.register(UserPromotion)
class UserPromotionAdmin(admin.ModelAdmin):
    list_display = ('user', 'promotion', 'is_used', 'created_at', 'used_at')
    list_filter = ('is_used', 'created_at', 'used_at')
    search_fields = ('user__username', 'user__email', 'promotion__code') 