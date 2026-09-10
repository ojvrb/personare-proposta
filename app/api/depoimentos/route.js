import { crudHandlers } from "@/lib/crudApi";
export const { GET, POST } = crudHandlers("depoimentos", { mutateRoles: ["admin"] });
