# 🏠 KvartiraBar - Платформа для аренды и продажи недвижимости с аукционами

## 📋 Краткое описание
Веб-платформа для объявлений о недвижимости в Узбекистане с уникальной системой аукционов и интеграцией платежной системы Click.

## 🏗️ Архитектура проекта

```
KvartiraBar/
├── backend/          # Django REST API
│   ├── properties/   # Основные объявления
│   ├── auctions/     # Система аукционов
│   ├── users/        # Аутентификация (JWT)
│   └── config/       # Настройки Django
└── frontend/         # React + Vite + Tailwind
    └── src/
        ├── pages/    # Страницы
        ├── components/
        └── services/ # API клиент (axios)
```

## 🚀 Стек технологий

### Backend
- **Django 5.1.4** + Django REST Framework
- **PostgreSQL** (база данных)
- **JWT** (Simple JWT для аутентификации)
- **Yandex Maps API** (геокодинг)
- **Click API** (платежная система)

### Frontend
- **React 18.2.0**
- **Vite 5.0.8** (сборщик)
- **Tailwind CSS 3.3.6**
- **React Router 6.20.0**
- **Axios 1.6.2**
- **React Icons** + **Heroicons**

## 👥 Типы пользователей

### 1. **Seller (Продавец)** - `user_type='seller'`
- Создает объявления о недвижимости
- Создает аукционы для своих объявлений
- Получает запросы на просмотр от покупателей
- Оплачивает аукционы (50,000 сум через Click)

### 2. **Buyer (Покупатель)** - `user_type='buyer'`
- Просматривает объявления
- Добавляет в избранное
- Делает ставки на аукционах
- Отправляет запросы на просмотр

## 🎯 Основные функции

### 1. Объявления (Properties)
**Модель:** `properties/models.py` → `Property`

**Типы объявлений:**
- `sale` - Продажа
- `long_term` - Долгосрочная аренда
- `daily` - Посуточная аренда

**⚠️ Важно:** Смена (период аренды) для всех объявлений одна - используется единый стандарт периодов аренды на всей платформе.

**Основные поля:**
- Адрес + координаты (автогеокодинг через Yandex Maps)
- Цена (зависит от типа: price, price_per_month, price_per_day)
- Характеристики (площадь, комнаты, этаж, удобства)
- Фильтры для студентов (gender_preference, near_university)
- Изображения (multiple)

**Ключевые features:**
- 🗺️ Поиск по карте с радиусом
- 📍 Автоопределение nearby landmarks (школы, университеты, остановки)
- ⭐ Избранное для покупателей
- 💬 Запросы на просмотр с контактами

**API Endpoints:**
```
GET    /api/properties/              - Список (фильтры, поиск)
POST   /api/properties/              - Создание (только seller)
GET    /api/properties/{id}/         - Детали
PUT    /api/properties/{id}/         - Обновление (только owner)
DELETE /api/properties/{id}/         - Удаление (только owner)
GET    /api/properties/my/           - Мои объявления
POST   /api/properties/{id}/favorite/- Добавить/убрать из избранного
```

### 2. Аукционы (Auctions)
**Модель:** `auctions/models.py` → `Auction`

**Жизненный цикл:**
```
1. pending_payment → 2. scheduled → 3. active → 4. completed
                                               └→ cancelled
```

**Статусы:**
- `pending_payment` - Ожидает оплаты 50,000 сум
- `scheduled` - Оплачен, ждет start_time
- `active` - Идет торг
- `completed` - Завершен (есть победитель)
- `cancelled` - Отменен

**Типы окончания (end_type):**
- `time` - По времени (end_time)
- `price` - По достижению цены (target_price)
- `both` - По времени ИЛИ цене (что наступит раньше)

**Ключевые features:**
- 💰 Обязательная оплата 50,000 сум через Click
- 🔥 Real-time таймер до окончания
- 📊 История ставок
- 🏆 Автоопределение победителя
- 🔔 Минимальный шаг ставки (настраиваемый)

**API Endpoints:**
```
GET  /api/auctions/                    - Список аукционов
POST /api/auctions/                    - Создание (только seller + оплата)
GET  /api/auctions/{id}/               - Детали
POST /api/auctions/{id}/bid/           - Сделать ставку
POST /api/auctions/{id}/initiate-payment/ - Инициировать оплату
POST /api/auctions/click/prepare/      - Click callback (prepare)
POST /api/auctions/click/complete/     - Click callback (complete)
```

### 3. Платежи Click (AuctionPayment)
**Модель:** `auctions/models.py` → `AuctionPayment`

