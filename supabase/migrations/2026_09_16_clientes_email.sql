-- clientes.email -- sem isso nao ha como lembrar o casal da validade da
-- proposta fora do WhatsApp (nem enviar nada por e-mail no futuro). Opcional
-- (nem todo lead antigo tem), preenchido a partir de agora no configurador
-- (app/painel/nova-proposta) e editavel na tela do cliente.
alter table clientes add column if not exists email text;
