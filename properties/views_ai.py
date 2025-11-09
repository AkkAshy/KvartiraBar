# properties/views_ai.py - ПОЛНАЯ ВЕРСИЯ СО ВСЕМИ ФИЛЬТРАМИ

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status

from .models import Property
from .serializers import PropertySerializer
from core.ai_search import ai_search_service


@api_view(['POST'])
@permission_classes([AllowAny])  # Доступно всем
def ai_search(request):
    """
    🤖 AI-ПОИСК НЕДВИЖИМОСТИ - ПОЛНАЯ ВЕРСИЯ

    POST /api/properties/ai-search/

    Body:
    {
        "query": "Найди 2-комнатную квартиру рядом с НГПИ до 2 млн с WiFi и мебелью",
        "user_location": {"lat": 42.464, "lon": 59.610}  // опционально
    }

    ПОДДЕРЖИВАЕМЫЕ ФИЛЬТРЫ:
    - rooms: количество комнат
    - type: sale/rent
    - min_price, max_price: цена
    - gender_preference: any/male/female/family/military
    - building_type: apartment/private
    - floor, min_floor, max_floor, total_floors
    - exclude_first_floor, exclude_last_floor
    - building_year, min_year, max_year
    - repair_type: no/cosmetic/euro/designer
    - boiler_type: none/factory/custom
    - has_furniture, has_wifi, has_parking, has_elevator
    - has_balcony, has_conditioner, has_washing_machine
    - has_fridge, pets_allowed
    - search: текстовый поиск или ориентир
    - max_distance: радиус поиска в км
    """
    query = request.data.get('query', '').strip()
    user_location = request.data.get('user_location')

    if not query:
        return Response(
            {'error': 'Параметр query обязателен'},
            status=status.HTTP_400_BAD_REQUEST
        )

    print(f"\n{'='*70}")
    print(f"🤖 AI-ПОИСК ЗАПУЩЕН")
    print(f"{'='*70}")
    print(f"📝 Запрос: {query}")
    if user_location:
        print(f"📍 Местоположение: {user_location}")

    try:
        # 1️⃣ Используем AI для парсинга запроса
        ai_result = ai_search_service.search(query, user_location)

        print(f"\n✅ AI распарсил запрос:")
        print(f"   Фильтры: {ai_result['filters']}")
        print(f"   Уверенность: {ai_result['confidence']}")

        # 2️⃣ Начинаем с активных объявлений
        queryset = Property.objects.filter(status='active')

        filters = ai_result['filters']

        print(f"\n🔍 ПРИМЕНЯЕМ ФИЛЬТРЫ:")
        print(f"   Всего активных: {queryset.count()}")

        # ===== ОСНОВНЫЕ ФИЛЬТРЫ =====

        # Количество комнат
        if 'rooms' in filters and filters['rooms']:
            queryset = queryset.filter(rooms=filters['rooms'])
            print(f"   ✓ Комнат: {filters['rooms']} → Осталось: {queryset.count()}")

        # Тип сделки (продажа/аренда)
        if 'type' in filters and filters['type'] and str(filters['type']).strip():
            queryset = queryset.filter(type=filters['type'])
            print(f"   ✓ Тип: {filters['type']} → Осталось: {queryset.count()}")

        # ===== ЦЕНА =====

        if 'min_price' in filters and filters['min_price'] and str(filters['min_price']).strip():
            queryset = queryset.filter(price__gte=filters['min_price'])
            print(f"   ✓ Мин. цена: {filters['min_price']:,.0f} сум → Осталось: {queryset.count()}")

        if 'max_price' in filters and filters['max_price'] and str(filters['max_price']).strip():
            queryset = queryset.filter(price__lte=filters['max_price'])
            print(f"   ✓ Макс. цена: {filters['max_price']:,.0f} сум → Осталось: {queryset.count()}")

        # ===== ДЛЯ КОГО СДАЕТСЯ =====

        if 'gender_preference' in filters:
            queryset = queryset.filter(gender_preference=filters['gender_preference'])
            print(f"   ✓ Для кого: {filters['gender_preference']} → Осталось: {queryset.count()}")

        # ===== ТИП ЗДАНИЯ =====

        if 'building_type' in filters:
            queryset = queryset.filter(building_type=filters['building_type'])
            print(f"   ✓ Тип здания: {filters['building_type']} → Осталось: {queryset.count()}")

        # ===== ЭТАЖ =====

        if 'floor' in filters and filters['floor'] and str(filters['floor']).strip():
            queryset = queryset.filter(floor=filters['floor'])
            print(f"   ✓ Этаж: {filters['floor']} → Осталось: {queryset.count()}")

        if 'min_floor' in filters and filters['min_floor'] and str(filters['min_floor']).strip():
            queryset = queryset.filter(floor__gte=filters['min_floor'])
            print(f"   ✓ Мин. этаж: {filters['min_floor']} → Осталось: {queryset.count()}")

        if 'max_floor' in filters and filters['max_floor'] and str(filters['max_floor']).strip():
            queryset = queryset.filter(floor__lte=filters['max_floor'])
            print(f"   ✓ Макс. этаж: {filters['max_floor']} → Осталось: {queryset.count()}")

        if 'exclude_first_floor' in filters and filters['exclude_first_floor']:
            queryset = queryset.exclude(floor=1)
            print(f"   ✓ Исключить первый этаж → Осталось: {queryset.count()}")

        if 'exclude_last_floor' in filters and filters['exclude_last_floor']:
            from django.db.models import F
            queryset = queryset.exclude(floor=F('total_floors'))
            print(f"   ✓ Исключить последний этаж → Осталось: {queryset.count()}")

        if 'total_floors' in filters and filters['total_floors'] and str(filters['total_floors']).strip():
            queryset = queryset.filter(total_floors=filters['total_floors'])
            print(f"   ✓ Всего этажей: {filters['total_floors']} → Осталось: {queryset.count()}")

        # ===== ГОД ПОСТРОЙКИ =====

        if 'building_year' in filters and filters['building_year'] and str(filters['building_year']).strip():
            queryset = queryset.filter(building_year=filters['building_year'])
            print(f"   ✓ Год постройки: {filters['building_year']} → Осталось: {queryset.count()}")

        if 'min_year' in filters and filters['min_year'] and str(filters['min_year']).strip():
            queryset = queryset.filter(building_year__gte=filters['min_year'])
            print(f"   ✓ Мин. год: {filters['min_year']} → Осталось: {queryset.count()}")

        if 'max_year' in filters and filters['max_year'] and str(filters['max_year']).strip():
            queryset = queryset.filter(building_year__lte=filters['max_year'])
            print(f"   ✓ Макс. год: {filters['max_year']} → Осталось: {queryset.count()}")

        # ===== РЕМОНТ =====

        if 'repair_type' in filters:
            queryset = queryset.filter(repair_type=filters['repair_type'])
            print(f"   ✓ Тип ремонта: {filters['repair_type']} → Осталось: {queryset.count()}")

        # ===== КОТЕЛ (для студентов) =====

        if 'boiler_type' in filters:
            queryset = queryset.filter(boiler_type=filters['boiler_type'])
            print(f"   ✓ Тип котла: {filters['boiler_type']} → Осталось: {queryset.count()}")

        # ===== МЕБЕЛЬ И УДОБСТВА (Boolean фильтры) =====

        if 'has_furniture' in filters and filters['has_furniture'] is not None and str(filters['has_furniture']).strip():
            queryset = queryset.filter(has_furniture=filters['has_furniture'])
            print(f"   ✓ Мебель: {'Да' if filters['has_furniture'] else 'Нет'} → Осталось: {queryset.count()}")

        if 'has_wifi' in filters and filters['has_wifi'] is not None and str(filters['has_wifi']).strip():
            queryset = queryset.filter(has_wifi=filters['has_wifi'])
            print(f"   ✓ WiFi: {'Да' if filters['has_wifi'] else 'Нет'} → Осталось: {queryset.count()}")

        if 'has_parking' in filters and filters['has_parking'] is not None and str(filters['has_parking']).strip():
            queryset = queryset.filter(has_parking=filters['has_parking'])
            print(f"   ✓ Парковка: {'Да' if filters['has_parking'] else 'Нет'} → Осталось: {queryset.count()}")

        if 'has_elevator' in filters and filters['has_elevator'] is not None and str(filters['has_elevator']).strip():
            queryset = queryset.filter(has_elevator=filters['has_elevator'])
            print(f"   ✓ Лифт: {'Да' if filters['has_elevator'] else 'Нет'} → Осталось: {queryset.count()}")

        if 'has_balcony' in filters and filters['has_balcony'] is not None and str(filters['has_balcony']).strip():
            queryset = queryset.filter(has_balcony=filters['has_balcony'])
            print(f"   ✓ Балкон: {'Да' if filters['has_balcony'] else 'Нет'} → Осталось: {queryset.count()}")

        if 'has_conditioner' in filters and filters['has_conditioner'] is not None and str(filters['has_conditioner']).strip():
            queryset = queryset.filter(has_conditioner=filters['has_conditioner'])
            print(f"   ✓ Кондиционер: {'Да' if filters['has_conditioner'] else 'Нет'} → Осталось: {queryset.count()}")

        if 'has_washing_machine' in filters and filters['has_washing_machine'] is not None and str(filters['has_washing_machine']).strip():
            queryset = queryset.filter(has_washing_machine=filters['has_washing_machine'])
            print(f"   ✓ Стиральная машина: {'Да' if filters['has_washing_machine'] else 'Нет'} → Осталось: {queryset.count()}")

        if 'has_fridge' in filters and filters['has_fridge'] is not None and str(filters['has_fridge']).strip():
            queryset = queryset.filter(has_fridge=filters['has_fridge'])
            print(f"   ✓ Холодильник: {'Да' if filters['has_fridge'] else 'Нет'} → Осталось: {queryset.count()}")

        if 'pets_allowed' in filters and filters['pets_allowed'] is not None and str(filters['pets_allowed']).strip():
            queryset = queryset.filter(pets_allowed=filters['pets_allowed'])
            print(f"   ✓ Можно с животными: {'Да' if filters['pets_allowed'] else 'Нет'} → Осталось: {queryset.count()}")

        # 3️⃣ ГЕОПОИСК - Самый важный фильтр!
        # Поиск рядом с ориентирами (НГПИ, центр и т.д.)

        if 'search' in filters and filters['search'] and str(filters['search']).strip():
            search_query = filters['search']
            max_distance = filters.get('max_distance', 5.0)  # По умолчанию 5 км

            print(f"\n🎯 ГЕОПОИСК:")
            print(f"   Ориентир: {search_query}")
            print(f"   Радиус: {max_distance} км")

            # Находим координаты ориентира
            from .views import PropertyListCreateView
            view = PropertyListCreateView()
            landmark_coords = view._find_landmark_coordinates(search_query)

            if landmark_coords:
                print(f"   ✅ Найден: {landmark_coords['name']}")
                print(f"   📍 Координаты: ({landmark_coords['lat']}, {landmark_coords['lon']})")

                # Фильтруем по расстоянию
                filtered_ids = []
                distances = {}

                for prop in queryset:
                    if prop.latitude and prop.longitude:
                        distance = prop._calculate_distance(
                            prop.latitude, prop.longitude,
                            landmark_coords['lat'], landmark_coords['lon']
                        )
                        if distance <= max_distance:
                            filtered_ids.append(prop.id)
                            distances[prop.id] = distance

                queryset = queryset.filter(id__in=filtered_ids)

                # Сортируем по расстоянию (ближайшие первыми)
                queryset = sorted(queryset, key=lambda x: distances.get(x.id, 999))

                print(f"   ✓ Найдено в радиусе {max_distance} км: {len(queryset)}")

                # Показываем топ-5 ближайших
                if len(queryset) > 0:
                    print(f"\n   🏆 ТОП-5 БЛИЖАЙШИХ:")
                    for i, prop in enumerate(queryset[:5], 1):
                        dist = distances.get(prop.id, 0)
                        print(f"      {i}. {prop.title[:40]} - {dist:.2f} км")

            else:
                # Если координаты не найдены, делаем текстовый поиск
                print(f"   ⚠️ Координаты не найдены, текстовый поиск...")
                from django.db.models import Q
                queryset = queryset.filter(
                    Q(title__icontains=search_query) |
                    Q(description__icontains=search_query) |
                    Q(address__icontains=search_query) |
                    Q(search_keywords__icontains=search_query)
                )
                print(f"   ✓ Текстовый поиск: {queryset.count() if hasattr(queryset, 'count') else len(queryset)}")

        # 4️⃣ Сериализуем результаты
        if isinstance(queryset, list):
            # Уже список после сортировки по расстоянию
            results = queryset[:20]
        else:
            # QuerySet
            results = list(queryset[:20])

        serializer = PropertySerializer(
            results,
            many=True,
            context={'request': request}
        )

        count = len(queryset) if isinstance(queryset, list) else queryset.count()

        print(f"\n📊 ИТОГО: Найдено {count} квартир")
        print(f"{'='*70}\n")

        # 5️⃣ Генерируем человекочитаемое сообщение
        message = _generate_response_message(count, ai_result)

        return Response({
            'ai_analysis': ai_result,
            'results': serializer.data,
            'count': count,
            'message': message
        })

    except Exception as e:
        print(f"❌ Ошибка AI-поиска: {e}")
        import traceback
        traceback.print_exc()

        return Response(
            {
                'error': 'Ошибка при обработке запроса',
                'details': str(e)
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


def _generate_response_message(count: int, ai_result: dict) -> str:
    """
    Генерирует человекочитаемое сообщение о результатах
    """
    if count == 0:
        return "К сожалению, квартир по вашему запросу не найдено. Попробуйте изменить параметры поиска."

    filters = ai_result['filters']
    parts = []

    if count == 1:
        parts.append("Найдена 1 квартира")
    elif count < 5:
        parts.append(f"Найдено {count} квартиры")
    else:
        parts.append(f"Найдено {count} квартир")

    # Добавляем детали из фильтров
    details = []

    if 'rooms' in filters:
        details.append(f"{filters['rooms']}-комнатная")

    if 'search' in filters:
        details.append(f"рядом с {filters['search']}")

    if 'has_wifi' in filters and filters['has_wifi']:
        details.append("с WiFi")

    if 'has_furniture' in filters and filters['has_furniture']:
        details.append("с мебелью")

    if 'max_price' in filters and filters['max_price'] and str(filters['max_price']).strip():
        try:
            price_millions = float(filters['max_price']) / 1000000
            details.append(f"до {price_millions:.1f} млн сум")
        except (ValueError, TypeError):
            pass

    if details:
        parts.append("(" + ", ".join(details) + ")")

    return " ".join(parts) + "."


# 🆕 ДОПОЛНИТЕЛЬНЫЙ ЭНДПОИНТ - Умные подсказки
@api_view(['POST'])
@permission_classes([AllowAny])
def ai_suggest(request):
    """
    🤖 УМНЫЕ ПОДСКАЗКИ ДЛЯ ПОИСКА

    POST /api/properties/ai-suggest/

    Body:
    {
        "partial_query": "2 комнатная рядом с"
    }

    Response:
    {
        "suggestions": [
            "2-комнатная рядом с НГПИ с WiFi",
            "2-комнатная рядом с центром с мебелью",
            "2-комнатная рядом с университетом"
        ]
    }
    """
    partial_query = request.data.get('partial_query', '').strip().lower()

    if not partial_query:
        return Response({'suggestions': []})

    suggestions = []

    # Простые шаблоны подсказок
    if 'рядом с' in partial_query or 'около' in partial_query:
        suggestions = [
            f"{partial_query} НГПИ с WiFi",
            f"{partial_query} НГПИ с мебелью",
            f"{partial_query} центром",
            f"{partial_query} университетом",
            f"{partial_query} рынком",
        ]
    elif 'комнат' in partial_query:
        base = partial_query.split('комнат')[0] + 'комнатная'
        suggestions = [
            f"{base} с WiFi рядом с НГПИ",
            f"{base} с мебелью",
            f"{base} рядом с НГПИ до 2 млн",
            f"{base} в центре с ремонтом",
            f"{base} с кондиционером"
        ]
    elif 'квартир' in partial_query:
        suggestions = [
            f"{partial_query} рядом с НГПИ с WiFi",
            f"{partial_query} в центре с мебелью",
            f"{partial_query} с WiFi и кондиционером",
            f"{partial_query} недорого",
            f"{partial_query} для студентки"
        ]
    elif 'wifi' in partial_query or 'вайфай' in partial_query:
        suggestions = [
            f"{partial_query} и мебелью рядом с НГПИ",
            f"{partial_query} рядом с университетом",
            f"{partial_query} недорого",
        ]
    else:
        # Популярные запросы
        suggestions = [
            "2-комнатная квартира рядом с НГПИ с WiFi",
            "Квартира для студентки с WiFi и мебелью",
            "1-комнатная с мебелью до 2 млн",
            "Квартира рядом с университетом с WiFi",
            "Частный дом в центре"
        ]

    return Response({'suggestions': suggestions[:5]})