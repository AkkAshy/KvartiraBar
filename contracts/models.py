from django.db import models
from users.models import User
from properties.models import Property


class Contract(models.Model):
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name='contracts', verbose_name='Недвижимость')
    buyer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='buyer_contracts', verbose_name='Покупатель')
    seller = models.ForeignKey(User, on_delete=models.CASCADE, related_name='seller_contracts', verbose_name='Продавец')
    file = models.FileField(upload_to='contracts/', verbose_name='Файл договора')
    signed_buyer = models.BooleanField(default=False, verbose_name='Подписано покупателем')
    signed_seller = models.BooleanField(default=False, verbose_name='Подписано продавцом')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Дата обновления')

    class Meta:
        verbose_name = 'Договор'
        verbose_name_plural = 'Договоры'
        ordering = ['-created_at']

    def __str__(self):
        return f"Договор между {self.buyer.full_name} и {self.seller.full_name}"

    def is_fully_signed(self):
        return self.signed_buyer and self.signed_seller
