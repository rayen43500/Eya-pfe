from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, LivreurProfile

class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'role', 'is_staff', 'is_active')
    list_filter = ('role', 'is_staff', 'is_active')
    fieldsets = UserAdmin.fieldsets + (
        ('Rôle', {'fields': ('role',)}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Rôle', {'fields': ('role',)}),
    )

admin.site.register(User, CustomUserAdmin)

@admin.register(LivreurProfile)
class LivreurProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'phone_number', 'vehicle_type', 'is_available', 'is_approved')
    list_filter = ('is_approved', 'vehicle_type', 'is_available')
    actions = ['approve_livreurs', 'reject_livreurs']
    
    def approve_livreurs(self, request, queryset):
        queryset.update(is_approved=True)
        self.message_user(request, f"{queryset.count()} livreurs ont été approuvés.")
    approve_livreurs.short_description = "Approuver les livreurs sélectionnés"
    
    def reject_livreurs(self, request, queryset):
        queryset.update(is_approved=False)
        self.message_user(request, f"{queryset.count()} livreurs ont été rejetés.")
    reject_livreurs.short_description = "Rejeter les livreurs sélectionnés" 