from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import authenticate
from django.db.models import Q
from .models import User


class PhoneOrUsernameTokenSerializer(TokenObtainPairSerializer):
    """
    Вход по телефону или username
    """
    username_field = 'login'  # Переименовываем поле

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Меняем поле username на login
        self.fields['login'] = self.fields.pop('username', serializers.CharField())

    def validate(self, attrs):
        login = attrs.get('login', '').strip()
        password = attrs.get('password', '')

        # Ищем пользователя по телефону или username
        user = User.objects.filter(
            Q(phone=login) | Q(username=login)
        ).first()

        if user is None:
            raise serializers.ValidationError('Пользователь не найден')

        if not user.check_password(password):
            raise serializers.ValidationError('Неверный пароль')

        if not user.is_active:
            raise serializers.ValidationError('Аккаунт деактивирован')

        # Генерируем токены
        refresh = self.get_token(user)
        data = {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }

        return data


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'full_name', 'email',
            'phone', 'avatar', 'is_verified', 'password',
            'date_joined', 'last_login'
        ]
        read_only_fields = ['id', 'date_joined', 'last_login']

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8, validators=[])
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['username', 'full_name', 'email', 'phone', 'password', 'password_confirm']

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError("Пароли не совпадают")
        return data

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


# Удаляем кастомный LoginSerializer, используем встроенный TokenObtainPairView