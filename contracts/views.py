from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Contract
from .serializers import ContractSerializer


class ContractListCreateView(generics.ListCreateAPIView):
    serializer_class = ContractSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Contract.objects.filter(
            buyer=user
        ) | Contract.objects.filter(
            seller=user
        )

    def perform_create(self, serializer):
        serializer.save(buyer=self.request.user)


class ContractDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ContractSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Contract.objects.filter(
            buyer=user
        ) | Contract.objects.filter(
            seller=user
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sign_contract(request, contract_id):
    try:
        contract = Contract.objects.get(id=contract_id)
    except Contract.DoesNotExist:
        return Response({'error': 'Договор не найден'}, status=status.HTTP_404_NOT_FOUND)

    user = request.user

    if user == contract.buyer:
        if contract.signed_buyer:
            return Response({'error': 'Договор уже подписан покупателем'}, status=status.HTTP_400_BAD_REQUEST)
        contract.signed_buyer = True
    elif user == contract.seller:
        if contract.signed_seller:
            return Response({'error': 'Договор уже подписан продавцом'}, status=status.HTTP_400_BAD_REQUEST)
        contract.signed_seller = True
    else:
        return Response({'error': 'У вас нет прав на подписание этого договора'}, status=status.HTTP_403_FORBIDDEN)

    contract.save()
    serializer = ContractSerializer(contract)
    return Response(serializer.data)
