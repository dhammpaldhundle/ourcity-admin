import React, { useState, useEffect } from "react";
import axios from "../../axios";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Select,
  VStack,
  HStack,
  useToast,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Box,
  Text,
  Divider,
} from "@chakra-ui/react";

const EditProductModal = ({ isOpen, onClose, product, businessId, businessName, onProductUpdated }) => {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    offerPrice: "",
    brand: "",
    quantity: "",
    feature: "",
    speciality: "",
    status: "active",
    image: null
  });

  // Initialize form data when product changes
  useEffect(() => {
    if (product && isOpen) {
      console.log("Pre-filling form with product data:", product);
      setFormData({
        name: product.name || "",
        description: product.description || "",
        price: product.price || "",
        offerPrice: product.offerPrice || "",
        brand: product.brand || "",
        quantity: product.quantity || "",
        feature: Array.isArray(product.feature) ? product.feature.join(", ") : (product.feature || ""),
        speciality: product.speciality || "",
        status: product.status || "active",
        image: null // Don't pre-fill image for edit
      });
    }
  }, [product, isOpen]);

  // Additional effect to ensure data is loaded when modal opens
  useEffect(() => {
    if (isOpen && product) {
      console.log("Modal opened, ensuring data is loaded:", product);
      setFormData({
        name: product.name || "",
        description: product.description || "",
        price: product.price || "",
        offerPrice: product.offerPrice || "",
        brand: product.brand || "",
        quantity: product.quantity || "",
        feature: Array.isArray(product.feature) ? product.feature.join(", ") : (product.feature || ""),
        speciality: product.speciality || "",
        status: product.status || "active",
        image: null
      });
    }
  }, [isOpen]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

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
        toast({
          title: "File size too large",
          description: "Please select an image smaller than 2MB or use URL input instead.",
          status: "error",
          duration: 4000,
        });
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let imageBase64 = null;

      if (formData.image && formData.image instanceof File) {
        try {
          imageBase64 = await convertFileToBase64(formData.image);
        } catch (error) {
          // Error is already handled in convertFileToBase64 with toast
          setLoading(false);
          return;
        }
      }

      const productData = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price) || 0,
        offerPrice: parseFloat(formData.offerPrice) || 0,
        brand: formData.brand,
        quantity: formData.quantity.toString(),
        speciality: formData.speciality,
        status: formData.status,
        bussinessId: businessId,
        feature: formData.feature
          ? formData.feature.split(",").map(f => f.trim()).filter(Boolean)
          : [],
        image: imageBase64 ? [imageBase64] : [], // ✅ array of strings
      };

      console.log('Sending product update data:', productData);
      const response = await axios.put(`/product/updateProduct/${product._id}`, productData);
      
      if (response.status === 200 || response.status === 201) {
        toast({
          title: "Product updated successfully!",
          description: "Your product has been updated.",
          status: "success",
          duration: 5000,
        });
        
        // Reset form
        setFormData({
          name: "",
          description: "",
          price: "",
          offerPrice: "",
          brand: "",
          quantity: "",
          feature: "",
          speciality: "",
          status: "active",
          image: null
        });
        
        // Notify parent component to refresh data
        if (onProductUpdated) {
          onProductUpdated();
        }
        
        onClose();
      } else {
        throw new Error(`API returned status: ${response.status}`);
      }
    } catch (error) {
      console.error("Error updating product:", error);
      toast({
        title: "Error updating product",
        description: error.response?.data?.message || "Please try again.",
        status: "error",
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Reset form when closing
    setFormData({
      name: "",
      description: "",
      price: "",
      offerPrice: "",
      brand: "",
      quantity: "",
      feature: "",
      speciality: "",
      status: "active",
      image: null
    });
    onClose();
  };

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: "",
        description: "",
        price: "",
        offerPrice: "",
        brand: "",
        quantity: "",
        feature: "",
        speciality: "",
        status: "active",
        image: null
      });
    }
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl">
      <ModalOverlay />
      <ModalContent maxW="800px">
        <ModalHeader>Edit Product</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {/* Business Info Alert */}
          <Alert status="info" mb={4}>
            <AlertIcon />
            <Box>
              <AlertTitle>Business Information</AlertTitle>
              <AlertDescription>
                Editing product for: <strong>{businessName}</strong>
              </AlertDescription>
            </Box>
          </Alert>

          <form onSubmit={handleSubmit}>
            <VStack spacing={4} align="stretch">
              {/* Basic Information */}
              <Box>
                <Text fontSize="md" fontWeight="bold" mb={2}>Basic Information</Text>
                <Divider mb={3} />
                
                <HStack spacing={3} mb={3}>
                  <FormControl isRequired>
                    <FormLabel fontSize="sm">Product Name</FormLabel>
                    <Input
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      placeholder="Enter product name"
                      size="sm"
                    />
                  </FormControl>
                  
                  <FormControl>
                    <FormLabel fontSize="sm">Brand</FormLabel>
                    <Input
                      value={formData.brand}
                      onChange={(e) => handleInputChange("brand", e.target.value)}
                      placeholder="Enter brand name"
                      size="sm"
                    />
                  </FormControl>
                </HStack>

                <FormControl isRequired mb={3}>
                  <FormLabel fontSize="sm">Description</FormLabel>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    placeholder="Enter product description"
                    rows={2}
                    size="sm"
                  />
                </FormControl>

                <FormControl mb={3}>
                  <FormLabel fontSize="sm">Speciality</FormLabel>
                  <Input
                    value={formData.speciality}
                    onChange={(e) => handleInputChange("speciality", e.target.value)}
                    placeholder="Enter product speciality"
                    size="sm"
                  />
                </FormControl>

                <FormControl mb={3}>
                  <FormLabel fontSize="sm">Product Image (Optional)</FormLabel>
                  
                  {/* File Upload Area */}
                  <Box
                    border="2px dashed"
                    borderColor="gray.300"
                    borderRadius="lg"
                    p={6}
                    textAlign="center"
                    cursor="pointer"
                    _hover={{ borderColor: "gray.400" }}
                    transition="all 0.2s"
                    onClick={() => document.getElementById('edit-image-upload').click()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files[0];
                      if (file && file.type.startsWith('image/')) {
                        handleInputChange("image", file);
                      } else {
                        toast({
                          title: "Invalid file type",
                          description: "Please select a valid image file",
                          status: "error",
                          duration: 3000,
                        });
                      }
                    }}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    <input
                      id="edit-image-upload"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          if (file.type.startsWith('image/')) {
                            handleInputChange("image", file);
                          } else {
                            toast({
                              title: "Invalid file type",
                              description: "Please select a valid image file",
                              status: "error",
                              duration: 3000,
                            });
                          }
                        }
                      }}
                      style={{ display: 'none' }}
                    />
                    
                    {formData.image ? (
                      <Box position="relative">
                        <img
                          src={URL.createObjectURL(formData.image)}
                          alt="Preview"
                          style={{ 
                            maxHeight: "120px", 
                            borderRadius: "8px",
                            border: "1px solid #e2e8f0"
                          }}
                        />
                        <Button
                          size="xs"
                          colorScheme="red"
                          position="absolute"
                          top="-8px"
                          right="-8px"
                          borderRadius="full"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInputChange("image", null);
                          }}
                        >
                          ×
                        </Button>
                      </Box>
                    ) : (
                      <VStack spacing={2}>
                        <Text fontSize="sm" color="gray.600">
                          Click to upload or drag and drop
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          PNG, JPG, GIF up to 2MB (auto-compressed)
                        </Text>
                      </VStack>
                    )}
                  </Box>
                  
                  {formData.image && (
                    <Box mt={2}>
                      <Text fontSize="xs" color="gray.600" mb={1}>
                        Selected: {formData.image.name} ({(formData.image.size / 1024).toFixed(1)} KB)
                      </Text>
                    </Box>
                  )}
                </FormControl>
              </Box>

              {/* Pricing Information */}
              <Box>
                <Text fontSize="md" fontWeight="bold" mb={2}>Pricing Information</Text>
                <Divider mb={3} />
                
                <HStack spacing={3} mb={3}>
                  <FormControl isRequired>
                    <FormLabel fontSize="sm">Price (₹)</FormLabel>
                    <NumberInput
                      value={formData.price}
                      onChange={(value) => handleInputChange("price", value)}
                      min={0}
                      precision={2}
                      size="sm"
                    >
                      <NumberInputField placeholder="0.00" />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  </FormControl>
                  
                  <FormControl>
                    <FormLabel fontSize="sm">Offer Price (₹)</FormLabel>
                    <NumberInput
                      value={formData.offerPrice}
                      onChange={(value) => handleInputChange("offerPrice", value)}
                      min={0}
                      precision={2}
                      size="sm"
                    >
                      <NumberInputField placeholder="0.00" />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  </FormControl>
                </HStack>

                <HStack spacing={3} mb={3}>
                  <FormControl isRequired>
                    <FormLabel fontSize="sm">Quantity</FormLabel>
                    <NumberInput
                      value={formData.quantity}
                      onChange={(value) => handleInputChange("quantity", value)}
                      min={0}
                      size="sm"
                    >
                      <NumberInputField placeholder="0" />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  </FormControl>
                  
                  <FormControl>
                    <FormLabel fontSize="sm">Status</FormLabel>
                    <Select
                      value={formData.status}
                      onChange={(e) => handleInputChange("status", e.target.value)}
                      size="sm"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </Select>
                  </FormControl>
                </HStack>
              </Box>

              {/* Features */}
              <Box>
                <Text fontSize="md" fontWeight="bold" mb={2}>Product Features</Text>
                <Divider mb={3} />
                
                <FormControl>
                  <FormLabel fontSize="sm">Features (comma-separated)</FormLabel>
                  <Textarea
                    value={formData.feature}
                    onChange={(e) => handleInputChange("feature", e.target.value)}
                    placeholder="Enter features separated by commas (e.g., Waterproof, Durable, Lightweight)"
                    rows={2}
                    size="sm"
                  />
                </FormControl>
              </Box>
            </VStack>
          </form>
        </ModalBody>

        <ModalFooter>
          <Button variant="outline" mr={3} onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            colorScheme="purple"
            onClick={handleSubmit}
            isLoading={loading}
            loadingText="Updating Product..."
          >
            Update Product
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default EditProductModal;
