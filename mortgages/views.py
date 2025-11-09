from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from .models import Mortgage
from .serializers import MortgageSerializer


class MortgageListCreateView(generics.ListCreateAPIView):
    serializer_class = MortgageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Mortgage.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class MortgageDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = MortgageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Mortgage.objects.filter(user=self.request.user)
