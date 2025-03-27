import { useState, useEffect, useRef } from 'react';
import MQTT from 'mqtt';

export const useMqtt = (macAddress) => {
    const [datos, setDatos] = useState({
        bombaAgua: false,
        ultimaComida: undefined
    });
    const [conectado, setConectado] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const clientRef = useRef(null);
    const lastMessageTimeRef = useRef(null);
    const connectionAttemptRef = useRef(0);

    // Función para agregar logs de depuración a la consola
    const logDebug = (message, type = 'info') => {
        const prefix = type === 'error' ? '❌ ' : 
                      type === 'success' ? '✅ ' : 
                      type === 'warning' ? '⚠️ ' : 'ℹ️ ';
        console.log(`${prefix} MQTT [${type}]: ${message}`);
    };

    // Funciones de control mejoradas con manejo de errores
    const dispensarComida = () => {
        if (!clientRef.current || !conectado || !macAddress) {
            logDebug("No se puede dispensar comida: cliente no disponible o no conectado", 'error');
            return false;
        }
        
        try {
            // Sin QoS para simplificar
            clientRef.current.publish(`mascota/comida/${macAddress}`, "dispensar");
            logDebug(`Publicado en mascota/comida/${macAddress}: dispensar`, 'success');
            return true;
        } catch (err) {
            logDebug(`Error al publicar mensaje de comida: ${err.message}`, 'error');
            return false;
        }
    };

    const controlarBombaAgua = (activar) => {
        if (!clientRef.current || !conectado || !macAddress) {
            logDebug("No se puede controlar bomba: cliente no disponible o no conectado", 'error');
            return false;
        }
        
        try {
            const message = activar ? "activar" : "desactivar";
            // Sin QoS para simplificar
            clientRef.current.publish(`mascota/agua/${macAddress}`, message);
            logDebug(`Publicado en mascota/agua/${macAddress}: ${message}`, 'success');
            return true;
        } catch (err) {
            logDebug(`Error al publicar mensaje de agua: ${err.message}`, 'error');
            return false;
        }
    };

    useEffect(() => {
        if (!macAddress) {
            logDebug("MAC Address no proporcionada", 'error');
            setError("MAC Address no proporcionada");
            setLoading(false);
            return;
        }

        logDebug(`Iniciando conexión MQTT para dispositivo: ${macAddress}`, 'info');

        // Cerrar cualquier conexión existente
        if (clientRef.current) {
            logDebug("Cerrando conexión MQTT existente", 'info');
            clientRef.current.end(true);
            clientRef.current = null;
        }

        // Incrementar contador de intentos
        connectionAttemptRef.current += 1;
        
        // Configuración base para MQTT
        const mqttConfig = {
            // IMPORTANTE: Usar credenciales alineadas con el ESP32
            username: "esp32",
            password: "esp32",
            clientId: `web-${macAddress}-${Math.random().toString(16).substr(2, 8)}-${connectionAttemptRef.current}`,
            clean: true,
            reconnectPeriod: 10000,
            connectTimeout: 30000,
            rejectUnauthorized: false // Ignora errores de certificados
        };

        // IMPORTANTE: Usar WebSocket normal (no seguro) - puerto 8083
        // Este es el puerto más común para WebSockets en EMQX
        const brokerUrl = "ws://raba7554.ala.dedicated.aws.emqxcloud.com:8083/mqtt";
        
        logDebug(`Intentando conectar a: ${brokerUrl}`, 'info');
        
        try {
            // Crear cliente MQTT
            clientRef.current = MQTT.connect(brokerUrl, mqttConfig);
            
            // Configurar handlers de eventos
            clientRef.current.on('connect', () => {
                logDebug(`Conectado al broker MQTT: ${brokerUrl}`, 'success');
                setConectado(true);
                setError(null);
                
                // Suscribirse al tópico de estado
                const estadoTopic = `mascota/estado/${macAddress}`;
                clientRef.current.subscribe(estadoTopic, (err) => {
                    if (err) {
                        logDebug(`Error al suscribirse a ${estadoTopic}: ${err.message}`, 'error');
                    } else {
                        logDebug(`Suscrito a ${estadoTopic}`, 'success');
                    }
                });
                
                // También suscribirse al tópico de confirmación
                const confirmacionTopic = `mascota/confirmacion/${macAddress}`;
                clientRef.current.subscribe(confirmacionTopic);

                // Enviar ping inicial para verificar que el dispositivo está online
                clientRef.current.publish(
                    `mascota/ping/${macAddress}`,
                    "web-client-ping"
                );
            });

            clientRef.current.on('message', (topic, message) => {
                const messageStr = message.toString();
                logDebug(`Mensaje recibido [${topic}]: ${messageStr}`, 'info');
                
                if (topic === `mascota/estado/${macAddress}`) {
                    try {
                        const payload = JSON.parse(messageStr);
                        setDatos({
                            bombaAgua: payload.bombaAgua,
                            ultimaComida: payload.ultimaComida
                        });
                        lastMessageTimeRef.current = Date.now();
                    } catch (error) {
                        logDebug(`Error al parsear mensaje JSON: ${error.message}`, 'error');
                        setError("Error al procesar mensaje");
                    }
                }
            });

            clientRef.current.on('error', (err) => {
                logDebug(`Error MQTT: ${err.message}`, 'error');
                setError(`Error de conexión: ${err.message}`);
            });

            clientRef.current.on('close', () => {
                logDebug("Conexión MQTT cerrada", 'warning');
                setConectado(false);
            });
            
            clientRef.current.on('offline', () => {
                logDebug("Cliente MQTT desconectado", 'warning');
                setConectado(false);
            });
            
        } catch (err) {
            logDebug(`Error al crear cliente MQTT: ${err.message}`, 'error');
            setError(`Error al inicializar conexión: ${err.message}`);
        }

        // Verificación periódica de la comunicación
        const intervalo = setInterval(() => {
            if (lastMessageTimeRef.current && Date.now() - lastMessageTimeRef.current > 15000) {
                if (clientRef.current && clientRef.current.connected) {
                    logDebug("Sin mensajes recientes del dispositivo", 'warning');
                    setError("Sin comunicación con el dispositivo");
                } else {
                    logDebug("Conexión MQTT perdida", 'warning');
                    setConectado(false);
                }
            }
        }, 5000);

        setLoading(false);

        return () => {
            logDebug("Limpiando recursos MQTT", 'info');
            clearInterval(intervalo);
            
            if (clientRef.current) {
                clientRef.current.end();
            }
        };
    }, [macAddress]);

    return {
        datos,
        conectado,
        loading,
        error,
        dispensarComida,
        controlarBombaAgua
    };
};
