import { crudHandlers } from "@/lib/crudApi";
export const { GET, POST } = crudHandlers("extras", { mutateRoles: ["admin"], campos: ["nome", "tipo_preco", "valor", "ativo", "fotos", "ordem", "substitui_buffet"] });
