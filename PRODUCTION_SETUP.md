# Настройка продакшен сервера (kvartirabar.uz)

## ✅ Callback URLs для Click

Вы правильно указали URL в панели Click:

```
Prepare: https://kvartirabar.uz/api/auctions/click/prepare/
Complete: https://kvartirabar.uz/api/auctions/click/complete/
```

## Важные настройки для продакшена

### 1. Настройка Click credentials

Откройте `config/settings.py` и замените:

```python
# Строки 22-23
CLICK_SERVICE_ID = 'ваш_service_id'  # Замените на реальный ID от Click
CLICK_SECRET_KEY = 'ваш_secret_key'  # Замените на реальный ключ от Click
```

**Где получить:**
- Личный кабинет Click: https://click.uz/
- Раздел "Настройки" → "API интеграция"
- Скопируйте `Service ID` и `Secret Key`

### 2. Настройка HTTPS (обязательно!)

Click требует HTTPS для callback URLs. Убедитесь что:

```python
# В settings.py для продакшена
DEBUG = False
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
```

### 3. Настройка CORS для фронтенда

```python
# В settings.py
CORS_ALLOWED_ORIGINS = [
    "https://kvartirabar.uz",
    "https://www.kvartirabar.uz",
]
```

### 4. Проверка URL маршрутов

Убедитесь что в `auctions/urls.py` есть:

```python
from django.urls import path
from .views import click_prepare, click_complete

urlpatterns = [
    # ... другие URL
    path('click/prepare/', click_prepare, name='click-prepare'),
    path('click/complete/', click_complete, name='click-complete'),
]
```

### 5. Тестирование callback URLs

Проверьте доступность endpoints:

```bash
# Prepare endpoint
curl -X POST https://kvartirabar.uz/api/auctions/click/prepare/ \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# Complete endpoint
curl -X POST https://kvartirabar.uz/api/auctions/click/complete/ \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

Должны вернуться JSON ответы (не 404 или 500).

### 6. Настройка логирования

Добавьте логирование для отслеживания платежей:

```python
# В settings.py
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': os.path.join(BASE_DIR, 'click_payments.log'),
        },
    },
    'loggers': {
        'auctions': {
            'handlers': ['file'],
            'level': 'INFO',
            'propagate': True,
        },
    },
}
```

### 7. Мониторинг платежей

#### Проверка статуса платежей через Django admin:

1. Откройте https://kvartirabar.uz/admin/
2. Перейдите в раздел "Auction Payments"
3. Проверьте статусы:
   - `pending` - ожидает оплаты
   - `completed` - успешно оплачено
   - `failed` - ошибка оплаты

#### Через Django shell:

```python
python manage.py shell

from auctions.models import AuctionPayment

# Все платежи
AuctionPayment.objects.all()

# Неоплаченные
AuctionPayment.objects.filter(status='pending')

# Успешные за сегодня
from django.utils import timezone
from datetime import timedelta
today = timezone.now() - timedelta(days=1)
AuctionPayment.objects.filter(status='completed', completed_at__gte=today)
```

### 8. Безопасность

#### Проверка подписи Click

Все callback от Click автоматически проверяются через MD5 подпись:

```python
# В click_service.py уже реализовано
def verify_signature(merchant_trans_id, service_id, secret_key, click_trans_id=None):
    if click_trans_id:
        sign_string = f"{click_trans_id}{service_id}{secret_key}{merchant_trans_id}"
    else:
        sign_string = f"{merchant_trans_id}{service_id}{secret_key}"

    return hashlib.md5(sign_string.encode('utf-8')).hexdigest()
```

#### Проверка суммы

В `click_service.py` уже проверяется что сумма = 50,000 сум.

### 9. Workflow оплаты

```
Пользователь создает аукцион
    ↓
Статус: pending_payment
    ↓
Пользователь нажимает "Инициировать оплату"
    ↓
Создается AuctionPayment с merchant_trans_id
    ↓
Пользователь копирует merchant_trans_id
    ↓
Пользователь оплачивает через Click app
    ↓
Click → POST /api/auctions/click/prepare/
    ↓
Проверка: подпись, сумма, статус
    ↓
Click → POST /api/auctions/click/complete/
    ↓
AuctionPayment.status = 'completed'
    ↓
Auction.is_paid = True
    ↓
Auction.status = 'scheduled' (если start_time в будущем)
или
Auction.status = 'active' (если start_time уже прошло)
```

### 10. Отладка проблем

#### Click не присылает callback

1. Проверьте что URL доступен извне:
   ```bash
   curl https://kvartirabar.uz/api/auctions/click/prepare/
   ```

2. Проверьте логи Django на сервере:
   ```bash
   tail -f /path/to/django/logs/error.log
   ```

3. Проверьте что HTTPS работает (Click требует HTTPS)

#### Ошибка "Sign check failed"

- Неверный `SECRET_KEY` в settings.py
- Проверьте что ключ совпадает с Click панелью

#### Ошибка "Transaction does not exist"

- `merchant_trans_id` не найден в базе
- Проверьте что платеж был создан через "Инициировать оплату"

#### Ошибка "Already paid"

- Платеж уже был выполнен
- Это нормально, повторная оплата блокируется

### 11. Checklist перед запуском

- [ ] `CLICK_SERVICE_ID` заменен на реальный
- [ ] `CLICK_SECRET_KEY` заменен на реальный
- [ ] HTTPS настроен и работает
- [ ] Callback URLs указаны в панели Click:
  - [ ] Prepare: https://kvartirabar.uz/api/auctions/click/prepare/
  - [ ] Complete: https://kvartirabar.uz/api/auctions/click/complete/
- [ ] Endpoints доступны (проверено через curl)
- [ ] DEBUG = False в продакшене
- [ ] ALLOWED_HOSTS содержит kvartirabar.uz
- [ ] Логирование настроено
- [ ] База данных в продакшене (PostgreSQL)
- [ ] Static files собраны (python manage.py collectstatic)

### 12. Тестовый платеж

1. Создайте аукцион через сайт
2. Нажмите "Инициировать оплату"
3. Скопируйте merchant_trans_id (например: `AUCTION_A1B2C3D4E5F6G7H8I9J0`)
4. Откройте Click app
5. Оплатите **50,000 сум** на ваш service
6. Проверьте что статус аукциона изменился с `pending_payment` на `scheduled` или `active`

### 13. Поддержка

**Если что-то не работает:**

1. Проверьте логи Django
2. Проверьте таблицу AuctionPayment в базе данных
3. Свяжитесь с техподдержкой Click: support@click.uz
4. Telegram: @click_support

**Документация Click API:**
https://docs.click.uz
