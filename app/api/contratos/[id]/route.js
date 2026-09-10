import { crudHandlers } from "@/lib/crudApi";
// PATCH: atualiza status (rascunho/assinado/cancelado) ou valor_contratado.
export const { PATCH } = crudHandlers("contratos", { mutateRoles: ["admin", "financeiro"] });
