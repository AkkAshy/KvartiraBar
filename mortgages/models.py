from django.db import models
from users.models import User


class Mortgage(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Ожидает рассмотрения'),
        ('approved', 'Одобрено'),
        ('rejected', 'Отклонено'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='mortgages', verbose_name='Пользователь')
    amount = models.DecimalField(max_digits=15, decimal_places=2, verbose_name='Сумма кредита')
    term_months = models.PositiveIntegerField(verbose_name='Срок в месяцах')
    interest_rate = models.DecimalField(max_digits=5, decimal_places=2, verbose_name='Процентная ставка')
    bank_name = models.CharField(max_length=255, verbose_name='Название банка')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', verbose_name='Статус')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Дата обновления')

    class Meta:
        verbose_name = 'Ипотека'
        verbose_name_plural = 'Ипотеки'
        ordering = ['-created_at']

    def __str__(self):
        return f"Ипотека для {self.user.full_name} на сумму {self.amount}"
