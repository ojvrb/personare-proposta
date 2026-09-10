import { crudHandlers } from "@/lib/crudApi";
// PATCH: marca pago (status + pago_em) ou edita valor/vencimento.
export const { PATCH } = crudHandlers("pagamentos", { mutateRoles: ["admin", "financeiro"] });
