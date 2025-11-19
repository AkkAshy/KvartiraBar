# properties/views.py - ОБНОВЛЕННАЯ ВЕРСИЯ

from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from django.db import transaction
from django.db.models import Q, F

from .models import Property, PropertyImage
from .serializers import PropertySerializer
from core.yandex_maps import geocoder_service


class PropertyListCreateView(generics.ListCreateAPIView):
    """
    Список и создание недвижимости с AI-поиском
    GET /api/properties/ - список
    POST /api/properties/ - создание (с изображениями)

    🆕 УМНЫЙ ПОИСК:
    ?search=НГПИ - найдет квартиры рядом с НГПИ
    ?type=daily_rent - посуточная аренда
    ?price_per_day__lte=200000 - до 200 тыс за сутки
    """
    serializer_class = PropertySerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]

    # 🆕 ОБНОВЛЕННЫЕ ФИЛЬТРЫ
    filterset_fields = [
        'type', 'status', 'rooms', 'boiler_type',
        'building_type', 'repair_type', 'has_furniture', 'has_parking',
        'has_elevator', 'has_wifi', 'pets_allowed', 'has_balcony',
        'has_conditioner', 'has_washing_machine', 'has_fridge'
    ]

    filter_overrides = {
        'gender_preference': {
            'filter_class': 'django_filters.CharFilter',
            'extra': lambda f: {
                'lookup_expr': 'icontains',
            },
        },
    }

    search_fields = ['title', 'description', 'address', 'search_keywords']

    # 🆕 ОБНОВЛЕННАЯ СОРТИРОВКА (добавлены новые цены)
    ordering_fields = [
        'created_at', 'price', 'price_per_day', 'price_per_month',
        'area', 'building_year', 'floor'
    ]
    ordering = ['-created_at']

    def get_queryset(self):
        """
        🆕 УМНЫЙ ПОИСК С AI и ГЕОЛОКАЦИЕЙ + ФИЛЬТРЫ ДЛЯ ПОСУТОЧНОЙ АРЕНДЫ
        """
        queryset = Property.objects.filter(status='active')

        # 🆕 AI-ПОИСК ПО КЛЮЧЕВЫМ СЛОВАМ
        search_query = self.request.query_params.get('search', '').strip().lower()

        if search_query:
            print(f"\n🔍 AI-ПОИСК: '{search_query}'")

            # Пытаемся найти координаты ориентира
            landmark_coords = self._find_landmark_coordinates(search_query)

            if landmark_coords:
                print(f"✅ Найден ориентир: {landmark_coords['name']} ({landmark_coords['lat']}, {landmark_coords['lon']})")

                # Сохраняем в context для сериализатора
                self.request.search_point = landmark_coords

                # Фильтруем по расстоянию (макс 5 км)
                max_distance = float(self.request.query_params.get('max_distance', 5.0))

                filtered_ids = []
                for prop in queryset:
                    if prop.latitude and prop.longitude:
                        distance = prop._calculate_distance(
                            prop.latitude, prop.longitude,
                            landmark_coords['lat'], landmark_coords['lon']
                        )
                        if distance <= max_distance:
                            filtered_ids.append(prop.id)

                queryset = queryset.filter(id__in=filtered_ids)
                print(f"📊 Найдено {queryset.count()} квартир в радиусе {max_distance} км")

            else:
                # Обычный текстовый поиск
                print("ℹ️ Обычный текстовый поиск (координаты не найдены)")
                queryset = queryset.filter(
                    Q(title__icontains=search_query) |
                    Q(description__icontains=search_query) |
                    Q(address__icontains=search_query) |
                    Q(search_keywords__icontains=search_query)
                )

        # 🆕 УМНЫЕ ФИЛЬТРЫ ПО ЦЕНЕ (в зависимости от типа объявления)
        min_price = self.request.query_params.get('min_price')
        max_price = self.request.query_params.get('max_price')

        # Фильтры для каждого типа цены
        min_price_day = self.request.query_params.get('min_price_day')
        max_price_day = self.request.query_params.get('max_price_day')
        min_price_month = self.request.query_params.get('min_price_month')
        max_price_month = self.request.query_params.get('max_price_month')

        # Универсальные фильтры (для основной цены)
        if min_price:
            queryset = queryset.filter(price__gte=min_price)
        if max_price:
            queryset = queryset.filter(price__lte=max_price)

        # 🆕 Фильтры для посуточной аренды
        if min_price_day:
            queryset = queryset.filter(
                Q(price_per_day__gte=min_price_day) | Q(price_per_day__isnull=True)
            )
        if max_price_day:
            queryset = queryset.filter(
                Q(price_per_day__lte=max_price_day) | Q(price_per_day__isnull=True)
            )

        # 🆕 Фильтры для долгосрочной аренды
        if min_price_month:
            queryset = queryset.filter(
                Q(price_per_month__gte=min_price_month) | Q(price_per_month__isnull=True)
            )
        if max_price_month:
            queryset = queryset.filter(
                Q(price_per_month__lte=max_price_month) | Q(price_per_month__isnull=True)
            )

        # 🆕 Фильтр по минимальному сроку аренды
        min_rental = self.request.query_params.get('min_rental_days')
        max_rental = self.request.query_params.get('max_rental_days')

        if min_rental:
            queryset = queryset.filter(min_rental_days__gte=min_rental)
        if max_rental:
            queryset = queryset.filter(min_rental_days__lte=max_rental)

        # 🆕 ФИЛЬТР ПО ГОДУ ПОСТРОЙКИ
        min_year = self.request.query_params.get('min_year')
        max_year = self.request.query_params.get('max_year')

        if min_year:
            queryset = queryset.filter(building_year__gte=min_year)
        if max_year:
            queryset = queryset.filter(building_year__lte=max_year)

        # 🆕 ФИЛЬТР ПО ЭТАЖУ
        min_floor = self.request.query_params.get('min_floor')
        max_floor = self.request.query_params.get('max_floor')

        if min_floor:
            queryset = queryset.filter(floor__gte=min_floor)
        if max_floor:
            queryset = queryset.filter(floor__lte=max_floor)

        # Исключаем первый и последний этаж (опция)
        exclude_first = self.request.query_params.get('exclude_first_floor', 'false').lower() == 'true'
        exclude_last = self.request.query_params.get('exclude_last_floor', 'false').lower() == 'true'

        if exclude_first:
            queryset = queryset.exclude(floor=1)
        if exclude_last:
            queryset = queryset.exclude(floor=F('total_floors'))

        return queryset

    def _find_landmark_coordinates(self, query):
        """
        🆕 НАХОДИТ КООРДИНАТЫ ИЗВЕСТНОГО ОРИЕНТИРА

        Сначала проверяет в локальной базе известных мест,
        потом пытается найти через Яндекс.Карты
        """
        # Локальная база известных мест Нукуса
        NUKUS_LANDMARKS = {
            'нгпи': {'name': 'НГПИ', 'lat': 42.4644, 'lon': 59.6103},
            'каракалпакский университет': {'name': 'Каракалпакский ГУ', 'lat': 42.4580, 'lon': 59.6100},
            'кгу': {'name': 'Каракалпакский ГУ', 'lat': 42.4580, 'lon': 59.6100},
            'парк бердаха': {'name': 'Парк Бердаха', 'lat': 42.4531, 'lon': 59.6103},
            'центральный рынок': {'name': 'Центральный рынок', 'lat': 42.4600, 'lon': 59.6150},
            'центр': {'name': 'Центр города', 'lat': 42.4531, 'lon': 59.6103},
            'вокзал': {'name': 'Ж/Д вокзал', 'lat': 42.4520, 'lon': 59.5950},
        }

        # Нормализуем запрос
        query_normalized = query.lower().strip()

        # Проверяем в локальной базе
        for key, landmark in NUKUS_LANDMARKS.items():
            if key in query_normalized or query_normalized in key:
                print(f"🎯 Найдено в локальной базе: {landmark['name']}")
                return landmark

        # Пытаемся найти через Яндекс.Карты
        try:
            # Добавляем "Нукус" к запросу для точности
            search_query = f"Нукус {query}" if 'нукус' not in query_normalized else query

            result = geocoder_service.geocode_address(search_query)

            if result:
                print(f"🗺️ Найдено через Яндекс.Карты: {result['formatted_address']}")
                return {
                    'name': result['formatted_address'],
                    'lat': result['lat'],
                    'lon': result['lon']
                }
        except Exception as e:
            print(f"❌ Ошибка поиска через Яндекс.Карты: {e}")

        return None

    def get_serializer_context(self):
        """
        Передаем search_point в сериализатор для расчета расстояний
        """
        context = super().get_serializer_context()
        search_point = getattr(self.request, 'search_point', None)
        if search_point:
            context['search_point'] = search_point
        return context

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """Создание объявления с изображениями"""
        print("\n" + "="*50)
        print("🏠 СОЗДАНИЕ НОВОГО ОБЪЯВЛЕНИЯ")
        print("="*50)
        print(f"👤 Пользователь: {request.user.username if request.user.is_authenticated else 'Anonymous'}")
        print(f"📊 Данные формы: {dict(request.data)}")

        # Получаем изображения
        images = (
            request.FILES.getlist('images[]') or
            request.FILES.getlist('images') or
            []
        )

        print(f"📁 Ключи в FILES: {list(request.FILES.keys())}")
        print(f"📸 Найдено изображений: {len(images)}")

        if images:
            for i, img in enumerate(images, 1):
                print(f"  {i}. {img.name} ({img.size} bytes, {img.content_type})")

        # Создаем объявление
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Сохраняем с owner
        property_obj = serializer.save(owner=request.user)
        print(f"✅ Property создано: ID={property_obj.id}, Title={property_obj.title}")
        print(f"💰 Тип: {property_obj.type}")
        print(f"🎯 Nearby landmarks: {property_obj.nearby_landmarks}")

        # Сохраняем изображения
        saved_images = 0
        if images:
            for image in images:
                try:
                    img_obj = PropertyImage.objects.create(
                        property=property_obj,
                        image=image
                    )
                    saved_images += 1
                    print(f"  ✅ Изображение сохранено: {img_obj.image.url}")
                except Exception as e:
                    print(f"  ❌ Ошибка сохранения изображения: {e}")

        print(f"📊 Результат: сохранено {saved_images} из {len(images)} изображений")
        print("="*50 + "\n")

        # Возвращаем созданный объект с изображениями
        output_serializer = self.get_serializer(property_obj)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)


class PropertyDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Детали, обновление и удаление недвижимости
    """
    serializer_class = PropertySerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def get_queryset(self):
        """Детали может видеть кто угодно"""
        return Property.objects.all()

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        """Обновление объявления с добавлением новых изображений"""
        print("\n" + "="*50)
        print("✏️ ОБНОВЛЕНИЕ ОБЪЯВЛЕНИЯ")
        print("="*50)

        partial = kwargs.pop('partial', False)
        instance = self.get_object()

        # Проверка прав: только владелец может редактировать
        if instance.owner != request.user:
            return Response(
                {'detail': 'Вы не можете редактировать это объявление'},
                status=status.HTTP_403_FORBIDDEN
            )

        print(f"🏠 Property ID: {instance.id}")

        # Получаем новые изображения
        images = (
            request.FILES.getlist('images[]') or
            request.FILES.getlist('images') or
            []
        )
        print(f"📸 Новых изображений: {len(images)}")

        # Обновляем данные объявления
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        property_obj = serializer.save()

        print(f"✅ Property обновлено: {property_obj.title}")
        print(f"💰 Тип: {property_obj.type}, Цена: {property_obj.get_price_display()}")  # 🆕
        print(f"🎯 Nearby landmarks: {property_obj.nearby_landmarks}")

        # Добавляем новые изображения
        saved_images = 0
        if images:
            for image in images:
                try:
                    img_obj = PropertyImage.objects.create(
                        property=property_obj,
                        image=image
                    )
                    saved_images += 1
                    print(f"  ✅ Новое изображение добавлено: {img_obj.image.url}")
                except Exception as e:
                    print(f"  ❌ Ошибка добавления изображения: {e}")

        print(f"📊 Добавлено {saved_images} новых изображений")
        print("="*50 + "\n")

        output_serializer = self.get_serializer(property_obj)
        return Response(output_serializer.data)


# 🗺️ ЭНДПОИНТЫ ДЛЯ ЯНДЕКС КАРТ

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def geocode_address(request):
    """Преобразует адрес в координаты"""
    address = request.data.get('address')

    if not address:
        return Response(
            {'error': 'Адрес не указан'},
            status=status.HTTP_400_BAD_REQUEST
        )

    result = geocoder_service.geocode_address(address)

    if not result:
        return Response(
            {'error': 'Адрес не найден'},
            status=status.HTTP_404_NOT_FOUND
        )

    return Response(result)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def suggest_addresses(request):
    """Автодополнение адресов при вводе"""
    query = request.query_params.get('query')

    if not query:
        return Response(
            {'error': 'Параметр query не указан'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Ограничивающий прямоугольник для Нукуса
    bbox = None
    if request.query_params.get('bbox') == 'nukus':
        bbox = (59.5, 42.4, 59.7, 42.5)

    suggestions = geocoder_service.suggest_addresses(query, bbox=bbox)

    return Response({'suggestions': suggestions})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reverse_geocode(request):
    """Преобразует координаты в адрес"""
    lat = request.data.get('lat')
    lon = request.data.get('lon')

    if not lat or not lon:
        return Response(
            {'error': 'Координаты не указаны'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        lat = float(lat)
        lon = float(lon)
    except ValueError:
        return Response(
            {'error': 'Неверный формат координат'},
            status=status.HTTP_400_BAD_REQUEST
        )

    address = geocoder_service.reverse_geocode(lat, lon)

    if not address:
        return Response(
            {'error': 'Адрес не найден'},
            status=status.HTTP_404_NOT_FOUND
        )

    return Response({'address': address})


# 🗑️ УДАЛЕНИЕ ИЗОБРАЖЕНИЯ

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_image(request, property_id, image_id):
    """Удаление конкретного изображения"""
    try:
        property_obj = Property.objects.get(id=property_id)

        if property_obj.owner != request.user:
            return Response(
                {'detail': 'Вы не можете удалить изображение этого объявления'},
                status=status.HTTP_403_FORBIDDEN
            )

        image = PropertyImage.objects.get(id=image_id, property=property_obj)
        image.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)

    except Property.DoesNotExist:
        return Response(
            {'detail': 'Объявление не найдено'},
            status=status.HTTP_404_NOT_FOUND
        )
    except PropertyImage.DoesNotExist:
        return Response(
            {'detail': 'Изображение не найдено'},
            status=status.HTTP_404_NOT_FOUND
        )


# 📋 МОИ ОБЪЯВЛЕНИЯ

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_properties(request):
    """Мои объявления"""
    queryset = Property.objects.filter(owner=request.user)
    serializer = PropertySerializer(queryset, many=True, context={'request': request})
    return Response(serializer.data)


# 🆕 ПОИСК ПО ОРИЕНТИРАМ (дополнительный эндпоинт)

@api_view(['GET'])
def search_near_landmark(request):
    """
    🆕 Специальный эндпоинт для поиска рядом с ориентиром

    GET /api/properties/search-near/?landmark=НГПИ&radius=2&type=daily_rent
    """
    landmark_name = request.query_params.get('landmark', '').strip()
    radius = float(request.query_params.get('radius', 3.0))  # км
    property_type = request.query_params.get('type', '')  # 🆕 фильтр по типу

    if not landmark_name:
        return Response(
            {'error': 'Параметр landmark обязателен'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Находим координаты ориентира
    view = PropertyListCreateView()
    landmark_coords = view._find_landmark_coordinates(landmark_name)

    if not landmark_coords:
        return Response(
            {'error': f'Ориентир "{landmark_name}" не найден'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Ищем квартиры в радиусе
    properties = Property.objects.filter(status='active')

    # 🆕 Фильтр по типу (если указан)
    if property_type:
        properties = properties.filter(type=property_type)

    results = []

    for prop in properties:
        if prop.latitude and prop.longitude:
            distance = prop._calculate_distance(
                prop.latitude, prop.longitude,
                landmark_coords['lat'], landmark_coords['lon']
            )
            if distance <= radius:
                results.append({
                    'property': PropertySerializer(prop, context={'request': request}).data,
                    'distance_km': round(distance, 2)
                })

    # Сортируем по расстоянию
    results.sort(key=lambda x: x['distance_km'])

    return Response({
        'landmark': landmark_coords,
        'radius_km': radius,
        'property_type': property_type if property_type else 'all',  # 🆕
        'found': len(results),
        'results': results
    })