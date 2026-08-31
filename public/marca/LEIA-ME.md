# Marca do produto

Coloque aqui o arquivo:

```
public/marca/taflow.webp
```

É a logo que a casca mostra quando a empresa **não** subiu a dela — o padrão
por cima do qual o cliente faz o white-label (migration 0080).

## Enquanto o arquivo não existir

Nada quebra. O `WorkspaceMark` tem `onError`: sem o arquivo, a casca escreve
o nome da empresa, exatamente como fazia antes da 0080. No dia em que o
arquivo for colocado aqui, ele passa a aparecer **sem mudança em código**.

## O que o arquivo precisa ter

- **WebP**, pelo mesmo motivo da logo do cliente: é a casca, carrega em toda
  tela.
- **Lado maior em 512px.** Ela aparece a 132px; 512 cobre densidade 3x.
- **Fundo transparente.**
- **Legível sobre claro e sobre escuro.** No tema escuro ela ganha a placa
  clara (`--logo-plate`), então uma marca escura funciona. Uma marca branca
  sobre a placa clara, não.

Se só existir a versão em PNG, converta antes — o caminho de conversão
automática vale para o envio do cliente, não para este arquivo.

## Onde ela NÃO aparece

No contrato impresso. Aquele cabeçalho identifica a parte contratada, e a
marca do fornecedor de software num documento jurídico de terceiro estaria
errada. Lá, sem logo da empresa, escreve-se o nome.
