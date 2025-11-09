import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { propertiesAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import { toast } from 'react-toastify';
import {
  FiMapPin,
  FiHome,
  FiMaximize,
  FiPhone,
  FiMail,
  FiUser,
  FiArrowLeft,
  FiUsers,
  FiZap,
  FiCheckCircle,
  FiCalendar,
  FiLayers,
  FiHash,
  FiTool,
  FiChevronUp,
  FiWifi,
  FiWind,
  FiHeart as FiPets,
  FiChevronLeft,
  FiChevronRight,
  FiX as FiClose,
  FiImage,
} from 'react-icons/fi';

const PropertyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isBuyer, isSeller } = useAuth();
  
  // State
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [contactLoading, setContactLoading] = useState(false);
  const [ownerContacts, setOwnerContacts] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  // Map refs - отдельные для основной карты и карты продавца
  const mainMapRef = useRef(null);
  const sellerMapRef = useRef(null);
  const [mainMapLoaded, setMainMapLoaded] = useState(false);
  const [sellerMapLoaded, setSellerMapLoaded] = useState(false);

  // Fetch property on mount
  useEffect(() => {
    fetchProperty();
  }, [id]);

  // Load maps when property is ready
  useEffect(() => {
    if (property && property.latitude && property.longitude) {
      if (!mainMapLoaded && mainMapRef.current) {
        loadYandexMaps('main');
      }
      if (!sellerMapLoaded && sellerMapRef.current && isSeller()) {
        loadYandexMaps('seller');
      }
    }
  }, [property, mainMapLoaded, sellerMapLoaded]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && showImageModal) {
        closeImageModal();
      }
    };
    
    if (showImageModal) {
      window.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden'; // Prevent background scroll
    }
    
    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [showImageModal]);

  const loadYandexMaps = (mapType) => {
    if (window.ymaps) {
      console.log('✅ Яндекс.Карты уже загружены');
      setTimeout(() => {
        if (mapType === 'main') {
          initMap(mainMapRef, setMainMapLoaded);
        } else {
          initMap(sellerMapRef, setSellerMapLoaded);
        }
      }, 100);
      return;
    }

    console.log('📥 Загружаем Яндекс.Карты...');
    const script = document.createElement('script');
    script.src = 'https://api-maps.yandex.ru/2.1/?apikey=6e46a359-b254-4264-bf45-210dbbb6d13a&lang=ru_RU';
    script.async = true;
    script.onload = () => {
      console.log('✅ Скрипт Яндекс.Карт загружен');
      window.ymaps.ready(() => {
        console.log('✅ Яндекс.Карты готовы');
        setTimeout(() => {
          if (mapType === 'main') {
            initMap(mainMapRef, setMainMapLoaded);
          } else {
            initMap(sellerMapRef, setSellerMapLoaded);
          }
        }, 100);
      });
    };
    script.onerror = () => {
      console.error('❌ Ошибка загрузки Яндекс.Карт');
    };
    document.head.appendChild(script);
  };

  const initMap = (mapRef, setMapLoaded) => {
    if (!mapRef.current || !property) {
      console.error('❌ mapRef.current или property не существует!');
      return;
    }
    
    if (!window.ymaps) {
      console.error('❌ window.ymaps не загружен!');
      return;
    }

    console.log('🗺️ Инициализация карты...');

    const coords = [property.latitude, property.longitude];

    try {
      const map = new window.ymaps.Map(mapRef.current, {
        center: coords,
        zoom: 15,
        controls: ['zoomControl', 'fullscreenControl']
      });

      const placemark = new window.ymaps.Placemark(coords, {
        balloonContent: property.address,
        hintContent: property.title
      }, {
        preset: 'islands#redDotIcon'
      });

      map.geoObjects.add(placemark);
      setMapLoaded(true);
      console.log('✅ Карта создана');
    } catch (error) {
      console.error('❌ Ошибка создания карты:', error);
    }
  };

  const fetchProperty = async () => {
    try {
      const response = await propertiesAPI.getById(id);
      setProperty(response.data);
      
      // Устанавливаем контакты только если они есть в ответе
      // (бэкенд должен возвращать их только если уже был ContactRequest)
      if (response.data.owner_contacts) {
        setOwnerContacts(response.data.owner_contacts);
      }
    } catch (error) {
      console.error('Ошибка загрузки:', error);
      toast.error('Ошибка при загрузке объявления');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleContact = async () => {
    if (!message.trim()) {
      toast.error('Введите сообщение');
      return;
    }

    setContactLoading(true);
    try {
      const response = await propertiesAPI.contactOwner(id, message);
      setOwnerContacts(response.data.owner_contacts);
      toast.success('Запрос отправлен! Контакты владельца доступны');
      setMessage('');
    } catch (error) {
      console.error('Ошибка отправки:', error);
      toast.error(error.response?.data?.error || 'Ошибка при отправке запроса');
    } finally {
      setContactLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('ru-RU').format(price);
  };

  const getGenderLabel = (gender) => {
    const labels = {
      male: 'Парням',
      female: 'Девушкам',
      family: 'Семейным',
      military: 'Военным',
      any: 'Всем'
    };
    return labels[gender] || 'Всем';
  };

  const getBoilerLabel = (boiler) => {
    const labels = {
      factory: 'Заводской котел',
      custom: 'Самодельный котел',
      none: 'Нет котла'
    };
    return labels[boiler] || 'Нет котла';
  };

  const getBuildingTypeLabel = (type) => {
    const labels = {
      apartment: 'Многоквартирный дом',
      private: 'Частный дом'
    };
    return labels[type] || 'Многоквартирный дом';
  };

  const getRepairTypeLabel = (repair) => {
    const labels = {
      no: 'Без ремонта',
      cosmetic: 'Косметический ремонт',
      euro: 'Евроремонт',
      designer: 'Дизайнерский ремонт'
    };
    return labels[repair] || 'Без ремонта';
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) =>
      prev === property.images.length - 1 ? 0 : prev + 1
    );
    setImageError(false);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) =>
      prev === 0 ? property.images.length - 1 : prev - 1
    );
    setImageError(false);
  };

  const openImageModal = (index) => {
    setCurrentImageIndex(index);
    setShowImageModal(true);
    setImageError(false);
  };

  const closeImageModal = () => {
    setShowImageModal(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container-custom py-8">
          <div className="animate-pulse">
            <div className="h-96 bg-gray-200 rounded-xl mb-6"></div>
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!property) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container-custom py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="btn-outline mb-6 flex items-center space-x-2"
        >
          <FiArrowLeft />
          <span>Назад</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Images Gallery */}
            <div className="card overflow-hidden">
              {property.images && property.images.length > 0 ? (
                <div className="relative">
                  {!imageError ? (
                    <img
                      src={property.images[currentImageIndex].image}
                      alt={property.title}
                      className="w-full h-96 object-cover cursor-pointer"
                      onClick={() => openImageModal(currentImageIndex)}
                      onError={() => setImageError(true)}
                    />
                  ) : (
                    <div className="w-full h-96 bg-gray-200 flex flex-col items-center justify-center">
                      <FiImage className="text-gray-400 text-6xl mb-2" />
                      <p className="text-gray-500">Не удалось загрузить изображение</p>
                    </div>
                  )}

                  {/* Navigation arrows */}
                  {property.images.length > 1 && !imageError && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          prevImage();
                        }}
                        className="absolute left-2 md:left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-3 md:p-2 rounded-full hover:bg-opacity-75 transition-all"
                      >
                        <FiChevronLeft className="text-2xl md:text-xl" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          nextImage();
                        }}
                        className="absolute right-2 md:right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-3 md:p-2 rounded-full hover:bg-opacity-75 transition-all"
                      >
                        <FiChevronRight className="text-2xl md:text-xl" />
                      </button>
                    </>
                  )}

                  {/* Image counter */}
                  {property.images.length > 1 && !imageError && (
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                      {currentImageIndex + 1} / {property.images.length}
                    </div>
                  )}

                  {/* Thumbnail strip */}
                  {property.images.length > 1 && !imageError && (
                    <div className="absolute bottom-4 left-4 right-4 flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
                      {property.images.map((image, index) => (
                        <button
                          key={image.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentImageIndex(index);
                            setImageError(false);
                          }}
                          className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                            index === currentImageIndex
                              ? 'border-white'
                              : 'border-gray-400 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img
                            src={image.image}
                            alt={`Thumbnail ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full h-96 bg-gray-200 flex items-center justify-center">
                  <FiHome className="text-gray-400 text-6xl" />
                </div>
              )}
            </div>

            {/* Title and Price */}
            <div className="card p-6">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4 gap-4">
                <div className="flex-1">
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                    {property.title}
                  </h1>
                  <div className="flex items-center text-gray-600">
                    <FiMapPin className="mr-2 flex-shrink-0" />
                    <span className="text-sm md:text-base">{property.address}</span>
                  </div>
                </div>
                {/* 🆕 УМНОЕ ОТОБРАЖЕНИЕ ЦЕНЫ */}
                <div className="text-left md:text-right">
                  {property.price_display ? (
                    <>
                      <div className="text-2xl md:text-3xl font-bold text-primary-600">
                        {property.price_display.formatted}
                      </div>
                      {property.price_display.min_rental_days && (
                        <div className="text-sm text-gray-500 mt-1">
                          Минимум {property.price_display.min_rental_days}
                          {property.price_display.period === 'day' ? ' сут' : ' мес'}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="text-2xl md:text-3xl font-bold text-primary-600">
                        {formatPrice(property.price)} сум
                      </div>
                      {property.type === 'rent' && (
                        <div className="text-gray-500 text-sm">/месяц</div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 mb-4">
                <span
                  className={`badge ${
                    property.type === 'sale'
                      ? 'badge-success'
                      : property.type === 'daily_rent'
                        ? 'badge-warning'
                        : 'badge-info'
                  }`}
                >
                  {property.type === 'sale' && '🏠 Продажа'}
                  {property.type === 'rent' && '📅 Долгосрочная'}
                  {property.type === 'daily_rent' && '⏰ Посуточно'}
                </span>
                <span className="badge badge-warning">
                  {property.status === 'active' ? 'Активно' : 'Неактивно'}
                </span>
                {property.gender_preference && property.gender_preference !== 'any' && (
                  <span className="badge badge-info flex items-center gap-1">
                    <FiUsers />
                    {getGenderLabel(property.gender_preference)}
                  </span>
                )}
                {property.boiler_type && property.boiler_type !== 'none' && (
                  <span className="badge badge-success flex items-center gap-1">
                    <FiZap />
                    {getBoilerLabel(property.boiler_type)}
                  </span>
                )}
                {property.has_furniture && (
                  <span className="badge badge-warning flex items-center gap-1">
                    <FiCheckCircle />
                    С мебелью
                  </span>
                )}
              </div>

              {/* Main Details Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t">
                <div className="flex items-center space-x-2">
                  <FiHome className="text-gray-400 text-xl flex-shrink-0" />
                  <div>
                    <div className="text-sm text-gray-500">Комнаты</div>
                    <div className="font-semibold">{property.rooms}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <FiMaximize className="text-gray-400 text-xl flex-shrink-0" />
                  <div>
                    <div className="text-sm text-gray-500">Площадь</div>
                    <div className="font-semibold">{property.area} м²</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <FiUsers className="text-gray-400 text-xl flex-shrink-0" />
                  <div>
                    <div className="text-sm text-gray-500">Сдается</div>
                    <div className="font-semibold text-sm">{getGenderLabel(property.gender_preference)}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <FiZap className="text-gray-400 text-xl flex-shrink-0" />
                  <div>
                    <div className="text-sm text-gray-500">Котел</div>
                    <div className="font-semibold text-sm">{getBoilerLabel(property.boiler_type)}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <FiCheckCircle className="text-gray-400 text-xl flex-shrink-0" />
                  <div>
                    <div className="text-sm text-gray-500">Мебель</div>
                    <div className="font-semibold">{property.has_furniture ? 'Есть' : 'Нет'}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <FiCalendar className="text-gray-400 text-xl flex-shrink-0" />
                  <div>
                    <div className="text-sm text-gray-500">Опубликовано</div>
                    <div className="font-semibold text-xs">
                      {new Date(property.created_at).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                </div>

                {/* Building Information */}
                {property.building_type && (
                  <div className="flex items-center space-x-2">
                    <FiHome className="text-gray-400 text-xl flex-shrink-0" />
                    <div>
                      <div className="text-sm text-gray-500">Тип здания</div>
                      <div className="font-semibold text-sm">{getBuildingTypeLabel(property.building_type)}</div>
                    </div>
                  </div>
                )}

                {property.floor && (
                  <div className="flex items-center space-x-2">
                    <FiLayers className="text-gray-400 text-xl flex-shrink-0" />
                    <div>
                      <div className="text-sm text-gray-500">Этаж</div>
                      <div className="font-semibold">
                        {property.total_floors ? `${property.floor} из ${property.total_floors}` : property.floor}
                      </div>
                    </div>
                  </div>
                )}

                {property.entrance && (
                  <div className="flex items-center space-x-2">
                    <FiHash className="text-gray-400 text-xl flex-shrink-0" />
                    <div>
                      <div className="text-sm text-gray-500">Подъезд</div>
                      <div className="font-semibold">{property.entrance}</div>
                    </div>
                  </div>
                )}

                {property.building_year && (
                  <div className="flex items-center space-x-2">
                    <FiCalendar className="text-gray-400 text-xl flex-shrink-0" />
                    <div>
                      <div className="text-sm text-gray-500">Год постройки</div>
                      <div className="font-semibold">{property.building_year}</div>
                    </div>
                  </div>
                )}

                {property.repair_type && (
                  <div className="flex items-center space-x-2">
                    <FiTool className="text-gray-400 text-xl flex-shrink-0" />
                    <div>
                      <div className="text-sm text-gray-500">Ремонт</div>
                      <div className="font-semibold text-sm">{getRepairTypeLabel(property.repair_type)}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Additional Amenities */}
              {(property.has_parking || property.has_elevator || property.has_balcony ||
                property.has_wifi || property.has_conditioner || property.has_washing_machine ||
                property.has_fridge || property.pets_allowed) && (
                <div className="pt-4 mt-4 border-t">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Удобства</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {property.has_parking && (
                      <div className="flex items-center space-x-2 text-sm">
                        <FiHome className="text-green-600 flex-shrink-0" />
                        <span>Парковка</span>
                      </div>
                    )}
                    {property.has_elevator && (
                      <div className="flex items-center space-x-2 text-sm">
                        <FiChevronUp className="text-green-600 flex-shrink-0" />
                        <span>Лифт</span>
                      </div>
                    )}
                    {property.has_balcony && (
                      <div className="flex items-center space-x-2 text-sm">
                        <FiHome className="text-green-600 flex-shrink-0" />
                        <span>Балкон</span>
                      </div>
                    )}
                    {property.has_wifi && (
                      <div className="flex items-center space-x-2 text-sm">
                        <FiWifi className="text-green-600 flex-shrink-0" />
                        <span>WiFi</span>
                      </div>
                    )}
                    {property.has_conditioner && (
                      <div className="flex items-center space-x-2 text-sm">
                        <FiWind className="text-green-600 flex-shrink-0" />
                        <span>Кондиционер</span>
                      </div>
                    )}
                    {property.has_washing_machine && (
                      <div className="flex items-center space-x-2 text-sm">
                        <FiHome className="text-green-600 flex-shrink-0" />
                        <span>Стиральная машина</span>
                      </div>
                    )}
                    {property.has_fridge && (
                      <div className="flex items-center space-x-2 text-sm">
                        <FiHome className="text-green-600 flex-shrink-0" />
                        <span>Холодильник</span>
                      </div>
                    )}
                    {property.pets_allowed && (
                      <div className="flex items-center space-x-2 text-sm">
                        <FiPets className="text-green-600 flex-shrink-0" />
                        <span>Можно с животными</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="card p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Описание</h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {property.description}
              </p>
            </div>

            {/* Map Section - Main */}
            {property.latitude && property.longitude && (
              <div className="card p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FiMapPin />
                  Расположение на карте
                </h2>
                <div 
                  ref={mainMapRef}
                  className="w-full h-96 rounded-lg border-2 border-gray-200 overflow-hidden bg-gray-100"
                >
                  {!mainMapLoaded && (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Загрузка карты...</p>
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-3">
                  📍 {property.address}
                </p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Card - FOR BUYERS */}
            {isAuthenticated && isBuyer() && (
              <div className="card p-6 sticky top-24">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  Связаться с владельцем
                </h3>

                {ownerContacts ? (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                      <p className="text-green-800 font-medium">
                        ✓ Контакты владельца доступны
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <FiUser className="text-gray-400 flex-shrink-0" />
                        <div>
                          <div className="text-sm text-gray-500">Владелец</div>
                          <div className="font-semibold">
                            {ownerContacts.full_name}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <FiPhone className="text-gray-400 flex-shrink-0" />
                        <div>
                          <div className="text-sm text-gray-500">Телефон</div>
                          <a
                            href={`tel:${ownerContacts.phone}`}
                            className="font-semibold text-primary-600 hover:underline"
                          >
                            {ownerContacts.phone}
                          </a>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <FiMail className="text-gray-400 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm text-gray-500">Email</div>
                          <a
                            href={`mailto:${ownerContacts.email}`}
                            className="font-semibold text-primary-600 hover:underline break-all text-sm"
                          >
                            {ownerContacts.email}
                          </a>
                        </div>
                      </div>
                    </div>

                    <a
                      href={`tel:${ownerContacts.phone}`}
                      className="w-full btn-primary flex items-center justify-center space-x-2 mt-4"
                    >
                      <FiPhone />
                      <span>Позвонить</span>
                    </a>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-gray-600 text-sm">
                      Отправьте сообщение, чтобы получить контакты владельца
                    </p>

                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Здравствуйте! Меня интересует эта недвижимость..."
                      rows={4}
                      className="input-field resize-none"
                    />

                    <button
                      onClick={handleContact}
                      disabled={contactLoading || !message.trim()}
                      className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {contactLoading ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                          </svg>
                          Отправка...
                        </span>
                      ) : (
                        'Получить контакты'
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Login Prompt - FOR NON-AUTHENTICATED */}
            {!isAuthenticated && (
              <div className="card p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  Связаться с владельцем
                </h3>
                <p className="text-gray-600 mb-4">
                  Войдите или зарегистрируйтесь, чтобы связаться с владельцем
                </p>
                <button
                  onClick={() => navigate('/login', { state: { from: `/properties/${id}` } })}
                  className="w-full btn-primary mb-2"
                >
                  Войти
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="w-full btn-outline"
                >
                  Регистрация
                </button>
              </div>
            )}

            {/* Owner Info - FOR SELLERS */}
            {isAuthenticated && isSeller() && (
              <div className="card p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  Информация о владельце
                </h3>
                <div className="space-y-3">
                  <div>
                    <div className="text-sm text-gray-500">Владелец</div>
                    <div className="font-semibold">{property.owner_name}</div>
                  </div>
                </div>

                {/* Mini Map for seller */}
                {property.latitude && property.longitude && (
                  <div className="mt-6">
                    <h4 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <FiMapPin />
                      Расположение
                    </h4>
                    <div 
                      ref={sellerMapRef}
                      className="w-full h-64 rounded-lg border-2 border-gray-200 overflow-hidden bg-gray-100"
                    >
                      {!sellerMapLoaded && (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
                            <p className="text-gray-600 text-sm">Загрузка...</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Image Modal - ВНУТРИ return! */}
        {showImageModal && property.images && property.images.length > 0 && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
            onClick={closeImageModal}
          >
            <div 
              className="relative max-w-4xl max-h-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={closeImageModal}
                className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors z-10"
                aria-label="Закрыть"
              >
                <FiClose className="text-3xl" />
              </button>

              {/* Main image */}
              {!imageError ? (
                <img
                  src={property.images[currentImageIndex].image}
                  alt={`${property.title} - изображение ${currentImageIndex + 1}`}
                  className="max-w-full max-h-[80vh] object-contain rounded-lg"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-96 bg-gray-800 flex flex-col items-center justify-center rounded-lg">
                  <FiImage className="text-gray-500 text-6xl mb-2" />
                  <p className="text-gray-400">Не удалось загрузить изображение</p>
                </div>
              )}

              {/* Navigation arrows */}
              {property.images.length > 1 && !imageError && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      prevImage();
                    }}
                    className="absolute left-2 md:left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-3 rounded-full hover:bg-opacity-75 transition-all text-xl"
                    aria-label="Предыдущее изображение"
                  >
                    <FiChevronLeft />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      nextImage();
                    }}
                    className="absolute right-2 md:right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-3 rounded-full hover:bg-opacity-75 transition-all text-xl"
                    aria-label="Следующее изображение"
                  >
                    <FiChevronRight />
                  </button>
                </>
              )}

              {/* Image counter */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-4 py-2 rounded-full text-sm">
                {currentImageIndex + 1} / {property.images.length}
              </div>

              {/* Thumbnail strip */}
              {property.images.length > 1 && !imageError && (
                <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 flex space-x-2 overflow-x-auto max-w-full px-4">
                  {property.images.map((image, index) => (
                    <button
                      key={image.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentImageIndex(index);
                        setImageError(false);
                      }}
                      className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                        index === currentImageIndex
                          ? 'border-white scale-110'
                          : 'border-gray-400 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={image.image}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default PropertyDetail;