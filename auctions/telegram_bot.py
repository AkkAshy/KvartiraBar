"""
Telegram Bot для обработки callback от кнопок подтверждения/отклонения платежей.

РЕЖИМЫ РАБОТЫ:
==============

1. POLLING (для разработки на localhost):
   python auctions/telegram_bot.py

   Бот сам опрашивает Telegram каждые 30 сек.

2. WEBHOOK (для продакшена на сервере):
   Один раз выполните команду для регистрации webhook:

   python auctions/telegram_bot.py --set-webhook https://your-domain.com/api/auctions/telegram/webhook/

   После этого Telegram сам будет отправлять обновления на ваш сервер.
   Бот (polling) больше не нужен - Django view обработает запросы.

3. УДАЛЕНИЕ WEBHOOK (для возврата к polling):
   python auctions/telegram_bot.py --delete-webhook
"""
import os
import sys
import django

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
django.setup()

import requests
import time
from auctions.models import ManualPayment
from auctions.telegram_service import TelegramService


def process_callback(callback_query):
    """Обработка callback от кнопок"""
    callback_id = callback_query['id']
    callback_data = callback_query.get('data', '')

    print(f"Received callback: {callback_data}")

    # Подтверждение платежа
    if callback_data.startswith('confirm_'):
        payment_id = int(callback_data.replace('confirm_', ''))
        try:
            payment = ManualPayment.objects.get(id=payment_id)
            if payment.status == 'waiting_confirmation':
                payment.confirm()
                TelegramService.update_payment_status(payment, confirmed=True)
                TelegramService.answer_callback_query(
                    callback_id,
                    '✅ Платеж подтвержден! Аукцион активирован.',
                    show_alert=True
                )
                print(f"✅ Payment {payment_id} confirmed!")
            else:
                TelegramService.answer_callback_query(
                    callback_id,
                    f'Платеж уже обработан: {payment.get_status_display()}',
                    show_alert=True
                )
        except ManualPayment.DoesNotExist:
            TelegramService.answer_callback_query(
                callback_id,
                'Платеж не найден',
                show_alert=True
            )

    # Отклонение платежа
    elif callback_data.startswith('reject_'):
        payment_id = int(callback_data.replace('reject_', ''))
        try:
            payment = ManualPayment.objects.get(id=payment_id)
            if payment.status == 'waiting_confirmation':
                payment.reject('Отклонено администратором')
                TelegramService.update_payment_status(
                    payment,
                    confirmed=False,
                    reason='Отклонено администратором'
                )
                TelegramService.answer_callback_query(
                    callback_id,
                    '❌ Платеж отклонен',
                    show_alert=True
                )
                print(f"❌ Payment {payment_id} rejected!")
            else:
                TelegramService.answer_callback_query(
                    callback_id,
                    f'Платеж уже обработан: {payment.get_status_display()}',
                    show_alert=True
                )
        except ManualPayment.DoesNotExist:
            TelegramService.answer_callback_query(
                callback_id,
                'Платеж не найден',
                show_alert=True
            )


def run_polling():
    """Запуск бота в режиме polling"""
    print("🤖 Telegram Bot started (polling mode)")
    print("Press Ctrl+C to stop\n")

    base_url = f'https://api.telegram.org/bot{TelegramService.BOT_TOKEN}'
    offset = 0

    while True:
        try:
            # Получаем обновления
            response = requests.get(
                f'{base_url}/getUpdates',
                params={'offset': offset, 'timeout': 30},
                timeout=35
            )
            data = response.json()

            if data.get('ok') and data.get('result'):
                for update in data['result']:
                    offset = update['update_id'] + 1

                    # Обрабатываем callback_query (нажатие кнопок)
                    if 'callback_query' in update:
                        process_callback(update['callback_query'])

        except requests.exceptions.Timeout:
            continue
        except KeyboardInterrupt:
            print("\n👋 Bot stopped")
            break
        except Exception as e:
            print(f"Error: {e}")
            time.sleep(5)


def set_webhook(webhook_url):
    """Устанавливает webhook для Telegram бота"""
    base_url = f'https://api.telegram.org/bot{TelegramService.BOT_TOKEN}'

    response = requests.post(
        f'{base_url}/setWebhook',
        json={'url': webhook_url}
    )
    result = response.json()

    if result.get('ok'):
        print(f"✅ Webhook установлен: {webhook_url}")
    else:
        print(f"❌ Ошибка: {result}")

    return result


def delete_webhook():
    """Удаляет webhook (для возврата к polling)"""
    base_url = f'https://api.telegram.org/bot{TelegramService.BOT_TOKEN}'

    response = requests.post(f'{base_url}/deleteWebhook')
    result = response.json()

    if result.get('ok'):
        print("✅ Webhook удален. Теперь можно использовать polling.")
    else:
        print(f"❌ Ошибка: {result}")

    return result


def get_webhook_info():
    """Получает информацию о текущем webhook"""
    base_url = f'https://api.telegram.org/bot{TelegramService.BOT_TOKEN}'

    response = requests.get(f'{base_url}/getWebhookInfo')
    result = response.json()

    if result.get('ok'):
        info = result['result']
        if info.get('url'):
            print(f"📡 Webhook URL: {info['url']}")
            print(f"   Pending updates: {info.get('pending_update_count', 0)}")
            if info.get('last_error_message'):
                print(f"   Last error: {info['last_error_message']}")
        else:
            print("📡 Webhook не установлен (используется polling)")
    else:
        print(f"❌ Ошибка: {result}")

    return result


if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(description='Telegram Bot для KvartiraBar')
    parser.add_argument('--set-webhook', type=str, help='Установить webhook URL')
    parser.add_argument('--delete-webhook', action='store_true', help='Удалить webhook')
    parser.add_argument('--info', action='store_true', help='Информация о webhook')

    args = parser.parse_args()

    if args.set_webhook:
        set_webhook(args.set_webhook)
    elif args.delete_webhook:
        delete_webhook()
    elif args.info:
        get_webhook_info()
    else:
        # По умолчанию запускаем polling
        run_polling()
