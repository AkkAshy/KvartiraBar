from rest_framework import serializers
from .models import Auction, Bid


class BidSerializer(serializers.ModelSerializer):
    bidder_name = serializers.CharField(source='bidder.full_name', read_only=True)

    class Meta:
        model = Bid
        fields = ['id', 'bidder', 'bidder_name', 'amount', 'bid_time']
        read_only_fields = ['id', 'bid_time']


class AuctionSerializer(serializers.ModelSerializer):
    bids = BidSerializer(many=True, read_only=True)
    property_title = serializers.CharField(source='property.title', read_only=True)
    organizer_name = serializers.CharField(source='organizer.full_name', read_only=True)
    winner_name = serializers.CharField(source='winner.full_name', read_only=True, allow_null=True)
    is_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = Auction
        fields = [
            'id', 'property', 'property_title', 'organizer', 'organizer_name',
            'start_price', 'current_price', 'start_time', 'end_time',
            'winner', 'winner_name', 'bids', 'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'current_price', 'winner', 'created_at']

    def create(self, validated_data):
        validated_data['organizer'] = self.context['request'].user
        return super().create(validated_data)