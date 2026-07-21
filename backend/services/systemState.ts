let isMaintenanceMode = false;
let isSecurityShieldEnabled = true;

export function getMaintenanceMode(): boolean {
  return isMaintenanceMode;
}

export function setMaintenanceMode(val: boolean): boolean {
  isMaintenanceMode = val;
  return isMaintenanceMode;
}

export function toggleMaintenanceMode(): boolean {
  isMaintenanceMode = !isMaintenanceMode;
  return isMaintenanceMode;
}

export function getSecurityShield(): boolean {
  return isSecurityShieldEnabled;
}

export function toggleSecurityShield(): boolean {
  isSecurityShieldEnabled = !isSecurityShieldEnabled;
  return isSecurityShieldEnabled;
}
