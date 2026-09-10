import { crudHandlers } from "@/lib/crudApi";
export const { PATCH, DELETE } = crudHandlers("depoimentos", { mutateRoles: ["admin"] });
