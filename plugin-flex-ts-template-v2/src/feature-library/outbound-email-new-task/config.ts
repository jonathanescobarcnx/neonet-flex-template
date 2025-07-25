import { getFeatureFlags } from '../../utils/configuration';
import OutboundEmailNewTaskConfig from './types/ServiceConfiguration';

const { enabled = false, remitentes = [] } = (getFeatureFlags()?.features?.outbound_email_new_task as OutboundEmailNewTaskConfig) || {};

export const isFeatureEnabled = () => {
  return enabled;
};

export const getRemitentes = () => remitentes;
