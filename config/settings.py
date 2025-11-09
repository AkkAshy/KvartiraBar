# config/settings.py

from pathlib import Path
import os
from dotenv import load_dotenv  # 🆕 ДОЛЖНО БЫТЬ

# 🆕 ЗАГРУЖАЕМ .env ФАЙЛ
load_dotenv()  # Эта строка ОБЯЗАТЕЛЬНА!

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Выберите провайдера AI:
# 'openai' - OpenAI GPT-4 (самый мощный, платный)
# 'gemini' - Google Gemini (есть бесплатный tier)
# 'claude' - Anthropic Claude (быстрый и точный)
AI_PROVIDER = os.getenv('AI_PROVIDER', 'openai')  # По умолчанию OpenAI

# API ключ для выбранного провайдера
AI_API_KEY = os.getenv('AI_API_KEY')


# Яндекс.Карты API
YANDEX_MAPS_API_KEY = '6e46a359-b254-4264-bf45-210dbbb6d13a'

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = 'django-insecure-^kvmioj5=kfl@(9$ane3+ejb!ag740y(7rqw%4mjs=efr0n48m'

DEBUG = True

# ✅ Для PythonAnywhere добавьте свой домен
ALLOWED_HOSTS = ['localhost', '127.0.0.1', 'kvartirabar.uz']

AUTH_USER_MODEL = 'users.User'

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party apps
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'django_filters',  # ✅ Добавлено

    # Local apps
    'users',
    'properties',
    'auctions',
    'mortgages',
    'contracts',
    'advertisements',
    'core',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',  # ✅ Должен быть перед CommonMiddleware
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

DATABASES = {
    'default': {
           'ENGINE': 'django.db.backends.postgresql',
           'NAME': 'kvbar',
           'USER': 'kvbar',
           'PASSWORD': 'kvbar2025',
           'HOST': 'localhost',
           'PORT': '5432',
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {
            'min_length': 8,
        }
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

LANGUAGE_CODE = 'ru-ru'
TIME_ZONE = 'Asia/Tashkent'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'  # ✅ Для PythonAnywhere

# ✅ КРИТИЧЕСКИ ВАЖНО: Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# ✅ КРИТИЧЕСКИ ВАЖНО: Максимальный размер загружаемых файлов
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ✅ CORS settings - ОЧЕНЬ ВАЖНО!
CORS_ALLOW_ALL_ORIGINS = True  # Для разработки
# Для продакшена:
# CORS_ALLOWED_ORIGINS = [
#     "http://localhost:3000",
#     "https://yourdomain.com",
# ]

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# ✅ REST Framework settings
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',  # ✅ Важно!
    ],
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
    ],
}

# JWT settings
from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'ROTATE_REFRESH_TOKENS': False,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': False,

    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,
    'AUDIENCE': None,
    'ISSUER': None,

    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',

    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',

    'JTI_CLAIM': 'jti',

    'SLIDING_TOKEN_REFRESH_EXP_CLAIM': 'refresh_exp',
    'SLIDING_TOKEN_LIFETIME': timedelta(minutes=5),
    'SLIDING_TOKEN_REFRESH_LIFETIME': timedelta(days=1),
}


# ✅ Для PythonAnywhere добавьте в Web tab:
# Media files mapping:
# URL: /media/
# Path: /home/akkanat/kvartirabar_backend/media
