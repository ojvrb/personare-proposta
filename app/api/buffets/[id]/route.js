import { crudHandlers } from "@/lib/crudApi";
export const { PATCH } = crudHandlers("buffets", { mutateRoles: ["admin"], campos: ["nome", "preco_pessoa", "descricao", "ativo", "fotos", "itens_entrada", "itens_prato", "itens_sobremesa", "ordem"] });
