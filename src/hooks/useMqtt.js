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
<<<<<<< HEAD
        console.log(`${prefix} MQTT [${type}]: ${message}`);
=======
        console.log(${prefix} MQTT [${type}]: ${message});
>>>>>>> 307b9c6ec49f2c88018ee2e733d12c16255072ce
    };

    // Funciones de control mejoradas con manejo de errores
    const dispensarComida = () => {
        if (!clientRef.current || !conectado || !macAddress) {
            logDebug("No se puede dispensar comida: cliente no disponible o no conectado", 'error');
            return false;
        }
        
        try {
<<<<<<< HEAD
            clientRef.current.publish(`mascota/comida/${macAddress}`, "dispensar");
            logDebug(`Publicado en mascota/comida/${macAddress}: dispensar`, 'success');
            return true;
        } catch (err) {
            logDebug(`Error al publicar mensaje de comida: ${err.message}`, 'error');
=======
            clientRef.current.publish(mascota/comida/${macAddress}, "dispensar");
            logDebug(Publicado en mascota/comida/${macAddress}: dispensar, 'success');
            return true;
        } catch (err) {
            logDebug(Error al publicar mensaje de comida: ${err.message}, 'error');
>>>>>>> 307b9c6ec49f2c88018ee2e733d12c16255072ce
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
<<<<<<< HEAD
            clientRef.current.publish(`mascota/agua/${macAddress}`, message);
            logDebug(`Publicado en mascota/agua/${macAddress}: ${message}`, 'success');
            return true;
        } catch (err) {
            logDebug(`Error al publicar mensaje de agua: ${err.message}`, 'error');
=======
            clientRef.current.publish(mascota/agua/${macAddress}, message);
            logDebug(Publicado en mascota/agua/${macAddress}: ${message}, 'success');
            return true;
        } catch (err) {
            logDebug(Error al publicar mensaje de agua: ${err.message}, 'error');
>>>>>>> 307b9c6ec49f2c88018ee2e733d12c16255072ce
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

<<<<<<< HEAD
        logDebug(`Iniciando conexión MQTT para dispositivo: ${macAddress}`, 'info');
=======
        logDebug(Iniciando conexión MQTT para dispositivo: ${macAddress}, 'info');
>>>>>>> 307b9c6ec49f2c88018ee2e733d12c16255072ce

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
<<<<<<< HEAD
            clientId: `web-${macAddress}-${Math.random().toString(16).substr(2, 8)}-${connectionAttemptRef.current}`,
=======
            clientId: web-${macAddress}-${Math.random().toString(16).substr(2, 8)}-${connectionAttemptRef.current},
>>>>>>> 307b9c6ec49f2c88018ee2e733d12c16255072ce
            clean: true,
            reconnectPeriod: 5000,
            connectTimeout: 30000,
            rejectUnauthorized: false // Ignora errores de certificados
        };

        // Intentar primero con WebSocket normal (WS) - puerto 8083
        const brokerUrl = "ws://raba7554.ala.dedicated.aws.emqxcloud.com:8083/mqtt";
        
<<<<<<< HEAD
        logDebug(`Intentando conectar a: ${brokerUrl}`, 'info');
=======
        logDebug(Intentando conectar a: ${brokerUrl}, 'info');
>>>>>>> 307b9c6ec49f2c88018ee2e733d12c16255072ce
        
        try {
            // Crear cliente MQTT
            clientRef.current = MQTT.connect(brokerUrl, mqttConfig);
            
            // Configurar handlers de eventos
            clientRef.current.on('connect', () => {
<<<<<<< HEAD
                logDebug(`Conectado al broker MQTT: ${brokerUrl}`, 'success');
=======
                logDebug(Conectado al broker MQTT: ${brokerUrl}, 'success');
>>>>>>> 307b9c6ec49f2c88018ee2e733d12c16255072ce
                setConectado(true);
                setError(null);
                
                // Suscribirse a los tópicos
                const topics = [
<<<<<<< HEAD
                    `mascota/estado/${macAddress}`,
                    `mascota/confirmacion/${macAddress}`,
                    `mascota/pong/${macAddress}`
=======
                    mascota/estado/${macAddress},
                    mascota/confirmacion/${macAddress},
                    mascota/pong/${macAddress}
>>>>>>> 307b9c6ec49f2c88018ee2e733d12c16255072ce
                ];

                topics.forEach(topic => {
                    clientRef.current.subscribe(topic, (err) => {
                        if (err) {
<<<<<<< HEAD
                            logDebug(`Error al suscribirse a ${topic}: ${err.message}`, 'error');
                        } else {
                            logDebug(`Suscrito a ${topic}`, 'success');
=======
                            logDebug(Error al suscribirse a ${topic}: ${err.message}, 'error');
                        } else {
                            logDebug(Suscrito a ${topic}, 'success');
>>>>>>> 307b9c6ec49f2c88018ee2e733d12c16255072ce
                        }
                    });
                });

                // Enviar ping inicial para verificar que el dispositivo está online
                clientRef.current.publish(
<<<<<<< HEAD
                    `mascota/ping/${macAddress}`,
=======
                    mascota/ping/${macAddress},
>>>>>>> 307b9c6ec49f2c88018ee2e733d12c16255072ce
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
<<<<<<< HEAD
                logDebug(`Error MQTT: ${err.message}`, 'error');
                setError(`Error de conexión: ${err.message}`);
=======
                logDebug(Error MQTT: ${err.message}, 'error');
                setError(Error de conexión: ${err.message});
>>>>>>> 307b9c6ec49f2c88018ee2e733d12c16255072ce
            });

            clientRef.current.on('message', (topic, message) => {
                const messageStr = message.toString();
<<<<<<< HEAD
                logDebug(`Mensaje recibido [${topic}]: ${messageStr}`, 'info');
                
                // Procesar mensaje según el tópico
                if (topic === `mascota/estado/${macAddress}`) {
=======
                logDebug(Mensaje recibido [${topic}]: ${messageStr}, 'info');
                
                // Procesar mensaje según el tópico
                if (topic === mascota/estado/${macAddress}) {
>>>>>>> 307b9c6ec49f2c88018ee2e733d12c16255072ce
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
<<<<<<< HEAD
                        logDebug(`Error al parsear mensaje JSON: ${error.message}`, 'error');
                    }
                } 
                else if (topic === `mascota/pong/${macAddress}`) {
                    logDebug("Dispositivo confirmó estar online", 'success');
                    lastMessageTimeRef.current = Date.now();
                }
                else if (topic === `mascota/confirmacion/${macAddress}`) {
                    logDebug(`Confirmación de acción: ${messageStr}`, 'success');
=======
                        logDebug(Error al parsear mensaje JSON: ${error.message}, 'error');
                    }
                } 
                else if (topic === mascota/pong/${macAddress}) {
                    logDebug("Dispositivo confirmó estar online", 'success');
                    lastMessageTimeRef.current = Date.now();
                }
                else if (topic === mascota/confirmacion/${macAddress}) {
                    logDebug(Confirmación de acción: ${messageStr}, 'success');
>>>>>>> 307b9c6ec49f2c88018ee2e733d12c16255072ce
                    
                    // Actualizar estado si el mensaje es sobre la bomba de agua
                    if (messageStr === "agua:activada") {
                        setDatos(prevData => ({...prevData, bombaAgua: true}));
                    } else if (messageStr === "agua:desactivada") {
                        setDatos(prevData => ({...prevData, bombaAgua: false}));
                    }
                }
            });
            
        } catch (err) {
<<<<<<< HEAD
            logDebug(`Error al crear cliente MQTT: ${err.message}`, 'error');
            setError(`Error al inicializar conexión: ${err.message}`);
=======
            logDebug(Error al crear cliente MQTT: ${err.message}, 'error');
            setError(Error al inicializar conexión: ${err.message});
>>>>>>> 307b9c6ec49f2c88018ee2e733d12c16255072ce
        }

        // Verificación periódica de la comunicación
        const intervalo = setInterval(() => {
            if (clientRef.current && clientRef.current.connected) {
                if (!lastMessageTimeRef.current || Date.now() - lastMessageTimeRef.current > 15000) {
                    logDebug("Enviando ping para verificar dispositivo", 'info');
                    
                    // Enviar ping para verificar que el dispositivo sigue online
                    clientRef.current.publish(
<<<<<<< HEAD
                        `mascota/ping/${macAddress}`,
=======
                        mascota/ping/${macAddress},
>>>>>>> 307b9c6ec49f2c88018ee2e733d12c16255072ce
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
<<<<<<< HEAD
                        `mascota/web/${macAddress}`,
=======
                        mascota/web/${macAddress},
>>>>>>> 307b9c6ec49f2c88018ee2e733d12c16255072ce
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
