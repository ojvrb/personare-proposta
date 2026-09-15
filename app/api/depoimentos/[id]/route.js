import { crudHandlers } from "@/lib/crudApi";
export const { PATCH, DELETE } = crudHandlers("depoimentos", { mutateRoles: ["admin"], campos: ["autor_nome", "texto", "foto", "evento_tipos", "ativo", "ordem"] });
