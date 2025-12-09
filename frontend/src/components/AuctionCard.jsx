import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ClockIcon, CurrencyDollarIcon, UserIcon, FireIcon } from '@heroicons/react/24/outline';

const AuctionCard = ({ auction }) => {
  const [timeRemaining, setTimeRemaining] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!auction.end_time || auction.status !== 'active') return;

    const updateTimer = () => {
      const now = new Date();
      const endTime = new Date(auction.end_time);
      const diff = endTime - now;

      if (diff <= 0) {
        setIsExpired(true);
        setTimeRemaining('Завершен');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) {
        setTimeRemaining(`${days}д ${hours}ч ${minutes}м`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}ч ${minutes}м ${seconds}с`);
      } else {
        setTimeRemaining(`${minutes}м ${seconds}с`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [auction.end_time, auction.status]);

  const getStatusBadge = () => {
    const statusColors = {
      pending_payment: 'bg-yellow-100 text-yellow-800',
      scheduled: 'bg-blue-100 text-blue-800',
      active: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
    };

    const statusLabels = {
      pending_payment: 'Ожидает оплаты',
      scheduled: 'Запланирован',
      active: 'Активен',
      completed: 'Завершен',
      cancelled: 'Отменен',
    };

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[auction.status]}`}>
        {statusLabels[auction.status]}
      </span>
    );
  };

  const getEndTypeLabel = () => {
    const labels = {
      time: 'По времени',
      price: 'По цене',
      both: 'По времени или цене',
    };
    return labels[auction.end_type];
  };

  return (
    <Link to={`/auctions/${auction.id}`}>
      <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden">
        {/* Изображение */}
        <div className="relative h-48 bg-gray-200">
          {auction.property_details?.images?.[0] ? (
            <img
              src={auction.property_details.images[0].image}
              alt={auction.property_title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-gray-400">Нет изображения</span>
            </div>
          )}
          <div className="absolute top-2 right-2">
            {getStatusBadge()}
          </div>
        </div>

        {/* Контент */}
        <div className="p-4">
          {/* Название */}
          <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
            {auction.property_title}
          </h3>

          {/* Цены */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-gray-50 p-2 rounded">
              <p className="text-xs text-gray-500">Стартовая цена</p>
              <p className="text-sm font-semibold text-gray-900">
                {Number(auction.start_price).toLocaleString('ru-RU')} сум
              </p>
            </div>
            <div className="bg-primary-50 p-2 rounded">
              <p className="text-xs text-primary-600">Текущая цена</p>
              <p className="text-sm font-bold text-primary-700">
                {Number(auction.current_price).toLocaleString('ru-RU')} сум
              </p>
            </div>
          </div>

          {/* Информация */}
          <div className="space-y-2">
            {/* Время окончания */}
            {auction.status === 'active' && auction.end_time && (
              <div className="flex items-center text-sm">
                <ClockIcon className={`w-4 h-4 mr-2 ${isExpired ? 'text-red-500' : 'text-gray-500'}`} />
                <span className={isExpired ? 'text-red-600 font-semibold' : 'text-gray-700'}>
                  {timeRemaining}
                </span>
              </div>
            )}

            {/* Тип окончания */}
            <div className="flex items-center text-sm text-gray-600">
              <FireIcon className="w-4 h-4 mr-2" />
              <span>{getEndTypeLabel()}</span>
            </div>

            {/* Организатор */}
            <div className="flex items-center text-sm text-gray-600">
              <UserIcon className="w-4 h-4 mr-2" />
              <span>{auction.organizer_name}</span>
            </div>

            {/* Количество ставок */}
            <div className="flex items-center text-sm text-gray-600">
              <CurrencyDollarIcon className="w-4 h-4 mr-2" />
              <span>{auction.bids?.length || 0} ставок</span>
            </div>
          </div>

          {/* Победитель (для завершенных) */}
          {auction.status === 'completed' && auction.winner_name && (
            <div className="mt-3 p-2 bg-green-50 rounded">
              <p className="text-xs text-green-600">Победитель</p>
              <p className="text-sm font-semibold text-green-800">{auction.winner_name}</p>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

export default AuctionCard;
