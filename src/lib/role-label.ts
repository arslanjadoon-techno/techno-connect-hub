import type { User } from "./types";

/** "Admin" for admin, "User • Finance", "State Manager • Texas", etc. */
export function roleSubLabel(user: Pick<User,
  "roleName" | "departmentName" | "department" | "stateName" | "districtName" | "marketName" | "storeName"
>): string {
  const map: Record<string, string> = {
    admin: "Admin",
    user: "User",
    manager: "Manager",
    state_manager: "State Manager",
    district_manager: "District Manager",
    market_manager: "Market Manager",
    store_manager: "Store Manager",
  };
  const role = map[user.roleName] ?? user.roleName;
  if (user.roleName === "admin") return role;
  let extra: string | undefined;
  switch (user.roleName) {
    case "user":
    case "manager":
      extra = user.departmentName || user.department;
      break;
    case "state_manager":
      extra = user.stateName;
      break;
    case "district_manager":
      extra = user.districtName;
      break;
    case "market_manager":
      extra = user.marketName;
      break;
    case "store_manager":
      extra = user.storeName;
      break;
  }
  return extra ? `${role} • ${extra}` : role;
}
