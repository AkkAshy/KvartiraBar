from rest_framework import serializers
from .models import Auction, Bid, AuctionPayment


class BidSerializer(serializers.ModelSerializer):
    bidder_name = serializers.CharField(source='bidder.full_name', read_only=True)

    class Meta:
        model = Bid
        fields = ['id', 'bidder', 'bidder_name', 'amount', 'bid_time']
        read_only_fields = ['id', 'bid_time']


class AuctionPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuctionPayment
        fields = [
            'id', 'merchant_trans_id', 'amount', 'status',
            'created_at', 'completed_at'
        ]
        read_only_fields = ['id', 'merchant_trans_id', 'created_at', 'completed_at']


class AuctionSerializer(serializers.ModelSerializer):
    bids = BidSerializer(many=True, read_only=True)
    property_title = serializers.CharField(source='property.title', read_only=True)
    organizer_name = serializers.CharField(source='organizer.full_name', read_only=True)
    winner_name = serializers.CharField(source='winner.full_name', read_only=True, allow_null=True)
    is_active = serializers.SerializerMethodField()
    payment_info = AuctionPaymentSerializer(source='payment', read_only=True)

    class Meta:
        model = Auction
        fields = [
            'id', 'property', 'property_title', 'organizer', 'organizer_name',
            'start_price', 'current_price', 'start_time', 'end_time',
            'end_type', 'target_price', 'status', 'is_paid',
            'winner', 'winner_name', 'winning_bid', 'bids',
            'is_active', 'payment_info', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'current_price', 'winner', 'winning_bid',
            'status', 'is_paid', 'created_at', 'updated_at'
        ]

    def get_is_active(self, obj):
        return obj.is_active()

    def validate(self, data):
        """Валидация данных аукциона"""
        end_type = data.get('end_type')
        end_time = data.get('end_time')
        target_price = data.get('target_price')
        start_time = data.get('start_time')

        # Проверяем, что указано время начала
        if not start_time:
            raise serializers.ValidationError("Укажите время начала аукциона")

        # Проверяем условия окончания в зависимости от типа
        if end_type == 'time':
            if not end_time:
                raise serializers.ValidationError(
                    "Для типа 'По времени' необходимо указать время окончания"
                )
            if end_time <= start_time:
                raise serializers.ValidationError(
                    "Время окончания должно быть позже времени начала"
                )

        elif end_type == 'price':
            if not target_price:
                raise serializers.ValidationError(
                    "Для типа 'По цене' необходимо указать целевую цену"
                )
            if target_price <= data.get('start_price', 0):
                raise serializers.ValidationError(
                    "Целевая цена должна быть выше стартовой цены"
                )

        elif end_type == 'both':
            if not end_time or not target_price:
                raise serializers.ValidationError(
                    "Для типа 'По времени или цене' необходимо указать и время окончания, и целевую цену"
                )
            if end_time <= start_time:
                raise serializers.ValidationError(
                    "Время окончания должно быть позже времени начала"
                )
            if target_price <= data.get('start_price', 0):
                raise serializers.ValidationError(
                    "Целевая цена должна быть выше стартовой цены"
                )

        return data

    def create(self, validated_data):
        validated_data['organizer'] = self.context['request'].user
        # При создании аукцион находится в статусе ожидания оплаты
        validated_data['status'] = 'pending_payment'
        validated_data['current_price'] = validated_data['start_price']
        return super().create(validated_data)