import React, { useState, useEffect, useRef } from 'react';
import { FiMapPin, FiCheck, FiX, FiInfo, FiClock, FiMap } from 'react-icons/fi';

const AddressMapPicker = ({ value, onChange, required = false }) => {
  const [mode, setMode] = useState('input');
  const [address, setAddress] = useState(value || '');
  const [coordinates, setCoordinates] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef(null);
  const ymapsRef = useRef(null);
  const placemarkRef = useRef(null);

  useEffect(() => {
    setAddress(value || '');
  }, [value]);

  useEffect(() => {
    if (mode === 'map' && !mapLoaded) {
      loadYandexMaps();
    }
  }, [mode]);

  const loadYandexMaps = () => {
    if (window.ymaps) {
      console.log('✅ Яндекс.Карты уже загружены');
      setMapLoaded(true);
      setTimeout(() => {
        initMap();
      }, 100);
      return;
    }

    console.log('📥 Загружаем Яндекс.Карты...');
    const script = document.createElement('script');
    // ✅ С ВАШИМ API КЛЮЧОМ
    script.src = 'https://api-maps.yandex.ru/2.1/?apikey=6e46a359-b254-4264-bf45-210dbbb6d13a&lang=ru_RU';
    script.async = true;
    script.onload = () => {
      console.log('✅ Скрипт Яндекс.Карт загружен');
      window.ymaps.ready(() => {
        console.log('✅ Яндекс.Карты готовы');
        setMapLoaded(true);
        setTimeout(() => {
          initMap();
        }, 100);
      });
    };
    script.onerror = () => {
      console.error('❌ Ошибка загрузки Яндекс.Карт');
    };
    document.head.appendChild(script);
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

    console.log('🗺️ Инициализация карты...');

    if (ymapsRef.current) {
      console.log('🗑️ Уничтожаем старую карту');
      ymapsRef.current.destroy();
      ymapsRef.current = null;
      placemarkRef.current = null;
    }

    const defaultCenter = [42.4640, 59.6103]; // Нукус
    const center = coordinates || defaultCenter;

    try {
      const map = new window.ymaps.Map(mapRef.current, {
        center: center,
        zoom: 13,
        controls: ['zoomControl', 'searchControl', 'geolocationControl']
      });

      ymapsRef.current = map;
      console.log('✅ Карта создана');

      const placemark = new window.ymaps.Placemark(center, {
        hintContent: 'Перетащите метку в нужное место',
        balloonContent: address || 'Выберите местоположение'
      }, {
        preset: 'islands#redDotIcon',
        draggable: true
      });

      placemarkRef.current = placemark;
      map.geoObjects.add(placemark);
      console.log('✅ Метка добавлена');

      // ✅ Обработчик перетаскивания С ГЕОКОДИРОВАНИЕМ
      placemark.events.add('dragend', async function () {
        const coords = placemark.geometry.getCoordinates();
        console.log('📍 Метка перемещена:', coords);
        setCoordinates(coords);
        
        // ГЕОКОДИРОВАНИЕ: координаты → адрес
        try {
          console.log('🔄 Геокодирование координат...');
          const geocoder = await window.ymaps.geocode(coords);
          const firstGeoObject = geocoder.geoObjects.get(0);
          
          if (firstGeoObject) {
            const newAddress = firstGeoObject.getAddressLine();
            console.log('✅ Получен адрес:', newAddress);
            setAddress(newAddress);
            placemark.properties.set('balloonContent', newAddress);
          } else {
            console.warn('⚠️ Адрес не найден');
          }
        } catch (error) {
          console.error('❌ Ошибка геокодирования:', error);
        }
      });

      // ✅ Клик по карте С ГЕОКОДИРОВАНИЕМ
      map.events.add('click', async function (e) {
        const coords = e.get('coords');
        console.log('👆 Клик по карте:', coords);
        placemark.geometry.setCoordinates(coords);
        setCoordinates(coords);
        
        // ГЕОКОДИРОВАНИЕ: координаты → адрес
        try {
          console.log('🔄 Геокодирование координат...');
          const geocoder = await window.ymaps.geocode(coords);
          const firstGeoObject = geocoder.geoObjects.get(0);
          
          if (firstGeoObject) {
            const newAddress = firstGeoObject.getAddressLine();
            console.log('✅ Получен адрес:', newAddress);
            setAddress(newAddress);
            placemark.properties.set('balloonContent', newAddress);
          } else {
            console.warn('⚠️ Адрес не найден');
            const simpleAddress = `Координаты: ${coords[0].toFixed(5)}, ${coords[1].toFixed(5)}`;
            setAddress(simpleAddress);
          }
        } catch (error) {
          console.error('❌ Ошибка геокодирования:', error);
          const simpleAddress = `Координаты: ${coords[0].toFixed(5)}, ${coords[1].toFixed(5)}`;
          setAddress(simpleAddress);
        }
      });

      // Если есть начальный адрес, геокодируем его
      if (address && !coordinates) {
        console.log('🔍 Геокодируем начальный адрес:', address);
        geocodeAddress(address);
      }

    } catch (error) {
      console.error('❌ Ошибка создания карты:', error);
    }
  };

  const geocodeAddress = async (addr) => {
    if (!window.ymaps) {
      console.error('❌ Яндекс.Карты не загружены');
      return;
    }

    console.log('🔍 Геокодирование адреса:', addr);

    try {
      const geocoder = await window.ymaps.geocode(addr);
      const firstGeoObject = geocoder.geoObjects.get(0);
      
      if (!firstGeoObject) {
        console.warn('⚠️ Адрес не найден');
        return;
      }
      
      const coords = firstGeoObject.geometry.getCoordinates();
      console.log('✅ Найдены координаты:', coords);
      setCoordinates(coords);
      
      if (ymapsRef.current && placemarkRef.current) {
        ymapsRef.current.setCenter(coords, 15);
        placemarkRef.current.geometry.setCoordinates(coords);
        console.log('✅ Карта и метка обновлены');
      }
    } catch (error) {
      console.error('❌ Ошибка геокодирования:', error);
    }
  };

  const handleAddressInputChange = (e) => {
    const newAddress = e.target.value;
    setAddress(newAddress);
  };

  const handleSaveAddress = () => {
    console.log('💾 Попытка сохранения адреса:', address);
    
    if (!address || !address.trim()) {
      console.warn('⚠️ Адрес пустой!');
      alert('Пожалуйста, введите адрес или кликните на карту');
      return;
    }
    
    console.log('✅ Сохраняем адрес:', address);
    onChange(address);
    
    setTimeout(() => {
      setMode('input');
      console.log('✅ Режим переключен на input');
    }, 0);
  };

  const handleCancelMap = () => {
    console.log('❌ Отмена');
    setAddress(value || '');
    setCoordinates(null);
    setMode('input');
  };

  const handleSearchFromInput = () => {
    console.log('🔍 Поиск адреса:', address);
    if (address && address.trim()) {
      geocodeAddress(address);
    }
  };

  const handleOpenMap = () => {
    console.log('🗺️ Открытие карты');
    setMode('map');
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Адрес {required && <span className="text-red-500">*</span>}
      </label>

      {mode === 'input' ? (
        <div className="space-y-2">
          <div className="relative">
            <input
              type="text"
              value={address}
              onChange={handleAddressInputChange}
              onBlur={() => {
                if (address && address.trim()) {
                  onChange(address);
                }
              }}
              required={required}
              className="input-field pr-10"
              placeholder="Нукус, улица..."
            />
            <button
              type="button"
              onClick={handleOpenMap}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-primary-600 hover:text-primary-700 p-2"
              title="Выбрать на карте"
            >
              <FiMapPin className="text-xl" />
            </button>
          </div>
          
          <button
            type="button"
            onClick={handleOpenMap}
            className="w-full btn-outline flex items-center justify-center space-x-2"
          >
            <FiMapPin />
            <span>Выбрать на карте</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Поле ввода адреса */}
          <div className="flex space-x-2">
            <input
              type="text"
              value={address}
              onChange={handleAddressInputChange}
              className="input-field flex-1"
              placeholder="Введите адрес или кликните на карту"
            />
            <button
              type="button"
              onClick={handleSearchFromInput}
              className="btn-outline px-4"
              title="Найти на карте"
            >
              <FiMapPin />
            </button>
          </div>

          {/* Карта */}
          <div 
            ref={mapRef}
            className="w-full h-96 rounded-lg border-2 border-gray-300 overflow-hidden bg-gray-200"
            style={{ minHeight: '384px' }}
          >
            {!mapLoaded && (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Загрузка карты...</p>
                </div>
              </div>
            )}
          </div>

          {/* Подсказка */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800 flex items-center">
              <FiInfo className="mr-2" />
              <strong>Как выбрать:</strong>
            </p>
            <ul className="text-sm text-blue-700 mt-2 ml-4 list-disc space-y-1">
              <li><strong>Кликните</strong> на карту → адрес появится автоматически</li>
              <li><strong>Перетащите</strong> красную метку → адрес обновится</li>
              <li>Или <strong>введите адрес</strong> выше и нажмите <FiMap className="inline" /></li>
            </ul>
          </div>

          {/* Кнопки */}
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={handleSaveAddress}
              className="flex-1 btn-primary flex items-center justify-center space-x-2"
              disabled={!address || !address.trim()}
            >
              <FiCheck />
              <span>Сохранить адрес</span>
            </button>
            <button
              type="button"
              onClick={handleCancelMap}
              className="flex-1 btn-outline flex items-center justify-center space-x-2"
            >
              <FiX />
              <span>Отмена</span>
            </button>
          </div>

          {/* Текущий выбор */}
          {(address || coordinates) && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              {address && address.trim() ? (
                <>
                  <p className="text-sm text-green-800 flex items-center">
                    <FiMapPin className="mr-2" />
                    <strong>Выбранный адрес:</strong> {address}
                  </p>
                  {coordinates && (
                    <p className="text-xs text-green-600 mt-1">
                      Координаты: {coordinates[0].toFixed(5)}, {coordinates[1].toFixed(5)}
                    </p>
                  )}
                </>
              ) : (
                coordinates && (
                  <>
                    <p className="text-sm text-orange-600 flex items-center">
                      <FiMapPin className="mr-2" />
                      <strong>Метка установлена:</strong> {coordinates[0].toFixed(5)}, {coordinates[1].toFixed(5)}
                    </p>
                    <p className="text-xs text-orange-500 mt-1 flex items-center">
                      <FiClock className="mr-1" />
                      Получаем адрес...
                    </p>
                  </>
                )
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AddressMapPicker;