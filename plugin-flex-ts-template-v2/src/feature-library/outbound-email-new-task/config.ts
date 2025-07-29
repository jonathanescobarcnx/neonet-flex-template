import { getFeatureFlags } from '../../utils/configuration';
import OutboundEmailNewTaskConfig from './types/ServiceConfiguration';

const featureFlags = getFeatureFlags();

const outboundEmailConfig = featureFlags?.features?.outbound_email_new_task as OutboundEmailNewTaskConfig;

const { enabled = false, remitentes = [], dominio = '', colas_permitidas = [] } = outboundEmailConfig || {};


export const isFeatureEnabled = () => {
  return enabled;
};

export const getRemitentes = () => remitentes;
export const getDominio = () => dominio;
export const getColasPermitidas = () => colas_permitidas;
