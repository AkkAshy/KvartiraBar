# properties/urls.py - ОБНОВЛЕННАЯ ВЕРСИЯ

from django.urls import path
from .views import (
    PropertyListCreateView,
    PropertyDetailView,
    geocode_address,
    suggest_addresses,
    reverse_geocode,
    delete_image,
    my_properties,
    search_near_landmark,
    # Избранное
    favorites_list,
    add_to_favorites,
    remove_from_favorites,
    toggle_favorite,
    # Заявки на контакт
    create_contact_request,
    my_contact_requests,
    received_contact_requests,
    update_contact_request_status,
)
from .views_ai import ai_search, ai_suggest  # 🆕 AI-поиск

app_name = 'properties'

urlpatterns = [
    # Основные CRUD операции
    path('', PropertyListCreateView.as_view(), name='property-list-create'),
    path('<int:pk>/', PropertyDetailView.as_view(), name='property-detail'),

    # Мои объявления
    path('my/', my_properties, name='my-properties'),

    # Избранное
    path('favorites/', favorites_list, name='favorites-list'),
    path('<int:property_id>/favorite/', add_to_favorites, name='add-to-favorites'),
    path('<int:property_id>/unfavorite/', remove_from_favorites, name='remove-from-favorites'),
    path('<int:property_id>/toggle-favorite/', toggle_favorite, name='toggle-favorite'),

    # Заявки на контакт
    path('<int:property_id>/contact/', create_contact_request, name='create-contact-request'),
    path('my-contact-requests/', my_contact_requests, name='my-contact-requests'),
    path('received-contact-requests/', received_contact_requests, name='received-contact-requests'),
    path('contact-requests/<int:request_id>/', update_contact_request_status, name='update-contact-request'),

    # Удаление изображения
    path('<int:property_id>/images/<int:image_id>/', delete_image, name='delete-image'),

    # Обычный AI-поиск по ориентирам
    path('search-near/', search_near_landmark, name='search-near-landmark'),

    # 🆕 AI-ПОИСК ЧЕРЕЗ LLM
    path('ai-search/', ai_search, name='ai-search'),
    path('ai-suggest/', ai_suggest, name='ai-suggest'),

    # Яндекс Карты
    path('geocode/', geocode_address, name='geocode-address'),
    path('suggest/', suggest_addresses, name='suggest-addresses'),
    path('reverse-geocode/', reverse_geocode, name='reverse-geocode'),
]

# ========================================
# 🤖 НОВЫЕ AI-ЭНДПОИНТЫ:
# ========================================
#
# POST /api/properties/ai-search/
#   Body: {"query": "2-комнатная рядом с НГПИ до 2 млн с WiFi"}
#   Response: {"ai_analysis": {...}, "results": [...], "count": 5}
#
# POST /api/properties/ai-suggest/
#   Body: {"partial_query": "2 комнатная рядом с"}
#   Response: {"suggestions": ["2-комнатная рядом с НГПИ", ...]}
#
# ========================================


# ========================================
# 📝 ПРИМЕРЫ ЗАПРОСОВ:
# ========================================
#
# 1. Простой AI-поиск:
#    POST /api/properties/ai-search/
#    {"query": "Найди квартиру рядом с НГПИ"}
#
# 2. Сложный AI-поиск:
#    POST /api/properties/ai-search/
#    {"query": "Хочу 2-комнатную квартиру длåя студентки с WiFi и мебелью рядом с университетом до 2 миллионов"}
#
# 3. С местоположением:
#    POST /api/properties/ai-search/
#    {
#      "query": "Покажи квартиры поблизости",
#      "user_location": {"lat": 42.464, "lon": 59.610}
#    }
#
# 4. Подсказки:
#    POST /api/properties/ai-suggest/
#    {"partial_query": "2 комнатная"}
#    → ["2-комнатная с WiFi", "2-комнатная рядом с НГПИ", ...]
#
# ========================================


# ========================================
# 🎯 СРАВНЕНИЕ МЕТОДОВ ПОИСКА:
# ========================================
#
# 1. Обычный поиск (GET):
#    /api/properties/?search=НГПИ&rooms=2&has_wifi=true
#    ✅ Быстрый, не требует API ключей
#    ❌ Нужно знать точные параметры
#
# 2. AI-поиск (POST):
#    /api/properties/ai-search/
#    {"query": "2 комнатная с wifi рядом с НГПИ"}
#    ✅ Понимает естественный язык
#    ✅ Автоматически извлекает фильтры
#    ❌ Требует API ключ (или использует fallback)
#
# 3. Поиск по ориентирам (GET):
#    /api/properties/search-near/?landmark=НГПИ&radius=2
#    ✅ Точный поиск по расстоянию
#    ❌ Один фильтр за раз
#
# ========================================
