from django.urls import path
from .views import ContractListCreateView, ContractDetailView, sign_contract

app_name = 'contracts'

urlpatterns = [
    path('', ContractListCreateView.as_view(), name='contract-list-create'),
    path('<int:pk>/', ContractDetailView.as_view(), name='contract-detail'),
    path('<int:contract_id>/sign/', sign_contract, name='sign-contract'),
]