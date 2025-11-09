"""
Утилиты для работы с Яндекс.Картами API
"""
import requests
from django.conf import settings


class YandexGeocoderService:
    """
    Сервис для работы с Яндекс.Геокодером
    """
    GEOCODE_URL = "https://geocode-maps.yandex.ru/1.x/"

    def __init__(self):
        self.api_key = getattr(settings, 'YANDEX_MAPS_API_KEY', None)
        if not self.api_key:
            raise ValueError("YANDEX_MAPS_API_KEY не настроен в settings")

    def geocode_address(self, address):
        """
        Преобразует адрес в координаты (широта, долгота)

        Args:
            address (str): Адрес для геокодинга

        Returns:
            dict: {'lat': float, 'lon': float, 'formatted_address': str} или None
        """
        try:

            if 'Нукус' not in address and 'нукус' not in address.lower():
                address = f"Нукус, Узбекистан, {address}"

            params = {
                'apikey': self.api_key,
                'geocode': address,
                'format': 'json',
                'results': 1,
                'lang': 'ru_RU'
            }

            response = requests.get(self.GEOCODE_URL, params=params, timeout=10)
            response.raise_for_status()

            data = response.json()

            # Извлекаем результат
            feature_member = data.get('response', {}).get('GeoObjectCollection', {}).get('featureMember', [])

            if not feature_member:
                return None

            geo_object = feature_member[0].get('GeoObject', {})
            point = geo_object.get('Point', {}).get('pos', '').split()

            if len(point) != 2:
                return None

            lon, lat = point
            formatted_address = geo_object.get('metaDataProperty', {}).get('GeocoderMetaData', {}).get('text', address)

            return {
                'lat': float(lat),
                'lon': float(lon),
                'formatted_address': formatted_address
            }

        except Exception as e:
            print(f"Ошибка геокодинга: {e}")
            return None

    def reverse_geocode(self, lat, lon):
        """
        Преобразует координаты в адрес

        Args:
            lat (float): Широта
            lon (float): Долгота

        Returns:
            str: Адрес или None
        """
        try:
            params = {
                'apikey': self.api_key,
                'geocode': f"{lon},{lat}",
                'format': 'json',
                'results': 1,
                'lang': 'ru_RU'
            }

            response = requests.get(self.GEOCODE_URL, params=params, timeout=10)
            response.raise_for_status()

            data = response.json()

            feature_member = data.get('response', {}).get('GeoObjectCollection', {}).get('featureMember', [])

            if not feature_member:
                return None

            geo_object = feature_member[0].get('GeoObject', {})
            address = geo_object.get('metaDataProperty', {}).get('GeocoderMetaData', {}).get('text', '')

            return address

        except Exception as e:
            print(f"Ошибка обратного геокодинга: {e}")
            return None

    def suggest_addresses(self, query, bbox=None):
        """
        Автодополнение адресов при вводе

        Args:
            query (str): Строка поиска
            bbox (tuple): Ограничивающий прямоугольник (lon_min, lat_min, lon_max, lat_max)

        Returns:
            list: Список предложенных адресов
        """
        try:
            params = {
                'apikey': self.api_key,
                'geocode': query,
                'format': 'json',
                'results': 10,
                'lang': 'ru_RU'
            }

            if bbox:
                # Формат bbox: lon_min,lat_min~lon_max,lat_max
                params['bbox'] = f"{bbox[0]},{bbox[1]}~{bbox[2]},{bbox[3]}"

            response = requests.get(self.GEOCODE_URL, params=params, timeout=10)
            response.raise_for_status()

            data = response.json()

            feature_members = data.get('response', {}).get('GeoObjectCollection', {}).get('featureMember', [])

            suggestions = []
            for member in feature_members:
                geo_object = member.get('GeoObject', {})
                address = geo_object.get('metaDataProperty', {}).get('GeocoderMetaData', {}).get('text', '')
                point = geo_object.get('Point', {}).get('pos', '').split()

                if len(point) == 2:
                    lon, lat = point
                    suggestions.append({
                        'address': address,
                        'lat': float(lat),
                        'lon': float(lon)
                    })

            return suggestions

        except Exception as e:
            print(f"Ошибка автодополнения: {e}")
            return []


# Создаем singleton инстанс
geocoder_service = YandexGeocoderService()