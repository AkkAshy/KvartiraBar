import React, { useState, useEffect } from 'react';
import { propertiesAPI } from '../services/api';
import Header from '../components/Header';
import { toast } from 'react-toastify';
import { FiUser, FiMail, FiPhone, FiMessageSquare, FiInbox } from 'react-icons/fi';

const ContactRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await propertiesAPI.getContactRequests();
      setRequests(response.data);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      await propertiesAPI.updateContactStatus(id, status);
      setRequests(
        requests.map((req) => (req.id === id ? { ...req, status } : req))
      );
      toast.success('Статус обновлен');
    } catch (error) {
      toast.error('Ошибка при обновлении статуса');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'badge-warning',
      contacted: 'badge-info',
      completed: 'badge-success',
      cancelled: 'badge-danger',
    };
    const labels = {
      pending: 'Ожидает',
      contacted: 'Связались',
      completed: 'Завершено',
      cancelled: 'Отменено',
    };
    return (
      <span className={`badge ${badges[status]}`}>{labels[status]}</span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container-custom py-8">
        <div className="mb-8">
          <h1 className="section-title">Запросы на контакт</h1>
          <p className="section-subtitle">
            Покупатели, заинтересованные в вашей недвижимости
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4 text-blue-500"><FiInbox /></div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">
              Пока нет запросов
            </h3>
            <p className="text-gray-600">
              Когда покупатели заинтересуются вашими объявлениями, вы увидите их здесь
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div key={request.id} className="card p-6 animate-fade-in">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {request.property_title}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {new Date(request.created_at).toLocaleDateString('ru-RU', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      {getStatusBadge(request.status)}
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-gray-700">
                        <FiUser className="mr-2 text-gray-400" />
                        <span className="font-medium">{request.buyer_name}</span>
                      </div>
                      <div className="flex items-center text-gray-700">
                        <FiMail className="mr-2 text-gray-400" />
                        <a
                          href={`mailto:${request.owner_contacts.email}`}
                          className="text-primary-600 hover:underline"
                        >
                          {request.owner_contacts.email}
                        </a>
                      </div>
                      <div className="flex items-center text-gray-700">
                        <FiPhone className="mr-2 text-gray-400" />
                        <a
                          href={`tel:${request.owner_contacts.phone}`}
                          className="text-primary-600 hover:underline"
                        >
                          {request.owner_contacts.phone}
                        </a>
                      </div>
                    </div>

                    {request.message && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-start">
                          <FiMessageSquare className="mr-2 text-gray-400 mt-0.5 flex-shrink-0" />
                          <p className="text-gray-700 text-sm">{request.message}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex md:flex-col gap-2">
                    <button
                      onClick={() => handleStatusUpdate(request.id, 'contacted')}
                      disabled={request.status === 'contacted'}
                      className="btn-outline text-sm py-2"
                    >
                      Связались
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(request.id, 'completed')}
                      disabled={request.status === 'completed'}
                      className="btn-primary text-sm py-2"
                    >
                      Завершить
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ContactRequests;
