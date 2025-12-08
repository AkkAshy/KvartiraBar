# 🤖 AI Search API - Руководство

## Что это?

**AI Search** - это умный поиск недвижимости, который понимает естественный язык. Вместо того чтобы указывать множество фильтров, пользователь просто пишет что хочет, а AI сам извлекает все параметры.

## 📱 Как использовать из приложения

### Endpoint
```
POST http://localhost:8000/api/properties/ai-search/
```
или
```
POST https://kvartirabar.uz/api/properties/ai-search/
```

### Запрос
```json
{
    "query": "2 комнатная квартира рядом с НГПИ с WiFi до 2 миллионов"
}
```

### Ответ
```json
{
    "ai_analysis": {
        "filters": {
            "rooms": 2,
            "search": "НГПИ",
            "has_wifi": true,
            "max_price": 2000000,
            "type": "rent",
            "max_distance": 5
        },
        "confidence": 0.95
    },
    "results": [
        {
            "id": 1,
            "title": "2-комнатная квартира для студентов",
            "type": "rent",
            "price_per_month": 1800000,
            "rooms": 2,
            "address": "Нукус, улица Достлик 12",
            "has_wifi": true,
            "distance_from_search": 0.8,
            "images": [...],
            "price_display": {
                "amount": 1800000,
                "formatted": "1 800 000 сум/мес",
                "period": "month"
            }
        }
    ],
    "count": 5,
    "message": "Найдено 5 квартир (2-комнатная, рядом с НГПИ, с WiFi, до 2.0 млн сум)."
}
```

## 🎯 Примеры запросов

### 1. Простой поиск
```json
{
    "query": "Квартира рядом с НГПИ"
}
```

### 2. Детальный поиск
```json
{
    "query": "2 комнатная квартира для студентки с WiFi и мебелью рядом с университетом до 2 миллионов"
}
```
AI поймет:
- `rooms: 2` (2 комнатная)
- `gender_preference: ["female"]` (для студентки)
- `has_wifi: true` (с WiFi)
- `has_furniture: true` (с мебелью)
- `search: "университет"` (рядом с университетом)
- `max_price: 2000000` (до 2 миллионов)
- `type: "rent"` (для студентки = аренда)

### 3. С геолокацией пользователя
```json
{
    "query": "Покажи квартиры поблизости",
    "user_location": {
        "lat": 42.464,
        "lon": 59.610
    }
}
```

### 4. Продажа
```json
{
    "query": "Хочу купить 3 комнатную квартиру в центре с ремонтом"
}
```
AI поймет:
- `type: "sale"` (купить)
- `rooms: 3`
- `search: "центр"`
- `repair_type: "euro"` или `"cosmetic"` (с ремонтом)

### 5. Посуточная аренда
```json
{
    "query": "Снять квартиру на пару дней с WiFi недорого"
}
```
AI поймет:
- `type: "daily_rent"` (на пару дней)
- `has_wifi: true`
- `max_price_per_day: 200000` (недорого)

## 🌟 Что AI понимает

### Количество комнат
- "1 комнатная", "однушка", "студия" → `rooms: 1`
- "2 комнатная", "двушка" → `rooms: 2`
- "3 комнатная", "трешка" → `rooms: 3`

### Тип сделки
- "купить", "продажа", "в собственность" → `type: "sale"`
- "снять", "аренда", "арендовать" → `type: "rent"`
- "посуточно", "на неделю", "на пару дней" → `type: "daily_rent"`

### Цена
- "до 2 миллионов", "до 2 млн" → `max_price: 2000000`
- "от 1 миллиона" → `min_price: 1000000`
- "недорого" → `max_price: 1500000` (для аренды)

### Локация
- "рядом с НГПИ", "около НГПИ" → `search: "НГПИ", max_distance: 5`
- "в центре" → `search: "центр"`
- "у вокзала" → `search: "вокзал"`

### Для кого
- "для студента", "для парня" → `gender_preference: ["male"]`
- "для студентки", "для девушки" → `gender_preference: ["female"]`
- "для семьи", "семейным" → `gender_preference: ["family"]`

### Удобства
- "с WiFi", "с интернетом" → `has_wifi: true`
- "с мебелью", "меблированная" → `has_furniture: true`
- "с парковкой" → `has_parking: true`
- "с лифтом" → `has_elevator: true`
- "с балконом" → `has_balcony: true`
- "с кондиционером" → `has_conditioner: true`
- "со стиральной машиной" → `has_washing_machine: true`
- "с холодильником" → `has_fridge: true`
- "можно с животными", "можно с собакой" → `pets_allowed: true`

### Ремонт
- "с ремонтом", "отремонтированная" → `repair_type: "euro"`
- "евроремонт" → `repair_type: "euro"`
- "косметический ремонт" → `repair_type: "cosmetic"`
- "без ремонта" → `repair_type: "no"`

### Этаж
- "не первый этаж" → `exclude_first_floor: true`
- "не последний этаж" → `exclude_last_floor: true`
- "5 этаж" → `floor: 5`

### Тип здания
- "частный дом" → `building_type: "private"`
- "многоквартирный", "в доме" → `building_type: "apartment"`

## 📱 Примеры кода для разных платформ

