export default interface OutboundEmailNewTaskConfig {
  enabled: boolean;
  remitentes?: string[];
  dominio?: string;
  colas_permitidas?: string[]; // Array de nombres de colas o SIDs permitidos
}
