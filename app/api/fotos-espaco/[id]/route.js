import { crudHandlers } from "@/lib/crudApi";
export const { PATCH, DELETE } = crudHandlers("fotos_espaco", { mutateRoles: ["admin"], campos: ["url", "legenda", "ordem", "ativo", "categoria"] });
