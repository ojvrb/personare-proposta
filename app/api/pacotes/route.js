import { crudHandlers } from "@/lib/crudApi";
export const { GET, POST } = crudHandlers("pacotes", { mutateRoles: ["admin"], campos: ["nome", "preco", "itens_inclusos", "itens_nao_inclusos", "ativo", "fotos", "ordem"] });
