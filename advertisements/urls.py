from django.urls import path
from .views import AdvertisementListCreateView, AdvertisementDetailView, activate_advertisement, advertisement_stats

app_name = 'advertisements'

urlpatterns = [
    path('', AdvertisementListCreateView.as_view(), name='advertisement-list-create'),
    path('<int:pk>/', AdvertisementDetailView.as_view(), name='advertisement-detail'),
    path('<int:ad_id>/activate/', activate_advertisement, name='activate-advertisement'),
    path('stats/', advertisement_stats, name='advertisement-stats'),
]