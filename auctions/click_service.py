import hashlib
import uuid
from decimal import Decimal
from django.conf import settings
from .models import AuctionPayment


class ClickService:
    """Сервис для работы с Click API"""

    @staticmethod
    def generate_merchant_trans_id():
        """Генерирует уникальный ID транзакции"""
        return f"AUCTION_{uuid.uuid4().hex[:20].upper()}"

    @staticmethod
    def verify_signature(merchant_trans_id, service_id, secret_key, click_trans_id=None):
        """Проверяет подпись от Click"""
        if click_trans_id:
            sign_string = f"{click_trans_id}{service_id}{secret_key}{merchant_trans_id}"
        else:
            sign_string = f"{merchant_trans_id}{service_id}{secret_key}"

        return hashlib.md5(sign_string.encode('utf-8')).hexdigest()

    @staticmethod
    def prepare(click_trans_id, service_id, click_paydoc_id, merchant_trans_id,
                amount, action, sign_time, sign_string):
        """
        Обработка prepare запроса от Click
        Это первый этап - проверка возможности платежа
        """
        try:
            # Получаем настройки Click из Django settings
            click_service_id = getattr(settings, 'CLICK_SERVICE_ID', '')
            click_secret_key = getattr(settings, 'CLICK_SECRET_KEY', '')

            # Проверяем service_id
            if str(service_id) != str(click_service_id):
                return {
                    'click_trans_id': click_trans_id,
                    'merchant_trans_id': merchant_trans_id,
                    'error': -5,
                    'error_note': 'Service ID is incorrect'
                }

            # Проверяем подпись
            expected_sign = ClickService.verify_signature(
                merchant_trans_id, service_id, click_secret_key, click_trans_id
            )
            if sign_string != expected_sign:
                return {
                    'click_trans_id': click_trans_id,
                    'merchant_trans_id': merchant_trans_id,
                    'error': -1,
                    'error_note': 'Sign check failed'
                }

            # Проверяем действие
            if action != 0:
                return {
                    'click_trans_id': click_trans_id,
                    'merchant_trans_id': merchant_trans_id,
                    'error': -3,
                    'error_note': 'Action not found'
                }

            # Ищем платеж
            try:
                payment = AuctionPayment.objects.get(merchant_trans_id=merchant_trans_id)
            except AuctionPayment.DoesNotExist:
                return {
                    'click_trans_id': click_trans_id,
                    'merchant_trans_id': merchant_trans_id,
                    'error': -5,
                    'error_note': 'Transaction does not exist'
                }

            # Проверяем статус платежа
            if payment.status == 'completed':
                return {
                    'click_trans_id': click_trans_id,
                    'merchant_trans_id': merchant_trans_id,
                    'error': -4,
                    'error_note': 'Already paid'
                }

            if payment.status == 'cancelled':
                return {
                    'click_trans_id': click_trans_id,
                    'merchant_trans_id': merchant_trans_id,
                    'error': -9,
                    'error_note': 'Transaction cancelled'
                }

            # Проверяем сумму
            if Decimal(str(amount)) != payment.amount:
                return {
                    'click_trans_id': click_trans_id,
                    'merchant_trans_id': merchant_trans_id,
                    'error': -2,
                    'error_note': 'Incorrect amount'
                }

            # Обновляем статус на processing
            payment.click_trans_id = click_trans_id
            payment.click_paydoc_id = click_paydoc_id
            payment.status = 'processing'
            payment.save()

            return {
                'click_trans_id': click_trans_id,
                'merchant_trans_id': merchant_trans_id,
                'merchant_prepare_id': payment.id,
                'error': 0,
                'error_note': 'Success'
            }

        except Exception as e:
            return {
                'click_trans_id': click_trans_id,
                'merchant_trans_id': merchant_trans_id,
                'error': -8,
                'error_note': f'Error: {str(e)}'
            }

    @staticmethod
    def complete(click_trans_id, service_id, click_paydoc_id, merchant_trans_id,
                 merchant_prepare_id, amount, action, sign_time, sign_string, error):
        """
        Обработка complete запроса от Click
        Это второй этап - подтверждение платежа
        """
        try:
            # Получаем настройки Click из Django settings
            click_service_id = getattr(settings, 'CLICK_SERVICE_ID', '')
            click_secret_key = getattr(settings, 'CLICK_SECRET_KEY', '')

            # Проверяем service_id
            if str(service_id) != str(click_service_id):
                return {
                    'click_trans_id': click_trans_id,
                    'merchant_trans_id': merchant_trans_id,
                    'error': -5,
                    'error_note': 'Service ID is incorrect'
                }

            # Проверяем подпись
            expected_sign = ClickService.verify_signature(
                merchant_trans_id, service_id, click_secret_key, click_trans_id
            )
            if sign_string != expected_sign:
                return {
                    'click_trans_id': click_trans_id,
                    'merchant_trans_id': merchant_trans_id,
                    'error': -1,
                    'error_note': 'Sign check failed'
                }

            # Проверяем действие
            if action != 1:
                return {
                    'click_trans_id': click_trans_id,
                    'merchant_trans_id': merchant_trans_id,
                    'error': -3,
                    'error_note': 'Action not found'
                }

            # Ищем платеж
            try:
                payment = AuctionPayment.objects.get(
                    merchant_trans_id=merchant_trans_id,
                    id=merchant_prepare_id
                )
            except AuctionPayment.DoesNotExist:
                return {
                    'click_trans_id': click_trans_id,
                    'merchant_trans_id': merchant_trans_id,
                    'error': -5,
                    'error_note': 'Transaction does not exist'
                }

            # Проверяем статус платежа
            if payment.status == 'completed':
                return {
                    'click_trans_id': click_trans_id,
                    'merchant_trans_id': merchant_trans_id,
                    'merchant_confirm_id': payment.id,
                    'error': 0,
                    'error_note': 'Already confirmed'
                }

            if payment.status == 'cancelled':
                return {
                    'click_trans_id': click_trans_id,
                    'merchant_trans_id': merchant_trans_id,
                    'error': -9,
                    'error_note': 'Transaction cancelled'
                }

            # Проверяем сумму
            if Decimal(str(amount)) != payment.amount:
                return {
                    'click_trans_id': click_trans_id,
                    'merchant_trans_id': merchant_trans_id,
                    'error': -2,
                    'error_note': 'Incorrect amount'
                }

            # Проверяем ошибку от Click
            if error < 0:
                payment.mark_failed(f'Click error: {error}')
                return {
                    'click_trans_id': click_trans_id,
                    'merchant_trans_id': merchant_trans_id,
                    'error': -6,
                    'error_note': 'Transaction cancelled'
                }

            # Завершаем платеж
            payment.mark_completed()

            return {
                'click_trans_id': click_trans_id,
                'merchant_trans_id': merchant_trans_id,
                'merchant_confirm_id': payment.id,
                'error': 0,
                'error_note': 'Success'
            }

        except Exception as e:
            return {
                'click_trans_id': click_trans_id,
                'merchant_trans_id': merchant_trans_id,
                'error': -8,
                'error_note': f'Error: {str(e)}'
            }
