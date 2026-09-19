// Validacao de CPF (algoritmo do modulo 11) -- rejeita sequencias repetidas
// (11111111111) que passam formalmente mas nao sao CPFs reais. Sem lib externa.
export function validarCPF(cpf) {
  if (!/^\d{11}$/.test(cpf)) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  const nums = cpf.split("").map(Number);
  for (let t = 9; t < 11; t++) {
    let soma = 0;
    for (let i = 0; i < t; i++) soma += nums[i] * (t + 1 - i);
    const dv = ((soma * 10) % 11) % 10;
    if (dv !== nums[t]) return false;
  }
  return true;
}
