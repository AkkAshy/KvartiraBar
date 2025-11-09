from django.contrib import admin
from .models import Property, PropertyImage, ContactRequest, Favorite


class PropertyImageInline(admin.TabularInline):
    model = PropertyImage
    extra = 1


@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    list_display = ['title', 'owner', 'type', 'price', 'status', 'created_at']
    list_filter = ['type', 'status', 'created_at']
    search_fields = ['title', 'address', 'owner__full_name']
    inlines = [PropertyImageInline]
    readonly_fields = ['latitude', 'longitude', 'created_at', 'updated_at']


@admin.register(ContactRequest)
class ContactRequestAdmin(admin.ModelAdmin):
    list_display = ['property', 'buyer', 'status', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['property__title', 'buyer__full_name', 'message']
    readonly_fields = ['created_at', 'updated_at']

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        # Показывать только свои запросы для обычных пользователей
        if not request.user.is_superuser:
            qs = qs.filter(property__owner=request.user)
        return qs


@admin.register(Favorite)
class FavoriteAdmin(admin.ModelAdmin):
    list_display = ['user', 'property', 'created_at']
    list_filter = ['created_at']
    search_fields = ['user__full_name', 'property__title']
    readonly_fields = ['created_at']