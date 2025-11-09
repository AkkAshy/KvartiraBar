import React, { useState } from 'react';
import { FiSearch, FiFilter, FiX, FiZap, FiMapPin } from 'react-icons/fi';
import { propertiesAPI } from '../services/api';

const PropertyFilter = ({ onFilter }) => {
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    ai_search: '',
    nearby_location: '',
    nearby_radius: '1',
    type: '',  // 🆕 По умолчанию пусто (был 'rent')
    rooms: '',
    min_price: '',
    max_price: '',
    status: 'active',
    min_area: '',
    max_area: '',
    gender_preference: '',
    boiler_type: '',
    has_furniture: '',
    min_floor: '',
    max_floor: '',
    year_built_from: '',
    year_built_to: '',
    renovation: '',
    entrance: '',
    sort_by: 'created_at',
    sort_order: 'desc',
    // 🆕 ДОБАВЬ ЭТИ НОВЫЕ ПОЛЯ:
    price_per_day_min: '',
    price_per_day_max: '',
    price_per_month_min: '',
    price_per_month_max: '',
    min_rental_days: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    let finalFilters = { ...filters };

    // 🆕 ЕСЛИ ИСПОЛЬЗУЕТСЯ AI-ПОИСК
    if (filters.ai_search && filters.ai_search.trim()) {
      console.log('🤖 Запускаем AI-поиск:', filters.ai_search);

      try {
        // Вызываем AI API
        const aiResponse = await propertiesAPI.aiSearch(filters.ai_search);

        console.log('✅ AI ответ:', aiResponse.data);

        // ✅ ЕСЛИ AI ВЕРНУЛ РЕЗУЛЬТАТЫ НАПРЯМУЮ - ИСПОЛЬЗУЕМ ИХ
        if (aiResponse.data.results && aiResponse.data.results.length > 0) {
          console.log('🎯 AI вернул результаты напрямую:', aiResponse.data.results.length);

          // Передаём результаты напрямую родителю
          onFilter({
            results: aiResponse.data.results,
            ai_search: undefined
          });
          return; // Выходим, не делаем обычный поиск
        }

        // Получаем фильтры от AI
        const aiFilters = aiResponse.data.ai_analysis?.filters || {};

        // Объединяем AI фильтры с обычными
        finalFilters = {
          ...finalFilters,
          ...aiFilters,
          // Убираем ai_search из финальных фильтров (уже обработан)
          ai_search: undefined
        };

        console.log('🎯 Итоговые фильтры после AI:', finalFilters);

      } catch (error) {
        console.error('❌ AI search error:', error);

        // FALLBACK: Если AI не сработал, используем обычный текстовый поиск
        finalFilters.search = filters.ai_search;
        delete finalFilters.ai_search;
      }
    }

    // Если используется геопоиск "рядом с"
    if (filters.nearby_location && filters.nearby_location.trim()) {
      try {
        // Сначала геокодируем адрес объекта
        const geocodeResponse = await propertiesAPI.geocode(filters.nearby_location);
        const { lat, lng } = geocodeResponse.data;

        // Ищем недвижимость рядом
        const nearbyResponse = await propertiesAPI.nearbySearch(
          lat,
          lng,
          filters.nearby_radius,
          filters.type || 'rent'
        );

        // Объединяем результаты
        finalFilters.nearby_properties = nearbyResponse.data.results;
      } catch (error) {
        console.error('Nearby search error:', error);
      }
    }

    // Передаём финальные фильтры родителю
    onFilter(finalFilters);
  };

  const handleReset = () => {
    const resetFilters = {
      search: '',
      ai_search: '',
      nearby_location: '',
      nearby_radius: '1',
      type: '',
      rooms: '',
      min_price: '',
      max_price: '',
      status: 'active',
      min_area: '',
      max_area: '',
      gender_preference: '',
      boiler_type: '',
      has_furniture: '',
      min_floor: '',
      max_floor: '',
      year_built_from: '',
      year_built_to: '',
      renovation: '',
      entrance: '',
      sort_by: 'created_at',
      sort_order: 'desc',
      // 🆕 ДОБАВЬ ЭТИ:
      price_per_day_min: '',
      price_per_day_max: '',
      price_per_month_min: '',
      price_per_month_max: '',
      min_rental_days: '',
    };
    setFilters(resetFilters);
    onFilter(resetFilters);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 mb-6 animate-fade-in">
      {/* Search Bar */}
      <form onSubmit={handleSubmit} className="mb-4 space-y-3">
        {/* AI Search - ЗАКОММЕНТИРОВАНО */}
        {/*
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <FiZap className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-500" />
            <input
              type="text"
              name="ai_search"
              value={filters.ai_search}
              onChange={handleChange}
              placeholder="AI-поиск: 'дешевая 2-комнатная квартира рядом с метро'..."
              className="input-field pl-10 border-purple-200 focus:border-purple-500"
            />
          </div>
          <button type="submit" className="btn-primary px-6 bg-purple-600 hover:bg-purple-700">
            <FiZap className="mr-2" />
            AI Найти
          </button>
        </div>
        */}

        {/* Regular Search */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              name="search"
              value={filters.search}
              onChange={handleChange}
              placeholder="Поиск по названию или адресу..."
              className="input-field pl-10"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="btn-outline px-4 flex items-center gap-2"
          >
            <FiFilter />
            <span className="hidden sm:inline">Фильтры</span>
          </button>
          <button type="submit" className="btn-primary px-6">
            Найти
          </button>
        </div>
      </form>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t animate-fade-in">
          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Тип сделки
            </label>
            <select
              name="type"
              value={filters.type}
              onChange={handleChange}
              className="input-field"
            >
              <option value="">Все</option>
              <option value="sale">Продажа</option>
              <option value="rent">Долгосрочная аренда</option>
              <option value="daily_rent">Посуточная аренда</option>  {/* 🆕 */}
            </select>
          </div>

          {/* Rooms */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Комнаты
            </label>
            <select
              name="rooms"
              value={filters.rooms}
              onChange={handleChange}
              className="input-field"
            >
              <option value="">Все</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4+</option>
            </select>
          </div>

          {/* Min Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Цена от
            </label>
            <input
              type="number"
              name="min_price"
              value={filters.min_price}
              onChange={handleChange}
              placeholder="0"
              className="input-field"
            />
          </div>

          {/* Max Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Цена до
            </label>
            <input
              type="number"
              name="max_price"
              value={filters.max_price}
              onChange={handleChange}
              placeholder="Не ограничено"
              className="input-field"
            />
          </div>

          {/* 🆕 УМНЫЕ ФИЛЬТРЫ ПО ЦЕНЕ В ЗАВИСИМОСТИ ОТ ТИПА */}
          {filters.type === 'daily_rent' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Цена за сутки от
                </label>
                <input
                  type="number"
                  name="price_per_day_min"
                  value={filters.price_per_day_min}
                  onChange={handleChange}
                  placeholder="0"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Цена за сутки до
                </label>
                <input
                  type="number"
                  name="price_per_day_max"
                  value={filters.price_per_day_max}
                  onChange={handleChange}
                  placeholder="Не ограничено"
                  className="input-field"
                />
              </div>
            </>
          )}

          {filters.type === 'rent' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Цена за месяц от
                </label>
                <input
                  type="number"
                  name="price_per_month_min"
                  value={filters.price_per_month_min}
                  onChange={handleChange}
                  placeholder="0"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Цена за месяц до
                </label>
                <input
                  type="number"
                  name="price_per_month_max"
                  value={filters.price_per_month_max}
                  onChange={handleChange}
                  placeholder="Не ограничено"
                  className="input-field"
                />
              </div>
            </>
          )}

          {/* Минимальный срок аренды */}
          {(filters.type === 'daily_rent' || filters.type === 'rent') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Минимальный срок {filters.type === 'daily_rent' ? '(суток)' : '(месяцев)'}
              </label>
              <input
                type="number"
                name="min_rental_days"
                value={filters.min_rental_days}
                onChange={handleChange}
                placeholder="1"
                min="1"
                className="input-field"
              />
            </div>
          )}

          {/* Area From */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Площадь от (м²)
            </label>
            <input
              type="number"
              name="min_area"
              value={filters.min_area}
              onChange={handleChange}
              placeholder="0"
              className="input-field"
            />
          </div>

          {/* Area To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Площадь до (м²)
            </label>
            <input
              type="number"
              name="max_area"
              value={filters.max_area}
              onChange={handleChange}
              placeholder="Не ограничено"
              className="input-field"
            />
          </div>

          {/* Gender Preference */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Сдается
            </label>
            <select
              name="gender_preference"
              value={filters.gender_preference}
              onChange={handleChange}
              className="input-field"
            >
              <option value="">Всем</option>
              <option value="male">Парням</option>
              <option value="female">Девушкам</option>
              <option value="family">Семейным</option>
              <option value="military">Военным</option>
            </select>
          </div>

          {/* Boiler Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Тип котла
            </label>
            <select
              name="boiler_type"
              value={filters.boiler_type}
              onChange={handleChange}
              className="input-field"
            >
              <option value="">Любой</option>
              <option value="none">Нет</option>
              <option value="factory">Заводской</option>
              <option value="custom">Самодельный</option>
            </select>
          </div>

          {/* Has Furniture */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Мебель
            </label>
            <select
              name="has_furniture"
              value={filters.has_furniture}
              onChange={handleChange}
              className="input-field"
            >
              <option value="">Не важно</option>
              <option value="true">С мебелью</option>
              <option value="false">Без мебели</option>
            </select>
          </div>

          {/* Floor From */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Этаж от
            </label>
            <input
              type="number"
              name="min_floor"
              value={filters.min_floor}
              onChange={handleChange}
              placeholder="1"
              min="1"
              className="input-field"
            />
          </div>

          {/* Floor To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Этаж до
            </label>
            <input
              type="number"
              name="max_floor"
              value={filters.max_floor}
              onChange={handleChange}
              placeholder="Не ограничено"
              min="1"
              className="input-field"
            />
          </div>

          {/* Year Built From */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Год постройки от
            </label>
            <input
              type="number"
              name="year_built_from"
              value={filters.year_built_from}
              onChange={handleChange}
              placeholder="1900"
              min="1900"
              max={new Date().getFullYear()}
              className="input-field"
            />
          </div>

          {/* Year Built To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Год постройки до
            </label>
            <input
              type="number"
              name="year_built_to"
              value={filters.year_built_to}
              onChange={handleChange}
              placeholder="Не ограничено"
              min="1900"
              max={new Date().getFullYear()}
              className="input-field"
            />
          </div>

          {/* Renovation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ремонт
            </label>
            <select
              name="renovation"
              value={filters.renovation}
              onChange={handleChange}
              className="input-field"
            >
              <option value="">Любой</option>
              <option value="cosmetic">Косметический</option>
              <option value="capital">Капитальный</option>
              <option value="designer">Дизайнерский</option>
              <option value="no_renovation">Без ремонта</option>
            </select>
          </div>

          {/* Entrance */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Подъезд
            </label>
            <input
              type="number"
              name="entrance"
              value={filters.entrance}
              onChange={handleChange}
              placeholder="Любой"
              min="1"
              className="input-field"
            />
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Сортировка
            </label>
            <select
              name="sort_by"
              value={filters.sort_by}
              onChange={handleChange}
              className="input-field"
            >
              <option value="created_at">По дате</option>
              <option value="price">По цене</option>
              <option value="area">По площади</option>
              <option value="rooms">По комнатам</option>
            </select>
          </div>

          {/* Sort Order */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Порядок
            </label>
            <select
              name="sort_order"
              value={filters.sort_order}
              onChange={handleChange}
              className="input-field"
            >
              <option value="desc">По убыванию</option>
              <option value="asc">По возрастанию</option>
            </select>
          </div>

          {/* Nearby Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Рядом с объектом
            </label>
            <input
              type="text"
              name="nearby_location"
              value={filters.nearby_location}
              onChange={handleChange}
              placeholder="Например: НГПИ, Центральный рынок"
              className="input-field"
            />
          </div>

          {/* Nearby Radius */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Радиус поиска (км)
            </label>
            <select
              name="nearby_radius"
              value={filters.nearby_radius}
              onChange={handleChange}
              className="input-field"
            >
              <option value="0.5">0.5 км</option>
              <option value="1">1 км</option>
              <option value="2">2 км</option>
              <option value="3">3 км</option>
              <option value="5">5 км</option>
            </select>
          </div>

          {/* Reset Button */}
          <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
            <button
              type="button"
              onClick={handleReset}
              className="btn-outline flex items-center gap-2"
            >
              <FiX />
              Сбросить фильтры
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyFilter;
