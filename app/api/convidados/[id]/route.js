import { crudHandlers } from "@/lib/crudApi";
// PATCH: staff corrige nome/status. DELETE: remove um convidado (sem FK apontando pra ele, sem soft delete).
export const { PATCH, DELETE } = crudHandlers("convidados");
