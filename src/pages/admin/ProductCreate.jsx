import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useProducts } from "../../context/ProductContext";
import { useCategories } from "../../context/CategoryContext";
import { useMarcas } from "../../context/MarcaContext";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaBox, FaFileAlt, FaTag, FaWarehouse, FaLayerGroup, FaTrademark, FaImage } from "react-icons/fa";
import "../../styles/productCreate.css"; // Rename CSS file to be specific to this component

function ProductCreate() {
  const navigate = useNavigate();
  const { createProduct } = useProducts();
  const { categories, getCategories } = useCategories();
  const { marcas, getMarcas } = useMarcas();

  const [product, setProduct] = useState({
    name: "",
    description: "",
    price: "",
    stock: "",
    category: "",
    marca: "",
    images: ["", "", "", ""],
  });

  useEffect(() => {
    getCategories();
    getMarcas();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "images") {
      const index = parseInt(e.target.dataset.index);
      const updatedImages = [...product.images];
      updatedImages[index] = value;
      setProduct({
        ...product,
        images: updatedImages,
      });
    } else {
      setProduct({
        ...product,
        [name]: value,
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newProduct = {
      name: product.name, 
      description: product.description,
      price: parseFloat(product.price), 
      stock: parseInt(product.stock, 10), 
      images: product.images.filter(img => img !== "") || [], 
      user: product.user, 
      category: product.category, 
      marca: product.marca, 
    };

    console.log("producto a enviar:", newProduct);

    try {
      await createProduct(newProduct);
      toast.success("Producto creado con éxito!");
      navigate('/manage-products');
    } catch (error) {
      toast.error("Hubo un error al crear el producto.");
      console.error(error);
    }
  };

  return (
    <div className="pc-product-form-container">
      <div className="pc-product-form-box">
        <h2 className="pc-product-form-title">Crear Producto</h2>

        <form onSubmit={handleSubmit}>
          <div className="pc-input-group">
            <label className="pc-input-label">Nombre del Producto</label>
            <div className="pc-input-with-icon">
              <div className="pc-input-icon"><FaBox /></div>
              <input type="text" name="name" placeholder="Nombre" value={product.name} onChange={handleChange} className="pc-input-field" required />
            </div>
          </div>

          <div className="pc-input-group pc-full-width">
            <label className="pc-input-label">Descripción</label>
            <div className="pc-input-with-icon">
              <div className="pc-input-icon"><FaFileAlt /></div>
              <textarea name="description" placeholder="Descripción" value={product.description} onChange={handleChange} className="pc-input-field" required />
            </div>
          </div>

          <div className="pc-input-group">
            <label className="pc-input-label">Precio</label>
            <div className="pc-input-with-icon">
              <div className="pc-input-icon"><FaTag /></div>
              <input type="number" name="price" placeholder="Precio" value={product.price} onChange={handleChange} className="pc-input-field" min="0" step="0.01" required />
            </div>
          </div>

          <div className="pc-input-group">
            <label className="pc-input-label">Stock Disponible</label>
            <div className="pc-input-with-icon">
              <div className="pc-input-icon"><FaWarehouse /></div>
              <input type="number" name="stock" placeholder="Stock" value={product.stock} onChange={handleChange} className="pc-input-field" min="0" required />
            </div>
          </div>

          <div className="pc-input-group">
            <label className="pc-input-label">Categoría</label>
            <div className="pc-input-with-icon">
              <div className="pc-input-icon"><FaLayerGroup /></div>
              <select name="category" value={product.category} onChange={handleChange} className="pc-input-field" required>
                <option value="">Seleccionar Categoría</option>
                {categories && categories.map((category) => (
                  <option key={category._id} value={category._id}>{category.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="pc-input-group">
            <label className="pc-input-label">Marca</label>
            <div className="pc-input-with-icon">
              <div className="pc-input-icon"><FaTrademark /></div>
              <select name="marca" value={product.marca} onChange={handleChange} className="pc-input-field" required>
                <option value="">Seleccionar Marca</option>
                {marcas && marcas.map((marca) => (
                  <option key={marca._id} value={marca._id}>{marca.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="pc-input-group pc-full-width">
            <label className="pc-input-label">Imágenes del Producto</label>
            {product.images.map((image, index) => (
              <div key={index} className="pc-input-with-icon">
                <div className="pc-input-icon"><FaImage /></div>
                <input 
  type="text" 
  name="images" 
  data-index={index} 
  placeholder={`URL de imagen ${index + 1}`}  // ✅ Template string correcta
  value={image || ""} 
  onChange={handleChange} 
  className="pc-input-field" 
/>
              </div>
            ))}
          </div>

          <div className="pc-button-container">
            <button type="submit" className="pc-primary-button">Crear Producto</button>
            <button type="button" onClick={() => navigate('/manage-products')} className="pc-secondary-button">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProductCreate;