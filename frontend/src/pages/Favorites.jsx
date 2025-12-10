import React, { useState, useEffect } from 'react';
import { propertiesAPI } from '../services/api';
import Header from '../components/Header';
import PropertyCard from '../components/PropertyCard';
import Skeleton from 'react-loading-skeleton';
import { FiHeart } from 'react-icons/fi';

const Favorites = () => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      const response = await propertiesAPI.getFavorites();
      // Backend возвращает { count, results }, берём results
      setFavorites(response.data.results || response.data || []);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container-custom py-8">
        <div className="mb-8">
          <h1 className="section-title">Избранное</h1>
          <p className="section-subtitle">Ваши сохраненные объявления</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="card">
                <Skeleton height={224} />
                <div className="p-5">
                  <Skeleton height={30} width="60%" className="mb-3" />
                  <Skeleton height={20} count={2} />
                </div>
              </div>
            ))}
          </div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4 text-red-500"><FiHeart /></div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">
              У вас пока нет избранных
            </h3>
            <p className="text-gray-600">
              Добавляйте объявления в избранное, чтобы не потерять их
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((fav) => (
              <PropertyCard key={fav.id} property={fav.property_details} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Favorites;
