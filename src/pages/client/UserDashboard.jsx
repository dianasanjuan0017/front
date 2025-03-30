import React, { useState, useEffect } from "react";
import { useParams } from 'react-router-dom';
import { useMqtt } from '../../hooks/useMqtt';

const UserDashboard = () => {
  const { id } = useParams();
  const macAddress = id || "";
  
  const { datos, conectado, loading, error, dispensarComida, controlarBombaAgua } = useMqtt(macAddress);
  
  const [foodBowlLevel, setFoodBowlLevel] = useState("vacio");
  const [waterBowlLevel, setWaterBowlLevel] = useState("vacio");
  const [foodDispensing, setFoodDispensing] = useState(false);
  const [waterDispensing, setWaterDispensing] = useState(false); // Nuevo estado para bomba de agua
  const [actionError, setActionError] = useState("");

  const determinarNivelContenedor = (distancia) => {
    if (!distancia) return "vacio";
    if (distancia >= 2 && distancia <= 10) {
      return "lleno";
    } else if (distancia >= 11 && distancia <= 18) {
      return "medio";
    } else if (distancia > 18) {
      return "vacio";
    }
    return "vacio";
  };

  useEffect(() => {
    if (actionError) {
      const timer = setTimeout(() => {
        setActionError("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [actionError]);

  useEffect(() => {
    if (!loading && datos) {
      setFoodDispensing(false);
      
      // Actualizar estado de dispensación de agua basado en datos MQTT
      if (datos.bombaAgua) {
        setWaterDispensing(true);
        // Simular que el plato se llena gradualmente
        const nextLevel = waterBowlLevel === "vacio" ? "medio" : "lleno";
        setWaterBowlLevel(nextLevel);
      } else {
        setWaterDispensing(false);
      }
      
      if (datos.platoComidaLleno) {
        setFoodBowlLevel("lleno");
      } else {
        const distanciaComida = datos.pesoComida;
        setFoodBowlLevel(determinarNivelContenedor(distanciaComida));
      }
      
      if (datos.platoAguaLleno) {
        setWaterBowlLevel("lleno");
      } else {
        const distanciaAgua = datos.pesoAgua;
        setWaterBowlLevel(determinarNivelContenedor(distanciaAgua));
      }
    }
  }, [datos, loading, waterBowlLevel]);

  const handleDispenseFood = () => {
    if (!datos.pesoComida || datos.pesoComida > 18) {
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
    
    setFoodDispensing(true);
    const success = dispensarComida();
    
    if (success) {
      setTimeout(() => {
        setFoodDispensing(false);
      }, 3000);
    } else {
      setFoodDispensing(false);
      setActionError("Error al enviar comando de comida");
    }
  };

  const handleDispenseWater = () => {
    if (!datos.pesoAgua || datos.pesoAgua > 18) {
      setActionError("El contenedor de agua está vacío");
      return;
    }
    
    if (!conectado) {
      setActionError("No hay conexión con el dispositivo");
      return;
    }
    
    if (waterDispensing) {
      setActionError("La bomba de agua ya está activa");
      return;
    }
    
    // Activar la bomba
    setWaterDispensing(true);
    const success = controlarBombaAgua(true); // Enviar comando de activación
    
    if (success) {
      // Desactivar automáticamente después de 5 segundos (similar al servo)
      setTimeout(() => {
        controlarBombaAgua(false); // Enviar comando de desactivación
        setWaterDispensing(false);
      }, 1000);
    } else {
      setWaterDispensing(false);
      setActionError("Error al activar la bomba de agua");
    }
  };

  const resetFoodBowl = () => {
    setFoodBowlLevel("vacio");
  };

  const resetWaterBowl = () => {
    setWaterBowlLevel("vacio");
  };

  if (loading) {
    return <div className="IoT-loading">Cargando datos del dispositivo...</div>;
  }

  const foodContainerLevel = determinarNivelContenedor(datos.pesoComida);
  const waterContainerLevel = determinarNivelContenedor(datos.pesoAgua);

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

 {/* Tarjeta del Dispensador de Agua - Modificado */}
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
              disabled={waterContainerLevel === "vacio" || waterDispensing || !conectado}
            >
              Dispensar Agua
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
                {datos.pesoComida ? ` (${datos.pesoComida.toFixed(1)}g)` : ''}
              </span>
            </div>
            {!datos.balanzaComidaLista && (
              <p className="IoT-sensor-warning">Sensor de peso no disponible</p>
            )}
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
                {datos.pesoAgua ? ` (${datos.pesoAgua.toFixed(1)}g)` : ''}
              </span>
            </div>
            {!datos.balanzaAguaLista && (
              <p className="IoT-sensor-warning">Sensor de peso no disponible</p>
            )}
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
      
      {/* Sección para mostrar información adicional de los sensores */}
      <div className="IoT-devices-container">
        <div className="IoT-device-card IoT-sensor-info">
          <div className="IoT-device-info">
            <h2>Información de Sensores</h2>
            <div className="IoT-sensor-data">
              <p><strong>Última comida:</strong> {datos.ultimaComida ? formatTime(datos.ultimaComida) : 'No disponible'}</p>
              <p><strong>Contenedor de comida:</strong> {datos.pesoComida ? `${datos.pesoComida.toFixed(1)}g` : 'No disponible'}</p>
              <p><strong>Contenedor de agua:</strong> {datos.pesoAgua ? `${datos.pesoAgua.toFixed(1)}g` : 'No disponible'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Función auxiliar para formatear el tiempo
const formatTime = (milliseconds) => {
  if (!milliseconds) return 'No disponible';
  
  const seconds = Math.floor(milliseconds / 1000);
  if (seconds < 60) return `Hace ${seconds} segundos`;
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Hace ${minutes} minutos`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} horas`;
  
  const days = Math.floor(hours / 24);
  return `Hace ${days} días`;
};

export default UserDashboard;