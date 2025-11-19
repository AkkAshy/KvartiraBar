from django.urls import path
from .views import (
    AuctionListCreateView, AuctionDetailView,
    bid_on_auction, initiate_payment,
    click_prepare, click_complete
)

app_name = 'auctions'

urlpatterns = [
    # Аукционы
    path('', AuctionListCreateView.as_view(), name='auction-list-create'),
    path('<int:pk>/', AuctionDetailView.as_view(), name='auction-detail'),

    # Ставки
    path('<int:auction_id>/bid/', bid_on_auction, name='bid-on-auction'),

    # Платежи
    path('<int:auction_id>/initiate-payment/', initiate_payment, name='initiate-payment'),

    # Click callbacks
    path('click/prepare/', click_prepare, name='click-prepare'),
    path('click/complete/', click_complete, name='click-complete'),
]