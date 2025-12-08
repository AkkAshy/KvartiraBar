from django.contrib import admin
from django.utils.html import format_html
from .models import Auction, Bid, AuctionPayment, ManualPayment


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


@admin.register(ManualPayment)
class ManualPaymentAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'auction', 'user', 'amount', 'status',
        'screenshot_preview', 'created_at', 'confirmed_at'
    ]
    list_filter = ['status', 'created_at']
    search_fields = ['auction__property__title', 'user__full_name', 'user__email']
    readonly_fields = [
        'screenshot_preview_large', 'telegram_message_id',
        'created_at', 'updated_at', 'confirmed_at'
    ]
    actions = ['confirm_payments', 'reject_payments']

    fieldsets = (
        ('Основная информация', {
            'fields': ('auction', 'user', 'amount', 'status')
        }),
        ('Скриншот оплаты', {
            'fields': ('screenshot', 'screenshot_preview_large')
        }),
        ('Telegram', {
            'fields': ('telegram_message_id',),
            'classes': ('collapse',)
        }),
        ('Отклонение', {
            'fields': ('rejection_reason',),
            'classes': ('collapse',)
        }),
        ('Даты', {
            'fields': ('created_at', 'updated_at', 'confirmed_at'),
            'classes': ('collapse',)
        }),
    )

    def screenshot_preview(self, obj):
        if obj.screenshot:
            return format_html(
                '<img src="{}" style="max-height: 50px; max-width: 100px;" />',
                obj.screenshot.url
            )
        return '-'
    screenshot_preview.short_description = 'Скриншот'

    def screenshot_preview_large(self, obj):
        if obj.screenshot:
            return format_html(
                '<a href="{}" target="_blank">'
                '<img src="{}" style="max-height: 400px; max-width: 600px;" />'
                '</a>',
                obj.screenshot.url, obj.screenshot.url
            )
        return 'Не загружен'
    screenshot_preview_large.short_description = 'Просмотр скриншота'

    def confirm_payments(self, request, queryset):
        confirmed = 0
        for payment in queryset.filter(status='waiting_confirmation'):
            payment.confirm()
            confirmed += 1
        self.message_user(request, f'Подтверждено платежей: {confirmed}')
    confirm_payments.short_description = 'Подтвердить выбранные платежи'

    def reject_payments(self, request, queryset):
        rejected = 0
        for payment in queryset.filter(status='waiting_confirmation'):
            payment.reject('Отклонено администратором')
            rejected += 1
        self.message_user(request, f'Отклонено платежей: {rejected}')
    reject_payments.short_description = 'Отклонить выбранные платежи'

    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'auction', 'auction__property', 'user'
        )
