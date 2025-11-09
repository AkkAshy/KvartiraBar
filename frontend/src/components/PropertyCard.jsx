import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { propertiesAPI } from '../services/api';
import { toast } from 'react-toastify';
import {
  FiMapPin,
  FiHome,
  FiMaximize,
  FiHeart,
  FiEdit,
  FiTrash2,
  FiPhone,
  FiUser,
  FiUsers,
  FiAward,
  FiZap,
  FiZapOff,
  FiCheckCircle,
} from 'react-icons/fi';

const PropertyCard = ({ property, onDelete, showActions = false }) => {
  const { isBuyer } = useAuth();
  const navigate = useNavigate();
  const [isFavorite, setIsFavorite] = useState(property.is_favorited || false);
  const [loading, setLoading] = useState(false);

  const formatPrice = (property) => {
    // 🆕 Используем price_display из API
    if (property.price_display) {
      return property.price_display.formatted;
    }
    
    // Fallback на старый формат
    return new Intl.NumberFormat('ru-RU').format(property.price) + ' сум';
  };

  const handleFavoriteToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isBuyer()) return;

    setLoading(true);
    try {
      if (isFavorite) {
        await propertiesAPI.removeFromFavorites(property.id);
        toast.success('Удалено из избранного');
      } else {
        await propertiesAPI.addToFavorites(property.id);
        toast.success('Добавлено в избранное');
      }
      setIsFavorite(!isFavorite);
    } catch (error) {
      toast.error('Ошибка при изменении избранного');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (window.confirm('Вы уверены, что хотите удалить это объявление?')) {
      try {
        await propertiesAPI.delete(property.id);
        toast.success('Объявление удалено');
        if (onDelete) onDelete(property.id);
      } catch (error) {
        toast.error('Ошибка при удалении');
      }
    }
  };

  const handleContact = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/properties/${property.id}`);
  };

  return (
    <Link
      to={`/properties/${property.id}`}
      className="card group cursor-pointer animate-fade-in"
    >
      {/* Image */}
      <div className="relative h-48 md:h-56 overflow-hidden bg-gray-200">
        {property.images && property.images.length > 0 ? (
          <img
            src={property.images[0].image}
            alt={property.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <FiHome className="text-6xl" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          <span
            className={`badge ${
              property.type === 'sale'
                ? 'badge-success'
                : property.type === 'daily_rent'
                  ? 'badge-warning'  // 🆕
                  : 'badge-info'
            }`}
          >
            {property.type === 'sale' && '🏠 Продажа'}
            {property.type === 'rent' && '📅 Аренда'}
            {property.type === 'daily_rent' && '⏰ Посуточно'}  {/* 🆕 */}
          </span>
          <span className="badge badge-warning">{property.status === 'active' ? 'Активно' : 'Неактивно'}</span>
        </div>

        {/* Favorite Button */}
        {isBuyer() && !showActions && (
          <button
            onClick={handleFavoriteToggle}
            disabled={loading}
            className={`absolute top-3 right-3 p-2 rounded-full transition-all duration-200 ${
              isFavorite
                ? 'bg-red-500 text-white'
                : 'bg-white text-gray-400 hover:text-red-500'
            }`}
          >
            <FiHeart className={isFavorite ? 'fill-current' : ''} />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-4 md:p-5">
        {/* Price */}
        <div className="mb-3">
          <span className="text-2xl md:text-3xl font-bold text-primary-600">
            {formatPrice(property)}
          </span>
          {/* 🆕 Минимальный срок для посуточной */}
          {property.price_display?.min_rental_days && property.type === 'daily_rent' && (
            <div className="text-xs text-gray-500 mt-1">
              Минимум {property.price_display.min_rental_days}
              {property.price_display.min_rental_days === 1 ? ' сутки' : ' суток'}
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">
          {property.title}
        </h3>

        {/* Location */}
        <div className="flex items-center text-gray-600 mb-3">
          <FiMapPin className="mr-2 flex-shrink-0" />
          <span className="text-sm line-clamp-1">{property.address}</span>
        </div>

        {/* Details */}
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mb-4">
          <div className="flex items-center">
            <FiHome className="mr-1" />
            <span>{property.rooms} комн.</span>
          </div>
          <div className="flex items-center">
            <FiMaximize className="mr-1" />
            <span>{property.area} м²</span>
          </div>
          {property.distance && (
            <div className="text-primary-600 font-medium">
              {property.distance} км
            </div>
          )}
          
          {/* Новые badges */}
          {property.gender_preference && property.gender_preference !== 'any' && (
            <span className="badge badge-info">
              {property.gender_preference === 'male' && <><FiUser className="mr-1" />Парням</>}
              {property.gender_preference === 'female' && <><FiUser className="mr-1" />Девушкам</>}
              {property.gender_preference === 'family' && <><FiUsers className="mr-1" />Семейным</>}
              {property.gender_preference === 'military' && <><FiAward className="mr-1" />Военным</>}
            </span>
          )}
          {property.boiler_type && property.boiler_type !== 'none' && (
            <span className="badge badge-success">
              {property.boiler_type === 'factory' ? <><FiZap className="mr-1" />Завод. котел</> : <><FiZapOff className="mr-1" />Котел</>}
            </span>
          )}
          {property.has_furniture && (
            <span className="badge badge-warning">
              <FiCheckCircle className="mr-1" />С мебелью
            </span>
          )}
        </div>

        {/* Actions */}
        {showActions ? (
          <div className="flex gap-2 pt-3 border-t">
            <Link
              to={`/properties/edit/${property.id}`}
              className="flex-1 btn-outline flex items-center justify-center space-x-1 py-2"
              onClick={(e) => e.stopPropagation()}
            >
              <FiEdit />
              <span>Редактировать</span>
            </Link>
            <button
              onClick={handleDelete}
              className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
            >
              <FiTrash2 />
            </button>
          </div>
        ) : isBuyer() ? (
          <button
            onClick={handleContact}
            className="w-full btn-primary flex items-center justify-center space-x-2"
          >
            <FiPhone />
            <span>Связаться</span>
          </button>
        ) : null}
      </div>
    </Link>
  );
};

export default PropertyCard;
