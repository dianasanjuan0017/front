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
  const [waterDispensing, setWaterDispensing] = useState(false);
  const [actionError, setActionError] = useState("");
  const [lastWaterDispensed, setLastWaterDispensed] = useState(
    localStorage.getItem('lastWaterDispensed') 
      ? parseInt(localStorage.getItem('lastWaterDispensed')) 
      : null
  );
  const [lastFoodDispensed, setLastFoodDispensed] = useState(() => {
    const storedValue = localStorage.getItem('lastFoodDispensed');
    // Validar que sea un timestamp razonable (no más antiguo que 30 días)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    if (storedValue && !isNaN(parseInt(storedValue)) && parseInt(storedValue) > thirtyDaysAgo) {
      return parseInt(storedValue);
    }
    // Si no hay valor o es inválido, lo inicializamos a null
    return null;
  });

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
      
      if (datos.bombaAgua) {
        setWaterDispensing(true);
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
      
      // Actualizar timestamps si vienen del dispositivo
      if (datos.ultimaComida && datos.ultimaComida > Date.now() - (30 * 24 * 60 * 60 * 1000)) {
        setLastFoodDispensed(datos.ultimaComida);
        localStorage.setItem('lastFoodDispensed', datos.ultimaComida.toString());
      }
      
      if (datos.ultimaAgua && datos.ultimaAgua > Date.now() - (30 * 24 * 60 * 60 * 1000)) {
        setLastWaterDispensed(datos.ultimaAgua);
        localStorage.setItem('lastWaterDispensed', datos.ultimaAgua.toString());
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
      // Actualizar el timestamp asegurando que usamos el tiempo actual
      const timestamp = Date.now();
      console.log("Actualizando timestamp de comida:", timestamp);
      
      // Eliminar cualquier valor anterior y establecer el nuevo
      localStorage.removeItem('lastFoodDispensed');
      localStorage.setItem('lastFoodDispensed', timestamp.toString());
      setLastFoodDispensed(timestamp);
      
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
    
    setWaterDispensing(true);
    const success = controlarBombaAgua(true);
    
    if (success) {
      // Actualizar el timestamp asegurando que usamos el tiempo actual
      const timestamp = Date.now();
      console.log("Actualizando timestamp de agua:", timestamp);
      
      // Eliminar cualquier valor anterior y establecer el nuevo
      localStorage.removeItem('lastWaterDispensed');
      localStorage.setItem('lastWaterDispensed', timestamp.toString());
      setLastWaterDispensed(timestamp);
      
      setTimeout(() => {
        controlarBombaAgua(false);
        setWaterDispensing(false);
      }, 5000);
    } else {
      setWaterDispensing(false);
      setActionError("Error al activar la bomba de agua");
    }
  };

  if (loading) {
    return <div className="IoT-loading">Cargando datos del dispositivo...</div>;
  }

  const foodContainerLevel = determinarNivelContenedor(datos.pesoComida);
  const waterContainerLevel = determinarNivelContenedor(datos.pesoAgua);

  // Hook para limpiar los valores corruptos al iniciar
  useEffect(() => {
    // Verificar y limpiar timestamps muy antiguos o inválidos al cargar el componente
    const currentTime = Date.now();
    const thirtyDaysAgo = currentTime - (30 * 24 * 60 * 60 * 1000);
    
    const storedFoodTime = localStorage.getItem('lastFoodDispensed');
    if (storedFoodTime && 
      (isNaN(parseInt(storedFoodTime)) || parseInt(storedFoodTime) < thirtyDaysAgo)) {
      console.log("Limpiando timestamp de comida inválido");
      localStorage.removeItem('lastFoodDispensed');
      setLastFoodDispensed(null);
    }
    
    const storedWaterTime = localStorage.getItem('lastWaterDispensed');
    if (storedWaterTime && 
      (isNaN(parseInt(storedWaterTime)) || parseInt(storedWaterTime) < thirtyDaysAgo)) {
      console.log("Limpiando timestamp de agua inválido");
      localStorage.removeItem('lastWaterDispensed');
      setLastWaterDispensed(null);
    }
  }, []);

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
        
        {error && <p className="IoT-error-message">Error de conexión: {error}</p>}
        {actionError && <p className="IoT-action-error">{actionError}</p>}
      </div>

      <div className="IoT-devices-container">
        <div className="IoT-device-card">
          <div className="IoT-device-icon-container">
            <div className={`IoT-tiger-icon ${foodDispensing ? 'IoT-active' : ''}`}></div>
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
                disabled={foodContainerLevel === "vacio" || foodDispensing || !conectado}
              >
                Dispensar Comida
              </button>
            </div>
          </div>
        </div>

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
        <div className="IoT-device-card">
          <div className="IoT-device-icon-container">
            <div className="IoT-container-icon IoT-tiger-food-container">
              <div className={`IoT-level-indicator IoT-${foodContainerLevel}`}></div>
            </div>
          </div>
          <div className="IoT-device-info">
            <h2>Contenedor de Comida</h2>
            {!datos.balanzaComidaLista && (
              <p className="IoT-sensor-warning">Sensor de peso no disponible</p>
            )}
          </div>
        </div>

        <div className="IoT-device-card">
          <div className="IoT-device-icon-container">
            <div className="IoT-container-icon IoT-water-container">
              <div className={`IoT-level-indicator IoT-${waterContainerLevel}`}></div>
            </div>
          </div>
          <div className="IoT-device-info">
            <h2>Contenedor de Agua</h2>
            {!datos.balanzaAguaLista && (
              <p className="IoT-sensor-warning">Sensor de peso no disponible</p>
            )}
          </div>
        </div>
      </div>

      <div className="IoT-devices-container">
        <div className="IoT-device-card IoT-sensor-info">
          <div className="IoT-device-info">
            <h2>Información</h2>
            <div className="IoT-sensor-data">
              <p>
                <strong>Comida:</strong> {lastFoodDispensed ? formatTime(lastFoodDispensed) : 'No disponible'}
              </p>
              <p>
                <strong>Agua:</strong> {lastWaterDispensed ? formatTime(lastWaterDispensed) : 'No disponible'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const formatTime = (milliseconds) => {
  if (!milliseconds) return 'No disponible';
  
  // Validar que el timestamp sea razonable (no más antiguo que 30 días)
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  if (milliseconds < thirtyDaysAgo) {
    return 'No disponible';
  }
  
  const seconds = Math.floor((Date.now() - milliseconds) / 1000);
  if (seconds < 0) return `Hace 0 segundos`; // En caso de problemas con el reloj del sistema
  if (seconds < 60) return `Hace ${seconds} segundos`;
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Hace ${minutes} minutos`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} horas`;
  
  const days = Math.floor(hours / 24);
  if (days > 30) return 'No disponible'; // Sanity check adicional
  return `Hace ${days} días`;
};

export default UserDashboard;