import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { propertiesAPI } from '../services/api';
import Header from '../components/Header';
import { FiX, FiMapPin, FiHome, FiMaximize, FiLoader, FiMap, FiUsers, FiAlertTriangle, FiInfo, FiCheck, FiFilter, FiChevronDown, FiChevronUp } from 'react-icons/fi';

const MapSearch = () => {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const [allProperties, setAllProperties] = useState([]); // Все загруженные квартиры
  const [properties, setProperties] = useState([]); // Отфильтрованные квартиры для отображения
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [map, setMap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(true); // ✅ НОВОЕ: состояние видимости фильтров
  const [filters, setFilters] = useState({
    gender_preference: '',
    boiler_type: '',
    min_price: '',
    max_price: '',
    rooms: '',
  });

  // Центр Нукуса
  const NUKUS_CENTER = [42.4531, 59.6103];

  // Цветовая схема
  const COLOR_SCHEME = {
    female: { color: '#ec4899', icon: 'islands#pinkDotIcon', label: 'Девушкам', emoji: '💗' },
    male: { color: '#3b82f6', icon: 'islands#blueDotIcon', label: 'Парням', emoji: '💙' },
    family: { color: '#10b981', icon: 'islands#greenDotIcon', label: 'Семейным', emoji: '💚' },
    military: { color: '#f59e0b', icon: 'islands#orangeDotIcon', label: 'Военным', emoji: '🧡' },
    any: { color: '#6366f1', icon: 'islands#violetDotIcon', label: 'Всем', emoji: '💜' },
  };

  useEffect(() => {
    console.log('🚀 Компонент MapSearch монтируется');
    loadYandexMapsAndFetchData();

    // Делаем navigate доступным глобально для Яндекс.Карт
    window.ReactRouter = { navigate };
  }, []);

  const loadYandexMapsAndFetchData = async () => {
    console.log('📥 Начинаем загрузку данных и карты...');
    
    // Сначала загружаем данные
    await fetchProperties();
    
    // Потом загружаем карты
    if (window.ymaps) {
      console.log('✅ Яндекс.Карты уже загружены');
      setTimeout(() => {
        initMap();
      }, 100);
    } else {
      console.log('📥 Загружаем Яндекс.Карты...');
      const script = document.createElement('script');
      script.src = 'https://api-maps.yandex.ru/2.1/?apikey=6e46a359-b254-4264-bf45-210dbbb6d13a&lang=ru_RU';
      script.async = true;
      script.onload = () => {
        console.log('✅ Скрипт Яндекс.Карт загружен');
        window.ymaps.ready(() => {
          console.log('✅ Яндекс.Карты готовы');
          setTimeout(() => {
            initMap();
          }, 100);
        });
      };
      script.onerror = () => {
        console.error('❌ Ошибка загрузки Яндекс.Карт');
        setLoading(false);
      };
      document.head.appendChild(script);
    }
  };

  const fetchProperties = async (customFilters = {}) => {
    console.log('📡 Загружаем объявления...');
    try {
      const params = { 
        type: 'rent', 
        status: 'active',
        ...customFilters 
      };
      console.log('📊 Параметры запроса:', params);
      
      const response = await propertiesAPI.getAll(params);
      console.log('📦 Ответ от сервера:', response.data);
      
      const props = response.data.results || response.data;
      console.log(`📍 Всего объявлений: ${props.length}`);
      
      console.log('🗺️ Объявления:', props.map(p => ({
        id: p.id,
        title: p.title,
        address: p.address,
        latitude: p.latitude,
        longitude: p.longitude,
        hasCoords: !!(p.latitude && p.longitude)
      })));
      
      const propsWithCoords = props.filter(p => p.latitude && p.longitude);
      console.log(`✅ Объявлений с координатами: ${propsWithCoords.length}`);
      
      if (propsWithCoords.length === 0 && props.length > 0) {
        console.warn('⚠️ Нет объявлений с координатами! Проверьте, что бэкенд возвращает latitude/longitude');
        console.warn('⚠️ Или проверьте, что геокодирование работает при создании объявлений');
      }
      
      setAllProperties(propsWithCoords);
      setProperties(propsWithCoords); // Изначально показываем все
      setLoading(false);
    } catch (error) {
      console.error('❌ Ошибка при загрузке объявлений:', error);
      setLoading(false);
    }
  };

  const initMap = () => {
    if (!mapRef.current) {
      console.error('❌ mapRef.current не существует!');
      return;
    }
    
    if (!window.ymaps) {
      console.error('❌ window.ymaps не загружен!');
      return;
    }

    console.log('🗺️ Инициализируем карту...');

    try {
      const mapInstance = new window.ymaps.Map(mapRef.current, {
        center: NUKUS_CENTER,
        zoom: 13,
        controls: ['zoomControl', 'fullscreenControl', 'geolocationControl', 'typeSelector']
      });

      console.log('✅ Карта создана успешно');
      setMap(mapInstance);
    } catch (error) {
      console.error('❌ Ошибка создания карты:', error);
    }
  };

  useEffect(() => {
    if (map && properties.length > 0) {
      console.log(`🎯 Добавляем ${properties.length} меток на карту`);
      addMarkersToMap();
    } else if (map && properties.length === 0) {
      console.log('ℹ️ Карта готова, но нет объявлений для отображения');
    }
  }, [map, properties]);

  const addMarkersToMap = () => {
    map.geoObjects.removeAll();

    const clusterer = new window.ymaps.Clusterer({
      preset: 'islands#invertedVioletClusterIcons',
      clusterHideIconOnBalloonOpen: false,
      geoObjectHideIconOnBalloonOpen: false,
      groupByCoordinates: false,
      clusterDisableClickZoom: false,
      clusterOpenBalloonOnClick: true,
    });

    const placemarks = properties.map((property, index) => {
      // Для квартир с несколькими категориями берем первую, или 'any' если пустой массив
      const genderPrefs = property.gender_preference || [];
      const genderPref = genderPrefs.length > 0 ? genderPrefs[0] : 'any';
      const colorData = COLOR_SCHEME[genderPref] || COLOR_SCHEME.any;

      const iconSize = [35, 35];
      const iconOffset = [-17, -35];

      console.log(`📍 Метка ${index + 1}:`, {
        title: property.title,
        coords: [property.latitude, property.longitude],
        category: genderPref,
        color: colorData.color
      });

      const placemark = new window.ymaps.Placemark(
        [property.latitude, property.longitude],
        {
          hintContent: property.title
        },
        {
          preset: colorData.icon,
          hideIconOnBalloonOpen: false,
          iconImageSize: iconSize,
          iconImageOffset: iconOffset
        }
      );

      placemark.events.add('click', () => {
        setSelectedProperty(property);
      });

      return placemark;
    });

    clusterer.add(placemarks);
    map.geoObjects.add(clusterer);

    if (placemarks.length > 0) {
      map.setBounds(clusterer.getBounds(), {
        checkZoomRange: true,
        zoomMargin: 50
      });
    }

    console.log(`✅ Добавлено ${placemarks.length} меток на карту`);
  };

  const handleFilterChange = (key, value) => {
    console.log('🔍 Изменен фильтр:', key, '=', value);
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);

    // Применяем все фильтры
    let filtered = [...allProperties];

    // Фильтр по категории (gender_preference) - теперь массив
    if (newFilters.gender_preference) {
      filtered = filtered.filter(property => {
        const prefs = property.gender_preference || [];
        // Показываем если массив пустой (всем) или содержит выбранную категорию
        return prefs.length === 0 || prefs.includes(newFilters.gender_preference);
      });
    }

    // Фильтр по типу котла
    if (newFilters.boiler_type) {
      filtered = filtered.filter(property =>
        (property.boiler_type || 'none') === newFilters.boiler_type
      );
    }

    // Фильтр по количеству комнат
    if (newFilters.rooms) {
      filtered = filtered.filter(property =>
        property.rooms === parseInt(newFilters.rooms)
      );
    }

    // Фильтр по цене
    if (newFilters.min_price) {
      filtered = filtered.filter(property =>
        property.price >= parseInt(newFilters.min_price)
      );
    }
    if (newFilters.max_price) {
      filtered = filtered.filter(property =>
        property.price <= parseInt(newFilters.max_price)
      );
    }

    console.log(`✅ После фильтрации: ${filtered.length} из ${allProperties.length}`);
    setProperties(filtered);
  };

  const resetFilters = () => {
    setFilters({
      gender_preference: '',
      boiler_type: '',
      min_price: '',
      max_price: '',
      rooms: '',
    });
    setProperties(allProperties);
  };

  const formatPrice = (property) => {
  // 🆕 Используем price_display из API
  if (property.price_display) {
    return property.price_display.formatted;
  }
  
  // Fallback на старый формат
  return new Intl.NumberFormat('ru-RU').format(property.price) + ' сум';
};

  if (loading) {
    return (
      <div className="h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <FiLoader className="text-6xl text-primary-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600 text-lg mb-2">Загрузка карты...</p>
            <p className="text-gray-500 text-sm">Загружено объявлений: {allProperties.length}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <Header />

      <div className="flex-1 relative">
        {/* Карта */}
        <div
          ref={mapRef}
          className="w-full h-full"
          style={{ minHeight: 'calc(100vh - 64px)', backgroundColor: '#f0f0f0' }}
        />

        {/* Предупреждение если нет объявлений */}
        {properties.length === 0 && !loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 z-20">
            <div className="text-center p-8 bg-white rounded-xl shadow-2xl max-w-md">
              <FiMap className="text-6xl mb-4 mx-auto text-gray-400" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Нет объявлений на карте
              </h2>
              <p className="text-gray-600 mb-4">
                {allProperties.length > 0 
                  ? 'Попробуйте изменить фильтры' 
                  : 'Похоже, у объявлений нет координат'}
              </p>
              <button
                onClick={allProperties.length > 0 ? resetFilters : () => navigate('/')}
                className="btn-primary"
              >
                {allProperties.length > 0 ? 'Сбросить фильтры' : 'Вернуться к списку'}
              </button>
            </div>
          </div>
        )}

        {/* ✅ ОБНОВЛЕННАЯ ПАНЕЛЬ ФИЛЬТРОВ С КНОПКОЙ СКРЫТЬ/ПОКАЗАТЬ */}
        {properties.length > 0 && (
          <div className="absolute top-4 left-4 bg-white rounded-xl shadow-xl z-10 max-w-xs overflow-hidden md:max-w-xs">
            {/* Заголовок с кнопкой свернуть/развернуть */}
            <div 
              className="flex items-center justify-between p-4 border-b cursor-pointer hover:bg-gray-50"
              onClick={() => setShowFilters(!showFilters)}
            >
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <FiFilter className="text-lg" />
                Фильтры ({properties.length})
              </h3>
              <button className="text-gray-500 hover:text-gray-700">
                {showFilters ? <FiChevronUp /> : <FiChevronDown />}
              </button>
            </div>
            
            {/* Содержимое фильтров */}
            {showFilters && (
              <div className="p-4 space-y-3 max-h-[calc(100vh-250px)] overflow-y-auto">
                {/* Быстрые фильтры по категориям */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2 uppercase">Для кого</p>
                  <div className="space-y-2">
                    <button
                      onClick={() => handleFilterChange('gender_preference', '')}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                        filters.gender_preference === '' 
                          ? 'bg-gray-900 text-white font-semibold' 
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <FiHome className="text-base" />
                        <span>Все квартиры</span>
                        <span className="ml-auto text-xs bg-white bg-opacity-20 px-2 py-0.5 rounded">
                          {allProperties.length}
                        </span>
                      </span>
                    </button>

                    {Object.entries(COLOR_SCHEME).map(([key, data]) => {
                       if (key === 'any') return null;
                       const count = allProperties.filter(p => {
                         const prefs = p.gender_preference || [];
                         return prefs.length === 0 || prefs.includes(key);
                       }).length;
                      
                      return (
                        <button
                          key={key}
                          onClick={() => handleFilterChange('gender_preference', key)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                            filters.gender_preference === key
                              ? `text-white font-semibold shadow-lg`
                              : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                          }`}
                          style={{
                            backgroundColor: filters.gender_preference === key ? data.color : undefined
                          }}
                        >
                          <span className="flex items-center gap-2">
                            <FiUsers className="text-base" />
                            <span>{data.label}</span>
                            <span className={`ml-auto text-xs px-2 py-0.5 rounded ${
                              filters.gender_preference === key 
                                ? 'bg-white bg-opacity-20' 
                                : 'bg-gray-200'
                            }`}>
                              {count}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Дополнительные фильтры */}
                <div className="pt-3 border-t">
                  <p className="text-xs font-semibold text-gray-500 mb-2 uppercase">Дополнительно</p>
                  
                  {/* Комнаты */}
                  <select
                    value={filters.rooms}
                    onChange={(e) => handleFilterChange('rooms', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Любое кол-во комнат</option>
                    <option value="1">1 комната</option>
                    <option value="2">2 комнаты</option>
                    <option value="3">3 комнаты</option>
                    <option value="4">4+ комнаты</option>
                  </select>

                  {/* Тип котла */}
                  <select
                    value={filters.boiler_type}
                    onChange={(e) => handleFilterChange('boiler_type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Любой котел</option>
                    <option value="factory">Заводской</option>
                    <option value="custom">Самодельный</option>
                    <option value="none">Без котла</option>
                  </select>

                  {/* Цена от */}
                  <input
                    type="number"
                    value={filters.min_price}
                    onChange={(e) => handleFilterChange('min_price', e.target.value)}
                    placeholder="Цена от"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />

                  {/* Цена до */}
                  <input
                    type="number"
                    value={filters.max_price}
                    onChange={(e) => handleFilterChange('max_price', e.target.value)}
                    placeholder="Цена до"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                {/* Кнопка сброса */}
                {(filters.gender_preference || filters.boiler_type || filters.rooms || filters.min_price || filters.max_price) && (
                  <button
                    onClick={resetFilters}
                    className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    Сбросить все фильтры
                  </button>
                )}

                <div className="pt-3 border-t">
                  <p className="text-xs text-gray-500 text-center">
                    Показано: <span className="font-bold text-gray-900">{properties.length}</span> из {allProperties.length}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Панель с выбранной квартирой */}
        {selectedProperty && (
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 w-full max-w-md px-4 animate-fade-in z-10">
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              {selectedProperty.images && selectedProperty.images.length > 0 ? (
                <img
                  src={selectedProperty.images[0].image}
                  alt={selectedProperty.title}
                  className="w-full h-48 object-cover"
                />
              ) : (
                <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                  <FiHome className="text-6xl text-gray-400" />
                </div>
              )}

              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-bold text-gray-900 flex-1 pr-2">
                    {selectedProperty.title}
                  </h3>
                  <button
                    onClick={() => setSelectedProperty(null)}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    <FiX className="text-xl" />
                  </button>
                </div>

                <div className="flex items-center text-gray-600 text-sm mb-3">
                  <FiMapPin className="mr-1 flex-shrink-0" />
                  <span className="line-clamp-1">{selectedProperty.address}</span>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <div className="text-2xl font-bold text-primary-600">
                    {formatPrice(selectedProperty.price)} сум
                  </div>
                  <div className="text-sm text-gray-500">/месяц</div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="badge badge-info">
                    <FiHome className="mr-1" />
                    {selectedProperty.rooms} комн.
                  </span>
                  <span className="badge badge-info">
                    <FiMaximize className="mr-1" />
                    {selectedProperty.area} м²
                  </span>
                </div>

                <button
                  onClick={() => navigate(`/properties/${selectedProperty.id}`)}
                  className="w-full btn-primary"
                  style={{
                    backgroundColor: COLOR_SCHEME[(selectedProperty.gender_preference || [])[0] || 'any'].color
                  }}
                >
                  Подробнее
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Кнопка назад */}
        <button
          onClick={() => navigate('/')}
          className="absolute top-4 right-4 btn-outline bg-white z-10 shadow-lg hidden md:block"
        >
          ← Вернуться к списку
        </button>
      </div>
    </div>
  );
};

export default MapSearch;