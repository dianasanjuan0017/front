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

    // Funciones de control (dispensarComida y controlarBombaAgua permanecen igual)
    const dispensarComida = () => {
        if (!clientRef.current || !conectado || !macAddress) return false;
        clientRef.current.publish(`mascota/comida/${macAddress}`, "dispensar");
        return true;
    };

    const controlarBombaAgua = (activar) => {
        if (!clientRef.current || !conectado || !macAddress) return false;
        clientRef.current.publish(`mascota/agua/${macAddress}`, activar ? "activar" : "desactivar");
        return true;
    };

    useEffect(() => {
        if (!macAddress) {
            setError("MAC Address no proporcionada");
            setLoading(false);
            return;
        }

        const mqttOptions = {
            clientId: `pet-feeder-${macAddress}-${Math.random().toString(16).substr(2, 8)}`,
            username: process.env.REACT_APP_MQTT_USERNAME || "moy19",
            password: process.env.REACT_APP_MQTT_PASSWORD || "moy19",
            clean: true,
            reconnectPeriod: 5000,
            connectTimeout: 10000,
            rejectUnauthorized: false, // Solo para desarrollo
            protocol: 'wss'
        };

        // URL CORREGIDA con puerto 8084 para wss
        const brokerUrl = "wss://raba7554.ala.dedicated.aws.emqxcloud.com:8084/mqtt";

        clientRef.current = MQTT.connect(brokerUrl, mqttOptions);

        // Resto del código de conexión y manejo de eventos permanece igual
        clientRef.current.on('connect', () => {
            console.log("Conectado al broker MQTT");
            const estadoTopic = `mascota/estado/${macAddress}`;
            clientRef.current.subscribe(estadoTopic, (err) => {
                if (err) {
                    setError("Error al suscribirse");
                    setConectado(false);
                } else {
                    setConectado(true);
                    setError(null);
                }
            });
        });

        clientRef.current.on('message', (topic, message) => {
            if (topic === `mascota/estado/${macAddress}`) {
                try {
                    const payload = JSON.parse(message.toString());
                    setDatos({
                        bombaAgua: payload.bombaAgua,
                        ultimaComida: payload.ultimaComida
                    });
                    lastMessageTimeRef.current = Date.now();
                } catch (error) {
                    setError("Error al procesar mensaje");
                }
            }
        });

        clientRef.current.on('error', (err) => {
            setError(`Error de conexión: ${err.message}`);
            setConectado(false);
        });

        const intervalo = setInterval(() => {
            if (lastMessageTimeRef.current && Date.now() - lastMessageTimeRef.current > 15000) {
                setConectado(false);
                setError("Timeout: No hay comunicación con el dispositivo");
            }
        }, 5000);

        setLoading(false);

        return () => {
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