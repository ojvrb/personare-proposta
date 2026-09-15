import { crudHandlers } from "@/lib/crudApi";
export const { GET, POST } = crudHandlers("proposta_momentos", { mutateRoles: ["admin"], campos: ["foto_url", "frase", "depois_de", "ordem", "ativo"] });
