-- Sem rede definida (Brenno, 02/11/2026): sem API oficial (sem CNPJ), quem posta é a pessoa
-- e escolhe o app na hora do compartilhar. A marcação do planner deixa de ter rede.
-- A coluna fica, opcional, para quando as redes forem conectadas. Nada é apagado.
alter table public.agenda alter column rede drop not null;
