// Guarda de mass assignment: deixa passar so' as colunas declaradas na rota.
// Vive separado de crudApi.js (que importa next/server e so' roda dentro do
// Next) pra poder ser testado isolado com `node --test`.
export function filtrarCampos(body, campos) {
  if (!campos) return body;
  const filtrado = {};
  for (const c of campos) if (c in body) filtrado[c] = body[c];
  return filtrado;
}
