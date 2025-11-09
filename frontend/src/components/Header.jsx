import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import logo from '../logo.png';
import {
  FiHome,
  FiHeart,
  FiUser,
  FiLogOut,
  FiMenu,
  FiX,
  FiPlusCircle,
  FiList,
  FiMessageSquare,
} from 'react-icons/fi';

const Header = () => {
  const { user, logout, isSeller, isBuyer, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="container-custom">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <img src={logo} alt="Logo" className="w-10 h-10 rounded-lg" />
            <span className="text-xl md:text-2xl font-bold text-gray-900">
              Kvartira<span className="text-primary-600">Bar</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link
              to="/"
              className="text-gray-700 hover:text-primary-600 font-medium transition-colors"
            >
              Главная
            </Link>

            {isAuthenticated && (
              <>
                {isSeller() && (
                  <>
                    <Link
                      to="/my-properties"
                      className="text-gray-700 hover:text-primary-600 font-medium transition-colors"
                    >
                      Мои объявления
                    </Link>
                    <Link
                      to="/contact-requests"
                      className="text-gray-700 hover:text-primary-600 font-medium transition-colors"
                    >
                      Запросы
                    </Link>
                  </>
                )}

                {isBuyer() && (
                  <Link
                    to="/favorites"
                    className="text-gray-700 hover:text-primary-600 font-medium transition-colors flex items-center space-x-1"
                  >
                    <FiHeart className="text-lg" />
                    <span>Избранное</span>
                  </Link>
                )}
              </>
            )}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                {isSeller() && (
                  <Link
                    to="/properties/create"
                    className="btn-primary flex items-center space-x-2"
                  >
                    <FiPlusCircle />
                    <span>Добавить объявление</span>
                  </Link>
                )}

                <div className="relative group">
                  <button className="flex items-center space-x-2 text-gray-700 hover:text-primary-600 transition-colors">
                    <FiUser className="text-xl" />
                    <span className="font-medium">{user?.full_name || user?.username}</span>
                  </button>

                  {/* Dropdown */}
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200">
                    <Link
                      to="/profile"
                      className="block px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Профиль
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Выйти
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-outline">
                  Войти
                </Link>
                <Link to="/register" className="btn-primary">
                  Регистрация
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMobileMenu}
            className="md:hidden text-gray-700 hover:text-primary-600 transition-colors"
          >
            {mobileMenuOpen ? <FiX className="text-2xl" /> : <FiMenu className="text-2xl" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t animate-fade-in">
            <nav className="flex flex-col space-y-3">
              <Link
                to="/"
                onClick={toggleMobileMenu}
                className="flex items-center space-x-2 text-gray-700 hover:text-primary-600 font-medium transition-colors py-2"
              >
                <img src={logo} alt="Logo" className="w-5 h-5 rounded" />
                <span>Главная</span>
              </Link>

              {isAuthenticated ? (
                <>
                  {isSeller() && (
                    <>
                      <Link
                        to="/my-properties"
                        onClick={toggleMobileMenu}
                        className="flex items-center space-x-2 text-gray-700 hover:text-primary-600 font-medium transition-colors py-2"
                      >
                        <FiList />
                        <span>Мои объявления</span>
                      </Link>
                      <Link
                        to="/contact-requests"
                        onClick={toggleMobileMenu}
                        className="flex items-center space-x-2 text-gray-700 hover:text-primary-600 font-medium transition-colors py-2"
                      >
                        <FiMessageSquare />
                        <span>Запросы</span>
                      </Link>
                      <Link
                        to="/properties/create"
                        onClick={toggleMobileMenu}
                        className="flex items-center space-x-2 text-primary-600 font-medium py-2"
                      >
                        <FiPlusCircle />
                        <span>Добавить объявление</span>
                      </Link>
                    </>
                  )}

                  {isBuyer() && (
                    <Link
                      to="/favorites"
                      onClick={toggleMobileMenu}
                      className="flex items-center space-x-2 text-gray-700 hover:text-primary-600 font-medium transition-colors py-2"
                    >
                      <FiHeart />
                      <span>Избранное</span>
                    </Link>
                  )}

                  <Link
                    to="/profile"
                    onClick={toggleMobileMenu}
                    className="flex items-center space-x-2 text-gray-700 hover:text-primary-600 font-medium transition-colors py-2"
                  >
                    <FiUser />
                    <span>Профиль</span>
                  </Link>

                  <button
                    onClick={() => {
                      handleLogout();
                      toggleMobileMenu();
                    }}
                    className="flex items-center space-x-2 text-red-600 font-medium py-2"
                  >
                    <FiLogOut />
                    <span>Выйти</span>
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={toggleMobileMenu}
                    className="flex items-center space-x-2 text-gray-700 hover:text-primary-600 font-medium transition-colors py-2"
                  >
                    <FiUser />
                    <span>Войти</span>
                  </Link>
                  <Link
                    to="/register"
                    onClick={toggleMobileMenu}
                    className="flex items-center space-x-2 text-primary-600 font-medium py-2"
                  >
                    <FiPlusCircle />
                    <span>Регистрация</span>
                  </Link>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
