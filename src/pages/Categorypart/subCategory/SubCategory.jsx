import React, { useEffect, useMemo, useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "../../../axios";
import Table from "../../../componant/Table/Table";
import Cell from "../../../componant/Table/cell";

import {
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Button,
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
  useDisclosure,
  useToast,
  Box,
  Image,
} from "@chakra-ui/react";
import { MdEdit, MdDelete } from "react-icons/md";
import { HiStatusOnline } from "react-icons/hi";
import NewNavbar from "../../Dashboard/main/NewNavbar";
// import { Atom } from "react-loading-indicators";
import Loding from "../../../componant/Loader/Loding";

import { motion } from "framer-motion";

const SubcategoryPage = () => {
  const { categoryId } = useParams();
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const toast = useToast();
  const navigate=useNavigate();

  const [modalOpen, setModalOpen] = useState(false);

  const [editId, setEditId] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    address: "",
    image: "",
  });
  const [imageFile, setImageFile] = useState(null);

  const {
    isOpen: isAlertOpen,
    onOpen: openAlert,
    onClose: closeAlert,
  } = useDisclosure();

  const cancelRef = useRef();

  // Compress image before converting to base64
  const compressImage = (file, maxWidth = 800, maxHeight = 600, quality = 0.8) => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        try {
          // Calculate new dimensions maintaining aspect ratio
          let { width, height } = img;
          const aspectRatio = width / height;
          
          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              width = Math.min(width, maxWidth);
              height = width / aspectRatio;
            } else {
              height = Math.min(height, maxHeight);
              width = height * aspectRatio;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // Draw and compress
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          }, 'image/jpeg', quality);
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = (error) => {
        console.error('Image load error:', error);
        reject(new Error('Failed to load image'));
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  // Convert file to base64
  const convertFileToBase64 = async (file) => {
    // For now, let's use the simple approach without compression
    // to avoid the compression issues
    console.log("Converting file to base64 without compression...");
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        console.log("Base64 conversion successful");
        resolve(reader.result);
      };
      reader.onerror = (error) => {
        console.error("Base64 conversion failed:", error);
        reject(new Error('Failed to convert image to base64'));
      };
      reader.readAsDataURL(file);
    });
  };

  const openAddModal = () => {
    setEditId(null);
    setFormData({ name: "", description: "", image: "", address: "" });
    setImageFile(null);
    setModalOpen(true);
  };
  // here

  const fetchSubcategories = async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `/subcategory/getSubCategoryByParent/${categoryId}`
      );
      setSubcategories(res.data.result || []);

      console.log("Subcategory Created:", res.data.result);
      console.log("Fetched Subcategories:", res.data.result[0]);
    } catch (err) {
      console.error("Error fetching subcategories", err);
      toast({
        title: "Error loading subcategories",
        description: err.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubcategories();
  }, [categoryId]);

  // console.log("categoryId from URL:", categoryId);
  const handleSubmit = async (e) => {
    e.preventDefault();
    const { name, description, address } = formData;

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

    // For new subcategories, image is required
    if (!editId && !imageFile) {
      toast({
        title: "Please select an image",
        description: "Image is required for new subcategories.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Validate image file type and size
    if (imageFile) {
      if (!["image/jpeg", "image/png", "image/jpg"].includes(imageFile.type)) {
        toast({
          title: "Invalid file type!",
          description: "Please upload a JPG or PNG image.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        return;
      }
      
      // Check file size (5MB limit)
      if (imageFile.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large!",
          description: "Please upload an image smaller than 5MB.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        return;
      }
    }

    try {
      setLoading(true);
      
      // Convert image to base64 if file is selected
      let imageBase64 = null;
      if (imageFile && imageFile instanceof File) {
        try {
          console.log("Processing image file:", imageFile.name, "Size:", imageFile.size);
          imageBase64 = await convertFileToBase64(imageFile);
          console.log("Image processed successfully, base64 length:", imageBase64.length);
        } catch (error) {
          console.error("Image processing error:", error);
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
        address: address || "",
        isActive: true,
        category: categoryId,
        image: imageBase64 || formData.image || "", // Use base64 or existing image
      };

      if (editId) {
        // Edit mode
        await axios.put(`/subcategory/updateSubcategory/${editId}`, payload);
        console.log("Submitted Payload:", "EDIT", payload);
        toast({ title: "Subcategory Updated!", status: "success" });
      } else {
        // Add mode
        await axios.post("subcategory/registerSubCategory", payload);
        console.log("Submitted Payload:", "ADD", payload);
        toast({ title: "Subcategory added!", status: "success" });
      }

      setModalOpen(false);
      setFormData({ name: "", description: "", image: "", address: "" });
      setImageFile(null);
      fetchSubcategories(); // 👈 call again to reload
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

  const handleDelete = async () => {
    try {
      await axios.delete(`/subcategory/deleteSubCategory/${selectedId}`);
      setSubcategories((prev) =>
        prev.filter((item) => item._id !== selectedId)
      );
      toast({
        title: "Subcategory deleted successfully.",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      closeAlert();
    } catch (err) {
      toast({
        title: "Error deleting subcategory.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleEditClick = (subcategory) => {
    setEditId(subcategory._id);
    setFormData({
      name: subcategory.name,
      description: subcategory.description,
      address: subcategory.address,
      image: subcategory.image,
    });
    setImageFile(null); // Reset image file for edit
    setModalOpen(true);
  };
const handleViewBusiness = (subcategoryId) => {
    
    navigate(`/dash/subcategory/${subcategoryId}/business`);
  };
  const columns = useMemo(
    () => [
      {
        Header: "Sr No.",
        accessor: "srNo",
        Cell: ({ row: { index } }) => <Cell text={index + 1} />,
      },
      {
        Header: "Image",
        accessor: "image",
        Cell: ({ value }) => (
          <div className="flex justify-center">
            {value && value.trim() ? (
              <img
                src={value.startsWith('data:') ? value : 
                     value.startsWith('http') ? value : 
                     `https://burhanpur-city-backend-mfs4.onrender.com/${value}`}
                alt="Subcategory"
                className="w-16 h-16 object-cover rounded border border-gray-200"
                onError={(e) => {
                  e.target.style.display = 'none';
                  const fallback = e.target.nextSibling;
                  if (fallback) {
                    fallback.style.display = 'block';
                  }
                }}
              />
            ) : null}
            <div 
              className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-gray-500 text-xs"
              style={{ display: value && value.trim() ? 'none' : 'block' }}
            >
              {value && value.trim() ? 'Error' : 'No Image'}
            </div>
          </div>
        ),
      },
      {
        Header: "Name",
        accessor: "name",
        Cell: ({ value }) => <Cell text={value} bold="bold" />,
      },
      {
        Header: "Description",
        accessor: "description",
        Cell: ({ value }) => <Cell text={value} />,
      },
      {
        Header: "Address",
        accessor: "address",
        Cell: ({ value }) => <Cell text={value} />,
      },
      {
        Header: "Actions",
        Cell: ({ row: { original } }) => (
          <Menu>
            <MenuButton as={Button} onClick={() => setSelectedId(original._id)}>
              Actions
            </MenuButton>
            <MenuList>
              <MenuItem onClick={() => handleEditClick(original)}>
                <MdEdit className="mr-2" /> Edit
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setSelectedId(original._id);
                  openAlert();
                }}
              >
                <MdDelete className="mr-2" /> Delete
              </MenuItem>
              <MenuItem onClick={() => handleViewBusiness(original._id)}>
                <HiStatusOnline className="mr-2" /> View Business
              </MenuItem>
            </MenuList>
          </Menu>
        ),
      },
    ],
    [subcategories]
  );

  console.log("Modal Open State:", modalOpen);

  return (
  <>
    <NewNavbar />

    {loading ? (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <Loding />
      </div>
    ) : (
      <div className="p-4 md:p-6 mt-20 pt-12">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
          
          {/* LEFT SIDE */}
          <div className="flex flex-col gap-2">
            <h2 className="text-xl md:text-2xl font-bold">Subcategories</h2>
            <Button size="sm" md-size="md" colorScheme="green" variant="solid" >
              Total Subcategories : {subcategories.length}
            </Button>
          </div>

          {/* RIGHT SIDE */}
          <div className="flex justify-center md:justify-end">
            <Button 
            onClick={openAddModal} 
            colorScheme="blue" 
            className="self-start md:self-auto"
          >
            + Add Subcategory
          </Button>
          </div>
          
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto">
          <Table data={subcategories} columns={columns} />
        </div>
      </div>
    )}

    {/* ALERT DIALOG */}
    <AlertDialog
      isOpen={isAlertOpen}
      leastDestructiveRef={cancelRef}
      onClose={closeAlert}
    >
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            Delete Subcategory
          </AlertDialogHeader>

          <AlertDialogBody>
            Are you sure you want to delete this subcategory?
          </AlertDialogBody>

          <AlertDialogFooter>
            <Button ref={cancelRef} onClick={closeAlert}>
              Cancel
            </Button>
            <Button colorScheme="red" onClick={handleDelete} ml={3}>
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>

    {/* MODAL */}
    {modalOpen && (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[999]">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg mx-4"
        >
          <h2 className="text-lg md:text-xl font-semibold mb-4">
            {editId ? "Edit Subcategory" : "Add Subcategory"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              placeholder="Subcategory Name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="border w-full px-3 py-2 rounded"
              required
            />
            <input
              type="text"
              placeholder="Description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="border w-full px-3 py-2 rounded"
            />
            <input
              type="text"
              placeholder="Address"
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              className="border w-full px-3 py-2 rounded"
            />
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Upload Image
              </label>
              
              {/* File Upload Area */}
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-all"
                onClick={() => document.getElementById('subcategory-image-upload').click()}
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
                  id="subcategory-image-upload"
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
                  className="hidden"
                />
                
                {imageFile ? (
                  <div className="relative">
                    <Image
                      src={URL.createObjectURL(imageFile)}
                      alt="Preview"
                      boxSize="120px"
                      borderRadius="md"
                      objectFit="cover"
                      mx="auto"
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
                  </div>
                ) : (
                  <div>
                    <div className="w-8 h-8 text-gray-400 mb-2 mx-auto">📁</div>
                    <p className="text-sm text-gray-600 mb-1">
                      Click to upload image or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">
                      PNG, JPG, GIF up to 2MB
                    </p>
                    {!editId && (
                      <p className="text-xs text-red-500 mt-1">
                        * Image is required
                      </p>
                    )}
                  </div>
                )}
              </div>
              
              {imageFile && (
                <div className="mt-2">
                  <p className="text-xs text-gray-600 mb-1">
                    Selected: {imageFile.name} ({(imageFile.size / 1024).toFixed(1)} KB)
                  </p>
                </div>
              )}

              {/* Show existing image in edit mode */}
              {editId && formData.image && !imageFile && (
                <div className="mt-3">
                  <label className="block text-sm text-gray-600 mb-2">Current Image:</label>
                  <Image
                    src={formData.image.startsWith('data:') ? formData.image : 
                         formData.image.startsWith('http') ? formData.image : 
                         `https://burhanpur-city-backend-mfs4.onrender.com/${formData.image}`}
                    alt="Current"
                    boxSize="100px"
                    borderRadius="md"
                    objectFit="cover"
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setModalOpen(false)} variant="outline">
                Cancel
              </Button>
              <Button type="submit" isLoading={loading} colorScheme="blue">
                {editId ? "Update" : "Add"}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    )}
  </>
);

};

export default SubcategoryPage;
