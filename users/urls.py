from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import RegisterView, logout_view, UserProfileView
from .serializers import PhoneOrUsernameTokenSerializer

router = DefaultRouter()

# Кастомный view для входа по телефону или username
class PhoneOrUsernameTokenView(TokenObtainPairView):
    serializer_class = PhoneOrUsernameTokenSerializer

urlpatterns = [
    path('', include(router.urls)),
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', PhoneOrUsernameTokenView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', logout_view, name='logout'),
    path('me/', UserProfileView.as_view(), name='profile'),
]