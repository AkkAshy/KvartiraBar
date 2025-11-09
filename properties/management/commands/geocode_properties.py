"""
Management команда для геокодинга существующих объектов недвижимости
"""
from django.core.management.base import BaseCommand
from properties.models import Property
from core.yandex_maps import geocoder_service


class Command(BaseCommand):
    help = 'Геокодирует все объекты недвижимости без координат'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Перегеокодировать все объекты, даже с координатами',
        )
        parser.add_argument(
            '--api-key',
            type=str,
            help='API ключ Яндекс.Карт (если не указан в .env)',
        )

    def handle(self, *args, **options):
        force = options['force']
        api_key = options.get('api_key')

        # Проверяем API ключ
        if api_key:
            geocoder_service.api_key = api_key

        if not geocoder_service.api_key:
            self.stdout.write(
                self.style.ERROR('❌ API ключ Яндекс.Карт не настроен!')
            )
            self.stdout.write(
                self.style.WARNING('\n📝 Инструкция:')
            )
            self.stdout.write('1. Получи ключ: https://developer.tech.yandex.ru/services/3')
            self.stdout.write('2. Добавь в .env файл: YANDEX_MAPS_API_KEY=твой-ключ')
            self.stdout.write('3. Или используй: python manage.py geocode_properties --api-key=твой-ключ')
            return

        # Получаем объекты для геокодинга
        if force:
            properties = Property.objects.all()
            self.stdout.write(f'🔄 Перегеокодирование всех объектов: {properties.count()}')
        else:
            properties = Property.objects.filter(latitude__isnull=True) | Property.objects.filter(longitude__isnull=True)
            self.stdout.write(f'📍 Найдено объектов без координат: {properties.count()}')

        if not properties.exists():
            self.stdout.write(self.style.SUCCESS('✅ Все объекты уже геокодированы!'))
            return

        success_count = 0
        fail_count = 0

        for prop in properties:
            self.stdout.write(f'\n🏠 Обрабатываем: {prop.id} - {prop.address}')

            try:
                result = geocoder_service.geocode_address(prop.address)

                if result:
                    prop.latitude = result['lat']
                    prop.longitude = result['lon']
                    # Сохраняем без повторного геокодинга
                    super(Property, prop).save()

                    success_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(f'  ✓ Координаты: {result["lat"]}, {result["lon"]}')
                    )
                    if result['formatted_address'] != prop.address:
                        self.stdout.write(f'  📝 Форматированный адрес: {result["formatted_address"]}')
                else:
                    fail_count += 1
                    self.stdout.write(
                        self.style.WARNING('  ✗ Не удалось геокодировать адрес')
                    )

            except Exception as e:
                fail_count += 1
                self.stdout.write(
                    self.style.ERROR(f'  ✗ Ошибка: {str(e)}')
                )

        # Итоги
        self.stdout.write('\n' + '='*50)
        self.stdout.write(self.style.SUCCESS(f'✅ Успешно геокодировано: {success_count}'))
        if fail_count > 0:
            self.stdout.write(self.style.WARNING(f'⚠️  Ошибок: {fail_count}'))
        self.stdout.write('='*50)