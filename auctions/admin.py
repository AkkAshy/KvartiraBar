from django.contrib import admin
from .models import Auction, Bid, AuctionPayment


class BidInline(admin.TabularInline):
    model = Bid
    extra = 0
    readonly_fields = ['bidder', 'amount', 'bid_time']
    can_delete = False


@admin.register(Auction)
class AuctionAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'property', 'organizer', 'start_price',
        'current_price', 'status', 'is_paid', 'winner',
        'start_time', 'end_time', 'created_at'
    ]
    list_filter = ['status', 'end_type', 'is_paid', 'created_at']
    search_fields = ['property__title', 'organizer__full_name']
    readonly_fields = [
        'current_price', 'winner', 'winning_bid',
        'is_paid', 'created_at', 'updated_at'
    ]
    inlines = [BidInline]
    fieldsets = (
        ('Основная информация', {
            'fields': ('property', 'organizer', 'start_price', 'current_price')
        }),
        ('Условия окончания', {
            'fields': ('end_type', 'start_time', 'end_time', 'target_price')
        }),
        ('Статус и результаты', {
            'fields': ('status', 'is_paid', 'winner', 'winning_bid')
        }),
        ('Даты', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'property', 'organizer', 'winner'
        )


@admin.register(Bid)
class BidAdmin(admin.ModelAdmin):
    list_display = ['id', 'auction', 'bidder', 'amount', 'bid_time']
    list_filter = ['bid_time']
    search_fields = ['auction__property__title', 'bidder__full_name']
    readonly_fields = ['bid_time']

    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'auction', 'bidder'
        )


@admin.register(AuctionPayment)
class AuctionPaymentAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'merchant_trans_id', 'auction', 'user',
        'amount', 'status', 'created_at', 'completed_at'
    ]
    list_filter = ['status', 'created_at']
    search_fields = [
        'merchant_trans_id', 'click_trans_id',
        'auction__property__title', 'user__full_name'
    ]
    readonly_fields = [
        'merchant_trans_id', 'click_trans_id', 'click_paydoc_id',
        'created_at', 'updated_at', 'completed_at'
    ]
    fieldsets = (
        ('Основная информация', {
            'fields': ('auction', 'user', 'amount', 'status')
        }),
        ('Click данные', {
            'fields': (
                'merchant_trans_id', 'click_trans_id',
                'click_paydoc_id', 'error_note'
            )
        }),
        ('Даты', {
            'fields': ('created_at', 'updated_at', 'completed_at')
        }),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'auction', 'user'
        )
