from rest_framework import serializers
from .models import Mortgage


class MortgageSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name', read_only=True)

    class Meta:
        model = Mortgage
        fields = [
            'id', 'user', 'user_name', 'amount', 'term_months',
            'interest_rate', 'bank_name', 'status',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)