from decimal import Decimal
from django.db import models
from users.models import User
from properties.models import Property


class Auction(models.Model):
    property = models.OneToOneField(Property, on_delete=models.CASCADE, related_name='auction', verbose_name='Недвижимость')
    organizer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='organized_auctions', verbose_name='Организатор')
    start_price = models.DecimalField(max_digits=15, decimal_places=2, verbose_name='Стартовая цена')
    current_price = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'), verbose_name='Текущая цена')
    start_time = models.DateTimeField(verbose_name='Время начала')
    end_time = models.DateTimeField(verbose_name='Время окончания')
    winner = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='won_auctions', verbose_name='Победитель')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')

    class Meta:
        verbose_name = 'Аукцион'
        verbose_name_plural = 'Аукционы'
        ordering = ['-created_at']

    def __str__(self):
        return f"Аукцион для {self.property.title}"

    def is_active(self):
        from django.utils import timezone
        return self.start_time <= timezone.now() <= self.end_time


class Bid(models.Model):
    auction = models.ForeignKey(Auction, on_delete=models.CASCADE, related_name='bids', verbose_name='Аукцион')
    bidder = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bids', verbose_name='Участник')
    amount = models.DecimalField(max_digits=15, decimal_places=2, verbose_name='Сумма ставки')
    bid_time = models.DateTimeField(auto_now_add=True, verbose_name='Время ставки')

    class Meta:
        verbose_name = 'Ставка'
        verbose_name_plural = 'Ставки'
        ordering = ['-bid_time']
        unique_together = ['auction', 'bidder', 'amount']  # Предотвращает дублирование ставок

    def __str__(self):
        return f"Ставка {self.amount} от {self.bidder.full_name}"
