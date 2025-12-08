import requests
from django.conf import settings


class TelegramService:
    """Сервис для отправки уведомлений в Telegram"""

    BOT_TOKEN = '8566433432:AAFBRqoY4sU5fxmnHYUtbgdVlgqkSB1OkNM'
    ADMIN_CHAT_ID = '5111968766'
    BASE_URL = f'https://api.telegram.org/bot{BOT_TOKEN}'

    # Номер карты для оплаты
    CARD_NUMBER = '9860 3501 4405 1694'

    @classmethod
    def send_message(cls, chat_id, text, reply_markup=None, parse_mode='HTML'):
        """Отправляет сообщение в Telegram"""
        url = f'{cls.BASE_URL}/sendMessage'
        payload = {
            'chat_id': chat_id,
            'text': text,
            'parse_mode': parse_mode,
        }
        if reply_markup:
            payload['reply_markup'] = reply_markup

        try:
            response = requests.post(url, json=payload, timeout=10)
            return response.json()
        except Exception as e:
            print(f'Telegram send_message error: {e}')
            return None

    @classmethod
    def send_photo(cls, chat_id, photo_url=None, photo_file=None, caption=None, reply_markup=None, parse_mode='HTML'):
        """Отправляет фото в Telegram

        Args:
            chat_id: ID чата
            photo_url: URL фото (для внешних ссылок)
            photo_file: Файл фото (путь или file-like object)
            caption: Подпись к фото
            reply_markup: Клавиатура
            parse_mode: Режим парсинга текста
        """
        url = f'{cls.BASE_URL}/sendPhoto'

        try:
            if photo_file:
                # Отправка файла напрямую
                data = {
                    'chat_id': chat_id,
                    'parse_mode': parse_mode,
                }
                if caption:
                    data['caption'] = caption
                if reply_markup:
                    import json
                    data['reply_markup'] = json.dumps(reply_markup)

                # Если это путь к файлу
                if isinstance(photo_file, str):
                    with open(photo_file, 'rb') as f:
                        files = {'photo': f}
                        response = requests.post(url, data=data, files=files, timeout=30)
                else:
                    # Если это file-like object
                    files = {'photo': photo_file}
                    response = requests.post(url, data=data, files=files, timeout=30)
            else:
                # Отправка по URL (для внешних ссылок)
                payload = {
                    'chat_id': chat_id,
                    'photo': photo_url,
                    'parse_mode': parse_mode,
                }
                if caption:
                    payload['caption'] = caption
                if reply_markup:
                    payload['reply_markup'] = reply_markup
                response = requests.post(url, json=payload, timeout=10)

            return response.json()
        except Exception as e:
            print(f'Telegram send_photo error: {e}')
            return None

    @classmethod
    def edit_message(cls, chat_id, message_id, text, reply_markup=None, parse_mode='HTML'):
        """Редактирует сообщение в Telegram"""
        url = f'{cls.BASE_URL}/editMessageCaption'
        payload = {
            'chat_id': chat_id,
            'message_id': message_id,
            'caption': text,
            'parse_mode': parse_mode,
        }
        if reply_markup:
            payload['reply_markup'] = reply_markup

        try:
            response = requests.post(url, json=payload, timeout=10)
            return response.json()
        except Exception as e:
            print(f'Telegram edit_message error: {e}')
            return None

    @classmethod
    def answer_callback_query(cls, callback_query_id, text=None, show_alert=False):
        """Отвечает на callback query"""
        url = f'{cls.BASE_URL}/answerCallbackQuery'
        payload = {
            'callback_query_id': callback_query_id,
            'show_alert': show_alert,
        }
        if text:
            payload['text'] = text

        try:
            response = requests.post(url, json=payload, timeout=10)
            return response.json()
        except Exception as e:
            print(f'Telegram answer_callback error: {e}')
            return None

    @classmethod
    def notify_new_payment(cls, payment, photo_url=None):
        """Уведомляет админа о новом платеже"""
        from django.conf import settings

        auction = payment.auction
        user = payment.user

        text = (
            f"<b>Новая заявка на оплату аукциона!</b>\n\n"
            f"<b>Аукцион:</b> #{auction.id}\n"
            f"<b>Объект:</b> {auction.property.title}\n"
            f"<b>Сумма:</b> {payment.amount:,.0f} сум\n\n"
            f"<b>Пользователь:</b> {user.full_name}\n"
            f"<b>Телефон:</b> {user.phone or 'не указан'}\n"
            f"<b>Email:</b> {user.email}\n\n"
            f"<b>ID платежа:</b> {payment.id}"
        )

        # Кнопки подтверждения/отклонения
        reply_markup = {
            'inline_keyboard': [
                [
                    {'text': '✅ Подтвердить', 'callback_data': f'confirm_{payment.id}'},
                    {'text': '❌ Отклонить', 'callback_data': f'reject_{payment.id}'}
                ]
            ]
        }

        # Получаем путь к файлу скриншота
        photo_file_path = None
        if payment.screenshot:
            photo_file_path = payment.screenshot.path

        result = cls.send_photo(
            chat_id=cls.ADMIN_CHAT_ID,
            photo_file=photo_file_path,  # Отправляем файл напрямую
            caption=text,
            reply_markup=reply_markup
        )

        # Сохраняем message_id для последующего редактирования
        if result and result.get('ok'):
            payment.telegram_message_id = result['result']['message_id']
            payment.save(update_fields=['telegram_message_id'])

        return result

    @classmethod
    def update_payment_status(cls, payment, confirmed=True, reason=''):
        """Обновляет статус платежа в сообщении Telegram"""
        if not payment.telegram_message_id:
            return None

        auction = payment.auction
        user = payment.user

        if confirmed:
            status_text = "ПОДТВЕРЖДЕНО"
            status_emoji = ""
        else:
            status_text = "ОТКЛОНЕНО"
            status_emoji = ""

        text = (
            f"<b>{status_emoji} Платеж {status_text}</b>\n\n"
            f"<b>Аукцион:</b> #{auction.id}\n"
            f"<b>Объект:</b> {auction.property.title}\n"
            f"<b>Сумма:</b> {payment.amount:,.0f} сум\n\n"
            f"<b>Пользователь:</b> {user.full_name}\n"
            f"<b>Телефон:</b> {user.phone or 'не указан'}\n"
            f"<b>Email:</b> {user.email}\n\n"
            f"<b>ID платежа:</b> {payment.id}"
        )

        if not confirmed and reason:
            text += f"\n\n<b>Причина:</b> {reason}"

        return cls.edit_message(
            chat_id=cls.ADMIN_CHAT_ID,
            message_id=payment.telegram_message_id,
            text=text,
            reply_markup=None  # Убираем кнопки
        )

    @classmethod
    def get_payment_info(cls):
        """Возвращает информацию для оплаты"""
        return {
            'card_number': cls.CARD_NUMBER,
            'card_number_raw': cls.CARD_NUMBER.replace(' ', ''),
            'instructions': (
                f"1. Переведите указанную сумму на карту:\n"
                f"   {cls.CARD_NUMBER}\n\n"
                f"2. Сделайте скриншот чека об оплате\n\n"
                f"3. Загрузите скриншот в форму ниже\n\n"
                f"4. Дождитесь подтверждения (обычно 5-15 минут)"
            )
        }
