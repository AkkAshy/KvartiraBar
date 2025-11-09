# properties/serializers.py - ОБНОВЛЕННАЯ ВЕРСИЯ

from rest_framework import serializers
from .models import Property, PropertyImage, ContactRequest, Favorite


class PropertyImageSerializer(serializers.ModelSerializer):
    """Сериализатор для изображений недвижимости"""

    class Meta:
        model = PropertyImage
        fields = ['id', 'image', 'uploaded_at']
        read_only_fields = ['uploaded_at']


class PropertySerializer(serializers.ModelSerializer):
    """Сериализатор для недвижимости"""
    images = PropertyImageSerializer(many=True, read_only=True)
    owner_name = serializers.CharField(source='owner.full_name', read_only=True)
    is_favorited = serializers.SerializerMethodField()
    distance_from_search = serializers.SerializerMethodField()

    # 🆕 Дополнительные computed поля
    floor_info = serializers.SerializerMethodField()
    building_age = serializers.SerializerMethodField()
    price_display = serializers.SerializerMethodField()  # 🆕 Красивое отображение цены

    class Meta:
        model = Property
        fields = [
            'id', 'title', 'description', 'address',
            'latitude', 'longitude', 'area', 'rooms', 'type', 'status',

            # 🆕 ЦЕНЫ (в зависимости от типа)
            'price',  # Основная цена (для продажи)
            'price_per_day',  # Цена за сутки (для посуточной аренды)
            'price_per_month',  # Цена за месяц (для долгосрочной аренды)
            'min_rental_days',  # Минимальный срок аренды

            # Фильтры для студентов
            'gender_preference', 'boiler_type', 'has_furniture', 'near_university',

            # 🆕 Информация о доме
            'building_type', 'floor', 'total_floors', 'entrance',
            'apartment_number', 'building_year',

            # 🆕 Удобства
            'repair_type', 'has_parking', 'has_elevator', 'has_balcony',
            'has_wifi', 'has_conditioner', 'has_washing_machine',
            'has_fridge', 'pets_allowed',

            # 🆕 AI-поиск
            'nearby_landmarks', 'search_keywords',

            # Computed fields
            'owner_name', 'images', 'is_favorited', 'distance_from_search',
            'floor_info', 'building_age', 'price_display',

            'created_at', 'updated_at'
        ]
        read_only_fields = ['owner', 'created_at', 'updated_at', 'nearby_landmarks', 'search_keywords']

    def get_is_favorited(self, obj):
        """Проверка, добавлено ли в избранное текущим пользователем"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Favorite.objects.filter(user=request.user, property=obj).exists()
        return False

    def get_distance_from_search(self, obj):
        """
        🆕 Расстояние от точки поиска (если была передана в context)
        Например, если пользователь искал "рядом с НГПИ"
        """
        search_point = self.context.get('search_point')
        if search_point and obj.latitude and obj.longitude:
            distance = obj._calculate_distance(
                obj.latitude, obj.longitude,
                search_point['lat'], search_point['lon']
            )
            return round(distance, 2)
        return None

    def get_floor_info(self, obj):
        """
        🆕 Красивая информация об этаже
        Например: "5 этаж из 9"
        """
        if obj.building_type == 'private':
            return "Частный дом"

        if obj.floor and obj.total_floors:
            return f"{obj.floor} этаж из {obj.total_floors}"
        elif obj.floor:
            return f"{obj.floor} этаж"

        return None

    def get_building_age(self, obj):
        """
        🆕 Возраст здания
        """
        if obj.building_year:
            from datetime import datetime
            age = datetime.now().year - obj.building_year
            if age == 0:
                return "Новостройка"
            elif age == 1:
                return "1 год"
            elif age < 5:
                return f"{age} года"
            else:
                return f"{age} лет"
        return None

    def get_price_display(self, obj):
        """
        🆕 КРАСИВОЕ ОТОБРАЖЕНИЕ ЦЕНЫ В ЗАВИСИМОСТИ ОТ ТИПА

        Возвращает:
        - Для продажи: "15 000 000 сум"
        - Для аренды: "2 500 000 сум/мес"
        - Для посуточной: "150 000 сум/сутки"
        """
        if obj.type == 'sale':
            if obj.price:
                return {
                    'amount': float(obj.price),
                    'formatted': f"{int(obj.price):,} сум".replace(',', ' '),
                    'period': None,
                    'type': 'sale'
                }

        elif obj.type == 'rent':
            if obj.price_per_month:
                return {
                    'amount': float(obj.price_per_month),
                    'formatted': f"{int(obj.price_per_month):,} сум/мес".replace(',', ' '),
                    'period': 'month',
                    'type': 'rent',
                    'min_rental_days': obj.min_rental_days if obj.min_rental_days else None
                }
            elif obj.price:  # Fallback на основную цену
                return {
                    'amount': float(obj.price),
                    'formatted': f"{int(obj.price):,} сум/мес".replace(',', ' '),
                    'period': 'month',
                    'type': 'rent'
                }

        elif obj.type == 'daily_rent':
            if obj.price_per_day:
                return {
                    'amount': float(obj.price_per_day),
                    'formatted': f"{int(obj.price_per_day):,} сум/сутки".replace(',', ' '),
                    'period': 'day',
                    'type': 'daily_rent',
                    'min_rental_days': obj.min_rental_days if obj.min_rental_days else 1
                }
            elif obj.price:  # Fallback на основную цену
                return {
                    'amount': float(obj.price),
                    'formatted': f"{int(obj.price):,} сум/сутки".replace(',', ' '),
                    'period': 'day',
                    'type': 'daily_rent'
                }

        return None


class ContactRequestSerializer(serializers.ModelSerializer):
    """Сериализатор для запросов на контакт"""
    property_title = serializers.CharField(source='property.title', read_only=True)
    buyer_name = serializers.CharField(source='buyer.full_name', read_only=True)
    owner_contacts = serializers.SerializerMethodField()

    class Meta:
        model = ContactRequest
        fields = [
            'id', 'property', 'property_title', 'buyer', 'buyer_name',
            'message', 'status', 'owner_contacts', 'created_at', 'updated_at'
        ]
        read_only_fields = ['buyer', 'created_at', 'updated_at']

    def get_owner_contacts(self, obj):
        """Возвращаем контакты владельца"""
        return {
            'full_name': obj.property.owner.full_name,
            'phone': obj.property.owner.phone,
            'email': obj.property.owner.email,
        }


class FavoriteSerializer(serializers.ModelSerializer):
    """Сериализатор для избранного"""
    property_details = PropertySerializer(source='property', read_only=True)

    class Meta:
        model = Favorite
        fields = ['id', 'property', 'property_details', 'created_at']
        read_only_fields = ['created_at']