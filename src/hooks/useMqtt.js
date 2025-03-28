import { useState, useEffect, useRef } from 'react';
import MQTT from 'mqtt';

export const useMqtt = (macAddress) => {
    const [datos, setDatos] = useState({
        bombaAgua: false,
        ultimaComida: undefined,
        // Nuevos valores de los contenedores
        pesoComida: 0,
        pesoAgua: 0,
        balanzaComidaLista: false,
        balanzaAguaLista: false,
        platoComidaLleno: false,
        platoAguaLleno: false
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
                      type === 'warning' ? '⚠ ' : 'ℹ ';
        console.log(`${prefix} MQTT [${type}]: ${message}`);
    };

    // Funciones de control mejoradas con manejo de errores
    const dispensarComida = () => {
        if (!clientRef.current || !conectado || !macAddress) {
            logDebug("No se puede dispensar comida: cliente no disponible o no conectado", 'error');
            return false;
        }
        
        try {
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
            username: "esp32",
            password: "esp32",
            clientId: `web-${macAddress}-${Math.random().toString(16).substr(2, 8)}-${connectionAttemptRef.current}`,
            clean: true,
            reconnectPeriod: 5000,
            connectTimeout: 30000,
            rejectUnauthorized: false // Ignora errores de certificados
        };

        // Intentar primero con WebSocket normal (WS) - puerto 8083
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
                
                // Suscribirse a los tópicos
                const topics = [
                    `mascota/estado/${macAddress}`,
                    `mascota/confirmacion/${macAddress}`,
                    `mascota/pong/${macAddress}`
                ];

                topics.forEach(topic => {
                    clientRef.current.subscribe(topic, (err) => {
                        if (err) {
                            logDebug(`Error al suscribirse a ${topic}: ${err.message}`, 'error');
                        } else {
                            logDebug(`Suscrito a ${topic}`, 'success');
                        }
                    });
                });

                // Enviar ping inicial para verificar que el dispositivo está online
                clientRef.current.publish(
                    `mascota/ping/${macAddress}`,
                    "web-client-ping"
                );
            });

            clientRef.current.on('reconnect', () => {
                logDebug("Reconectando al broker MQTT...", 'warning');
                setConectado(false);
            });

            clientRef.current.on('offline', () => {
                logDebug("Cliente MQTT desconectado", 'warning');
                setConectado(false);
            });

            clientRef.current.on('error', (err) => {
                logDebug(`Error MQTT: ${err.message}`, 'error');
                setError(`Error de conexión: ${err.message}`);
            });

            clientRef.current.on('message', (topic, message) => {
                const messageStr = message.toString();
                logDebug(`Mensaje recibido [${topic}]: ${messageStr}`, 'info');
                
                // Procesar mensaje según el tópico
                if (topic === `mascota/estado/${macAddress}`) {
                    try {
                        const payload = JSON.parse(messageStr);
                        
                        // Actualizar los datos, incluyendo los valores de los contenedores
                        setDatos({
                            bombaAgua: payload.bombaAgua,
                            ultimaComida: payload.ultimaComida,
                            // Datos de los sensores de peso
                            pesoComida: payload.pesoComida || 0,
                            pesoAgua: payload.pesoAgua || 0,
                            balanzaComidaLista: payload.balanzaComidaLista || false,
                            balanzaAguaLista: payload.balanzaAguaLista || false,
                            
                            // Calcular si los platos están llenos basado en umbrales
                            // Estos umbrales coinciden con los del código Arduino
                            platoComidaLleno: (payload.pesoComida && payload.pesoComida > 50) || false,
                            platoAguaLleno: (payload.pesoAgua && payload.pesoAgua > 100) || false
                        });
                        
                        lastMessageTimeRef.current = Date.now();
                    } catch (error) {
                        logDebug(`Error al parsear mensaje JSON: ${error.message}`, 'error');
                    }
                } 
                else if (topic === `mascota/pong/${macAddress}`) {
                    logDebug("Dispositivo confirmó estar online", 'success');
                    lastMessageTimeRef.current = Date.now();
                }
                else if (topic === `mascota/confirmacion/${macAddress}`) {
                    logDebug(`Confirmación de acción: ${messageStr}`, 'success');
                    
                    // Actualizar estado si el mensaje es sobre la bomba de agua
                    if (messageStr === "agua:activada") {
                        setDatos(prevData => ({...prevData, bombaAgua: true}));
                    } else if (messageStr === "agua:desactivada") {
                        setDatos(prevData => ({...prevData, bombaAgua: false}));
                    }
                }
            });
            
        } catch (err) {
            logDebug(`Error al crear cliente MQTT: ${err.message}`, 'error');
            setError(`Error al inicializar conexión: ${err.message}`);
        }

        // Verificación periódica de la comunicación
        const intervalo = setInterval(() => {
            if (clientRef.current && clientRef.current.connected) {
                if (!lastMessageTimeRef.current || Date.now() - lastMessageTimeRef.current > 15000) {
                    logDebug("Enviando ping para verificar dispositivo", 'info');
                    
                    // Enviar ping para verificar que el dispositivo sigue online
                    clientRef.current.publish(
                        `mascota/ping/${macAddress}`,
                        "web-client-ping"
                    );
                    
                    // Si no hay respuesta en demasiado tiempo, mostrar advertencia
                    if (lastMessageTimeRef.current && Date.now() - lastMessageTimeRef.current > 30000) {
                        logDebug("Sin respuesta del dispositivo por más de 30 segundos", 'warning');
                        setError("Sin comunicación con el dispositivo");
                    }
                }
            } else {
                logDebug("Conexión MQTT perdida o no establecida", 'warning');
                setConectado(false);
            }
        }, 10000); // Verificar cada 10 segundos

        setLoading(false);

        return () => {
            logDebug("Limpiando recursos MQTT", 'info');
            clearInterval(intervalo);
            
            if (clientRef.current) {
                // Enviar mensaje de desconexión
                if (clientRef.current.connected) {
                    clientRef.current.publish(
                        `mascota/web/${macAddress}`,
                        JSON.stringify({status: "disconnected", timestamp: Date.now()})
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