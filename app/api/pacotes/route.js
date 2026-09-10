import { crudHandlers } from "@/lib/crudApi";
export const { GET, POST } = crudHandlers("pacotes", { mutateRoles: ["admin"] });
