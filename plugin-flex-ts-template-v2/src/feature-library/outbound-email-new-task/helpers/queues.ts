import { Manager } from '@twilio/flex-ui';

export async function obtenerColasTwilioFlex() {
    try {
        const response = await fetch('https://email-uat-5241.twil.io/get_queues');
        if (response.ok) {
            return JSON.parse(await response.text());
        }
        return [];
    } catch {
        return [];
    }
} 