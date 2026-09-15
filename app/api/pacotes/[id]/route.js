import { crudHandlers } from "@/lib/crudApi";
export const { PATCH } = crudHandlers("pacotes", { mutateRoles: ["admin"], campos: ["nome", "preco", "itens_inclusos", "itens_nao_inclusos", "ativo", "fotos", "ordem"] });
