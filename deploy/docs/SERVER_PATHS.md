# KvartiraBar - Пути на сервере

## Сервер
- **IP**: vps_prod (см. ~/.ssh/config)
- **OS**: Ubuntu 24.04
- **Домен**: kvartirabar.uz, server.kvartirabar.uz

---

## Структура проекта на сервере

```
/root/kanat/kvbar/KvartiraBar/          # Backend (Django)
├── config/
│   ├── settings.py
│   ├── urls.py
│   ├── celery.py
│   └── __init__.py
├── auctions/
├── properties/
├── users/
├── core/
├── media/                               # Загруженные файлы
│   ├── properties/
│   └── payment_screenshots/
├── staticfiles/                         # Собранная статика Django
├── venv/                                # Python virtual environment
├── .env                                 # Переменные окружения
├── manage.py
├── requirements.txt
├── kvartirabar.service                  # Systemd сервис Django
├── kvartirabar.nginx                    # Nginx конфиг
├── celery-worker.service                # Systemd сервис Celery Worker
└── celery-beat.service                  # Systemd сервис Celery Beat

/var/www/kvartirabar/frontend/           # Frontend (React/Vite)
├── index.html
└── assets/
    ├── index-*.js
    └── index-*.css
```

---

## Systemd сервисы

### Django (Gunicorn)
```
Файл:     /etc/systemd/system/kvartirabar.service
Исходник: /root/kanat/kvbar/KvartiraBar/kvartirabar.service
Статус:   sudo systemctl status kvartirabar
Логи:     sudo journalctl -u kvartirabar -f
```

### Celery Worker
```
Файл:     /etc/systemd/system/celery-worker.service
Исходник: /root/kanat/kvbar/KvartiraBar/celery-worker.service
Статус:   sudo systemctl status celery-worker
Логи:     tail -f /var/log/celery/worker.log
```

### Celery Beat
```
Файл:     /etc/systemd/system/celery-beat.service
Исходник: /root/kanat/kvbar/KvartiraBar/celery-beat.service
Статус:   sudo systemctl status celery-beat
Логи:     tail -f /var/log/celery/beat.log
```

### Redis
```
Сервис:   redis-server
Статус:   sudo systemctl status redis-server
Порт:     6379
```

---

## Nginx

```
Конфиг:   /etc/nginx/sites-enabled/kvartirabar
Исходник: /root/kanat/kvbar/KvartiraBar/kvartirabar.nginx
Тест:     sudo nginx -t
Reload:   sudo systemctl reload nginx
```

---

## Логи

| Что              | Путь                                    |
|------------------|-----------------------------------------|
| Django           | `journalctl -u kvartirabar -f`          |
| Celery Worker    | `/var/log/celery/worker.log`            |
| Celery Beat      | `/var/log/celery/beat.log`              |
| Nginx Access     | `/var/log/nginx/access.log`             |
| Nginx Error      | `/var/log/nginx/error.log`              |

---

## Команды деплоя

### Обновить backend
```bash
cd /root/kanat/kvbar/KvartiraBar
git pull
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput
sudo systemctl restart kvartirabar celery-worker celery-beat
```

### Обновить frontend
```bash
# На локалке:
cd frontend && npm run build
scp -r dist/* vps_prod:/var/www/kvartirabar/frontend/
```

### Перезапустить все сервисы
```bash
sudo systemctl restart kvartirabar celery-worker celery-beat nginx
```

---

## Базы данных

### PostgreSQL
```
Host:     localhost
Port:     5432
DB:       kvbar
User:     kvbar
Password: kvbar2025
```

### Redis
```
Host:     localhost
Port:     6379
DB:       0
```

---

## Домены и SSL

| Домен                  | Назначение       |
|------------------------|------------------|
| kvartirabar.uz         | Frontend (React) |
| www.kvartirabar.uz     | Frontend (React) |
| server.kvartirabar.uz  | Backend API      |

SSL сертификаты через Let's Encrypt (Certbot).

---

## Локальная разработка

```
Backend:  /Users/akkanat/Projects/kvbar-server/KvartiraBar/
Frontend: /Users/akkanat/Projects/kvbar-server/KvartiraBar/frontend/
```

### Запуск локально
```bash
# Backend
cd KvartiraBar
source venv/bin/activate
python manage.py runserver

# Frontend
cd frontend
npm run dev

# Celery (требует Redis)
celery -A config worker -l info
celery -A config beat -l info
```
