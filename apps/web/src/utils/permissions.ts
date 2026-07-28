export interface PermissionValues {
  canManageMoney: boolean;
  canManageActions: boolean;
  canManageSettings: boolean;
  canManageFamily: boolean;
}

export const FULL_PERMISSIONS: PermissionValues = {
  canManageMoney: true,
  canManageActions: true,
  canManageSettings: true,
  canManageFamily: true,
};
