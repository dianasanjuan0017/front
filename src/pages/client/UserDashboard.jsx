import React, { useState, useEffect } from "react";
import { useParams } from 'react-router-dom';
import { useMqtt } from '../../hooks/useMqtt';
 // Asegúrate que la ruta sea correcta

const UserDashboard = () => {
  const { id } = useParams(); // Obtener el ID del dispositivo (MAC Address) de los parámetros
  const macAddress = id || ""; // Usar el ID, o una cadena vacía si no está disponible
  
  // Usar el hook MQTT optimizado
  const { datos, conectado, loading, error, dispensarComida, controlarBombaAgua } = useMqtt(macAddress);
  
  // Estado para los niveles del plato de comida y agua
  const [foodBowlLevel, setFoodBowlLevel] = useState("vacio");
  const [waterBowlLevel, setWaterBowlLevel] = useState("vacio");
  
  // Estado de dispensación
  const [foodDispensing, setFoodDispensing] = useState(false);
  
  // Indicador de error temporal para mostrar al usuario
  const [actionError, setActionError] = useState("");

  // Función para convertir valores numéricos a niveles visuales (vacío, medio, lleno)
  // Usando la lógica del semáforo para determinar niveles
  const determinarNivelContenedor = (distancia) => {
    if (!distancia) return "vacio";
    if (distancia >= 2 && distancia <= 10) {
      return "lleno";
    } else if (distancia >= 11 && distancia <= 18) {
      return "medio";
    } else if (distancia > 18) {
      return "vacio";
    }
    return "vacio"; // Por defecto si no cumple ninguna condición
  };

  // Limpiar errores temporales después de un tiempo
  useEffect(() => {
    if (actionError) {
      const timer = setTimeout(() => {
        setActionError("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [actionError]);

  // Actualizar el estado basado en los datos MQTT
  useEffect(() => {
    if (!loading && datos) {
      // Actualizar estado de dispensación de agua
      setFoodDispensing(false); // Reset food dispensing if needed
      
      // Si la bomba está activa, actualizar estado del plato de agua
      if (datos.bombaAgua && waterBowlLevel !== "lleno") {
        const nextLevel = waterBowlLevel === "vacio" ? "medio" : "lleno";
        setWaterBowlLevel(nextLevel);
      }
      
      // Actualizar plato de comida basado en los datos de los sensores (usando lógica del semáforo)
      if (datos.platoComidaLleno) {
        setFoodBowlLevel("lleno");
      } else {
        // Usar la distancia como sensor para el plato de comida
        const distanciaComida = datos.pesoComida; // Asumimos que pesoComida contiene la distancia
        setFoodBowlLevel(determinarNivelContenedor(distanciaComida));
      }
      
      // Actualizar plato de agua basado en los datos de los sensores (usando lógica del semáforo)
      if (datos.platoAguaLleno) {
        setWaterBowlLevel("lleno");
      } else {
        // Usar la distancia como sensor para el plato de agua
        const distanciaAgua = datos.pesoAgua; // Asumimos que pesoAgua contiene la distancia
        setWaterBowlLevel(determinarNivelContenedor(distanciaAgua));
      }
    }
  }, [datos, loading, waterBowlLevel]);

  // Manejar la dispensación de comida
  const handleDispenseFood = () => {
    // Validar condiciones según la nueva lógica de semáforo
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
    
    // Activar indicador visual inmediatamente
    setFoodDispensing(true);
    
    // Intentar dispensar comida a través de MQTT
    const success = dispensarComida();
    
    if (success) {
      // La respuesta real vendrá por MQTT, pero mantenemos el indicador
      // visual por un tiempo para dar feedback al usuario
      setTimeout(() => {
        setFoodDispensing(false);
      }, 3000);
    } else {
      // Si hay error, restaurar estado y mostrar mensaje
      setFoodDispensing(false);
      setActionError("Error al enviar comando de comida");
    }
  };

  // Manejar la dispensación de agua
 // Manejar la dispensación de agua
const handleDispenseWater = () => {
  // Validar condiciones según la nueva lógica de semáforo
  if (!datos.pesoAgua || datos.pesoAgua > 18) {
    setActionError("El contenedor de agua está vacío");
    return;
  }
  
  if (!conectado) {
    setActionError("No hay conexión con el dispositivo");
    return;
  }
  
  // Similar a la dispensación de comida, activamos la bomba temporalmente
  const success = controlarBombaAgua(true);
  
  if (success) {
    // La bomba se desactivará automáticamente después de un tiempo
    // El estado real se actualizará mediante MQTT
    setTimeout(() => {
      // Opcional: podríamos desactivar explícitamente después de un tiempo
      // controlarBombaAgua(false);
      // Pero es mejor que el dispositivo lo maneje
    }, 3000);
  } else {
    setActionError("Error al activar bomba de agua");
  }
};


  // Reiniciar el plato de comida (simulando que la mascota come)
  // Esto es solo para la interfaz, no afecta al dispositivo real
  const resetFoodBowl = () => {
    setFoodBowlLevel("vacio");
  };

  // Reiniciar el plato de agua (simulando que la mascota bebe)
  // Esto es solo para la interfaz, no afecta al dispositivo real
  const resetWaterBowl = () => {
    setWaterBowlLevel("vacio");
  };

  if (loading) {
    return <div className="IoT-loading">Cargando datos del dispositivo...</div>;
  }

  // Determinar niveles de contenedores basados en los valores de distancia
  // Usando la lógica del semáforo
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

        {/* Tarjeta del Dispensador de Agua */}
        <div className="IoT-device-card">
          <div className="IoT-device-icon-container">
            <div className={`IoT-water-icon ${datos.bombaAgua ? 'IoT-active' : ''}`}></div>
          </div>
          <div className="IoT-device-info">
            <h2>Dispensador de Agua</h2>
            <div className="IoT-status-display">
              <span className="IoT-label">Estado:</span>
              <span className={`IoT-status-badge ${datos.bombaAgua ? 'IoT-active' : 'IoT-inactive'}`}>
                {datos.bombaAgua ? 'Dispensando' : 'Inactivo'}
              </span>
            </div>
            <div className="IoT-control-buttons">
              {/* Cambio en el botón para que siempre diga "Dispensar Agua" */}
          <button 
            className="IoT-control-btn IoT-on-btn" 
            onClick={handleDispenseWater}
            disabled={waterContainerLevel === "vacio" || !conectado || datos.bombaAgua}
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
            <div className="IoT-container-icon IoT-tiger-food-container">
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
                disabled={foodBowlLevel === "vacio"}
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
                disabled={waterBowlLevel === "vacio"}
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
