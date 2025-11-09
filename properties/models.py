from django.db import models
from users.models import User


class PropertyImage(models.Model):
    property = models.ForeignKey('Property', related_name='images', on_delete=models.CASCADE)
    image = models.ImageField(upload_to='properties/', verbose_name='Изображение')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Изображение недвижимости'
        verbose_name_plural = 'Изображения недвижимости'

    def __str__(self):
        return f"Изображение для {self.property.title}"


class Property(models.Model):
    TYPE_CHOICES = [
    ('sale', 'Продажа'),
    ('rent', 'Аренда'),
    ('daily_rent', 'Посуточная аренда'),
    ]
    STATUS_CHOICES = [
        ('active', 'Активно'),
        ('sold', 'Продано'),
        ('rented', 'Сдано в аренду'),
        ('archived', 'В архиве'),
    ]
    GENDER_CHOICES = [
        ('any', 'Всем'),
        ('male', 'Парням'),
        ('female', 'Девушкам'),
        ('family', 'Семейным'),
        ('military', 'Военным'),
    ]

    # Множественный выбор для gender_preference
    gender_preference = models.JSONField(
        default=list,
        blank=True,
        verbose_name='Кому сдается',
        help_text='Можно выбрать несколько вариантов'
    )
    BOILER_CHOICES = [
        ('none', 'Нет'),
        ('factory', 'Заводской'),
        ('custom', 'Самодельный'),
    ]
    # 🆕 НОВЫЕ CHOICES
    BUILDING_TYPE_CHOICES = [
        ('apartment', 'Многоквартирный дом'),
        ('private', 'Частный дом'),
    ]
    REPAIR_CHOICES = [
        ('no', 'Без ремонта'),
        ('cosmetic', 'Косметический'),
        ('euro', 'Евроремонт'),
        ('designer', 'Дизайнерский'),
    ]

    # Основные поля
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='properties', verbose_name='Владелец')
    title = models.CharField(max_length=255, verbose_name='Название')
    description = models.TextField(verbose_name='Описание')
    price = models.DecimalField(max_digits=15, decimal_places=2, verbose_name='Цена')
    address = models.CharField(max_length=500, verbose_name='Адрес')
    latitude = models.FloatField(null=True, blank=True, verbose_name='Широта')
    longitude = models.FloatField(null=True, blank=True, verbose_name='Долгота')
    area = models.FloatField(verbose_name='Площадь (м²)')
    rooms = models.PositiveIntegerField(verbose_name='Количество комнат')
    type = models.CharField(max_length=15, choices=TYPE_CHOICES, default='sale', verbose_name='Тип')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active', verbose_name='Статус')

    price_per_day = models.DecimalField(
    max_digits=10,
    decimal_places=2,
    null=True,
    blank=True,
    verbose_name='Цена за сутки'
    )
    price_per_month = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name='Цена за месяц'
    )
    min_rental_days = models.PositiveIntegerField(
        default=1,
        verbose_name='Минимальный срок аренды',
        help_text='Для посуточной: минимум сколько суток. Для долгосрочной: минимум месяцев'
    )

    # Фильтры для студентов
    # gender_preference = models.CharField(max_length=10, choices=GENDER_CHOICES, default='any', verbose_name='Кому сдается')  # Закомментировано, заменено на JSONField
    boiler_type = models.CharField(max_length=10, choices=BOILER_CHOICES, default='none', verbose_name='Тип котла')
    has_furniture = models.BooleanField(default=False, verbose_name='С мебелью')
    near_university = models.CharField(max_length=200, blank=True, verbose_name='Рядом с университетом')

    # 🆕 ИНФОРМАЦИЯ О ДОМЕ
    building_type = models.CharField(
        max_length=20,
        choices=BUILDING_TYPE_CHOICES,
        default='apartment',
        verbose_name='Тип здания'
    )
    floor = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name='Этаж',
        help_text='На каком этаже находится квартира'
    )
    total_floors = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name='Всего этажей',
        help_text='Сколько этажей в доме'
    )
    entrance = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name='Подъезд'
    )
    apartment_number = models.CharField(
        max_length=10,
        blank=True,
        verbose_name='Номер квартиры'
    )
    building_year = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name='Год постройки'
    )

    # 🆕 ДОПОЛНИТЕЛЬНЫЕ УДОБСТВА
    repair_type = models.CharField(
        max_length=20,
        choices=REPAIR_CHOICES,
        default='no',
        verbose_name='Ремонт'
    )
    has_parking = models.BooleanField(default=False, verbose_name='Есть парковка')
    has_elevator = models.BooleanField(default=False, verbose_name='Есть лифт')
    has_balcony = models.BooleanField(default=False, verbose_name='Есть балкон')
    has_wifi = models.BooleanField(default=False, verbose_name='Есть WiFi')
    has_conditioner = models.BooleanField(default=False, verbose_name='Есть кондиционер')
    has_washing_machine = models.BooleanField(default=False, verbose_name='Есть стиральная машина')
    has_fridge = models.BooleanField(default=False, verbose_name='Есть холодильник')
    pets_allowed = models.BooleanField(default=False, verbose_name='Можно с животными')

    # 🆕 AI-ПОИСК - Для кэширования результатов геокодинга
    nearby_landmarks = models.JSONField(
        default=list,
        blank=True,
        verbose_name='Ближайшие ориентиры',
        help_text='Автоматически заполняется: [{"name": "НГПИ", "distance": 1.2}]'
    )
    search_keywords = models.TextField(
        blank=True,
        verbose_name='Ключевые слова для поиска',
        help_text='Автоматически генерируется из адреса и описания'
    )

    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Дата обновления')

    class Meta:
        verbose_name = 'Недвижимость'
        verbose_name_plural = 'Недвижимость'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['latitude', 'longitude']),  # Для быстрого поиска по координатам
            models.Index(fields=['type', 'status']),
            models.Index(fields=['gender_preference']),
        ]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        """
        ✅ Автоматический геокодинг при сохранении
        ✅ Генерация ключевых слов для поиска
        ✅ Поиск ближайших ориентиров
        """
        # Геокодируем, если есть адрес и НЕТ координат
        if self.address and (not self.latitude or not self.longitude):
            try:
                from core.yandex_maps import geocoder_service
                result = geocoder_service.geocode_address(self.address)
                if result:
                    self.latitude = result['lat']
                    self.longitude = result['lon']
                    print(f"✅ Автогеокодинг: {self.address[:50]}... → ({self.latitude}, {self.longitude})")
            except Exception as e:
                print(f"❌ Ошибка геокодинга: {e}")

        # 🆕 Генерируем ключевые слова для AI-поиска
        self._generate_search_keywords()

        super().save(*args, **kwargs)

        # 🆕 После сохранения ищем ближайшие ориентиры
        if self.latitude and self.longitude:
            self._find_nearby_landmarks()

    def _generate_search_keywords(self):
        """
        Генерирует ключевые слова для умного поиска
        """
        keywords = []

        # Адрес
        if self.address:
            keywords.append(self.address.lower())

        # Название
        if self.title:
            keywords.append(self.title.lower())

        # Описание
        if self.description:
            keywords.append(self.description.lower())

        # Рядом с университетом
        if self.near_university:
            keywords.append(self.near_university.lower())

        self.search_keywords = ' | '.join(keywords)

    def _find_nearby_landmarks(self):
        """
        🆕 Находит ближайшие известные места (университеты, парки и т.д.)
        """
        if not self.latitude or not self.longitude:
            return

        # Известные ориентиры Нукуса с координатами
        NUKUS_LANDMARKS = [
            {'name': 'НГПИ', 'lat': 42.4644, 'lon': 59.6103, 'type': 'university'},
            {'name': 'Каракалпакский государственный университет', 'lat': 42.4580, 'lon': 59.6100, 'type': 'university'},
            {'name': 'Парк имени Бердаха', 'lat': 42.4531, 'lon': 59.6103, 'type': 'park'},
            {'name': 'Центральный рынок', 'lat': 42.4600, 'lon': 59.6150, 'type': 'market'},
            {'name': 'Железнодорожный вокзал', 'lat': 42.4520, 'lon': 59.5950, 'type': 'transport'},
        ]

        nearby = []

        for landmark in NUKUS_LANDMARKS:
            # Вычисляем расстояние (формула Haversine)
            distance = self._calculate_distance(
                self.latitude, self.longitude,
                landmark['lat'], landmark['lon']
            )

            # Если меньше 5 км, добавляем
            if distance <= 5.0:
                nearby.append({
                    'name': landmark['name'],
                    'type': landmark['type'],
                    'distance': round(distance, 2)
                })

        # Сортируем по расстоянию
        nearby.sort(key=lambda x: x['distance'])

        # Сохраняем топ-5 ближайших
        self.nearby_landmarks = nearby[:5]

        # Обновляем без вызова save() чтобы не было рекурсии
        Property.objects.filter(pk=self.pk).update(nearby_landmarks=self.nearby_landmarks)

        print(f"🎯 Найдено {len(nearby)} ориентиров рядом с {self.title}")

    @staticmethod
    def _calculate_distance(lat1, lon1, lat2, lon2):
        """
        Вычисляет расстояние между двумя точками (формула Haversine)
        Возвращает расстояние в километрах
        """
        from math import radians, sin, cos, sqrt, atan2

        R = 6371  # Радиус Земли в км

        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])

        dlat = lat2 - lat1
        dlon = lon2 - lon1

        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))

        distance = R * c
        return distance


# Запрос на связь с владельцем
class ContactRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Ожидает'),
        ('contacted', 'Связались'),
        ('completed', 'Завершено'),
        ('cancelled', 'Отменено'),
    ]

    property = models.ForeignKey(
        Property,
        on_delete=models.CASCADE,
        related_name='contact_requests',
        verbose_name='Недвижимость'
    )
    buyer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='sent_contact_requests',
        verbose_name='Покупатель'
    )
    message = models.TextField(blank=True, verbose_name='Сообщение от покупателя')
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name='Статус'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Дата обновления')

    class Meta:
        verbose_name = 'Запрос на контакт'
        verbose_name_plural = 'Запросы на контакт'
        ordering = ['-created_at']
        unique_together = ['property', 'buyer']

    def __str__(self):
        return f"{self.buyer.full_name} -> {self.property.title}"


# Избранное
class Favorite(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='favorites')
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name='favorited_by')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Избранное'
        verbose_name_plural = 'Избранное'
        unique_together = ['user', 'property']

    def __str__(self):
        return f"{self.user.full_name} - {self.property.title}"
