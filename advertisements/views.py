from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters

from .models import Advertisement
from .serializers import AdvertisementSerializer


class AdvertisementListCreateView(generics.ListCreateAPIView):
    serializer_class = AdvertisementSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['property__title'] if 'property' in AdvertisementSerializer().get_fields() else []
    ordering_fields = ['created_at', 'budget', 'start_date', 'end_date']
    ordering = ['-created_at']

    def get_queryset(self):
        return Advertisement.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class AdvertisementDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AdvertisementSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Advertisement.objects.filter(owner=self.request.user)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def activate_advertisement(request, ad_id):
    try:
        ad = Advertisement.objects.get(id=ad_id, owner=request.user)
    except Advertisement.DoesNotExist:
        return Response({'error': 'Реклама не найдена'}, status=status.HTTP_404_NOT_FOUND)

    ad.is_active = True
    ad.save()
    serializer = AdvertisementSerializer(ad)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def advertisement_stats(request):
    ads = Advertisement.objects.filter(owner=request.user)
    total_budget = sum(ad.budget for ad in ads)
    total_impressions = sum(ad.impressions for ad in ads)
    total_clicks = sum(ad.clicks for ad in ads)
    avg_ctr = (total_clicks / total_impressions * 100) if total_impressions > 0 else 0

    return Response({
        'total_budget': total_budget,
        'total_impressions': total_impressions,
        'total_clicks': total_clicks,
        'average_ctr': avg_ctr,
    })
