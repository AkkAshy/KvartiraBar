from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from decimal import Decimal

from .models import Auction, Bid, AuctionPayment
from .serializers import AuctionSerializer, BidSerializer, AuctionPaymentSerializer
from .click_service import ClickService


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
