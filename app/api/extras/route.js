import { crudHandlers } from "@/lib/crudApi";
export const { GET, POST } = crudHandlers("extras", { mutateRoles: ["admin"] });
