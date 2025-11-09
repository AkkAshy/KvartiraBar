from rest_framework import serializers
from .models import Contract


class ContractSerializer(serializers.ModelSerializer):
    property_title = serializers.CharField(source='property.title', read_only=True)
    buyer_name = serializers.CharField(source='buyer.full_name', read_only=True)
    seller_name = serializers.CharField(source='seller.full_name', read_only=True)
    is_fully_signed = serializers.BooleanField(read_only=True)

    class Meta:
        model = Contract
        fields = [
            'id', 'property', 'property_title', 'buyer', 'buyer_name',
            'seller', 'seller_name', 'file', 'signed_buyer', 'signed_seller',
            'is_fully_signed', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def create(self, validated_data):
        validated_data['buyer'] = self.context['request'].user
        return super().create(validated_data)