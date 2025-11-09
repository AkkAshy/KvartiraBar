import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import { FiUser, FiMail, FiPhone, FiBriefcase } from 'react-icons/fi';

const Profile = () => {
  const { user } = useAuth();

  const getRoleLabel = (role) => {
    return role === 'seller' ? 'Продавец' : 'Покупатель';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container-custom py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="section-title mb-8">Мой профиль</h1>

          <div className="card p-8">
            <div className="flex items-center space-x-4 mb-8">
              <div className="w-20 h-20 bg-primary-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                {user?.full_name?.charAt(0) || user?.username?.charAt(0)}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {user?.full_name || user?.username}
                </h2>
                <p className="text-gray-600">@{user?.username}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                <FiMail className="text-gray-400 text-xl" />
                <div>
                  <div className="text-sm text-gray-500">Email</div>
                  <div className="font-medium text-gray-900">{user?.email}</div>
                </div>
              </div>

              {user?.phone && (
                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                  <FiPhone className="text-gray-400 text-xl" />
                  <div>
                    <div className="text-sm text-gray-500">Телефон</div>
                    <div className="font-medium text-gray-900">{user?.phone}</div>
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                <FiBriefcase className="text-gray-400 text-xl" />
                <div>
                  <div className="text-sm text-gray-500">Роль</div>
                  <div className="font-medium text-gray-900">
                    {getRoleLabel(user?.role)}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                <FiUser className="text-gray-400 text-xl" />
                <div>
                  <div className="text-sm text-gray-500">Дата регистрации</div>
                  <div className="font-medium text-gray-900">
                    {new Date(user?.date_joined).toLocaleDateString('ru-RU', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;
