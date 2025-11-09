from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    # УПРОЩЕННЫЕ РОЛИ - только 2
    ROLE_CHOICES = [
        ('seller', 'Продавец/Владелец'),  # Может создавать, редактировать, удалять объявления
        ('buyer', 'Покупатель'),           # Может только просматривать и связываться с владельцами
    ]

    full_name = models.CharField(max_length=255, verbose_name='Полное имя')
    email = models.EmailField(unique=True, verbose_name='Email')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='buyer', verbose_name='Роль')
    phone = models.CharField(max_length=20, blank=True, verbose_name='Телефон')
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True, verbose_name='Аватар')
    is_verified = models.BooleanField(default=False, verbose_name='Верифицирован')

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email', 'full_name']

    groups = models.ManyToManyField(
        'auth.Group',
        verbose_name='groups',
        blank=True,
        help_text='The groups this user belongs to. A user will get all permissions granted to each of their groups.',
        related_name='custom_user_set',
        related_query_name='user',
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        verbose_name='user permissions',
        blank=True,
        help_text='Specific permissions for this user.',
        related_name='custom_user_set',
        related_query_name='user',
    )

    class Meta:
        verbose_name = 'Пользователь'
        verbose_name_plural = 'Пользователи'

    def __str__(self):
        return self.full_name or self.email