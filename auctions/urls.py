from django.urls import path
from .views import AuctionListCreateView, AuctionDetailView, bid_on_auction

app_name = 'auctions'

urlpatterns = [
    path('', AuctionListCreateView.as_view(), name='auction-list-create'),
    path('<int:pk>/', AuctionDetailView.as_view(), name='auction-detail'),
    path('<int:auction_id>/bid/', bid_on_auction, name='bid-on-auction'),
]