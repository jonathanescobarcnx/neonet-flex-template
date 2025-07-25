import React, { useEffect, useState } from 'react';
import { Actions, Manager } from '@twilio/flex-ui';
import { obtenerColasTwilioFlex } from '../helpers/queues';
import { getRemitentes, getDominio } from '../config';
import './TwilioEmailForm.css';

const OutboundEmailForm = () => {
    const [colas, setColas] = useState([]);
    const [selectedQueueSid, setSelectedQueueSid] = useState('');

    // Obtener remitentes y dominio configurados
    const remitentes = getRemitentes();
    const dominio = getDominio();

    // Obtener correo del worker logueado y cambiarle el dominio
    const manager = Manager.getInstance();
    const workerEmail = manager.workerClient?.attributes?.email || '';
    let workerEmailWithDomain = '';
    if (workerEmail && dominio) {
        const [user] = workerEmail.split('@');
        workerEmailWithDomain = `${user}@${dominio}`;
    }

    useEffect(() => {
        const fetchColas = async () => {
            const result = await obtenerColasTwilioFlex();
            setColas(result);
            if (result.length > 0) setSelectedQueueSid(result[0].sid);
        };
        fetchColas();
    }, []);

    return (
        <form
            onSubmit={async e => {
                e.preventDefault();
                const form = e.target as any;
                await Actions.invokeAction("StartOutboundEmailTask", {
                    destination: form.to.value,
                    queueSid: form.queueSid.value,
                    from: form.from.value,
                    fromName: manager.workerClient?.attributes?.full_name || "",
                    taskAttributes: {}
                });
            }}
            className="twilio-form-container"
        >
            <label className="twilio-form-label">Cola:</label>
            <select
                name="queueSid"
                required
                className="twilio-form-select"
                value={selectedQueueSid}
                onChange={e => setSelectedQueueSid(e.target.value)}
                aria-label="Selecciona una cola"
                style={{ marginBottom: 16 }}
            >
                {colas.map((queue: any) => (
                    <option key={queue.sid} value={queue.sid}>
                        {queue.friendly_name}
                    </option>
                ))}
            </select>

            <label className="twilio-form-label">Remitente (from):</label>
            <select name="from" required className="twilio-form-select">
                {workerEmailWithDomain && (
                    <option value={workerEmailWithDomain}>{workerEmailWithDomain} (mi usuario)</option>
                )}
                {remitentes.filter(r => r !== workerEmailWithDomain).map(remitente => (
                    <option key={remitente} value={remitente}>{remitente}</option>
                ))}
            </select>

            <label className="twilio-form-label">Para (email cliente):</label>
            <input name="to" placeholder="Para (email cliente)" required className="twilio-form-input" />

            <button type="submit" className="twilio-form-button">
                Crear conversación de email
            </button>
        </form>
    );
};

export default OutboundEmailForm; 