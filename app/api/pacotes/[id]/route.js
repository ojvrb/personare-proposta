import { crudHandlers } from "@/lib/crudApi";
export const { PATCH } = crudHandlers("pacotes", { mutateRoles: ["admin"] });
