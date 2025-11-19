
from decimal import Decimal
from django.db import models
from users.models import User
from properties.models import Property


class Auction(models.Model):
    END_TYPE_CHOICES = [
        ('time', 'По времени'),
        ('price', 'По цене'),
        ('both', 'По времени или цене'),
    ]

    STATUS_CHOICES = [
        ('pending_payment', 'Ожидает оплаты'),
        ('scheduled', 'Запланирован'),
        ('active', 'Активен'),
        ('completed', 'Завершен'),
        ('cancelled', 'Отменен'),
    ]

    property = models.OneToOneField(Property, on_delete=models.CASCADE, related_name='auction', verbose_name='Недвижимость')
    organizer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='organized_auctions', verbose_name='Организатор')
    start_price = models.DecimalField(max_digits=15, decimal_places=2, verbose_name='Стартовая цена')
    current_price = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'), verbose_name='Текущая цена')

    # Условия окончания аукциона
    end_type = models.CharField(max_length=20, choices=END_TYPE_CHOICES, default='time', verbose_name='Тип окончания')
    start_time = models.DateTimeField(verbose_name='Время начала')
    end_time = models.DateTimeField(null=True, blank=True, verbose_name='Время окончания')
    target_price = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True, verbose_name='Целевая цена')

    # Статус и результаты
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending_payment', verbose_name='Статус')
    winner = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='won_auctions', verbose_name='Победитель')
    winning_bid = models.ForeignKey('Bid', on_delete=models.SET_NULL, null=True, blank=True, related_name='won_auction', verbose_name='Победная ставка')

    # Оплата
    is_paid = models.BooleanField(default=False, verbose_name='Оплачен')
    payment_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('50000.00'), verbose_name='Сумма оплаты')

    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Дата обновления')

    class Meta:
        verbose_name = 'Аукцион'
        verbose_name_plural = 'Аукционы'
        ordering = ['-created_at']

    def __str__(self):
        return f"Аукцион для {self.property.title}"

    def is_active(self):
        from django.utils import timezone
        now = timezone.now()

        if self.status != 'active':
            return False

        # Проверка времени
        if self.start_time > now:
            return False

        # Проверка условий окончания
        if self.end_type == 'time' and self.end_time:
            return now <= self.end_time
        elif self.end_type == 'price' and self.target_price:
            return self.current_price < self.target_price
        elif self.end_type == 'both' and self.end_time and self.target_price:
            return now <= self.end_time and self.current_price < self.target_price

        return True

    def should_end(self):
        """Проверяет, должен ли аукцион завершиться"""
        from django.utils import timezone
        now = timezone.now()

        if self.status != 'active':
            return False

        if self.end_type == 'time' and self.end_time:
            return now > self.end_time
        elif self.end_type == 'price' and self.target_price:
            return self.current_price >= self.target_price
        elif self.end_type == 'both' and self.end_time and self.target_price:
            return now > self.end_time or self.current_price >= self.target_price

        return False

    def determine_winner(self):
        """Определяет победителя аукциона"""
        if self.status == 'completed' or not self.should_end():
            return

        # Получаем самую высокую ставку
        highest_bid = self.bids.order_by('-amount').first()

        if highest_bid:
            self.winner = highest_bid.bidder
            self.winning_bid = highest_bid
            self.current_price = highest_bid.amount

        self.status = 'completed'
        self.save()


class Bid(models.Model):
    auction = models.ForeignKey(Auction, on_delete=models.CASCADE, related_name='bids', verbose_name='Аукцион')
    bidder = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bids', verbose_name='Участник')
    amount = models.DecimalField(max_digits=15, decimal_places=2, verbose_name='Сумма ставки')
    bid_time = models.DateTimeField(auto_now_add=True, verbose_name='Время ставки')

    class Meta:
        verbose_name = 'Ставка'
        verbose_name_plural = 'Ставки'
        ordering = ['-bid_time']
        unique_together = ['auction', 'bidder', 'amount']

    def __str__(self):
        return f"Ставка {self.amount} от {self.bidder.full_name}"

    def save(self, *args, **kwargs):
        """При сохранении ставки обновляем аукцион"""
        super().save(*args, **kwargs)

        # Обновляем текущую цену аукциона
        self.auction.current_price = self.amount
        self.auction.save()

        # Проверяем, нужно ли завершить аукцион
        if self.auction.should_end():
            self.auction.determine_winner()


class AuctionPayment(models.Model):
    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Ожидает оплаты'),
        ('processing', 'В обработке'),
        ('completed', 'Завершен'),
        ('failed', 'Не удался'),
        ('cancelled', 'Отменен'),
    ]

    auction = models.OneToOneField(Auction, on_delete=models.CASCADE, related_name='payment', verbose_name='Аукцион')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='auction_payments', verbose_name='Пользователь')
    amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('50000.00'), verbose_name='Сумма')

    # Click данные
    click_trans_id = models.CharField(max_length=255, null=True, blank=True, verbose_name='Click Transaction ID')
    click_paydoc_id = models.CharField(max_length=255, null=True, blank=True, verbose_name='Click Paydoc ID')
    merchant_trans_id = models.CharField(max_length=255, unique=True, verbose_name='Merchant Transaction ID')

    status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending', verbose_name='Статус')
    error_note = models.TextField(null=True, blank=True, verbose_name='Примечание об ошибке')

    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Дата обновления')
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name='Дата завершения')

    class Meta:
        verbose_name = 'Платеж аукциона'
        verbose_name_plural = 'Платежи аукционов'
        ordering = ['-created_at']

    def __str__(self):
        return f"Платеж {self.merchant_trans_id} - {self.status}"

    def mark_completed(self):
        """Отмечает платеж как завершенный и активирует аукцион"""
        from django.utils import timezone

        self.status = 'completed'
        self.completed_at = timezone.now()
        self.save()

        # Обновляем статус аукциона
        self.auction.is_paid = True
        if self.auction.status == 'pending_payment':
            self.auction.status = 'scheduled'
        self.auction.save()

    def mark_failed(self, error_note=''):
        """Отмечает платеж как неудавшийся"""
        self.status = 'failed'
        self.error_note = error_note
        self.save()
