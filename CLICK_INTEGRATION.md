# Интеграция Click для оплаты аукционов

## Как работает интеграция

### 1. Процесс оплаты

1. **Создание аукциона** → Автоматически создается `AuctionPayment` с уникальным `merchant_trans_id`
2. **Пользователь получает номер транзакции** → Например: `AUCTION_A1B2C3D4E5F6G7H8I9J0`
3. **Оплата через Click**:
   - Пользователь открывает приложение Click
   - Находит сервис или вводит номер транзакции
   - Подтверждает оплату 50,000 сум
4. **Click отправляет callback** → На ваш сервер по URL `/api/auctions/click/prepare/` и `/api/auctions/click/complete/`
5. **Активация аукциона** → Статус меняется с `pending_payment` на `scheduled` или `active`

### 2. Настройка Click

#### Получение учетных данных

1. Зарегистрируйтесь в Click для мерчантов: https://click.uz
2. Создайте сервис для приема платежей
3. Получите:
   - `SERVICE_ID` - ID вашего сервиса
   - `SECRET_KEY` - Секретный ключ для проверки подписей

#### Настройка в Django

Откройте `config/settings.py` и замените:

```python
# Click Integration Settings
CLICK_SERVICE_ID = 'ваш_service_id'  # Замените на реальный ID
CLICK_SECRET_KEY = 'ваш_secret_key'  # Замените на реальный ключ
```

#### Настройка callback URL в Click

В личном кабинете Click укажите:

- **Prepare URL**: `https://ваш-домен.com/api/auctions/click/prepare/`
- **Complete URL**: `https://ваш-домен.com/api/auctions/click/complete/`

Для разработки можно использовать ngrok:
```bash
ngrok http 8000
# Используйте полученный URL: https://xxxx.ngrok.io/api/auctions/click/prepare/
```

### 3. Endpoints

#### POST /api/auctions/click/prepare/
Первый этап оплаты - проверка возможности платежа

**Request от Click:**
```json
{
  "click_trans_id": "123456",
  "service_id": "12345",
  "click_paydoc_id": "123456",
  "merchant_trans_id": "AUCTION_A1B2C3D4E5F6G7H8I9J0",
  "amount": "50000.00",
  "action": "0",
  "sign_time": "2025-11-19 10:00:00",
  "sign_string": "md5_hash"
}
```

**Response:**
```json
{
  "click_trans_id": "123456",
  "merchant_trans_id": "AUCTION_A1B2C3D4E5F6G7H8I9J0",
  "merchant_prepare_id": "1",
  "error": 0,
  "error_note": "Success"
}
```

#### POST /api/auctions/click/complete/
Второй этап оплаты - завершение транзакции

**Request от Click:**
```json
{
  "click_trans_id": "123456",
  "service_id": "12345",
  "click_paydoc_id": "123456",
  "merchant_trans_id": "AUCTION_A1B2C3D4E5F6G7H8I9J0",
  "merchant_prepare_id": "1",
  "amount": "50000.00",
  "action": "1",
  "sign_time": "2025-11-19 10:01:00",
  "sign_string": "md5_hash"
}
```

**Response:**
```json
{
  "click_trans_id": "123456",
  "merchant_trans_id": "AUCTION_A1B2C3D4E5F6G7H8I9J0",
  "merchant_confirm_id": "1",
  "error": 0,
  "error_note": "Success"
}
```

### 4. Коды ошибок

| Код | Описание |
|-----|----------|
| 0   | Успех |
| -1  | Sign check failed (неверная подпись) |
| -2  | Incorrect parameter amount |
| -3  | Action not found |
| -4  | Already paid |
| -5  | Transaction does not exist |
| -8  | Error in request from click |
| -9  | Transaction cancelled |

### 5. Тестирование

#### Локальное тестирование с ngrok

```bash
# 1. Запустите Django сервер
python manage.py runserver 8000

# 2. В другом терминале запустите ngrok
ngrok http 8000

# 3. Используйте URL от ngrok в настройках Click
# Например: https://abc123.ngrok.io/api/auctions/click/prepare/

# 4. Создайте аукцион через фронтенд

# 5. Получите merchant_trans_id

# 6. Протестируйте оплату через приложение Click
```

#### Тестирование с curl

Prepare запрос:
```bash
curl -X POST http://localhost:8000/api/auctions/click/prepare/ \
  -H "Content-Type: application/json" \
  -d '{
    "click_trans_id": "123456",
    "service_id": "ваш_service_id",
    "click_paydoc_id": "123456",
    "merchant_trans_id": "AUCTION_XXXXX",
    "amount": "50000.00",
    "action": "0",
    "sign_time": "2025-11-19 10:00:00",
    "sign_string": "подпись"
  }'
```

### 6. Безопасность

1. **Проверка подписи**: Все запросы от Click проверяются через MD5 подпись
2. **Проверка суммы**: Сумма платежа должна быть ровно 50,000 сум
3. **Проверка статуса**: Нельзя оплатить уже оплаченный аукцион
4. **HTTPS**: В продакшене используйте только HTTPS

### 7. Мониторинг

Все платежи сохраняются в модели `AuctionPayment`:

```python
# Посмотреть все платежи
from auctions.models import AuctionPayment
AuctionPayment.objects.all()

# Посмотреть неоплаченные
AuctionPayment.objects.filter(status='pending')

# Посмотреть успешные
AuctionPayment.objects.filter(status='completed')
```

### 8. Альтернативные способы оплаты

#### Через веб-виджет Click (если доступно)

```javascript
// В будущем можно добавить прямую интеграцию с веб-виджетом
window.open(`https://my.click.uz/services/pay?service_id=${serviceId}&merchant_id=${merchantTransId}&amount=50000`, '_blank');
```

#### Через QR-код

Можно сгенерировать QR-код с номером транзакции для быстрой оплаты.

## Контакты

- Документация Click API: https://docs.click.uz
- Техподдержка Click: support@click.uz
- Telegram поддержки: @click_support
