from django.db import models
from users.models import User
from properties.models import Property


class Advertisement(models.Model):
    property = models.ForeignKey(Property, on_delete=models.CASCADE, null=True, blank=True, related_name='advertisements', verbose_name='Недвижимость')
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='advertisements', verbose_name='Владелец')
    budget = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='Бюджет')
    start_date = models.DateField(verbose_name='Дата начала')
    end_date = models.DateField(verbose_name='Дата окончания')
    impressions = models.PositiveIntegerField(default=0, verbose_name='Показы')
    clicks = models.PositiveIntegerField(default=0, verbose_name='Клики')
    is_active = models.BooleanField(default=True, verbose_name='Активно')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')

    class Meta:
        verbose_name = 'Реклама'
        verbose_name_plural = 'Реклама'
        ordering = ['-created_at']

    def __str__(self):
        return f"Реклама для {self.property.title if self.property else 'общей кампании'}"

    def ctr(self):
        """Click-through rate"""
        if self.impressions == 0:
            return 0
        return (self.clicks / self.impressions) * 100
