import React, { useState, useEffect } from 'react';
import axios from '../../../axios';

const RegisterBusinessForm = ({
  categories = [],
  onSubmit,
  initialData = null,
  loading = false,
  userId = null, // Add userId prop for linking business to user
}) => {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    subCategory: '',
    description: '',
    street: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    email: '',
    facebook: '',
    instagram: '',
    status: 'inactive', // Add status field with default value
    approvalStatus: 'pending', // Add approvalStatus field
  });

  const [subcategories, setSubcategories] = useState([]);
  const [responseMsg, setResponseMsg] = useState('');
  const [image, setImage] = useState(null);

  // Image compression function
  const compressImage = (file, maxWidth = 800, quality = 0.8) => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  // Convert image file to Base64 with compression
  const convertFileToBase64 = async (file) => {
    try {
      // Check file size (limit to 2MB for better server compatibility)
      const maxSize = 2 * 1024 * 1024; // 2MB
      if (file.size > maxSize) {
        setResponseMsg('❌ File size too large. Please select an image smaller than 2MB.');
        throw new Error('File size too large');
      }

      // First try to compress the image
      const compressedDataUrl = await compressImage(file, 800, 0.7);
      
      // Check if compressed size is still too large (1MB limit for base64)
      if (compressedDataUrl.length > 1000000) {
        // Try with more aggressive compression
        const moreCompressed = await compressImage(file, 600, 0.5);
        if (moreCompressed.length > 1000000) {
          throw new Error('Image too large even after compression. Please use URL input instead.');
        }
        return moreCompressed;
      }
      
      return compressedDataUrl;
    } catch (error) {
      console.error('Image compression error:', error);
      throw error;
    }
  };

  // Fetch subcategories when category changes
  useEffect(() => {
    if (formData.category) {
      fetchSubcategories(formData.category);
    } else {
      setSubcategories([]);
    }
  }, [formData.category]);

  // Fetch subcategories when initialData changes (for edit mode)
  useEffect(() => {
    if (initialData && initialData.category) {
      const categoryId = typeof initialData.category === 'object' && initialData.category !== null 
        ? initialData.category._id 
        : initialData.category;
      if (categoryId) {
        fetchSubcategories(categoryId);
      }
    }
  }, [initialData]);

  // Fetch subcategories from API
  const fetchSubcategories = async (categoryId) => {
    try {
      const response = await axios.get(`/subcategory/getSubCategoryByParent/${categoryId}`);
      if (response.data?.result) {
        setSubcategories(response.data.result || []);
      }
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      setSubcategories([]);
    }
  };

  useEffect(() => {
    if (initialData) {
      // Handle category - it might be an object with _id or just a string
      const categoryId = typeof initialData.category === 'object' && initialData.category !== null 
        ? initialData.category._id 
        : initialData.category || '';
      
      // Handle subcategory - it might be an object with _id or just a string
      const subCategoryId = typeof initialData.subCategory === 'object' && initialData.subCategory !== null
        ? initialData.subCategory._id
        : initialData.subCategory || initialData.subcategory || '';
      
      setFormData({
        name: initialData.name || '',
        category: categoryId,
        subCategory: subCategoryId,
        description: initialData.description || '',
        street: initialData.address?.street || '',
        city: initialData.address?.city || '',
        state: initialData.address?.state || '',
        pincode: initialData.address?.pincode || '',
        phone: initialData.contact?.phone || '',
        email: initialData.contact?.email || '',
        facebook: initialData.socialLinks?.facebook || '',
        instagram: initialData.socialLinks?.instagram || '',
        status: initialData.status || 'inactive', // Add status field
        approvalStatus: initialData.approvalStatus || 'pending', // Add approvalStatus field
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Reset subCategory when category changes
    if (name === 'category') {
      setFormData(prev => ({ ...prev, subCategory: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setResponseMsg('');

    try {
      let imageBase64 = null;

      if (image && image instanceof File) {
        try {
          imageBase64 = await convertFileToBase64(image);
        } catch (error) {
          // Error is already handled in convertFileToBase64
          return;
        }
      }

      const businessData = {
        name: formData.name,
        category: formData.category,
        subCategory: formData.subCategory,
        description: formData.description,
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
        },
        contact: {
          phone: formData.phone,
          email: formData.email,
        },
        socialLinks: {
          facebook: formData.facebook,
          instagram: formData.instagram,
        },
        status: formData.status,
        approvalStatus: formData.approvalStatus,
        ...(userId && { owner: userId }),
        images: imageBase64 || "", // ✅ single string
      };

      console.log('Sending business data:', businessData);
      await onSubmit(businessData);
      
      setResponseMsg('✅ Business added successfully!');
      if (!initialData) {
        setFormData({
          name: '',
          category: '',
          subCategory: '',
          description: '',
          street: '',
          city: '',
          state: '',
          pincode: '',
          phone: '',
          email: '',
          facebook: '',
          instagram: '',
          status: 'inactive',
          approvalStatus: 'pending',
        });
        setImage(null);
      }
    } catch (error) {
      setResponseMsg('❌ Failed to add business. Please try again.');
      console.error('API Error:', error);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4"
    >
      {/* Business Name - Full Width */}
      <div className="md:col-span-2 flex flex-col">
        <label className="text-sm font-medium text-gray-700 mb-1">Business Name *</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          className="px-4 py-2 rounded-xl border border-gray-300 bg-white shadow-sm"
          placeholder="Enter Business Name"
        />
      </div>

      {/* Category Dropdown */}
      <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-700 mb-1">Category *</label>
        <select
          name="category"
          value={formData.category}
          onChange={handleChange}
          required
          className="px-4 py-2 rounded-xl border border-gray-300 bg-white shadow-sm"
        >
          <option value="">Select Category</option>
          {categories.map((cat) => (
            <option key={cat._id} value={cat._id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Subcategory Dropdown - Dependent on Category */}
      <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-700 mb-1">Subcategory</label>
        <select
          name="subCategory"
          value={formData.subCategory}
          onChange={handleChange}
          className="px-4 py-2 rounded-xl border border-gray-300 bg-white shadow-sm"
          disabled={!formData.category}
        >
          <option value="">Select Subcategory</option>
          {subcategories.map((subcat) => (
            <option key={subcat._id} value={subcat._id}>
              {subcat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Status Dropdown - Only show in edit mode */}
      {initialData && (
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">Status *</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            required
            className="px-4 py-2 rounded-xl border border-gray-300 bg-white shadow-sm"
          >
            
            <option value="inactive">Inactive</option>
            <option value="active">Active</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>
      )}

      {/* Approval Status Dropdown - Only show in edit mode */}
      {initialData && (
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">Approval Status *</label>
          <select
            name="approvalStatus"
            value={formData.approvalStatus}
            onChange={handleChange}
            required
            className="px-4 py-2 rounded-xl border border-gray-300 bg-white shadow-sm"
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      )}

      {/* Description - Full Width */}
      <div className="md:col-span-2 flex flex-col">
        <label className="text-sm font-medium text-gray-700 mb-1">Description *</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          required
          className="px-4 py-3 rounded-xl border border-gray-300 resize-none h-28 shadow-sm"
          placeholder="Describe your business..."
        ></textarea>
      </div>

      {/* Business Image Upload */}
      <div className="md:col-span-2 flex flex-col">
        <label className="text-sm font-medium text-gray-700 mb-1">Business Image (Optional)</label>
        
        {/* File Upload Area */}
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer"
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
              setImage(file);
            } else {
              setResponseMsg('❌ Please select a valid image file');
            }
          }}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => document.getElementById('business-image-upload').click()}
        >
          <input
            id="business-image-upload"
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files[0];
              if (file) {
                if (file.type.startsWith('image/')) {
                  setImage(file);
                } else {
                  setResponseMsg('❌ Please select a valid image file');
                }
              }
            }}
            className="hidden"
          />
          
          {image ? (
            <div className="relative">
              <img
                src={URL.createObjectURL(image)}
                alt="Preview"
                className="mx-auto max-h-32 rounded-lg border"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setImage(null);
                }}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
              >
                ×
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 text-gray-400 mb-2">📁</div>
              <p className="text-sm text-gray-600 mb-1">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-gray-500">
                PNG, JPG, GIF up to 2MB (auto-compressed)
              </p>
            </div>
          )}
        </div>
        
        {image && (
          <div className="mt-2">
            <p className="text-xs text-gray-600 mb-1">
              Selected: {image.name} ({(image.size / 1024).toFixed(1)} KB)
            </p>
          </div>
        )}
      </div>

      {/* Address Fields */}
      <div className="md:col-span-2">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Address Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: 'Street', name: 'street' },
            { label: 'City', name: 'city' },
            { label: 'State', name: 'state' },
            { label: 'Pincode', name: 'pincode' },
          ].map((field) => (
            <div key={field.name} className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">{field.label}</label>
              <input
                type="text"
                name={field.name}
                value={formData[field.name]}
                onChange={handleChange}
                required
                className="px-4 py-2 rounded-xl border border-gray-300 bg-white shadow-sm"
                placeholder={`Enter ${field.label}`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Contact Information */}
      <div className="md:col-span-2">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Contact Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: 'Phone', name: 'phone', type: 'tel' },
            { label: 'Email', name: 'email', type: 'email' },
          ].map((field) => (
            <div key={field.name} className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">{field.label} *</label>
              <input
                type={field.type}
                name={field.name}
                value={formData[field.name]}
                onChange={handleChange}
                required
                className="px-4 py-2 rounded-xl border border-gray-300 bg-white shadow-sm"
                placeholder={`Enter ${field.label}`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Social Media Links */}
      <div className="md:col-span-2">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Social Media Links (Optional)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: 'Facebook URL', name: 'facebook' },
            { label: 'Instagram URL', name: 'instagram' },
          ].map((field) => (
            <div key={field.name} className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">{field.label}</label>
              <input
                type="url"
                name={field.name}
                value={formData[field.name]}
                onChange={handleChange}
                className="px-4 py-2 rounded-xl border border-gray-300 bg-white shadow-sm"
                placeholder={`Enter ${field.label}`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Submit Button */}
      <div className="md:col-span-2 flex justify-center mt-6">
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-8 rounded-xl transition duration-300 shadow-md"
        >
          {loading ? 'Adding Business...' : initialData ? 'Update Business' : 'Add Business'}
        </button>
      </div>

      {/* Response Message */}
      {responseMsg && (
        <div className="md:col-span-2 text-center mt-4 text-blue-700 font-medium">
          {responseMsg}
        </div>
      )}
    </form>
  );
};

export default RegisterBusinessForm;
