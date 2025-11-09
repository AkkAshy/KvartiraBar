from rest_framework import serializers
from .models import Advertisement


class AdvertisementSerializer(serializers.ModelSerializer):
    owner_name = serializers.CharField(source='owner.full_name', read_only=True)
    property_title = serializers.CharField(source='property.title', read_only=True, allow_null=True)
    ctr = serializers.FloatField(read_only=True)

    class Meta:
        model = Advertisement
        fields = [
            'id', 'property', 'property_title', 'owner', 'owner_name',
            'budget', 'start_date', 'end_date', 'impressions', 'clicks',
            'ctr', 'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'impressions', 'clicks', 'ctr', 'created_at']

    def create(self, validated_data):
        validated_data['owner'] = self.context['request'].user
        return super().create(validated_data)