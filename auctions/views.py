from rest_framework import generics, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from django.utils import timezone

from .models import Auction, Bid
from .serializers import AuctionSerializer, BidSerializer


class AuctionListCreateView(generics.ListCreateAPIView):
    serializer_class = AuctionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['property__title', 'organizer__full_name']
    ordering_fields = ['created_at', 'start_time', 'end_time', 'current_price']
    ordering = ['-created_at']

    def get_queryset(self):
        return Auction.objects.all()

    def perform_create(self, serializer):
        serializer.save(organizer=self.request.user)


class AuctionDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AuctionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Auction.objects.all()


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bid_on_auction(request, auction_id):
    try:
        auction = Auction.objects.get(id=auction_id)
    except Auction.DoesNotExist:
        return Response({'error': 'Аукцион не найден'}, status=status.HTTP_404_NOT_FOUND)

    if not auction.is_active:
        return Response({'error': 'Аукцион не активен'}, status=status.HTTP_400_BAD_REQUEST)

    amount = request.data.get('amount')
    if not amount:
        return Response({'error': 'Не указана сумма ставки'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        amount = float(amount)
    except ValueError:
        return Response({'error': 'Неверный формат суммы'}, status=status.HTTP_400_BAD_REQUEST)

    if amount <= auction.current_price:
        return Response({'error': 'Ставка должна быть выше текущей цены'}, status=status.HTTP_400_BAD_REQUEST)

    # Создаем ставку
    bid = Bid.objects.create(
        auction=auction,
        bidder=request.user,
        amount=amount
    )

    # Обновляем текущую цену аукциона
    from decimal import Decimal
    auction.current_price = Decimal(str(amount))
    auction.save()

    serializer = BidSerializer(bid)
    return Response(serializer.data, status=status.HTTP_201_CREATED)
