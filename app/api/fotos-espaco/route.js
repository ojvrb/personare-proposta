import { crudHandlers } from "@/lib/crudApi";
export const { GET, POST } = crudHandlers("fotos_espaco", { mutateRoles: ["admin"] });
