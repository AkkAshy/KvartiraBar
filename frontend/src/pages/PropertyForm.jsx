import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { propertiesAPI } from '../services/api';
import Header from '../components/Header';
import AddressMapPicker from '../components/AddressMapPicker';
import { toast } from 'react-toastify';
import { FiArrowLeft, FiUpload, FiX, FiImage } from 'react-icons/fi';

const PropertyForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',  // Основная цена (для продажи)
    // 🆕 ДОБАВЬ ЭТИ ПОЛЯ:
    price_per_day: '',
    price_per_month: '',
    min_rental_days: 1,
    address: '',
    area: '',
    rooms: '',
    type: 'rent',
    status: 'active',
    gender_preference: [],
    boiler_type: 'none',
    has_furniture: false,
    building_type: 'apartment',
    floor: '',
    total_floors: '',
    entrance: '',
    apartment_number: '',
    building_year: '',
    repair_type: 'no',
    has_parking: false,
    has_elevator: false,
    has_balcony: false,
    has_wifi: false,
    has_conditioner: false,
    has_washing_machine: false,
    has_fridge: false,
    pets_allowed: false,
  });
  const [images, setImages] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [previewImages, setPreviewImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEdit);

  useEffect(() => {
    if (isEdit) {
      fetchProperty();
    }
  }, [id]);

  const fetchProperty = async () => {
    try {
      const response = await propertiesAPI.getById(id);
      const property = response.data;
      setFormData({
        title: property.title,
        description: property.description,
        price: property.price,
        // 🆕 ДОБАВЬ:
        price_per_day: property.price_per_day || '',
        price_per_month: property.price_per_month || '',
        min_rental_days: property.min_rental_days || 1,
        address: property.address,
        area: property.area,
        rooms: property.rooms,
        type: property.type,
        status: property.status,
        gender_preference: property.gender_preference || [],
        boiler_type: property.boiler_type || 'none',
        has_furniture: property.has_furniture || false,
        building_type: property.building_type || 'apartment',
        floor: property.floor || '',
        total_floors: property.total_floors || '',
        entrance: property.entrance || '',
        apartment_number: property.apartment_number || '',
        building_year: property.building_year || '',
        repair_type: property.repair_type || 'no',
        has_parking: property.has_parking || false,
        has_elevator: property.has_elevator || false,
        has_balcony: property.has_balcony || false,
        has_wifi: property.has_wifi || false,
        has_conditioner: property.has_conditioner || false,
        has_washing_machine: property.has_washing_machine || false,
        has_fridge: property.has_fridge || false,
        pets_allowed: property.pets_allowed || false,
      });
      setExistingImages(property.images || []);
    } catch (error) {
      toast.error('Ошибка при загрузке объявления');
      navigate('/my-properties');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // ИСПРАВЛЕННЫЙ обработчик для адреса
  const handleAddressChange = (newAddress) => {
    console.log('🏠 AddressMapPicker изменил адрес:', newAddress);
    setFormData((prev) => ({
      ...prev,
      address: newAddress,
    }));
  };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    
    console.log('🖼️ Выбрано файлов:', files.length);
    
    if (files.length === 0) {
      return;
    }

    const currentTotal = images.length + existingImages.length;
    if (files.length + currentTotal > 10) {
      toast.error('Максимум 10 фотографий');
      return;
    }

    const validFiles = [];
    const newPreviews = [];

    files.forEach(file => {
      const isImage = file.type.startsWith('image/');
      const isValidSize = file.size <= 5 * 1024 * 1024;
      
      if (!isImage) {
        toast.error(`${file.name} не является изображением`);
        return;
      }
      if (!isValidSize) {
        toast.error(`${file.name} слишком большой (макс. 5MB)`);
        return;
      }
      
      validFiles.push(file);
      const url = URL.createObjectURL(file);
      newPreviews.push(url);
    });

    if (validFiles.length === 0) {
      return;
    }

    setImages(prevImages => [...prevImages, ...validFiles]);
    setPreviewImages(prevPreviews => [...prevPreviews, ...newPreviews]);
    toast.success(`Добавлено ${validFiles.length} фото`);
  };

  const removeNewImage = (index) => {
    setImages(prevImages => {
      const newImages = [...prevImages];
      newImages.splice(index, 1);
      return newImages;
    });
    
    setPreviewImages(prevPreviews => {
      const newPreviews = [...prevPreviews];
      URL.revokeObjectURL(newPreviews[index]);
      newPreviews.splice(index, 1);
      return newPreviews;
    });
    
    toast.info('Фото удалено');
  };

  const removeExistingImage = async (imageId) => {
    if (!window.confirm('Удалить это фото?')) {
      return;
    }

    try {
      await propertiesAPI.deleteImage(id, imageId);
      setExistingImages(existingImages.filter(img => img.id !== imageId));
      toast.success('Фото удалено');
    } catch (error) {
      console.error('Ошибка удаления:', error);
      toast.error('Ошибка при удалении фото');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // ✅ ПРОВЕРКА АДРЕСА ПЕРЕД ОТПРАВКОЙ
    if (!formData.address || !formData.address.trim()) {
      console.error('❌ Адрес пустой!');
      toast.error('Пожалуйста, укажите адрес');
      return;
    }
    
    setLoading(true);

    try {
      console.log('\n========== ОТПРАВКА ФОРМЫ ==========');
      console.log('📝 Режим:', isEdit ? 'Редактирование' : 'Создание');
      console.log('📊 Данные формы:', formData);
      console.log('📍 Адрес:', formData.address);
      console.log('📸 Количество новых изображений:', images.length);

      const submitData = new FormData();
      
      Object.keys(formData).forEach(key => {
        const value = formData[key];
        submitData.append(key, value);
      });

      if (images.length > 0) {
        console.log('\n📤 Добавление изображений в FormData:');
        images.forEach((imageFile, index) => {
          submitData.append('images[]', imageFile, imageFile.name);
          console.log(`  ✓ images[${index}]: ${imageFile.name}`);
        });
      }

      console.log('\n🚀 Отправка на сервер...');
      let response;
      if (isEdit) {
        response = await propertiesAPI.update(id, submitData);
      } else {
        response = await propertiesAPI.create(submitData);
      }
      
      console.log('✅ Успешный ответ:', response.data);
      toast.success(isEdit ? 'Объявление обновлено!' : 'Объявление создано!');
      navigate('/my-properties');
      
    } catch (error) {
      console.error('\n❌ ОШИБКА:');
      console.error('Объект ошибки:', error);
      console.error('Ответ сервера:', error.response?.data);
      console.error('Статус:', error.response?.status);
      
      // Обработка ошибки валидации адреса
      if (error.response?.data?.address) {
        toast.error('Ошибка адреса: ' + error.response.data.address[0]);
      } else {
        const errorMessage = error.response?.data?.detail 
          || error.response?.data?.message
          || error.message
          || 'Неизвестная ошибка';
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      previewImages.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container-custom py-8">
          <div className="animate-pulse max-w-3xl mx-auto">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
            <div className="bg-white rounded-xl p-6 space-y-4">
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container-custom py-8">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="btn-outline mb-6 flex items-center space-x-2"
          >
            <FiArrowLeft />
            <span>Назад</span>
          </button>

          <div className="card p-6 md:p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">
              {isEdit ? 'Редактировать объявление' : 'Новое объявление'}
            </h1>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Фотографии */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Фотографии (до 10 штук)
                </label>
                
                {existingImages.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    {existingImages.map((img) => (
                      <div key={img.id} className="relative group">
                        <img
                          src={img.image}
                          alt="Property"
                          className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => removeExistingImage(img.id)}
                          className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        >
                          <FiX className="text-sm" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {previewImages.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    {previewImages.map((preview, index) => (
                      <div key={`preview-${index}`} className="relative group">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border-2 border-green-400"
                        />
                        <button
                          type="button"
                          onClick={() => removeNewImage(index)}
                          className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        >
                          <FiX className="text-sm" />
                        </button>
                        <div className="absolute bottom-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded font-semibold">
                          Новое #{index + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {(images.length + existingImages.length < 10) && (
                  <div className="space-y-3">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary-500 hover:bg-gray-50 transition-all">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <FiUpload className="text-3xl text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">
                          <span className="font-semibold text-primary-600">Нажмите для загрузки</span> или перетащите
                        </p>
                        <p className="text-xs text-gray-500 mt-1">PNG, JPG до 5MB</p>
                      </div>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    Загружено: <span className="font-semibold text-primary-600">{images.length + existingImages.length}</span> из 10
                  </p>
                  {images.length > 0 && (
                    <p className="text-sm text-green-600 font-medium">
                      ✓ {images.length} новых фото
                    </p>
                  )}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Название *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  className="input-field"
                  placeholder="3-комнатная квартира в центре"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Описание *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  rows={6}
                  className="input-field resize-none"
                  placeholder="Опишите вашу недвижимость..."
                />
              </div>

              {/* Address с картой */}
              <AddressMapPicker
                value={formData.address}
                onChange={handleAddressChange}
                required={true}
              />

              {/* 🆕 УМНЫЕ ПОЛЯ ЦЕН В ЗАВИСИМОСТИ ОТ ТИПА */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Тип сделки */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Тип сделки *
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="input-field"
                  >
                    <option value="sale">Продажа</option>
                    <option value="rent">Долгосрочная аренда</option>
                    <option value="daily_rent">Посуточная аренда</option>  {/* 🆕 */}
                  </select>
                </div>

                {/* ПРОДАЖА - основная цена */}
                {formData.type === 'sale' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Цена (сум) *
                    </label>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleChange}
                      required
                      min="0"
                      className="input-field"
                      placeholder="35000000"
                    />
                  </div>
                )}

                {/* ДОЛГОСРОЧНАЯ АРЕНДА - цена за месяц */}
                {formData.type === 'rent' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Цена за месяц (сум) *
                      </label>
                      <input
                        type="number"
                        name="price_per_month"
                        value={formData.price_per_month}
                        onChange={handleChange}
                        required
                        min="0"
                        className="input-field"
                        placeholder="2500000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Минимальный срок (месяцев)
                      </label>
                      <input
                        type="number"
                        name="min_rental_days"
                        value={formData.min_rental_days}
                        onChange={handleChange}
                        min="1"
                        className="input-field"
                        placeholder="1"
                      />
                    </div>
                  </>
                )}

                {/* ПОСУТОЧНАЯ АРЕНДА - цена за сутки */}
                {formData.type === 'daily_rent' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Цена за сутки (сум) *
                      </label>
                      <input
                        type="number"
                        name="price_per_day"
                        value={formData.price_per_day}
                        onChange={handleChange}
                        required
                        min="0"
                        className="input-field"
                        placeholder="150000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Минимальный срок (суток)
                      </label>
                      <input
                        type="number"
                        name="min_rental_days"
                        value={formData.min_rental_days}
                        onChange={handleChange}
                        min="1"
                        className="input-field"
                        placeholder="1"
                      />
                    </div>
                  </>
                )}

                {/* Остальные поля (площадь, комнаты и т.д.) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Площадь (м²) *
                  </label>
                  <input
                    type="number"
                    name="area"
                    value={formData.area}
                    onChange={handleChange}
                    required
                    min="0"
                    step="0.1"
                    className="input-field"
                    placeholder="85.5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Количество комнат *
                  </label>
                  <input
                    type="number"
                    name="rooms"
                    value={formData.rooms}
                    onChange={handleChange}
                    required
                    min="1"
                    className="input-field"
                    placeholder="3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Тип здания
                  </label>
                  <select
                    name="building_type"
                    value={formData.building_type}
                    onChange={handleChange}
                    className="input-field"
                  >
                    <option value="apartment">Многоквартирный дом</option>
                    <option value="private">Частный дом</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Этаж
                  </label>
                  <input
                    type="number"
                    name="floor"
                    value={formData.floor}
                    onChange={handleChange}
                    min="1"
                    className="input-field"
                    placeholder="5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Всего этажей
                  </label>
                  <input
                    type="number"
                    name="total_floors"
                    value={formData.total_floors}
                    onChange={handleChange}
                    min="1"
                    className="input-field"
                    placeholder="9"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Подъезд
                  </label>
                  <input
                    type="number"
                    name="entrance"
                    value={formData.entrance}
                    onChange={handleChange}
                    min="1"
                    className="input-field"
                    placeholder="2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Номер квартиры
                  </label>
                  <input
                    type="text"
                    name="apartment_number"
                    value={formData.apartment_number}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="15"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Год постройки
                  </label>
                  <input
                    type="number"
                    name="building_year"
                    value={formData.building_year}
                    onChange={handleChange}
                    min="1900"
                    max={new Date().getFullYear()}
                    className="input-field"
                    placeholder="2020"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ремонт
                  </label>
                  <select
                    name="repair_type"
                    value={formData.repair_type}
                    onChange={handleChange}
                    className="input-field"
                  >
                    <option value="no">Без ремонта</option>
                    <option value="cosmetic">Косметический</option>
                    <option value="euro">Евроремонт</option>
                    <option value="designer">Дизайнерский</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Сдается (можно выбрать несколько)
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: 'any', label: 'Всем' },
                      { value: 'male', label: 'Парням' },
                      { value: 'female', label: 'Девушкам' },
                      { value: 'family', label: 'Семейным' },
                      { value: 'military', label: 'Военным' },
                    ].map((option) => (
                      <div key={option.value} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`gender_${option.value}`}
                          checked={formData.gender_preference.includes(option.value)}
                          onChange={(e) => {
                            const value = option.value;
                            setFormData(prev => ({
                              ...prev,
                              gender_preference: e.target.checked
                                ? [...prev.gender_preference, value]
                                : prev.gender_preference.filter(item => item !== value)
                            }));
                          }}
                          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <label htmlFor={`gender_${option.value}`} className="ml-2 text-sm font-medium text-gray-700">
                          {option.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Тип котла
                  </label>
                  <select
                    name="boiler_type"
                    value={formData.boiler_type}
                    onChange={handleChange}
                    className="input-field"
                  >
                    <option value="none">Нет</option>
                    <option value="factory">Заводской</option>
                    <option value="custom">Самодельный</option>
                  </select>
                </div>
              </div>

              {/* Удобства */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Удобства</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="has_furniture"
                      name="has_furniture"
                      checked={formData.has_furniture}
                      onChange={handleChange}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <label htmlFor="has_furniture" className="ml-2 text-sm font-medium text-gray-700">
                      С мебелью
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="has_parking"
                      name="has_parking"
                      checked={formData.has_parking}
                      onChange={handleChange}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <label htmlFor="has_parking" className="ml-2 text-sm font-medium text-gray-700">
                      Парковка
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="has_elevator"
                      name="has_elevator"
                      checked={formData.has_elevator}
                      onChange={handleChange}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <label htmlFor="has_elevator" className="ml-2 text-sm font-medium text-gray-700">
                      Лифт
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="has_balcony"
                      name="has_balcony"
                      checked={formData.has_balcony}
                      onChange={handleChange}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <label htmlFor="has_balcony" className="ml-2 text-sm font-medium text-gray-700">
                      Балкон
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="has_wifi"
                      name="has_wifi"
                      checked={formData.has_wifi}
                      onChange={handleChange}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <label htmlFor="has_wifi" className="ml-2 text-sm font-medium text-gray-700">
                      WiFi
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="has_conditioner"
                      name="has_conditioner"
                      checked={formData.has_conditioner}
                      onChange={handleChange}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <label htmlFor="has_conditioner" className="ml-2 text-sm font-medium text-gray-700">
                      Кондиционер
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="has_washing_machine"
                      name="has_washing_machine"
                      checked={formData.has_washing_machine}
                      onChange={handleChange}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <label htmlFor="has_washing_machine" className="ml-2 text-sm font-medium text-gray-700">
                      Стиральная машина
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="has_fridge"
                      name="has_fridge"
                      checked={formData.has_fridge}
                      onChange={handleChange}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <label htmlFor="has_fridge" className="ml-2 text-sm font-medium text-gray-700">
                      Холодильник
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="pets_allowed"
                      name="pets_allowed"
                      checked={formData.pets_allowed}
                      onChange={handleChange}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <label htmlFor="pets_allowed" className="ml-2 text-sm font-medium text-gray-700">
                      Можно с животными
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Статус
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="input-field"
                >
                  <option value="active">Активно</option>
                  <option value="archived">В архиве</option>
                </select>
              </div>

              {/* Кнопки */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Сохранение...
                    </span>
                  ) : (
                    isEdit ? 'Сохранить изменения' : 'Создать объявление'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="btn-outline"
                  disabled={loading}
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PropertyForm;