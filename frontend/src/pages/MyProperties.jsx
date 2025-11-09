import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { propertiesAPI } from '../services/api';
import Header from '../components/Header';
import PropertyCard from '../components/PropertyCard';
import { FiPlusCircle, FiFileText } from 'react-icons/fi';
import Skeleton from 'react-loading-skeleton';

const MyProperties = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyProperties();
  }, []);

  const fetchMyProperties = async () => {
    try {
      const response = await propertiesAPI.getMy();
      setProperties(response.data);
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id) => {
    setProperties(properties.filter((p) => p.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container-custom py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="section-title">Мои объявления</h1>
            <p className="section-subtitle">Управляйте своими объявлениями</p>
          </div>
          <Link to="/properties/create" className="btn-primary flex items-center space-x-2">
            <FiPlusCircle />
            <span className="hidden sm:inline">Добавить объявление</span>
            <span className="sm:hidden">Добавить</span>
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, index) => (
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
          <div className="text-center py-16">
            <FiFileText className="text-6xl mb-4 mx-auto text-gray-400" />
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">
              У вас пока нет объявлений
            </h3>
            <p className="text-gray-600 mb-6">
              Создайте первое объявление, чтобы начать продавать недвижимость
            </p>
            <Link to="/properties/create" className="btn-primary inline-flex items-center space-x-2">
              <FiPlusCircle />
              <span>Создать объявление</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                showActions
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default MyProperties;
