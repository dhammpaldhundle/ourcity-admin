import React, { useEffect, useState } from "react";
import axios from "../../axios";
import {
  Button,
  useToast,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  HStack,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Select,
  Spinner,
  InputGroup,
  InputLeftElement,
  Badge,
  InputRightAddon,
  Box,
  Image,
} from "@chakra-ui/react";
import { MdEdit, MdDelete, MdSearch } from "react-icons/md";
import { FaPlus } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import PaginationNav from "../../componant/Pagination/Pagination";

const CategorySection = () => {
  const [categories, setCategories] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentCategoryId, setCurrentCategoryId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    image: "",
    type: "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8);
  const toast = useToast();
  const navigate = useNavigate();

  // Convert file to base64
  const convertFileToBase64 = async (file) => {
    console.log("Converting category file to base64 without compression...");
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        console.log("Category base64 conversion successful");
        resolve(reader.result);
      };
      reader.onerror = (error) => {
        console.error("Category base64 conversion failed:", error);
        reject(new Error('Failed to convert image to base64'));
      };
      reader.readAsDataURL(file);
    });
  };

  // Fetch all categories
  const fetchCategories = async () => {
    try {
      const res = await axios.get("/category/getCategory");
      setCategories(res.data?.data || []);

      console.log(res.data.data)

      const managementCategories = categories.filter(
  (cat) =>
    Array.isArray(cat.type) &&
    cat.type.some((t) => t.toLowerCase().includes("management"))
);

console.log("Management & Services Categories:", managementCategories);

    } catch (error) {
      console.error(
        "Error fetching categories:",
        error.response?.data || error.message
      );
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Debug effect to track categories changes
  useEffect(() => {
    console.log("Categories state updated:", categories.length, "categories");
    const jewelleryCategory = categories.find(cat => cat.name === "Jewellery");
    if (jewelleryCategory) {
      console.log("Jewellery category updated:", jewelleryCategory.name);
      console.log("Jewellery image type:", jewelleryCategory.image ? (jewelleryCategory.image.startsWith('data:') ? 'base64' : 'url') : 'none');
    }
  }, [categories]);


  // Open modal for add
  const openAddModal = () => {
    setIsEditMode(false);
    setFormData({ name: "", description: "", image: "", type: "" });
    setImageFile(null);
    setModalOpen(true);
  };

  // Open modal for edit
  const openEditModal = (category) => {
    setIsEditMode(true);
    setCurrentCategoryId(category._id);
    setFormData({
      name: category.name,
      description: category.description,
      image: category.image,
      type: category.type ? category.type[0] : "",
    });
    setImageFile(null); // Reset image file for edit
    setModalOpen(true);
  };

  // Subcategory button click
  const handleSubcategoryClick = (categoryId) => {
    navigate(`/dash/subcategory/${categoryId}`);
  };

  // Add / Edit submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    const { name, description, type } = formData;

    if (!name.trim()) {
      toast({
        title: "Missing required fields.",
        description: "Name is required.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // For new categories, image is required
    if (!isEditMode && !imageFile) {
      toast({
        title: "Please select an image",
        description: "Image is required for new categories.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Validate image file type
    if (imageFile && !["image/jpeg", "image/png", "image/jpg"].includes(imageFile.type)) {
      toast({
        title: "Invalid file type!",
        description: "Please upload a JPG or PNG image.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setLoading(true);

    try {
      // Convert image to base64 if file is selected
      let imageBase64 = null;
      if (imageFile && imageFile instanceof File) {
        try {
          console.log("Processing category image file:", imageFile.name, "Size:", imageFile.size);
          imageBase64 = await convertFileToBase64(imageFile);
          console.log("Category image processed successfully, base64 length:", imageBase64.length);
        } catch (error) {
          console.error("Category image processing error:", error);
          toast({
            title: "Image processing failed",
            description: error.message || "Please try again with a different image.",
            status: "error",
            duration: 5000,
          });
          setLoading(false);
          return;
        }
      }

      const payload = {
        name: name.trim(),
        description: description.trim() || "No description",
        isActive: true,
        type: type ? [type] : [],
        image: imageBase64 || formData.image || "", // Use base64 or existing image
      };

      if (isEditMode) {
        const response = await axios.put(
          `/category/updateCategory/${currentCategoryId}`,
          payload
        );
        
        console.log("Category update response:", response.data);
        toast({ title: "Category updated successfully!", status: "success" });
        setIsEditMode(false);
        
        // Simple approach: just fetch all categories after update
        fetchCategories();
      } else {
        const response = await axios.post("/category/createCategory", payload);
        console.log("Category create response:", response.data);
        toast({ title: "Category added successfully!", status: "success" });
        // For new categories, fetch all data
        fetchCategories();
      }
      setModalOpen(false);
      setFormData({ name: "", description: "", image: "", type: "" });
      setImageFile(null);
    } catch (err) {
      toast({
        title: "Error",
        description: err.response?.data?.message || "Server error",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  // Delete category
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this category?"))
      return;
    try {
      await axios.delete(`/category/deleteCategory/${id}`);
      fetchCategories();
      toast({
        title: "Category deleted.",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: "Error deleting category",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // ---------------- Pagination Logic ----------------
  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(search.toLowerCase())
  );
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredCategories.slice(
    indexOfFirstItem,
    indexOfLastItem
  );
  const pageCount = Math.ceil(filteredCategories.length / itemsPerPage);

  const handlePageChange = (page) => setCurrentPage(page);

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setCurrentPage(1); // Reset to first page when searching
  };

  return (
    // <div className="p-6 pt-20 pb-6 max-w-7xl mx-auto">
    <div className="pt-24 pb-4 px-6 max-w-7xl mx-auto">
      {/* Top Section */}
      <div className="flex justify-between items-center mb-5 ">
        <div className="flex items-center gap-4">
          <Button size="md" colorScheme="green" variant="solid">
            Total Categories : {categories.length}
          </Button>
          <Button onClick={openAddModal} leftIcon={<FaPlus />} colorScheme="blue" size="md">
            Add Category
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-96">
            <InputGroup size="md">
              <InputLeftElement pointerEvents="none">
                <MdSearch color="gray.400" />
              </InputLeftElement>
              <Input
                placeholder="Search categories by name..."
                value={search}
                onChange={handleSearchChange}
                border="1px solid #949494"
                _hover={{ borderColor: "gray.300" }}
                _focus={{ borderColor: "blue.500", boxShadow: "outline" }}
                size="md"
              />
              <InputRightAddon p={0} border="none">
                <Button
                  className="bg-purple"
                  colorScheme="purple"
                  size="md"
                  borderLeftRadius={0}
                  borderRightRadius={3.3}
                  border="1px solid #949494"
                >
                  Search
                </Button>
              </InputRightAddon>
            </InputGroup>
          </div>
        </div>
      </div>

      {/* Search Results Info */}
      {search && (
        <div className="mb-6 text-sm text-gray-600">
          Showing {filteredCategories.length} of {categories.length} categories
        </div>
      )}

      {/* Categories Grid */}
      {/* <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-5">
        {currentItems.map((cat) => (
          <div
            key={cat._id}
            className="bg-white rounded-lg shadow-md overflow-hidden"
          >
            <img
              src={cat.image}
              alt={cat.name}
              className="w-full h-32 object-cover"
            />
            <div className="p-3">
              <h2 className="text-lg font-semibold">{cat.name}</h2>
              <p className="text-gray-600 text-sm mb-2">{cat.description}</p>

              <HStack spacing={2}  justify="center">
                <Menu>
                  <MenuButton as={Button} size="sm" colorScheme="purple">
                    Actions
                  </MenuButton>
                  <MenuList>
                    <MenuItem
                      icon={<MdEdit />}
                      onClick={() => openEditModal(cat)}
                    >
                      Edit
                    </MenuItem>
                    <MenuItem
                      icon={<MdDelete />}
                      onClick={() => handleDelete(cat._id)}
                    >
                      Delete
                    </MenuItem>
                  </MenuList>
                </Menu>

                <Button
                  colorScheme="teal"
                  size="sm" 
                  onClick={() => handleSubcategoryClick(cat._id)}
                >
                  Subcategory
                </Button>
              </HStack>
            </div>
          </div>
        ))}

        {currentItems.length === 0 && (
          <div className="text-center text-gray-500 col-span-full">
            No categories found.
          </div>
        )}

      </div> */}

      {/* Categories Grid */}
<div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 mb-4">
  {currentItems.map((cat) => (
    <div
      key={cat._id}
      className="bg-white rounded shadow-sm overflow-hidden"
      style={{ minHeight: "150px" }} // 🔽 force compact
    >
       {cat.image ? (
         <img
           src={cat.image.startsWith('data:') ? cat.image : 
                cat.image.startsWith('http') ? cat.image : 
                `https://burhanpur-city-backend-mfs4.onrender.com/${cat.image}`}
           alt={cat.name}
           className="w-full h-20 object-cover"
         />
       ) : (
         <div className="w-full h-20 bg-gray-200 flex items-center justify-center text-gray-500 text-xs">
           No Image
         </div>
       )}
      <div className="p-2">
        <h2 className="text-sm font-semibold truncate">{cat.name}</h2>
        <p className="text-gray-600 text-xs mb-1 truncate">
          {cat.description}
        </p>
        {/* {cat.type && cat.type.length > 0 && (
          <p className="text-blue-600 text-xs mb-1 font-medium">
            Type: {cat.type[0]}
          </p>
        )} */}

        <HStack spacing={1} justify="center">
          <Menu>
            <MenuButton as={Button} size="xs" colorScheme="purple">
              Actions
            </MenuButton>
            <MenuList>
              <MenuItem
                icon={<MdEdit />}
                onClick={() => openEditModal(cat)}
              >
                Edit
              </MenuItem>
              <MenuItem
                icon={<MdDelete />}
                onClick={() => handleDelete(cat._id)}
              >
                Delete
              </MenuItem>
            </MenuList>
          </Menu>

          <Button
            colorScheme="teal"
            size="xs"
            onClick={() => handleSubcategoryClick(cat._id)}
          >
            Subcategory
          </Button>
        </HStack>
      </div>
    </div>
  ))}
</div>


      {/* Pagination */}
      {pageCount > 1 && (
        <PaginationNav
          pageCount={pageCount}
          currentPage={currentPage}
          setCurrentPage={handlePageChange}
        />
      )}

      {/* ✅ Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {isEditMode ? "Edit Category" : "Add Category"}
          </ModalHeader>
          <ModalCloseButton />
          <form onSubmit={handleSubmit}>
            <ModalBody>
              <FormControl isRequired mb={3}>
                <FormLabel>Name</FormLabel>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </FormControl>
              <FormControl mb={3}>
                <FormLabel>Description</FormLabel>
                <Input
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </FormControl>
              <FormControl isRequired mb={3}>
                <FormLabel>Upload Image</FormLabel>
                
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
                  onClick={() => document.getElementById('category-image-upload').click()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files[0];
                    if (file && file.type.startsWith('image/')) {
                      setImageFile(file);
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
                    id="category-image-upload"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        if (file.type.startsWith('image/')) {
                          setImageFile(file);
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
                  
                  {imageFile ? (
                    <Box position="relative">
                      <Image
                        src={URL.createObjectURL(imageFile)}
                        alt="Preview"
                        boxSize="120px"
                        borderRadius="md"
                        objectFit="cover"
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
                          setImageFile(null);
                        }}
                      >
                        ×
                      </Button>
                    </Box>
                  ) : (
                    <Box>
                      <div className="w-8 h-8 text-gray-400 mb-2 mx-auto">📁</div>
                      <p className="text-sm text-gray-600 mb-1">
                        Click to upload image or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">
                        PNG, JPG, GIF up to 2MB
                      </p>
                      {!isEditMode && (
                        <p className="text-xs text-red-500 mt-1">
                          * Image is required
                        </p>
                      )}
                    </Box>
                  )}
                </Box>
                
                {imageFile && (
                  <Box mt={2}>
                    <p className="text-xs text-gray-600 mb-1">
                      Selected: {imageFile.name} ({(imageFile.size / 1024).toFixed(1)} KB)
                    </p>
                  </Box>
                )}

                {/* Show existing image in edit mode */}
                {isEditMode && formData.image && !imageFile && (
                  <Box mt={3}>
                    <FormLabel fontSize="sm" color="gray.600">Current Image:</FormLabel>
                    <Image
                      src={formData.image.startsWith('data:') ? formData.image : 
                           formData.image.startsWith('http') ? formData.image : 
                           `https://burhanpur-city-backend-mfs4.onrender.com/${formData.image}?t=${Date.now()}`}
                      alt="Current"
                      boxSize="100px"
                      borderRadius="md"
                      objectFit="cover"
                    />
                  </Box>
                )}
              </FormControl>
              <FormControl mb={4}>
                <FormLabel>Category Type</FormLabel>
                <Select
                  placeholder="Select category type"
                  value={formData.type || ""}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="Management & Service">Management & Service</option>
                  <option value="Product-based Service">Product-based Service</option>
                </Select>
              </FormControl>
            </ModalBody>
            <ModalFooter>
              <Button
                colorScheme="blue"
                type="submit"
                isLoading={loading}
                mr={3}
              >
                {isEditMode ? "Update" : "Create"}
              </Button>
              <Button variant="ghost" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    </div>
  );
};

export default CategorySection;