### Swift (iOS)
```swift
struct AISearchRequest: Codable {
    let query: String
    let user_location: Location?
}

struct Location: Codable {
    let lat: Double
    let lon: Double
}

func searchProperties(query: String) async throws -> SearchResponse {
    let url = URL(string: "http://localhost:8000/api/properties/ai-search/")!
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")

    let body = AISearchRequest(query: query, user_location: nil)
    request.httpBody = try JSONEncoder().encode(body)

    let (data, _) = try await URLSession.shared.data(for: request)
    return try JSONDecoder().decode(SearchResponse.self, from: data)
}

// Использование
let results = try await searchProperties(query: "2 комнатная рядом с НГПИ с WiFi")
print("Найдено: \(results.count) квартир")
```

### Kotlin (Android)
```kotlin
data class AISearchRequest(
    val query: String,
    val user_location: Location? = null
)

data class Location(val lat: Double, val lon: Double)

suspend fun searchProperties(query: String): SearchResponse {
    val client = OkHttpClient()
    val gson = Gson()

    val requestBody = AISearchRequest(query = query)
    val json = gson.toJson(requestBody)

    val request = Request.Builder()
        .url("http://localhost:8000/api/properties/ai-search/")
        .post(json.toRequestBody("application/json".toMediaType()))
        .build()

    val response = client.newCall(request).execute()
    return gson.fromJson(response.body?.string(), SearchResponse::class.java)
}

// Использование
lifecycleScope.launch {
    val results = searchProperties("2 комнатная рядом с НГПИ с WiFi")
    println("Найдено: ${results.count} квартир")
}
```

### Flutter (Dart)
```dart
import 'package:http/http.dart' as http;
import 'dart:convert';

Future<Map<String, dynamic>> searchProperties(String query) async {
  final response = await http.post(
    Uri.parse('http://localhost:8000/api/properties/ai-search/'),
    headers: {'Content-Type': 'application/json'},
    body: jsonEncode({'query': query}),
  );

  if (response.statusCode == 200) {
    return jsonDecode(response.body);
  } else {
    throw Exception('Failed to search properties');
  }
}

// Использование
final results = await searchProperties('2 комнатная рядом с НГПИ с WiFi');
print('Найдено: ${results['count']} квартир');
```

### React Native (JavaScript)
```javascript
async function searchProperties(query) {
  const response = await fetch('http://localhost:8000/api/properties/ai-search/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  return await response.json();
}

// Использование
const results = await searchProperties('2 комнатная рядом с НГПИ с WiFi');
console.log(`Найдено: ${results.count} квартир`);
```

## 🎨 Подсказки (Autocomplete)

Для автодополнения используй второй endpoint:

```
POST http://localhost:8000/api/properties/ai-suggest/
```

### Запрос
```json
{
    "partial_query": "2 комнатная рядом с"
}
```

### Ответ
```json
{
    "suggestions": [
        "2 комнатная рядом с НГПИ с WiFi",
        "2 комнатная рядом с НГПИ с мебелью",
        "2 комнатная рядом с центром",
        "2 комнатная рядом с университетом",
        "2 комнатная рядом с рынком"
    ]
}
```

### Пример использования
```javascript
// При каждом изменении текста в поисковой строке
const handleSearchChange = async (text) => {
  if (text.length < 3) return;

  const response = await fetch('http://localhost:8000/api/properties/ai-suggest/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ partial_query: text })
  });

  const data = await response.json();
  setSuggestions(data.suggestions);
};
```

## 🗺️ Известные ориентиры

Система уже знает эти локации в Нукусе:
- **НГПИ** - Нукусский государственный педагогический институт
- **КГУ** / **Каракалпакский университет**
- **Парк Бердаха**
- **Центральный рынок**
- **Центр** - центр города
- **Вокзал** - железнодорожный вокзал

Если локация не найдена в базе, система автоматически ищет через Yandex Maps API.

## ⚙️ Параметры

### query (обязательный)
Текстовый запрос на естественном языке

### user_location (опциональный)
```json
{
    "lat": 42.464,
    "lon": 59.610
}
```
Используется когда в запросе есть "поблизости", "рядом со мной" и т.д.

## 📊 Формат ответа

```json
{
    "ai_analysis": {
        "filters": {...},           // Извлеченные фильтры
        "confidence": 0.95,         // Уверенность AI (0-1)
        "original_query": "..."     // Оригинальный запрос
    },
    "results": [...],               // Массив найденных квартир
    "count": 5,                     // Количество результатов
    "message": "..."                // Человекочитаемое сообщение
}
```

## 🚀 Преимущества AI-поиска

✅ **Простота** - отправляешь одну строку текста
✅ **Умный** - понимает естественный язык
✅ **Быстрый** - без авторизации
✅ **Гибкий** - комбинирует любые фильтры
✅ **Локализованный** - знает Нукус

## ⚠️ Ограничения

- Максимум 20 результатов в одном ответе
- Радиус поиска по умолчанию 5 км
- Требуется AI_API_KEY для продвинутого AI (fallback работает без него)

## 🔧 Настройка

Если нужен продвинутый AI-анализ, добавь в `.env`:
```env
AI_API_KEY=your_openai_or_anthropic_key
```

Без API ключа работает fallback (простой парсинг текста).
