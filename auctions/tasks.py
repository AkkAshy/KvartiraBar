from celery import shared_task
from django.utils import timezone
from .models import Auction


@shared_task
def check_and_complete_auctions():
    """
    Периодическая задача для проверки и завершения аукционов
    Запускается каждую минуту через Celery Beat
    """
    now = timezone.now()

    # Находим все активные аукционы
    active_auctions = Auction.objects.filter(status='active')

    completed_count = 0

    for auction in active_auctions:
        if auction.should_end():
            auction.determine_winner()
            completed_count += 1

    return f"Проверено аукционов: {active_auctions.count()}, завершено: {completed_count}"


@shared_task
def activate_scheduled_auctions():
    """
    Активирует запланированные аукционы, время которых наступило
    """
    now = timezone.now()

    # Находим все запланированные аукционы, которые должны начаться
    scheduled_auctions = Auction.objects.filter(
        status='scheduled',
        is_paid=True,
        start_time__lte=now
    )

    activated_count = 0

    for auction in scheduled_auctions:
        auction.status = 'active'
        auction.save()
        activated_count += 1

    return f"Активировано аукционов: {activated_count}"


@shared_task
def cancel_unpaid_auctions():
    """
    Отменяет неоплаченные аукционы через 24 часа после создания
    """
    from datetime import timedelta

    cutoff_time = timezone.now() - timedelta(hours=24)

    unpaid_auctions = Auction.objects.filter(
        status='pending_payment',
        is_paid=False,
        created_at__lte=cutoff_time
    )

    cancelled_count = unpaid_auctions.count()

    for auction in unpaid_auctions:
        auction.status = 'cancelled'
        auction.save()

    return f"Отменено неоплаченных аукционов: {cancelled_count}"
