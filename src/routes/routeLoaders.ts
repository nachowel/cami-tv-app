export const ADMIN_PANEL_ROUTE_IMPORT_PATH = "./AdminPanel";

export function loadAdminPanelRoute() {
  return import("./AdminPanel");
}
