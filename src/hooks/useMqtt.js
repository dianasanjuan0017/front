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
    const reconnectTimeoutRef = useRef(null);
    const maxReconnectAttempts = 5;

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

    // Función para establecer conexión MQTT con reintentos
    const setupMqttConnection = (attempt = 0) => {
        // Limpiar cualquier intento de reconexión pendiente
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        if (attempt >= maxReconnectAttempts) {
            logDebug(`Máximo número de intentos (${maxReconnectAttempts}) alcanzado. Deteniendo reintentos.`, 'error');
            setError("No se pudo establecer conexión después de varios intentos");
            setLoading(false);
            return;
        }

        // Cerrar cualquier conexión existente
        if (clientRef.current) {
            logDebug("Cerrando conexión MQTT existente", 'info');
            clientRef.current.end(true);
            clientRef.current = null;
        }

        // Incrementar contador de intentos
        connectionAttemptRef.current = attempt + 1;
        
        // Configuración base para MQTT con opciones adicionales para mejorar la estabilidad
        const mqttConfig = {
            username: "esp32",
            password: "esp32",
            clientId: `web-${macAddress}-${Math.random().toString(16).substr(2, 8)}-${connectionAttemptRef.current}`,
            clean: true,
            reconnectPeriod: 5000,
            connectTimeout: 30000,
            keepalive: 60,
            rejectUnauthorized: false, // Ignora errores de certificados
            protocolVersion: 4, // Asegura el uso de MQTT v3.1.1
            protocolId: 'MQTT',
            will: { // Mensaje Last Will and Testament para detectar desconexiones abruptas
                topic: `mascota/web/${macAddress}/estado`,
                payload: JSON.stringify({status: "disconnected_unexpectedly", timestamp: Date.now()}),
                qos: 1,
                retain: false
            }
        };

        // Definir las URLs para intentar, primero WSS, luego WS como fallback
        const brokerUrls = [
            // Intento 1: WSS estándar puerto 8084
            "wss://raba7554.ala.dedicated.aws.emqxcloud.com:8084/mqtt",
            // Intento 2: WSS estándar en puerto alternativo 443 (a veces disponible)
            "wss://raba7554.ala.dedicated.aws.emqxcloud.com:443/mqtt",
            // Intento 3: Última opción - WS inseguro (solo si estamos en HTTP)
            window.location.protocol === 'http:' ? "ws://raba7554.ala.dedicated.aws.emqxcloud.com:8083/mqtt" : null
        ].filter(Boolean); // Eliminar entradas nulas
        
        const brokerUrl = brokerUrls[attempt % brokerUrls.length];
        
        logDebug(`Intento ${attempt + 1}/${maxReconnectAttempts}: Conectando a ${brokerUrl}`, 'info');
        
        try {
            // Crear cliente MQTT
            clientRef.current = MQTT.connect(brokerUrl, mqttConfig);
            
            // Configurar timeout para este intento
            const connectionTimeout = setTimeout(() => {
                if (clientRef.current && !clientRef.current.connected) {
                    logDebug(`Timeout en intento ${attempt + 1}. Intentando siguiente opción...`, 'warning');
                    // Forzar desconexión y probar siguiente opción
                    if (clientRef.current) {
                        clientRef.current.end(true);
                        clientRef.current = null;
                    }
                    
                    // Programar próximo intento con retraso exponencial
                    const nextAttemptDelay = Math.min(1000 * Math.pow(2, attempt), 30000); // Max 30 segundos
                    logDebug(`Programando reconexión en ${nextAttemptDelay}ms`, 'info');
                    reconnectTimeoutRef.current = setTimeout(() => setupMqttConnection(attempt + 1), nextAttemptDelay);
                }
            }, 15000); // 15 segundos para cada intento
            
            // Configurar handlers de eventos
            clientRef.current.on('connect', () => {
                logDebug(`Conectado al broker MQTT: ${brokerUrl}`, 'success');
                clearTimeout(connectionTimeout);
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

            clientRef.current.on('close', () => {
                logDebug("Conexión MQTT cerrada", 'warning');
                setConectado(false);
            });

            clientRef.current.on('error', (err) => {
                logDebug(`Error MQTT: ${err.message}`, 'error');
                setError(`Error de conexión: ${err.message}`);
                
                // Si hay un error que impide la conexión, intentar siguiente opción más rápido
                if (err.message.includes('ENOTFOUND') || 
                    err.message.includes('ECONNREFUSED') || 
                    err.message.includes('WebSocket') ||
                    err.message.includes('timeout')) {
                    
                    clearTimeout(connectionTimeout);
                    
                    // Desconectar cliente actual
                    if (clientRef.current) {
                        clientRef.current.end(true);
                        clientRef.current = null;
                    }
                    
                    // Programar próximo intento con retraso mínimo
                    logDebug("Error de conexión crítico. Intentando siguiente opción...", 'warning');
                    reconnectTimeoutRef.current = setTimeout(() => setupMqttConnection(attempt + 1), 1000);
                }
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
            
            // Programar próximo intento
            reconnectTimeoutRef.current = setTimeout(() => setupMqttConnection(attempt + 1), 2000);
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
        
        // Iniciar proceso de conexión
        setupMqttConnection(0);

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
                
                // Reintentar conexión automáticamente si se pierde
                if (connectionAttemptRef.current < maxReconnectAttempts && !reconnectTimeoutRef.current) {
                    logDebug("Programando reconexión automática...", 'info');
                    reconnectTimeoutRef.current = setTimeout(() => setupMqttConnection(0), 5000);
                }
            }
        }, 10000); // Verificar cada 10 segundos

        setLoading(false);

        return () => {
            logDebug("Limpiando recursos MQTT", 'info');
            clearInterval(intervalo);
            
            // Limpiar timeout de reconexión si existe
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            
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
