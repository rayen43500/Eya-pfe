from rest_framework import serializers
from .models import Promotion

class PromotionSerializer(serializers.ModelSerializer):
    value_display = serializers.SerializerMethodField()
    period_display = serializers.SerializerMethodField()
    usage_display = serializers.SerializerMethodField()
    type_display = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    
    class Meta:
        model = Promotion
        fields = ['id', 'code', 'description', 'details', 'type', 'type_display',
                 'value', 'value_display', 'start_date', 'end_date', 'period_display',
                 'usage_limit', 'usage_count', 'usage_display', 'status', 'status_display',
                 'created_at', 'updated_at']
    
    def get_value_display(self, obj):
        if obj.type == 'percentage':
            return f"{obj.value}%"
        elif obj.type == 'fixed':
            return f"{obj.value}€"
        else:
            return "Offerte"
    
    def get_period_display(self, obj):
        start = obj.start_date.strftime('%d/%m/%Y')
        end = obj.end_date.strftime('%d/%m/%Y')
        return f"{start}→{end}"
    
    def get_usage_display(self, obj):
        if obj.usage_limit:
            return f"{obj.usage_count}/{obj.usage_limit}"
        return f"{obj.usage_count}/∞"
    
    def get_type_display(self, obj):
        return dict(Promotion.TYPE_CHOICES).get(obj.type, "")
    
    def get_status_display(self, obj):
        return dict(Promotion.STATUS_CHOICES).get(obj.status, "") 