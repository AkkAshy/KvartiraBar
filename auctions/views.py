from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from decimal import Decimal
import json

from .models import Auction, Bid, AuctionPayment, ManualPayment
from .serializers import (
    AuctionSerializer, BidSerializer, AuctionPaymentSerializer,
    ManualPaymentSerializer, PaymentInfoSerializer
)
from .click_service import ClickService
from .telegram_service import TelegramService


class AuctionListCreateView(generics.ListCreateAPIView):
    serializer_class = AuctionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'end_type']
    search_fields = ['property__title', 'organizer__full_name']
    ordering_fields = ['created_at', 'start_time', 'end_time', 'current_price']
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = Auction.objects.select_related(
            'property', 'organizer', 'winner'
        ).prefetch_related('bids')

        # Фильтр по активным аукционам
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            if is_active.lower() == 'true':
                queryset = [auction for auction in queryset if auction.is_active()]
                return queryset
            elif is_active.lower() == 'false':
                queryset = [auction for auction in queryset if not auction.is_active()]
                return queryset

        return queryset

    def perform_create(self, serializer):
        auction = serializer.save(organizer=self.request.user)

        # Создаем платеж для аукциона
        merchant_trans_id = ClickService.generate_merchant_trans_id()
        AuctionPayment.objects.create(
            auction=auction,
            user=self.request.user,
            merchant_trans_id=merchant_trans_id,
            amount=Decimal('50000.00')
        )


class AuctionDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AuctionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Auction.objects.select_related(
            'property', 'organizer', 'winner'
        ).prefetch_related('bids')


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bid_on_auction(request, auction_id):
    """Сделать ставку на аукционе"""
    try:
        auction = Auction.objects.get(id=auction_id)
    except Auction.DoesNotExist:
        return Response({'error': 'Аукцион не найден'}, status=status.HTTP_404_NOT_FOUND)

    # Проверяем, что аукцион оплачен
    if not auction.is_paid:
        return Response({
            'error': 'Аукцион еще не оплачен организатором'
        }, status=status.HTTP_400_BAD_REQUEST)

    # Проверяем статус аукциона
    if auction.status not in ['active', 'scheduled']:
        return Response({
            'error': f'Нельзя делать ставки. Статус аукциона: {auction.get_status_display()}'
        }, status=status.HTTP_400_BAD_REQUEST)

    # Проверяем, что аукцион активен
    if not auction.is_active():
        return Response({'error': 'Аукцион не активен'}, status=status.HTTP_400_BAD_REQUEST)

    # Проверяем, что это не организатор
    if request.user == auction.organizer:
        return Response({
            'error': 'Организатор не может делать ставки на своем аукционе'
        }, status=status.HTTP_400_BAD_REQUEST)

    amount = request.data.get('amount')
    if not amount:
        return Response({'error': 'Не указана сумма ставки'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        amount = Decimal(str(amount))
    except (ValueError, TypeError):
        return Response({'error': 'Неверный формат суммы'}, status=status.HTTP_400_BAD_REQUEST)

    if amount <= auction.current_price:
        return Response({
            'error': f'Ставка должна быть выше текущей цены ({auction.current_price})'
        }, status=status.HTTP_400_BAD_REQUEST)

    # Создаем ставку
    bid = Bid.objects.create(
        auction=auction,
        bidder=request.user,
        amount=amount
    )

    serializer = BidSerializer(bid)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def initiate_payment(request, auction_id):
    """Инициировать оплату для аукциона"""
    try:
        auction = Auction.objects.get(id=auction_id)
    except Auction.DoesNotExist:
        return Response({'error': 'Аукцион не найден'}, status=status.HTTP_404_NOT_FOUND)

    # Проверяем, что пользователь - организатор
    if request.user != auction.organizer:
        return Response({
            'error': 'Только организатор может оплатить аукцион'
        }, status=status.HTTP_403_FORBIDDEN)

    # Проверяем, что аукцион еще не оплачен
    if auction.is_paid:
        return Response({
            'error': 'Аукцион уже оплачен'
        }, status=status.HTTP_400_BAD_REQUEST)

    # Получаем или создаем платеж
    try:
        payment = auction.payment
    except AuctionPayment.DoesNotExist:
        merchant_trans_id = ClickService.generate_merchant_trans_id()
        payment = AuctionPayment.objects.create(
            auction=auction,
            user=request.user,
            merchant_trans_id=merchant_trans_id,
            amount=Decimal('50000.00')
        )

    serializer = AuctionPaymentSerializer(payment)
    return Response({
        'payment': serializer.data,
        'message': 'Используйте merchant_trans_id для оплаты через Click'
    }, status=status.HTTP_200_OK)


@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def click_prepare(request):
    """Click prepare endpoint"""
    data = request.data
    result = ClickService.prepare(
        click_trans_id=data.get('click_trans_id'),
        service_id=data.get('service_id'),
        click_paydoc_id=data.get('click_paydoc_id'),
        merchant_trans_id=data.get('merchant_trans_id'),
        amount=data.get('amount'),
        action=data.get('action'),
        sign_time=data.get('sign_time'),
        sign_string=data.get('sign_string')
    )
    return JsonResponse(result)


@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def click_complete(request):
    """Click complete endpoint"""
    data = request.data
    result = ClickService.complete(
        click_trans_id=data.get('click_trans_id'),
        service_id=data.get('service_id'),
        click_paydoc_id=data.get('click_paydoc_id'),
        merchant_trans_id=data.get('merchant_trans_id'),
        merchant_prepare_id=data.get('merchant_prepare_id'),
        amount=data.get('amount'),
        action=data.get('action'),
        sign_time=data.get('sign_time'),
        sign_string=data.get('sign_string'),
        error=data.get('error')
    )
    return JsonResponse(result)


# ==================== РУЧНАЯ ОПЛАТА ====================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_payment_info(request, auction_id):
    """Получить информацию для оплаты аукциона (номер карты и инструкции)"""
    try:
        auction = Auction.objects.get(id=auction_id)
    except Auction.DoesNotExist:
        return Response({'error': 'Аукцион не найден'}, status=status.HTTP_404_NOT_FOUND)

    # Проверяем, что пользователь - организатор
    if request.user != auction.organizer:
        return Response({
            'error': 'Только организатор может оплатить аукцион'
        }, status=status.HTTP_403_FORBIDDEN)

    # Проверяем, что аукцион еще не оплачен
    if auction.is_paid:
        return Response({
            'error': 'Аукцион уже оплачен',
            'is_paid': True
        }, status=status.HTTP_400_BAD_REQUEST)

    # Получаем или создаем запись о платеже
    payment, created = ManualPayment.objects.get_or_create(
        auction=auction,
        defaults={
            'user': request.user,
            'amount': auction.payment_amount
        }
    )

    # Информация для оплаты
    payment_info = TelegramService.get_payment_info()

    return Response({
        'payment_id': payment.id,
        'payment_status': payment.status,
        'card_number': payment_info['card_number'],
        'card_number_raw': payment_info['card_number_raw'],
        'amount': payment.amount,
        'instructions': payment_info['instructions'],
        'auction': {
            'id': auction.id,
            'title': auction.property.title,
            'status': auction.status
        }
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_payment_screenshot(request, auction_id):
    """Загрузить скриншот оплаты"""
    try:
        auction = Auction.objects.get(id=auction_id)
    except Auction.DoesNotExist:
        return Response({'error': 'Аукцион не найден'}, status=status.HTTP_404_NOT_FOUND)

    # Проверяем, что пользователь - организатор
    if request.user != auction.organizer:
        return Response({
            'error': 'Только организатор может загрузить скриншот оплаты'
        }, status=status.HTTP_403_FORBIDDEN)

    # Проверяем, что аукцион еще не оплачен
    if auction.is_paid:
        return Response({
            'error': 'Аукцион уже оплачен'
        }, status=status.HTTP_400_BAD_REQUEST)

    # Проверяем наличие файла
    screenshot = request.FILES.get('screenshot')
    if not screenshot:
        return Response({
            'error': 'Не загружен скриншот оплаты'
        }, status=status.HTTP_400_BAD_REQUEST)

    # Проверяем формат файла
    allowed_types = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
    if screenshot.content_type not in allowed_types:
        return Response({
            'error': 'Неверный формат файла. Разрешены: JPG, PNG, WEBP'
        }, status=status.HTTP_400_BAD_REQUEST)

    # Получаем или создаем платеж
    payment, created = ManualPayment.objects.get_or_create(
        auction=auction,
        defaults={
            'user': request.user,
            'amount': auction.payment_amount
        }
    )

    # Проверяем статус платежа
    if payment.status == 'confirmed':
        return Response({
            'error': 'Платеж уже подтвержден'
        }, status=status.HTTP_400_BAD_REQUEST)

    if payment.status == 'waiting_confirmation':
        return Response({
            'error': 'Скриншот уже загружен и ожидает подтверждения'
        }, status=status.HTTP_400_BAD_REQUEST)

    # Сохраняем скриншот
    payment.screenshot = screenshot
    payment.status = 'waiting_confirmation'
    payment.save()

    # Отправляем уведомление в Telegram (файл отправляется напрямую)
    TelegramService.notify_new_payment(payment)

    serializer = ManualPaymentSerializer(payment, context={'request': request})
    return Response({
        'message': 'Скриншот загружен. Ожидайте подтверждения.',
        'payment': serializer.data
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_payment_status(request, auction_id):
    """Проверить статус оплаты аукциона"""
    try:
        auction = Auction.objects.get(id=auction_id)
    except Auction.DoesNotExist:
        return Response({'error': 'Аукцион не найден'}, status=status.HTTP_404_NOT_FOUND)

    # Проверяем, что пользователь - организатор
    if request.user != auction.organizer:
        return Response({
            'error': 'Нет доступа'
        }, status=status.HTTP_403_FORBIDDEN)

    try:
        payment = auction.manual_payment
        serializer = ManualPaymentSerializer(payment, context={'request': request})
        return Response({
            'is_paid': auction.is_paid,
            'payment': serializer.data
        })
    except ManualPayment.DoesNotExist:
        return Response({
            'is_paid': auction.is_paid,
            'payment': None
        })


# ==================== TELEGRAM WEBHOOK ====================

@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def telegram_webhook(request):
    """Webhook для обработки callback от Telegram бота"""
    data = request.data

    # Обрабатываем callback_query (нажатие кнопок)
    callback_query = data.get('callback_query')
    if callback_query:
        callback_id = callback_query['id']
        callback_data = callback_query.get('data', '')

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
                        'Платеж подтвержден!',
                        show_alert=True
                    )
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
                        'Платеж отклонен',
                        show_alert=True
                    )
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

    return Response({'ok': True})
