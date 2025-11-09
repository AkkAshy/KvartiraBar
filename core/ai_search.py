"""
AI-сервис для умного поиска недвижимости
Поддерживает: OpenAI, Google Gemini, Anthropic Claude
"""
import os
import requests
import json
from typing import Dict, List, Optional
from django.conf import settings
from dotenv import load_dotenv

# Загружаем переменные окружения
load_dotenv()


class AISearchService:
    """
    Умный поиск недвижимости с помощью LLM

    Примеры запросов:
    - "Найди мне 2-комнатную квартиру рядом с НГПИ до 2 миллионов"
    - "Хочу квартиру для студентки с WiFi и мебелью"
    - "Покажи частные дома в центре с ремонтом"
    """

    def __init__(self, provider: Optional[str] = None):
        # Выбираем провайдера, если не передан — по умолчанию openai
        self.provider = provider or 'openai'

        # Получаем API ключ из окружения
        if self.provider == 'openai':
            self.api_key = os.getenv("AI_API_KEY")
        elif self.provider == 'gemini':
            self.api_key = os.getenv("GEMINI_API_KEY")
        elif self.provider == 'claude':
            self.api_key = os.getenv("CLAUDE_API_KEY")
        else:
            raise ValueError(f"Unknown provider: {self.provider}")

        if not self.api_key:
            print("⚠️ AI_API_KEY не настроен! AI-поиск будет использовать fallback")

    def search(self, user_query: str, user_location: Optional[Dict] = None) -> Dict:
        """
        Главный метод поиска

        Args:
            user_query: Запрос пользователя на естественном языке
            user_location: {"lat": 42.464, "lon": 59.610} - местоположение пользователя

        Returns:
            {
                "filters": {...},  # Извлеченные фильтры
                "search_query": "...",  # Обработанный поисковый запрос
                "intent": "...",  # Намерение пользователя
                "confidence": 0.95  # Уверенность AI
            }
        """
        print(f"\n🤖 AI-ПОИСК: {user_query}")

        try:
            if self.api_key:
                # Используем настоящий AI
                result = self._ai_parse_query(user_query, user_location)
            else:
                # Fallback на простую логику
                result = self._fallback_parse_query(user_query)

            print(f"✅ Результат: {json.dumps(result, ensure_ascii=False, indent=2)}")
            return result

        except Exception as e:
            print(f"❌ Ошибка AI-поиска: {e}")
            # Возвращаем fallback
            return self._fallback_parse_query(user_query)

    def _ai_parse_query(self, query: str, user_location: Optional[Dict]) -> Dict:
        """
        Парсинг запроса с помощью LLM API
        """
        if self.provider == 'openai':
            return self._openai_parse(query, user_location)
        elif self.provider == 'gemini':
            return self._gemini_parse(query, user_location)
        elif self.provider == 'claude':
            return self._claude_parse(query, user_location)
        else:
            raise ValueError(f"Неизвестный AI provider: {self.provider}")

    def _openai_parse(self, query: str, user_location: Optional[Dict]) -> Dict:
        """
        Использует OpenAI GPT-4 для парсинга запроса
        """
        url = "https://api.openai.com/v1/chat/completions"

        system_prompt = self._get_system_prompt()
        user_prompt = self._build_user_prompt(query, user_location)

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        data = {
            "model": "gpt-4o-mini",  # Дешевле чем gpt-4
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.3,  # Меньше креативности, больше точности
            "response_format": {"type": "json_object"}
        }

        response = requests.post(url, headers=headers, json=data, timeout=30)
        response.raise_for_status()

        result = response.json()
        ai_response = json.loads(result['choices'][0]['message']['content'])

        return ai_response

    def _gemini_parse(self, query: str, user_location: Optional[Dict]) -> Dict:
        """
        Использует Google Gemini для парсинга запроса
        """
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key={self.api_key}"

        system_prompt = self._get_system_prompt()
        user_prompt = self._build_user_prompt(query, user_location)

        data = {
            "contents": [{
                "parts": [{
                    "text": f"{system_prompt}\n\n{user_prompt}"
                }]
            }],
            "generationConfig": {
                "temperature": 0.3,
                "topK": 1,
                "topP": 1,
            }
        }

        response = requests.post(url, json=data, timeout=30)
        response.raise_for_status()

        result = response.json()
        ai_text = result['candidates'][0]['content']['parts'][0]['text']

        # Извлекаем JSON из ответа
        import re
        json_match = re.search(r'\{.*\}', ai_text, re.DOTALL)
        if json_match:
            ai_response = json.loads(json_match.group())
        else:
            raise ValueError("Не удалось извлечь JSON из ответа Gemini")

        return ai_response

    def _claude_parse(self, query: str, user_location: Optional[Dict]) -> Dict:
        """
        Использует Anthropic Claude для парсинга запроса
        """
        url = "https://api.anthropic.com/v1/messages"

        system_prompt = self._get_system_prompt()
        user_prompt = self._build_user_prompt(query, user_location)

        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }

        data = {
            "model": "claude-3-haiku-20240307",  # Быстрая и дешевая модель
            "max_tokens": 1024,
            "temperature": 0.3,
            "system": system_prompt,
            "messages": [
                {"role": "user", "content": user_prompt}
            ]
        }

        response = requests.post(url, headers=headers, json=data, timeout=30)
        response.raise_for_status()

        result = response.json()
        ai_text = result['content'][0]['text']

        # Извлекаем JSON
        import re
        json_match = re.search(r'\{.*\}', ai_text, re.DOTALL)
        if json_match:
            ai_response = json.loads(json_match.group())
        else:
            raise ValueError("Не удалось извлечь JSON из ответа Claude")

        return ai_response

    def _get_system_prompt(self) -> str:
        """
        Системный промпт для AI
        """
        return """Ты - эксперт по поиску недвижимости в Нукусе (Узбекистан).

Твоя задача: парсить запросы пользователей и извлекать фильтры для поиска квартир.

ДОСТУПНЫЕ ФИЛЬТРЫ:
- rooms: количество комнат (1, 2, 3, 4)
- type: тип сделки ("rent" или "sale")
- min_price, max_price: цена в сумах
- gender_preference: для кого сдается ("any", "male", "female", "family", "military")
- building_type: тип здания ("apartment", "private")
- floor, total_floors: этаж
- min_floor, max_floor: диапазон этажей
- exclude_first_floor, exclude_last_floor: исключить первый/последний этаж (true/false)
- building_year, min_year, max_year: год постройки
- repair_type: тип ремонта ("no", "cosmetic", "euro", "designer")
- has_furniture: с мебелью (true/false)
- has_wifi: есть WiFi (true/false)
- has_parking: есть парковка (true/false)
- has_elevator: есть лифт (true/false)
- has_conditioner: есть кондиционер (true/false)
- pets_allowed: можно с животными (true/false)
- search: текстовый поиск или ориентир (например "НГПИ", "центр", "Достлык")
- max_distance: радиус поиска в км (если указан ориентир)

ИЗВЕСТНЫЕ ОРИЕНТИРЫ НУКУСА:
- НГПИ (педагогический институт)
- КГУ, Каракалпакский университет
- Центр города, центр
- Парк Бердаха
- Центральный рынок
- Вокзал, ж/д вокзал

ВАЖНО:
- Возвращай ТОЛЬКО валидный JSON
- Не придумывай несуществующие поля
- Если что-то непонятно, оставь поле пустым
- Цены в сумах (1 млн = 1000000)

ФОРМАТ ОТВЕТА:
{
  "filters": {
    "rooms": 2,
    "type": "rent",
    "max_price": 2000000,
    "search": "НГПИ",
    "has_wifi": true
  },
  "search_query": "2-комнатная квартира рядом с НГПИ",
  "intent": "rent_apartment_near_university",
  "confidence": 0.95
}"""

    def _build_user_prompt(self, query: str, user_location: Optional[Dict]) -> str:
        """
        Строит промпт для пользователя
        """
        prompt = f"ЗАПРОС ПОЛЬЗОВАТЕЛЯ: {query}\n\n"

        if user_location:
            prompt += f"МЕСТОПОЛОЖЕНИЕ ПОЛЬЗОВАТЕЛЯ: lat={user_location['lat']}, lon={user_location['lon']}\n\n"

        prompt += "Проанализируй запрос и верни JSON с фильтрами."

        return prompt

    def _fallback_parse_query(self, query: str) -> Dict:
        """
        Простой парсинг без AI (fallback)
        Использует ключевые слова
        """
        query_lower = query.lower()

        filters = {}

        # Количество комнат
        if '1-комн' in query_lower or '1 комн' in query_lower or 'однокомнатн' in query_lower:
            filters['rooms'] = 1
        elif '2-комн' in query_lower or '2 комн' in query_lower or 'двухкомнатн' in query_lower:
            filters['rooms'] = 2
        elif '3-комн' in query_lower or '3 комн' in query_lower or 'трехкомнатн' in query_lower:
            filters['rooms'] = 3
        elif '4-комн' in query_lower or '4 комн' in query_lower or 'четырехкомнатн' in query_lower:
            filters['rooms'] = 4

        # Тип сделки
        if 'аренд' in query_lower or 'снять' in query_lower or 'сдается' in query_lower:
            filters['type'] = 'rent'
        elif 'купить' in query_lower or 'продается' in query_lower or 'продажа' in query_lower:
            filters['type'] = 'sale'

        # Для кого
        if 'парн' in query_lower or 'студент' in query_lower or 'парень' in query_lower:
            filters['gender_preference'] = 'male'
        elif 'девуш' in query_lower or 'студентк' in query_lower or 'девушка' in query_lower:
            filters['gender_preference'] = 'female'
        elif 'семь' in query_lower or 'семейн' in query_lower or 'семья' in query_lower:
            filters['gender_preference'] = 'family'
        elif 'военн' in query_lower:
            filters['gender_preference'] = 'military'

        # Удобства
        if 'мебел' in query_lower:
            filters['has_furniture'] = True
        if 'wifi' in query_lower or 'вайфай' in query_lower or 'интернет' in query_lower:
            filters['has_wifi'] = True
        if 'парков' in query_lower:
            filters['has_parking'] = True
        if 'лифт' in query_lower:
            filters['has_elevator'] = True
        if 'кондиционер' in query_lower:
            filters['has_conditioner'] = True
        if 'животн' in query_lower or 'питом' in query_lower or 'кошк' in query_lower or 'собак' in query_lower:
            filters['pets_allowed'] = True

        # Ориентиры
        search_terms = []
        if 'нгпи' in query_lower:
            search_terms.append('НГПИ')
        if 'центр' in query_lower:
            search_terms.append('центр')
        if 'кгу' in query_lower or 'университет' in query_lower:
            search_terms.append('КГУ')
        if 'вокзал' in query_lower:
            search_terms.append('вокзал')
        if 'рынок' in query_lower:
            search_terms.append('рынок')

        if search_terms:
            filters['search'] = ' '.join(search_terms)

        # Цена (простое извлечение чисел)
        import re
        numbers = re.findall(r'\d+(?:\s?\d+)*', query)
        if numbers:
            # Преобразуем в сумы
            prices = []
            for num in numbers:
                num_clean = num.replace(' ', '')
                if 'млн' in query_lower or 'миллион' in query_lower:
                    prices.append(int(num_clean) * 1000000)
                elif 'тыс' in query_lower or 'тысяч' in query_lower:
                    prices.append(int(num_clean) * 1000)
                else:
                    prices.append(int(num_clean))

            if 'до' in query_lower and prices:
                filters['max_price'] = max(prices)
            elif 'от' in query_lower and prices:
                filters['min_price'] = min(prices)

        return {
            "filters": filters,
            "search_query": query,
            "intent": "search_property",
            "confidence": 0.6,  # Низкая уверенность без AI
            "method": "fallback"
        }


# Singleton инстанс
ai_search_service = AISearchService()
