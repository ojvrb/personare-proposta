import { crudHandlers } from "@/lib/crudApi";
export const { PATCH, DELETE } = crudHandlers("proposta_momentos", { mutateRoles: ["admin"], campos: ["foto_url", "frase", "depois_de", "ordem", "ativo"] });
