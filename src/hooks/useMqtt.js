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

    // Funciones de control mejoradas con manejo de errores
    const dispensarComida = () => {
        if (!clientRef.current || !conectado || !macAddress) {
            console.error("No se puede dispensar comida: cliente no disponible o no conectado");
            return false;
        }
        
        try {
            // Usar QoS 1 para asegurar la entrega
            clientRef.current.publish(`mascota/comida/${macAddress}`, "dispensar", { qos: 1 });
            console.log(`Publicado en mascota/comida/${macAddress}: dispensar`);
            return true;
        } catch (err) {
            console.error("Error al publicar mensaje de comida:", err);
            return false;
        }
    };

    const controlarBombaAgua = (activar) => {
        if (!clientRef.current || !conectado || !macAddress) {
            console.error("No se puede controlar bomba: cliente no disponible o no conectado");
            return false;
        }
        
        try {
            const message = activar ? "activar" : "desactivar";
            // Usar QoS 1 para asegurar la entrega
            clientRef.current.publish(`mascota/agua/${macAddress}`, message, { qos: 1 });
            console.log(`Publicado en mascota/agua/${macAddress}: ${message}`);
            return true;
        } catch (err) {
            console.error("Error al publicar mensaje de agua:", err);
            return false;
        }
    };

    useEffect(() => {
        if (!macAddress) {
            console.error("MAC Address no proporcionada");
            setError("MAC Address no proporcionada");
            setLoading(false);
            return;
        }

        console.log(`Iniciando conexión MQTT para dispositivo: ${macAddress}`);

        // Verificar si ya hay un cliente existente y terminarlo
        if (clientRef.current) {
            console.log("Cerrando conexión MQTT existente");
            clientRef.current.end(true);
            clientRef.current = null;
        }

        // Configuración para el broker MQTT
        // IMPORTANTE: Estos valores deben coincidir con los del ESP32
        const mqttConfig = {
            // Usar las mismas credenciales que en el ESP32
            username: "esp32",  // <-- DEBE COINCIDIR con el ESP32
            password: "esp32",  // <-- DEBE COINCIDIR con el ESP32
            clientId: `web-${macAddress}-${Math.random().toString(16).substr(2, 8)}`,
            clean: true,
            reconnectPeriod: 5000,
            connectTimeout: 10000,
            rejectUnauthorized: false
        };

        // Intentar primero conexión WSS (WebSocket Secure)
        console.log("Intentando conexión MQTT via WSS...");
        
        // IMPORTANTE: Puerto 8084 para WSS, asegúrate que este puerto esté habilitado en tu broker
        const brokerUrl = "wss://raba7554.ala.dedicated.aws.emqxcloud.com:8084/mqtt";
        
        try {
            clientRef.current = MQTT.connect(brokerUrl, mqttConfig);
            
            clientRef.current.on('connect', () => {
                console.log("Conectado al broker MQTT");
                setConectado(true);
                
                // Suscribirse al tópico de estado
                const estadoTopic = `mascota/estado/${macAddress}`;
                console.log(`Suscribiéndose a: ${estadoTopic}`);
                
                clientRef.current.subscribe(estadoTopic, { qos: 1 }, (err) => {
                    if (err) {
                        console.error("Error al suscribirse:", err);
                        setError(`Error al suscribirse: ${err.message}`);
                    } else {
                        console.log("Suscripción exitosa");
                        setError(null);
                    }
                });
                
                // También suscribirse al tópico de confirmación
                const confirmacionTopic = `mascota/confirmacion/${macAddress}`;
                clientRef.current.subscribe(confirmacionTopic, { qos: 1 });
                
                // Publicar un mensaje de presencia al conectar
                clientRef.current.publish(
                    `mascota/web/${macAddress}`, 
                    JSON.stringify({status: "connected", timestamp: Date.now()}),
                    { qos: 1 }
                );
            });

            clientRef.current.on('reconnect', () => {
                console.log("Reconectando al broker MQTT...");
                setConectado(false);
            });

            clientRef.current.on('error', (err) => {
                console.error("Error MQTT:", err);
                setError(`Error de conexión MQTT: ${err.message}`);
                setConectado(false);
            });

            clientRef.current.on('message', (topic, message) => {
                const messageStr = message.toString();
                console.log(`Mensaje recibido [${topic}]: ${messageStr}`);
                
                if (topic === `mascota/estado/${macAddress}`) {
                    try {
                        const payload = JSON.parse(messageStr);
                        console.log("Datos recibidos:", payload);
                        setDatos({
                            bombaAgua: payload.bombaAgua,
                            ultimaComida: payload.ultimaComida
                        });
                        lastMessageTimeRef.current = Date.now();
                    } catch (error) {
                        console.error("Error al parsear mensaje JSON:", error);
                        setError("Error al procesar mensaje: formato inválido");
                    }
                } else if (topic === `mascota/confirmacion/${macAddress}`) {
                    console.log("Confirmación recibida:", messageStr);
                }
            });

            clientRef.current.on('offline', () => {
                console.log("Cliente MQTT desconectado");
                setConectado(false);
            });
        } catch (err) {
            console.error("Error al crear cliente MQTT:", err);
            setError(`Error al inicializar MQTT: ${err.message}`);
            setConectado(false);
        }

        // Verificación periódica de conexión activa
        const intervalo = setInterval(() => {
            if (lastMessageTimeRef.current && Date.now() - lastMessageTimeRef.current > 15000) {
                console.log("Sin mensajes recientes del dispositivo");
                setError("Sin comunicación con el dispositivo");
                
                // Mantener la conexión MQTT pero indicar que el dispositivo no responde
                if (clientRef.current && clientRef.current.connected) {
                    console.log("Cliente MQTT conectado pero dispositivo no responde");
                } else {
                    setConectado(false);
                }
            }
        }, 5000);

        // Intentar un ping inicial al dispositivo
        const pingTimeout = setTimeout(() => {
            if (clientRef.current && clientRef.current.connected) {
                clientRef.current.publish(
                    `mascota/ping/${macAddress}`, 
                    "web-client-ping",
                    { qos: 1 }
                );
            }
        }, 2000);

        setLoading(false);

        return () => {
            console.log("Limpiando recursos MQTT");
            clearInterval(intervalo);
            clearTimeout(pingTimeout);
            
            if (clientRef.current) {
                // Publicar mensaje de desconexión antes de cerrar
                if (clientRef.current.connected) {
                    clientRef.current.publish(
                        `mascota/web/${macAddress}`,
                        JSON.stringify({status: "disconnected", timestamp: Date.now()}),
                        { qos: 1 }
                    );
                }
                
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
