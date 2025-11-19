import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { auctionsAPI } from '../services/api';
import { toast } from 'react-toastify';
import Header from '../components/Header';
import AuctionCard from '../components/AuctionCard';
import { PlusIcon, FunnelIcon } from '@heroicons/react/24/outline';

const Auctions = () => {
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    is_active: '',
    end_type: '',
    search: '',
  });

  useEffect(() => {
    fetchAuctions();
  }, [filters]);

  const fetchAuctions = async () => {
    try {
      setLoading(true);
      const params = {};

      if (filters.status) params.status = filters.status;
      if (filters.is_active) params.is_active = filters.is_active;
      if (filters.end_type) params.end_type = filters.end_type;
      if (filters.search) params.search = filters.search;

      const response = await auctionsAPI.getAll(params);
      setAuctions(response.data);
    } catch (error) {
      console.error('Error fetching auctions:', error);
      toast.error('Ошибка при загрузке аукционов');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      is_active: '',
      end_type: '',
      search: '',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Заголовок */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Аукционы</h1>
          <Link
            to="/auctions/create"
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Создать аукцион
          </Link>
        </div>

        {/* Фильтры */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex items-center mb-4">
            <FunnelIcon className="w-5 h-5 text-gray-500 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Фильтры</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Поиск */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Поиск
              </label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Название недвижимости..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Статус */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Статус
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Все статусы</option>
                <option value="pending_payment">Ожидает оплаты</option>
                <option value="scheduled">Запланирован</option>
                <option value="active">Активен</option>
                <option value="completed">Завершен</option>
                <option value="cancelled">Отменен</option>
              </select>
            </div>

            {/* Активность */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Активность
              </label>
              <select
                value={filters.is_active}
                onChange={(e) => handleFilterChange('is_active', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Все</option>
                <option value="true">Активные</option>
                <option value="false">Неактивные</option>
              </select>
            </div>

            {/* Тип окончания */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Тип окончания
              </label>
              <select
                value={filters.end_type}
                onChange={(e) => handleFilterChange('end_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Все типы</option>
                <option value="time">По времени</option>
                <option value="price">По цене</option>
                <option value="both">По времени или цене</option>
              </select>
            </div>
          </div>

          {/* Кнопка очистки фильтров */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Очистить фильтры
            </button>
          </div>
        </div>

        {/* Список аукционов */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : auctions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Аукционы не найдены</p>
            <Link
              to="/auctions/create"
              className="inline-flex items-center mt-4 text-primary-600 hover:text-primary-700"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Создать первый аукцион
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {auctions.map((auction) => (
              <AuctionCard key={auction.id} auction={auction} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Auctions;
