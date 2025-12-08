from django.urls import path
from .views import (
    AuctionListCreateView, AuctionDetailView,
    bid_on_auction, initiate_payment,
    click_prepare, click_complete,
    # Ручная оплата
    get_payment_info, upload_payment_screenshot,
    check_payment_status, telegram_webhook
)

app_name = 'auctions'

urlpatterns = [
    # Аукционы
    path('', AuctionListCreateView.as_view(), name='auction-list-create'),
    path('<int:pk>/', AuctionDetailView.as_view(), name='auction-detail'),

    # Ставки
    path('<int:auction_id>/bid/', bid_on_auction, name='bid-on-auction'),

    # Платежи (Click - старое)
    path('<int:auction_id>/initiate-payment/', initiate_payment, name='initiate-payment'),
    path('click/prepare/', click_prepare, name='click-prepare'),
    path('click/complete/', click_complete, name='click-complete'),

    # Ручная оплата (новое)
    path('<int:auction_id>/payment-info/', get_payment_info, name='payment-info'),
    path('<int:auction_id>/upload-screenshot/', upload_payment_screenshot, name='upload-screenshot'),
    path('<int:auction_id>/payment-status/', check_payment_status, name='payment-status'),

    # Telegram webhook
    path('telegram/webhook/', telegram_webhook, name='telegram-webhook'),
]