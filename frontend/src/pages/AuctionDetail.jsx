import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { auctionsAPI } from '../services/api';
import { toast } from 'react-toastify';
import Header from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import {
  ClockIcon,
  CurrencyDollarIcon,
  UserIcon,
  CalendarIcon,
  FireIcon,
  TrophyIcon,
  CreditCardIcon,
  PhotoIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

const AuctionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [auction, setAuction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bidAmount, setBidAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  // Состояния для ручной оплаты
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [screenshot, setScreenshot] = useState(null);
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);

  useEffect(() => {
    fetchAuction();
  }, [id]);

  useEffect(() => {
    if (!auction || !auction.end_time || auction.status !== 'active') return;

    const updateTimer = () => {
      const now = new Date();
      const endTime = new Date(auction.end_time);
      const diff = endTime - now;

      if (diff <= 0) {
        setIsExpired(true);
        setTimeRemaining('Аукцион завершен');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) {
        setTimeRemaining(`${days} дн. ${hours} ч. ${minutes} мин.`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours} ч. ${minutes} мин. ${seconds} сек.`);
      } else {
        setTimeRemaining(`${minutes} мин. ${seconds} сек.`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [auction]);

  const fetchAuction = async () => {
    try {
      setLoading(true);
      const response = await auctionsAPI.getById(id);
      setAuction(response.data);
      setBidAmount(String(Number(response.data.current_price) + 1000000));
    } catch (error) {
      console.error('Error fetching auction:', error);
      toast.error('Ошибка при загрузке аукциона');
      navigate('/auctions');
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceBid = async (e) => {
    e.preventDefault();

    if (!isAuthenticated) {
      toast.error('Войдите в систему, чтобы делать ставки');
      navigate('/login');
      return;
    }

    if (!bidAmount || Number(bidAmount) <= 0) {
      toast.error('Введите корректную сумму ставки');
      return;
    }

    if (Number(bidAmount) <= Number(auction.current_price)) {
      toast.error(`Ставка должна быть выше текущей цены (${Number(auction.current_price).toLocaleString('ru-RU')} сум)`);
      return;
    }

    try {
      setSubmitting(true);
      await auctionsAPI.placeBid(id, bidAmount);
      toast.success('Ставка успешно сделана!');
      await fetchAuction();
    } catch (error) {
      console.error('Error placing bid:', error);
      const errorMessage = error.response?.data?.error || 'Ошибка при размещении ставки';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // Получить информацию для оплаты (номер карты)
  const handleGetPaymentInfo = async () => {
    try {
      setPaymentLoading(true);
      const response = await auctionsAPI.getPaymentInfo(id);
      setPaymentInfo(response.data);
      toast.success('Информация для оплаты получена');
    } catch (error) {
      console.error('Error getting payment info:', error);
      const errorMessage = error.response?.data?.error || 'Ошибка при получении информации об оплате';
      toast.error(errorMessage);
    } finally {
      setPaymentLoading(false);
    }
  };

  // Копировать номер карты
  const handleCopyCardNumber = () => {
    if (paymentInfo?.card_number_raw) {
      navigator.clipboard.writeText(paymentInfo.card_number_raw);
      toast.success('Номер карты скопирован!');
    }
  };

  // Выбрать файл скриншота
  const handleScreenshotChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Размер файла не должен превышать 5 МБ');
        return;
      }
      setScreenshot(file);
    }
  };

  // Загрузить скриншот оплаты
  const handleUploadScreenshot = async () => {
    if (!screenshot) {
      toast.error('Выберите скриншот оплаты');
      return;
    }

    try {
      setUploadingScreenshot(true);
      const formData = new FormData();
      formData.append('screenshot', screenshot);

      await auctionsAPI.uploadScreenshot(id, formData);
      toast.success('Скриншот отправлен на проверку! Ожидайте подтверждения в Telegram.');
      setScreenshot(null);
      await fetchAuction();
      // Обновляем информацию о платеже
      const response = await auctionsAPI.getPaymentInfo(id);
      setPaymentInfo(response.data);
    } catch (error) {
      console.error('Error uploading screenshot:', error);
      const errorMessage = error.response?.data?.error || 'Ошибка при загрузке скриншота';
      toast.error(errorMessage);
    } finally {
      setUploadingScreenshot(false);
    }
  };

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
      <span className={`px-3 py-1 text-sm font-semibold rounded-full ${statusColors[auction.status]}`}>
        {statusLabels[auction.status]}
      </span>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  if (!auction) {
    return null;
  }

  const isOrganizer = user && auction.organizer === user.id;
  const canBid = isAuthenticated && !isOrganizer && auction.status === 'active' && auction.is_active && !isExpired;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Кнопка назад */}
        <Link to="/auctions" className="text-primary-600 hover:text-primary-700 mb-4 inline-block">
          ← Вернуться к аукционам
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Левая колонка - основная информация */}
          <div className="lg:col-span-2 space-y-6">
            {/* Изображения недвижимости */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              {auction.property_data?.images?.[0] ? (
                <img
                  src={auction.property_data.images[0].image}
                  alt={auction.property_title}
                  className="w-full h-96 object-cover"
                />
              ) : (
                <div className="w-full h-96 bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-400">Нет изображения</span>
                </div>
              )}
            </div>

            {/* Информация об аукционе */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-start mb-4">
                <h1 className="text-3xl font-bold text-gray-900">{auction.property_title}</h1>
                {getStatusBadge()}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Стартовая цена */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Стартовая цена</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {Number(auction.start_price).toLocaleString('ru-RU')} сум
                  </p>
                </div>

                {/* Текущая цена */}
                <div className="bg-primary-50 p-4 rounded-lg">
                  <p className="text-sm text-primary-600 mb-1">Текущая цена</p>
                  <p className="text-2xl font-bold text-primary-700">
                    {Number(auction.current_price).toLocaleString('ru-RU')} сум
                  </p>
                </div>
              </div>

              {/* Детали */}
              <div className="space-y-3">
                <div className="flex items-center text-gray-700">
                  <UserIcon className="w-5 h-5 mr-3 text-gray-400" />
                  <span>Организатор: <strong>{auction.organizer_name}</strong></span>
                </div>

                <div className="flex items-center text-gray-700">
                  <CalendarIcon className="w-5 h-5 mr-3 text-gray-400" />
                  <span>Начало: <strong>{formatDate(auction.start_time)}</strong></span>
                </div>

                {auction.end_time && (
                  <div className="flex items-center text-gray-700">
                    <CalendarIcon className="w-5 h-5 mr-3 text-gray-400" />
                    <span>Окончание: <strong>{formatDate(auction.end_time)}</strong></span>
                  </div>
                )}

                <div className="flex items-center text-gray-700">
                  <FireIcon className="w-5 h-5 mr-3 text-gray-400" />
                  <span>
                    Тип окончания:{' '}
                    <strong>
                      {auction.end_type === 'time' && 'По времени'}
                      {auction.end_type === 'price' && 'По цене'}
                      {auction.end_type === 'both' && 'По времени или цене'}
                    </strong>
                  </span>
                </div>

                {auction.target_price && (
                  <div className="flex items-center text-gray-700">
                    <CurrencyDollarIcon className="w-5 h-5 mr-3 text-gray-400" />
                    <span>
                      Целевая цена: <strong>{Number(auction.target_price).toLocaleString('ru-RU')} сум</strong>
                    </span>
                  </div>
                )}

                {auction.status === 'active' && auction.end_time && (
                  <div className="flex items-center">
                    <ClockIcon className={`w-5 h-5 mr-3 ${isExpired ? 'text-red-500' : 'text-gray-400'}`} />
                    <span className={isExpired ? 'text-red-600 font-bold' : 'text-gray-700'}>
                      Осталось: <strong>{timeRemaining}</strong>
                    </span>
                  </div>
                )}
              </div>

              {/* Победитель */}
              {auction.status === 'completed' && auction.winner_name && (
                <div className="mt-6 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                  <div className="flex items-center text-green-800">
                    <TrophyIcon className="w-6 h-6 mr-3" />
                    <div>
                      <p className="text-sm font-medium">Победитель аукциона</p>
                      <p className="text-lg font-bold">{auction.winner_name}</p>
                      <p className="text-sm">
                        Выигрышная ставка: {Number(auction.current_price).toLocaleString('ru-RU')} сум
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Блок оплаты для организатора */}
              {isOrganizer && auction.status === 'pending_payment' && !auction.is_paid && (
                <div className="mt-6 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                  <div className="flex items-center text-yellow-800 mb-4">
                    <CreditCardIcon className="w-6 h-6 mr-3" />
                    <div>
                      <p className="text-sm font-medium">Требуется оплата за размещение аукциона</p>
                      <p className="text-lg font-bold">50,000 сум</p>
                    </div>
                  </div>

                  {!paymentInfo ? (
                    // Кнопка "Получить реквизиты"
                    <button
                      onClick={handleGetPaymentInfo}
                      disabled={paymentLoading}
                      className="w-full px-4 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:bg-gray-400 font-semibold"
                    >
                      {paymentLoading ? 'Загрузка...' : 'Получить реквизиты для оплаты'}
                    </button>
                  ) : (
                    // Форма оплаты
                    <div className="bg-white rounded-lg p-4 border border-yellow-300">
                      {/* Статус платежа */}
                      {paymentInfo.payment_status === 'waiting_confirmation' && (
                        <div className="flex items-center bg-yellow-100 text-yellow-800 px-3 py-2 rounded mb-4">
                          <ClockIcon className="w-5 h-5 mr-2" />
                          <span className="text-sm font-medium">Скриншот отправлен. Ожидает проверки администратором.</span>
                        </div>
                      )}
                      {paymentInfo.payment_status === 'confirmed' && (
                        <div className="flex items-center bg-green-100 text-green-800 px-3 py-2 rounded mb-4">
                          <CheckCircleIcon className="w-5 h-5 mr-2" />
                          <span className="text-sm font-medium">Оплата подтверждена!</span>
                        </div>
                      )}
                      {paymentInfo.payment_status === 'rejected' && (
                        <div className="flex items-center bg-red-100 text-red-800 px-3 py-2 rounded mb-4">
                          <XCircleIcon className="w-5 h-5 mr-2" />
                          <span className="text-sm font-medium">Оплата отклонена. Попробуйте снова.</span>
                        </div>
                      )}

                      {/* Номер карты */}
                      <div className="mb-4">
                        <p className="text-sm text-gray-700 mb-2 font-semibold">Номер карты для перевода:</p>
                        <div className="flex items-center justify-between bg-gray-100 px-4 py-3 rounded-lg">
                          <p className="font-mono text-lg font-bold text-gray-900 tracking-wider">
                            {paymentInfo.card_number}
                          </p>
                          <button
                            onClick={handleCopyCardNumber}
                            className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                          >
                            Копировать
                          </button>
                        </div>
                      </div>

                      {/* Сумма */}
                      <div className="mb-4 p-3 bg-green-50 rounded-lg">
                        <p className="text-sm text-green-700">Сумма к оплате:</p>
                        <p className="text-2xl font-bold text-green-800">
                          {Number(paymentInfo.amount).toLocaleString('ru-RU')} сум
                        </p>
                      </div>

                      {/* Инструкции */}
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-800 font-semibold mb-2">Как оплатить:</p>
                        <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                          <li>Скопируйте номер карты выше</li>
                          <li>Откройте приложение банка (Click, Payme, Uzum)</li>
                          <li>Переведите <strong>50,000 сум</strong> на указанную карту</li>
                          <li>Сделайте скриншот подтверждения перевода</li>
                          <li>Загрузите скриншот ниже</li>
                        </ol>
                      </div>

                      {/* Загрузка скриншота - показываем если статус pending (ожидает скриншот) или rejected (отклонено), скрываем если waiting_confirmation или confirmed */}
                      {paymentInfo.payment_status !== 'waiting_confirmation' && paymentInfo.payment_status !== 'confirmed' && (
                        <div className="border-t border-gray-200 pt-4">
                          <p className="text-sm text-gray-700 mb-2 font-semibold">
                            <PhotoIcon className="w-5 h-5 inline mr-1" />
                            Загрузите скриншот оплаты:
                          </p>

                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleScreenshotChange}
                            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-yellow-50 file:text-yellow-700 hover:file:bg-yellow-100 mb-3"
                          />

                          {screenshot && (
                            <div className="mb-3">
                              <p className="text-sm text-green-600 mb-2">
                                ✓ Выбран файл: {screenshot.name}
                              </p>
                              <img
                                src={URL.createObjectURL(screenshot)}
                                alt="Preview"
                                className="max-h-40 rounded-lg border"
                              />
                            </div>
                          )}

                          <button
                            onClick={handleUploadScreenshot}
                            disabled={!screenshot || uploadingScreenshot}
                            className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
                          >
                            {uploadingScreenshot ? 'Отправка...' : 'Отправить скриншот на проверку'}
                          </button>

                          <p className="text-xs text-gray-500 mt-2 text-center">
                            После отправки администратор проверит оплату в Telegram
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* История ставок */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                История ставок ({auction.bids?.length || 0})
              </h2>

              {auction.bids && auction.bids.length > 0 ? (
                <div className="space-y-3">
                  {auction.bids.map((bid, index) => (
                    <div
                      key={bid.id}
                      className={`p-4 rounded-lg ${
                        index === 0 ? 'bg-primary-50 border-2 border-primary-200' : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-gray-900">{bid.bidder_name}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(bid.bid_time).toLocaleString('ru-RU')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-xl font-bold ${index === 0 ? 'text-primary-700' : 'text-gray-900'}`}>
                            {Number(bid.amount).toLocaleString('ru-RU')} сум
                          </p>
                          {index === 0 && <span className="text-xs text-primary-600">Лидирует</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">Ставок пока нет</p>
              )}
            </div>
          </div>

          {/* Правая колонка - форма ставки */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Сделать ставку</h2>

              {!isAuthenticated ? (
                <div className="text-center py-4">
                  <p className="text-gray-600 mb-4">Войдите, чтобы делать ставки</p>
                  <Link
                    to="/login"
                    className="w-full inline-block px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-center"
                  >
                    Войти
                  </Link>
                </div>
              ) : isOrganizer ? (
                <p className="text-gray-600 text-center py-4">
                  Вы являетесь организатором этого аукциона
                </p>
              ) : !canBid ? (
                <p className="text-gray-600 text-center py-4">
                  {auction.status !== 'active' ? 'Аукцион неактивен' : 'Ставки недоступны'}
                </p>
              ) : (
                <form onSubmit={handlePlaceBid}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ваша ставка (сум)
                    </label>
                    <input
                      type="number"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      min={Number(auction.current_price) + 1}
                      step="1000000"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Минимальная ставка: {(Number(auction.current_price) + 1).toLocaleString('ru-RU')} сум
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
                  >
                    {submitting ? 'Отправка...' : 'Сделать ставку'}
                  </button>
                </form>
              )}

              {/* Информация о недвижимости */}
              {auction.property && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-3">О недвижимости</h3>
                  <Link
                    to={`/properties/${auction.property.id}`}
                    className="text-primary-600 hover:text-primary-700 text-sm"
                  >
                    Посмотреть детали →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuctionDetail;
