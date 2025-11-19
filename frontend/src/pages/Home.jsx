import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { propertiesAPI } from '../services/api';
import PropertyCard from '../components/PropertyCard';
import PropertyFilter from '../components/PropertyFilter';
import Header from '../components/Header';
import { FiAlertCircle, FiMap, FiSearch, FiHome, FiZap } from 'react-icons/fi';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const Home = () => {
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    type: '',  // 🆕 По умолчанию пусто (был 'rent')
    rooms: '',
    gender_preference: '', // ✅ Новый фильтр
    boiler_type: '', // ✅ Новый фильтр
    min_price: '',
    max_price: '',
  });
  const [query, setQuery] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    setLoading(true);
    setError(null);
    try {
      // 🆕 Убираем фильтр по умолчанию, показываем все типы
      const response = await propertiesAPI.getAll({ status: 'active' });
      setProperties(response.data.results || response.data);
    } catch (err) {
      if (err.response?.status === 401) {
        console.log('Неавторизованный пользователь - показываем публичные данные');
      } else {
        setError('Ошибка при загрузке объявлений');
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSearch = async (searchFilters) => {
    setLoading(true);
    try {
      console.log('🔍 Получены фильтры от PropertyFilter:', searchFilters);

      // ✅ ЕСЛИ AI-ПОИСК ВЕРНУЛ РЕЗУЛЬТАТЫ НАПРЯМУЮ
      if (searchFilters.results) {
        console.log('🎯 AI вернул результаты напрямую:', searchFilters.results.length);
        setProperties(searchFilters.results);
        setLoading(false);
        return;
      }

      // ✅ ПЕРЕДАЕМ ВСЕ ФИЛЬТРЫ на бэкенд
      const params = {
        status: 'active',
        ...searchFilters,
      };

      // Удаляем пустые значения
      Object.keys(params).forEach(key => {
        if (!params[key] || params[key] === '') {
          delete params[key];
        }
      });

      console.log('🔍 Отправляем фильтры на бэкенд:', params);

      let results = [];

      // Если есть результаты геопоиска, используем их
      if (params.nearby_properties) {
        results = params.nearby_properties;
        delete params.nearby_properties;
      } else {
        const response = await propertiesAPI.getAll(params);
        results = response.data.results || response.data;
      }

      console.log(`📊 Получено квартир: ${results.length}`);
      setProperties(results);
    } catch (err) {
      setError('Ошибка при поиске');
      console.error('Ошибка поиска:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAISearch = async () => {
    if (!query.trim()) return;
    setAiLoading(true);
    setError(null);

    try {
      const response = await propertiesAPI.aiSearch(query);
      setProperties(response.data.results || response.data);
    } catch (err) {
      console.error('Ошибка AI-поиска:', err);
      setError('Не удалось выполнить ИИ-поиск.');
    } finally {
      setAiLoading(false);
    }
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      type: 'rent',
      rooms: '',
      gender_preference: '',
      boiler_type: '',
      min_price: '',
      max_price: '',
    });
    fetchProperties();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* 🧠 AI Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-700 via-primary-800 to-gray-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c')] bg-cover bg-center opacity-20" />

        <div className="relative z-10 container-custom py-12 md:py-20 lg:py-24 text-center px-4">
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold mb-4 md:mb-6 animate-fade-in">
            Найди жильё <span className="text-yellow-400">по-человечески</span>
          </h1>
          <p className="text-base md:text-xl text-gray-200 mb-6 md:mb-10 px-4">
            Просто опиши, что тебе нужно — наш <span className="text-yellow-300 font-semibold">ИИ</span> подберёт подходящие квартиры.
          </p>

          <div className="relative max-w-3xl mx-auto px-4">
            <input
              type="text"
              placeholder="Например: квартира с вай-фаем и стиралкой рядом с НГПИ"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAISearch()}
              className="w-full p-4 md:p-5 pr-12 md:pr-32 rounded-2xl text-gray-900 text-base md:text-lg shadow-lg focus:ring-4 focus:ring-yellow-400 outline-none"
            />
            <button
              onClick={handleAISearch}
              className="absolute right-6 md:right-8 top-1/2 transform -translate-y-1/2 bg-yellow-400 hover:bg-yellow-500 text-black px-4 md:px-6 py-2 md:py-3 rounded-xl font-semibold flex items-center gap-2 transition text-sm md:text-base"
            >
              <FiSearch className="text-lg" />
              <span className="hidden md:inline">Найти</span>
            </button>
          </div>

          <p className="text-xs md:text-sm text-gray-300 mt-3 md:mt-4 italic px-4">
            Попробуй: <span className="text-yellow-300">"комната для девушки с кондиционером"</span>
          </p>

          <div className="mt-6 md:mt-8 flex justify-center items-center gap-2 text-yellow-300">
            <FiZap className="text-base md:text-lg animate-pulse" />
            <span className="text-sm md:text-base">ИИ-поиск активирован</span>
          </div>
        </div>
      </section>

      {/* Форма поиска */}
      <div className="container-custom -mt-12 relative z-10">
        <PropertyFilter onFilter={handleSearch} />
      </div>

      {/* Кнопки действий */}
      <div className="container-custom py-6">
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate('/map')}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-colors flex items-center justify-center gap-2 max-w-md mx-auto"
          >
            <FiMap />
            ПОСМОТРЕТЬ НА КАРТЕ
          </button>
        </div>
      </div>

      <main className="container-custom py-12">
        {/* Быстрые фильтры */}
        <div className="mb-8">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">Популярные запросы</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
            <button
              onClick={() => {
                handleFilterChange('search', 'НГПИ');
                setTimeout(handleSearch, 100);
              }}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0"
            >
              Рядом с НГПИ
            </button>
            <button
              onClick={() => {
                handleFilterChange('search', 'центр');
                setTimeout(handleSearch, 100);
              }}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0"
            >
              Центр города
            </button>
            <button
              onClick={() => {
                handleFilterChange('gender_preference', 'female');
                setTimeout(handleSearch, 100);
              }}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0"
            >
              Для девушек
            </button>
            <button
              onClick={() => {
                handleFilterChange('boiler_type', 'factory');
                setTimeout(handleSearch, 100);
              }}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0"
            >
              С заводским котлом
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center space-x-3 text-red-800">
            <FiAlertCircle className="text-xl flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Properties Grid */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              Актуальные объявления
            </h2>
            {!loading && (
              <span className="text-gray-600">
                Найдено: <span className="font-semibold">{properties.length}</span>
              </span>
            )}
          </div>

          {aiLoading ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center gap-3 text-primary-600">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                <span className="text-lg font-medium">ИИ анализирует ваш запрос...</span>
              </div>
            </div>
          ) : loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, index) => (
                <div key={index} className="card">
                  <Skeleton height={224} />
                  <div className="p-5">
                    <Skeleton height={30} width="60%" className="mb-3" />
                    <Skeleton height={20} count={2} className="mb-3" />
                    <Skeleton height={40} />
                  </div>
                </div>
              ))}
            </div>
          ) : properties.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl">
              <FiHome className="text-6xl mb-4 mx-auto text-gray-400" />
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                Объявления не найдены
              </h3>
              <p className="text-gray-600 mb-6">
                Попробуйте изменить параметры поиска
              </p>
              <button
                onClick={resetFilters}
                className="btn-primary"
              >
                Сбросить фильтры
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {properties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Home;