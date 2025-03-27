import React, { useState, useEffect } from "react";
import { useParams } from 'react-router-dom';
import { useMqtt } from './useMqtt'; // Asegúrate que la ruta sea correcta

const UserDashboard = () => {
  const { id } = useParams(); // Obtener el ID del dispositivo (MAC Address) de los parámetros
  const macAddress = id || ""; // Usar el ID, o una cadena vacía si no está disponible
  
  // Usar el hook MQTT optimizado
  const { datos, conectado, loading, error, dispensarComida, controlarBombaAgua } = useMqtt(macAddress);
  
  // Estado para los niveles del contenedor de comida y agua
  const [foodContainerLevel, setFoodContainerLevel] = useState("full");
  const [waterContainerLevel, setWaterContainerLevel] = useState("full");
  
  // Estado para los niveles del plato de comida y agua
  const [foodBowlLevel, setFoodBowlLevel] = useState("empty");
  const [waterBowlLevel, setWaterBowlLevel] = useState("empty");
  
  // Estado de dispensación
  const [foodDispensing, setFoodDispensing] = useState(false);
  const [waterDispensing, setWaterDispensing] = useState(false);
  
  // Indicador de error temporal para mostrar al usuario
  const [actionError, setActionError] = useState("");

  // Limpiar errores temporales después de un tiempo
  useEffect(() => {
    if (actionError) {
      const timer = setTimeout(() => {
        setActionError("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [actionError]);

  // Actualizar el estado de la bomba de agua basado en los datos MQTT
  useEffect(() => {
    if (!loading && datos) {
      // Actualizar estado de dispensación de agua
      setWaterDispensing(datos.bombaAgua);
      
      // Si la bomba está activa, simular llenado del plato
      if (datos.bombaAgua && waterBowlLevel !== "full") {
        const nextLevel = waterBowlLevel === "empty" ? "medium" : "full";
        setWaterBowlLevel(nextLevel);
      }
    }
  }, [datos, loading, waterBowlLevel]);

  // Manejar la dispensación de comida
  const handleDispenseFood = () => {
    // Validar condiciones
    if (foodContainerLevel === "empty") {
      setActionError("El contenedor de comida está vacío");
      return;
    }
    
    if (!conectado) {
      setActionError("No hay conexión con el dispositivo");
      return;
    }
    
    if (foodDispensing) {
      setActionError("Ya se está dispensando comida");
      return;
    }
    
    // Activar indicador visual inmediatamente
    setFoodDispensing(true);
    
    // Intentar dispensar comida a través de MQTT
    const success = dispensarComida();
    
    if (success) {
      // Simular la acción de dispensación con timeout
      setTimeout(() => {
        // Actualizar el nivel del plato basado en el nivel actual
        if (foodBowlLevel === "empty") {
          setFoodBowlLevel("medium");
        } else if (foodBowlLevel === "medium") {
          setFoodBowlLevel("full");
        }
        
        // Actualizar el nivel del contenedor
        if (foodContainerLevel === "full") {
          setFoodContainerLevel("medium");
        } else if (foodContainerLevel === "medium") {
          setFoodContainerLevel("empty");
        }
        
        // Desactivar indicador de dispensación
        setFoodDispensing(false);
      }, 3000);
    } else {
      // Si hay error, restaurar estado y mostrar mensaje
      setFoodDispensing(false);
      setActionError("Error al enviar comando de comida");
    }
  };

  // Manejar la dispensación de agua
  const handleDispenseWater = () => {
    // Validar condiciones
    if (waterContainerLevel === "empty") {
      setActionError("El contenedor de agua está vacío");
      return;
    }
    
    if (!conectado) {
      setActionError("No hay conexión con el dispositivo");
      return;
    }
    
    // Alternar estado de dispensación
    if (!waterDispensing) {
      // Activar bomba
      const success = controlarBombaAgua(true);
      
      if (success) {
        // El estado real se actualizará mediante MQTT, pero activamos
        // el indicador visual inmediatamente para feedback al usuario
        setWaterDispensing(true);
        
        // Simulación del llenado del plato (en un caso real, esto vendría del estado del dispositivo)
        setTimeout(() => {
          if (waterBowlLevel === "empty") {
            setWaterBowlLevel("medium");
          } else if (waterBowlLevel === "medium") {
            setWaterBowlLevel("full");
          }
          
          // Simulación del vaciado del contenedor
          if (waterContainerLevel === "full") {
            setWaterContainerLevel("medium");
          } else if (waterContainerLevel === "medium") {
            setWaterContainerLevel("empty");
          }
        }, 2000);
      } else {
        setActionError("Error al activar bomba de agua");
      }
    } else {
      // Desactivar bomba
      const success = controlarBombaAgua(false);
      if (!success) {
        setActionError("Error al desactivar bomba de agua");
      }
      // El estado real se actualizará mediante MQTT
    }
  };

  // Reiniciar el plato de comida (simulando que la mascota come)
  const resetFoodBowl = () => {
    setFoodBowlLevel("empty");
  };

  // Reiniciar el plato de agua (simulando que la mascota bebe)
  const resetWaterBowl = () => {
    setWaterBowlLevel("empty");
  };

  if (loading) {
    return <div className="IoT-loading">Cargando datos del dispositivo...</div>;
  }

  return (
    <div className="IoT-feeder-container">
      <div className="IoT-feeder-header">
        <h1>Panel de Control del Alimentador de Mascotas</h1>
        <p className="IoT-feeder-subtitle">
          Monitorea y controla la comida y agua de tu mascota
          <span className={`IoT-connection-status ${conectado ? 'IoT-connected' : 'IoT-disconnected'}`}>
            {conectado ? '• Conectado' : '• Desconectado'}
          </span>
        </p>
        {macAddress && <p className="IoT-device-id">ID: {macAddress}</p>}
        
        {/* Mostrar errores */}
        {error && <p className="IoT-error-message">Error de conexión: {error}</p>}
        {actionError && <p className="IoT-action-error">{actionError}</p>}
      </div>

      <div className="IoT-devices-container">
        {/* Tarjeta del Dispensador de Comida */}
        <div className="IoT-device-card">
          <div className="IoT-device-icon-container">
            <div className={`IoT-food-icon ${foodDispensing ? 'IoT-active' : ''}`}></div>
          </div>
          <div className="IoT-device-info">
            <h2>Dispensador de Comida</h2>
            <div className="IoT-status-display">
              <span className="IoT-label">Estado:</span>
              <span className={`IoT-status-badge ${foodDispensing ? 'IoT-active' : 'IoT-inactive'}`}>
                {foodDispensing ? 'Dispensando' : 'Inactivo'}
              </span>
            </div>
            <div className="IoT-control-buttons">
              <button 
                className="IoT-control-btn IoT-on-btn" 
                onClick={handleDispenseFood}
                disabled={foodContainerLevel === "empty" || foodDispensing || !conectado}
              >
                Dispensar Comida
              </button>
            </div>
          </div>
        </div>

        {/* Tarjeta del Dispensador de Agua */}
        <div className="IoT-device-card">
          <div className="IoT-device-icon-container">
            <div className={`IoT-water-icon ${waterDispensing ? 'IoT-active' : ''}`}></div>
          </div>
          <div className="IoT-device-info">
            <h2>Dispensador de Agua</h2>
            <div className="IoT-status-display">
              <span className="IoT-label">Estado:</span>
              <span className={`IoT-status-badge ${waterDispensing ? 'IoT-active' : 'IoT-inactive'}`}>
                {waterDispensing ? 'Dispensando' : 'Inactivo'}
              </span>
            </div>
            <div className="IoT-control-buttons">
              <button 
                className="IoT-control-btn IoT-on-btn" 
                onClick={handleDispenseWater}
                disabled={waterContainerLevel === "empty" || !conectado}
              >
                {waterDispensing ? 'Detener' : 'Dispensar Agua'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="IoT-devices-container">
        {/* Estado del Contenedor de Comida */}
        <div className="IoT-device-card">
          <div className="IoT-device-icon-container">
            <div className="IoT-container-icon IoT-food-container">
              <div className={`IoT-level-indicator IoT-${foodContainerLevel}`}></div>
            </div>
          </div>
          <div className="IoT-device-info">
            <h2>Contenedor de Comida</h2>
            <div className="IoT-status-display">
              <span className="IoT-label">Nivel:</span>
              <span className={`IoT-level-badge IoT-${foodContainerLevel}`}>
                {foodContainerLevel.charAt(0).toUpperCase() + foodContainerLevel.slice(1)}
              </span>
            </div>
          </div>
        </div>

        {/* Estado del Contenedor de Agua */}
        <div className="IoT-device-card">
          <div className="IoT-device-icon-container">
            <div className="IoT-container-icon IoT-water-container">
              <div className={`IoT-level-indicator IoT-${waterContainerLevel}`}></div>
            </div>
          </div>
          <div className="IoT-device-info">
            <h2>Contenedor de Agua</h2>
            <div className="IoT-status-display">
              <span className="IoT-label">Nivel:</span>
              <span className={`IoT-level-badge IoT-${waterContainerLevel}`}>
                {waterContainerLevel.charAt(0).toUpperCase() + waterContainerLevel.slice(1)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="IoT-devices-container">
        {/* Estado del Plato de Comida */}
        <div className="IoT-device-card">
          <div className="IoT-device-icon-container">
            <div className="IoT-bowl-icon IoT-food-bowl">
              <div className={`IoT-level-indicator IoT-${foodBowlLevel}`}></div>
            </div>
          </div>
          <div className="IoT-device-info">
            <h2>Plato de Comida</h2>
            <div className="IoT-status-display">
              <span className="IoT-label">Nivel:</span>
              <span className={`IoT-level-badge IoT-${foodBowlLevel}`}>
                {foodBowlLevel.charAt(0).toUpperCase() + foodBowlLevel.slice(1)}
              </span>
            </div>
            <div className="IoT-control-buttons">
              <button 
                className="IoT-control-btn IoT-off-btn" 
                onClick={resetFoodBowl}
                disabled={foodBowlLevel === "empty"}
              >
                Reiniciar Plato
              </button>
            </div>
          </div>
        </div>

        {/* Estado del Plato de Agua */}
        <div className="IoT-device-card">
          <div className="IoT-device-icon-container">
            <div className="IoT-bowl-icon IoT-water-bowl">
              <div className={`IoT-level-indicator IoT-${waterBowlLevel}`}></div>
            </div>
          </div>
          <div className="IoT-device-info">
            <h2>Plato de Agua</h2>
            <div className="IoT-status-display">
              <span className="IoT-label">Nivel:</span>
              <span className={`IoT-level-badge IoT-${waterBowlLevel}`}>
                {waterBowlLevel.charAt(0).toUpperCase() + waterBowlLevel.slice(1)}
              </span>
            </div>
            <div className="IoT-control-buttons">
              <button 
                className="IoT-control-btn IoT-off-btn" 
                onClick={resetWaterBowl}
                disabled={waterBowlLevel === "empty"}
              >
                Reiniciar Plato
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