**Процесс оплаты:**
```
1. Пользователь создает аукцион
   ↓
2. Backend генерирует merchant_trans_id (AUCTION_XXXXX)
   ↓
3. AuctionPayment создается со статусом 'pending'
   ↓
4. Пользователь копирует merchant_trans_id
   ↓
5. Оплачивает через Click app (50,000 сум)
   ↓
6. Click → POST /api/auctions/click/prepare/ (проверка)
   ↓
7. Click → POST /api/auctions/click/complete/ (завершение)
   ↓
8. AuctionPayment.status = 'completed'
   ↓
9. Auction.is_paid = True, status = 'scheduled' или 'active'
```

**Безопасность:**
- ✅ MD5 проверка подписи от Click
- ✅ Проверка суммы (строго 50,000)
- ✅ Проверка статуса (нельзя оплатить дважды)

### 4. Аутентификация (Users)
**Модель:** `users/models.py` → `User` (кастомная модель)

**JWT токены:**
- Access token (15 мин)
- Refresh token (7 дней)

**API Endpoints:**
```
POST /api/auth/register/       - Регистрация
POST /api/auth/login/          - Вход (получить токены)
POST /api/auth/login/refresh/  - Обновить access token
POST /api/auth/logout/         - Выход
GET  /api/auth/me/             - Текущий пользователь
```

## 📂 Ключевые файлы

### Backend
```
properties/
├── models.py         - Property, PropertyImage, ContactRequest, Favorite
├── serializers.py    - PropertySerializer (с get_price_display)
├── views.py          - CRUD + поиск по карте
└── urls.py

auctions/
├── models.py         - Auction, Bid, AuctionPayment
├── serializers.py    - AuctionSerializer (вложенный PropertySerializer)
├── views.py          - CRUD + ставки + Click callbacks
├── click_service.py  - Логика работы с Click API
└── urls.py

users/
├── models.py         - User (AbstractUser)
├── serializers.py    - Регистрация, вход
└── views.py

config/
├── settings.py       - Настройки (ВАЖНО: CLICK_SERVICE_ID, CLICK_SECRET_KEY)
└── urls.py           - Главный роутер
```

### Frontend
```
src/
├── pages/
│   ├── Home.jsx              - Главная (список объявлений)
│   ├── PropertyDetail.jsx    - Детали объявления
│   ├── PropertyForm.jsx      - Создание/редактирование
│   ├── MyProperties.jsx      - Мои объявления
│   ├── Favorites.jsx         - Избранное
│   ├── Auctions.jsx          - Список аукционов
│   ├── AuctionDetail.jsx     - Детали аукциона + ставки
│   ├── AuctionForm.jsx       - Создание аукциона
│   ├── ContactRequests.jsx   - Запросы на просмотр
│   ├── Login.jsx / Register.jsx
│   └── Profile.jsx
│
├── components/
│   ├── Header.jsx            - Навигация (с ролями)
│   ├── PropertyCard.jsx      - Карточка объявления
│   └── AuctionCard.jsx       - Карточка аукциона
│
├── services/
│   └── api.js                - Axios клиент + все API методы
│
├── contexts/
│   └── AuthContext.jsx       - JWT + роли пользователя
│
└── App.jsx                   - Роутинг + Protected routes
```

## 🔧 Настройка окружения

### Backend (.env или settings.py)
```python
# Database
'default': {
    'ENGINE': 'django.db.backends.postgresql',
    'NAME': 'kvbar',
    'USER': 'kvbar',
    'PASSWORD': 'kvbar2025',
    'HOST': 'localhost',
    'PORT': '5432',
}

# Click Payment
CLICK_SERVICE_ID = 'ваш_service_id'  # ← ЗАМЕНИТЬ!
CLICK_SECRET_KEY = 'ваш_secret_key'  # ← ЗАМЕНИТЬ!

# Yandex Maps
YANDEX_MAPS_API_KEY = '6e46a359-b254-4264-bf45-210dbbb6d13a'

# Domain
ALLOWED_HOSTS = ['kvartirabar.uz', 'www.kvartirabar.uz', 'localhost']
```

### Frontend (.env)
```bash
VITE_API_URL=http://localhost:8000/api
# Для продакшена: https://kvartirabar.uz/api
```

## 🚀 Запуск проекта

### Backend
```bash
cd /Users/akkanat/Projects/kvbar-server/KvartiraBar

# Установка зависимостей
pip install -r requirements.txt

# Создание БД
psql -U postgres
CREATE DATABASE kvbar;
CREATE USER kvbar WITH PASSWORD 'kvbar2025';
GRANT ALL PRIVILEGES ON DATABASE kvbar TO kvbar;

# Миграции
python manage.py migrate

# Создание суперпользователя
python manage.py createsuperuser

# Запуск
python manage.py runserver 8000
```

### Frontend
```bash
cd frontend

# Установка зависимостей
npm install

# Запуск dev сервера
npm run dev  # http://localhost:3000

# Сборка для продакшена
npm run build
```

## 🌐 Production URLs

**Домен:** https://kvartirabar.uz

**Click Callbacks:**
- Prepare: `https://kvartirabar.uz/api/auctions/click/prepare/`
- Complete: `https://kvartirabar.uz/api/auctions/click/complete/`

## 🐛 Частые проблемы и решения

### 1. Ошибка "AttributeError: 'Property' object has no attribute 'get_price_display'"
**Причина:** `get_price_display()` - это метод сериализатора, а не модели
**Решение:** Удалить вызов `property_obj.get_price_display()` из views.py

### 2. Изображения не отображаются на frontend
**Причина:** В сериализаторе аукциона не было вложенного PropertySerializer
**Решение:** Добавлен `property_data = PropertySerializer(source='property')`
**Использование:** `auction.property_data.images[0].image`

### 3. Ошибка "organizer: ['Обязательное поле.']" при создании аукциона
**Причина:** `organizer` не был в read_only_fields
**Решение:** Добавлен в `read_only_fields` (устанавливается автоматически из `request.user`)

### 4. Click не присылает callback
**Проверить:**
- ✅ HTTPS работает
- ✅ URLs доступны извне (curl тест)
- ✅ `CLICK_SERVICE_ID` и `CLICK_SECRET_KEY` правильные
- ✅ Callback URLs указаны в панели Click

### 5. gender_preference JSON validation error
**Причина:** Array отправлялся как есть, а нужен JSON string
**Решение:** `JSON.stringify(value)` в PropertyForm.jsx для JSONField

## 📊 Структура данных

### Property (основные поля)
```python
{
    "id": 1,
    "title": "3-комнатная квартира в центре",
    "type": "sale",  # sale | long_term | daily
    "price": 150000000,  # для sale
    "price_per_month": None,
    "price_per_day": None,
    "address": "Узбекистан, Ташкент, ул. Навои, 1",
    "latitude": 41.311158,
    "longitude": 69.279737,
    "area": 85,
    "rooms": 3,
    "images": [{"id": 1, "image": "/media/properties/img.jpg"}],
    "nearby_landmarks": ["Школа №5", "Метро Мустакиллик"],
    "owner": 1,
    "status": "active"  # active | sold | rented
}
```

### Auction
```python
{
    "id": 1,
    "property": 5,
    "property_data": {Property},  # вложенный объект
    "organizer": 1,
    "start_price": 100000000,
    "current_price": 105000000,
    "start_time": "2025-11-20T10:00:00Z",
    "end_time": "2025-11-25T10:00:00Z",
    "end_type": "both",  # time | price | both
    "target_price": 120000000,
    "status": "active",  # pending_payment | scheduled | active | completed
    "is_paid": true,
    "bids": [{"id": 1, "bidder_name": "Иван", "amount": 105000000}],
    "payment_info": {
        "merchant_trans_id": "AUCTION_A1B2C3D4",
        "status": "completed"
    }
}
```

## 📚 Документация

- **[CLICK_INTEGRATION.md](CLICK_INTEGRATION.md)** - Полная документация Click API
- **[PRODUCTION_SETUP.md](PRODUCTION_SETUP.md)** - Настройка продакшена
- **[CLICK_SETUP_CHECKLIST.md](CLICK_SETUP_CHECKLIST.md)** - Чеклист настройки Click

## 🔐 Важные замечания

1. **Безопасность:**
   - НИКОГДА не коммитить `.env` файлы
   - В продакшене `DEBUG = False`
   - Использовать HTTPS для Click callbacks
   - JWT токены в localStorage (автоочистка при logout)

2. **Click требования:**
   - Обязательно HTTPS
   - Сумма строго 50,000 сум
   - MD5 подпись для всех запросов
   - Callback URLs должны возвращать JSON

3. **Git:**
   - Проверить `.gitignore` (секреты, __pycache__, node_modules)
   - Не коммитить `media/` с пользовательскими файлами
   - `.env` файлы только локально

## 🎨 UI/UX особенности

- **Tailwind CSS** с кастомными цветами (`primary-600`)
- **Responsive** дизайн (mobile-first)
- **Real-time** таймеры на аукционах
- **Toast уведомления** для всех действий
- **Loading states** для всех запросов
- **Protected routes** по ролям (seller/buyer)

## 📞 Контакты и поддержка

- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:8000
- **Admin:** http://localhost:8000/admin
- **Production:** https://kvartirabar.uz

---

**Создано:** 2025-11-19
**Последнее обновление:** 2025-11-19
**Версия Django:** 5.1.4
**Версия React:** 18.2.0