import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auctionsAPI, propertiesAPI } from '../services/api';
import { toast } from 'react-toastify';
import Header from '../components/Header';
import { useAuth } from '../contexts/AuthContext';

const AuctionForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [myProperties, setMyProperties] = useState([]);
  const [loadingProperties, setLoadingProperties] = useState(true);

  const [formData, setFormData] = useState({
    property: '',
    start_price: '',
    end_type: 'time',
    start_time: '',
    end_time: '',
    target_price: '',
  });

  useEffect(() => {
    fetchMyProperties();
  }, []);

  const fetchMyProperties = async () => {
    try {
      setLoadingProperties(true);
      const response = await propertiesAPI.getMy();
      // Фильтруем только те объекты, которые еще не имеют аукциона
      const availableProperties = response.data.filter(
        (property) => !property.has_auction
      );
      setMyProperties(availableProperties);
    } catch (error) {
      console.error('Error fetching properties:', error);
      toast.error('Ошибка при загрузке недвижимости');
    } finally {
      setLoadingProperties(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Валидация
    if (!formData.property) {
      toast.error('Выберите недвижимость');
      return;
    }

    if (!formData.start_price || Number(formData.start_price) <= 0) {
      toast.error('Введите корректную стартовую цену');
      return;
    }

    if (!formData.start_time) {
      toast.error('Укажите время начала');
      return;
    }

    const now = new Date();
    const startTime = new Date(formData.start_time);
    if (startTime <= now) {
      toast.error('Время начала должно быть в будущем');
      return;
    }

    // Валидация в зависимости от типа окончания
    if (formData.end_type === 'time') {
      if (!formData.end_time) {
        toast.error('Укажите время окончания для типа "По времени"');
        return;
      }

      const endTime = new Date(formData.end_time);
      if (endTime <= startTime) {
        toast.error('Время окончания должно быть позже времени начала');
        return;
      }
    } else if (formData.end_type === 'price') {
      if (!formData.target_price || Number(formData.target_price) <= 0) {
        toast.error('Укажите целевую цену для типа "По цене"');
        return;
      }

      if (Number(formData.target_price) <= Number(formData.start_price)) {
        toast.error('Целевая цена должна быть выше стартовой цены');
        return;
      }
    } else if (formData.end_type === 'both') {
      if (!formData.end_time) {
        toast.error('Укажите время окончания');
        return;
      }

      if (!formData.target_price || Number(formData.target_price) <= 0) {
        toast.error('Укажите целевую цену');
        return;
      }

      const endTime = new Date(formData.end_time);
      if (endTime <= startTime) {
        toast.error('Время окончания должно быть позже времени начала');
        return;
      }

      if (Number(formData.target_price) <= Number(formData.start_price)) {
        toast.error('Целевая цена должна быть выше стартовой цены');
        return;
      }
    }

    try {
      setLoading(true);

      const auctionData = {
        property: formData.property,
        start_price: formData.start_price,
        end_type: formData.end_type,
        start_time: formData.start_time,
      };

      if (formData.end_type === 'time' || formData.end_type === 'both') {
        auctionData.end_time = formData.end_time;
      }

      if (formData.end_type === 'price' || formData.end_type === 'both') {
        auctionData.target_price = formData.target_price;
      }

      const response = await auctionsAPI.create(auctionData);
      toast.success('Аукцион успешно создан! Теперь необходимо оплатить 50,000 сум для активации.');
      navigate(`/auctions/${response.data.id}`);
    } catch (error) {
      console.error('Error creating auction:', error);
      const errorMessage = error.response?.data?.error ||
                          error.response?.data?.detail ||
                          'Ошибка при создании аукциона';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Создать аукцион</h1>

        {loadingProperties ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : myProperties.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-gray-600 mb-4">
              У вас нет доступной недвижимости для создания аукциона
            </p>
            <button
              onClick={() => navigate('/properties/create')}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Добавить недвижимость
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
            {/* Выбор недвижимости */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Недвижимость <span className="text-red-500">*</span>
              </label>
              <select
                name="property"
                value={formData.property}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              >
                <option value="">Выберите недвижимость</option>
                {myProperties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.title} - {Number(property.price).toLocaleString('ru-RU')} сум
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Выберите объект недвижимости для аукциона
              </p>
            </div>

            {/* Стартовая цена */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Стартовая цена (сум) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="start_price"
                value={formData.start_price}
                onChange={handleChange}
                min="0"
                step="1000000"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>

            {/* Время начала */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Время начала <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                name="start_time"
                value={formData.start_time}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>

            {/* Тип окончания */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Тип окончания <span className="text-red-500">*</span>
              </label>
              <select
                name="end_type"
                value={formData.end_type}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              >
                <option value="time">По времени</option>
                <option value="price">По цене</option>
                <option value="both">По времени или цене</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {formData.end_type === 'time' && 'Аукцион завершится в указанное время'}
                {formData.end_type === 'price' && 'Аукцион завершится при достижении целевой цены'}
                {formData.end_type === 'both' && 'Аукцион завершится при наступлении любого из условий'}
              </p>
            </div>

            {/* Время окончания (если нужно) */}
            {(formData.end_type === 'time' || formData.end_type === 'both') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Время окончания <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  name="end_time"
                  value={formData.end_time}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required={formData.end_type === 'time' || formData.end_type === 'both'}
                />
              </div>
            )}

            {/* Целевая цена (если нужно) */}
            {(formData.end_type === 'price' || formData.end_type === 'both') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Целевая цена (сум) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="target_price"
                  value={formData.target_price}
                  onChange={handleChange}
                  min={formData.start_price || 0}
                  step="1000000"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required={formData.end_type === 'price' || formData.end_type === 'both'}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Цена, при достижении которой аукцион завершится
                </p>
              </div>
            )}

            {/* Информация об оплате */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Об оплате</h3>
              <p className="text-sm text-gray-700">
                После создания аукциона вам необходимо будет оплатить 50,000 сум для его активации.
                Аукцион станет доступен участникам только после успешной оплаты.
              </p>
            </div>

            {/* Кнопки */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => navigate('/auctions')}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Создание...' : 'Создать аукцион'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AuctionForm;
