from django.urls import path
from .views import MortgageListCreateView, MortgageDetailView

app_name = 'mortgages'

urlpatterns = [
    path('', MortgageListCreateView.as_view(), name='mortgage-list-create'),
    path('<int:pk>/', MortgageDetailView.as_view(), name='mortgage-detail'),
]