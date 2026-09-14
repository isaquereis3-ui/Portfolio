export type CaseDetailBlock = {
  heading: string;
  text: string;
  aside: string;
};

export type CaseDetailMeta = {
  label: string;
  value: string;
};

export type CaseDetail = {
  summary: string;
  meta: CaseDetailMeta[];
  blocks: CaseDetailBlock[];
};

export type PortfolioCase = {
  slug: string;
  year: string;
  title: string;
  description: string;
  category: string;
  detail: CaseDetail;
};

const defaultDetail = (label: string): CaseDetail => ({
  summary: `Escreva aqui um resumo do ${label}. Explique o contexto, o desafio e o impacto final.`,
  meta: [
    { label: "Papel", value: "Seu papel no projeto" },
    { label: "Stack", value: "Ferramentas e tecnologias usadas" },
    { label: "Duração", value: "Período ou tempo de execução" },
  ],
  blocks: [
    {
      heading: "Contexto",
      text: "Descreva o cenário, o cliente e o problema que precisava ser resolvido.",
      aside: "Nota lateral sobre o contexto, restrições ou objetivo principal do case.",
    },
    {
      heading: "Processo",
      text: "Explique sua abordagem, decisões importantes e como o trabalho foi conduzido.",
      aside: "Detalhe uma decisão, método ou aprendizado relevante durante o processo.",
    },
    {
      heading: "Resultado",
      text: "Compartilhe os resultados, aprendizados e o que esse case representa no seu portfólio.",
      aside: "Métrica, feedback ou impacto final que você queira destacar.",
    },
  ],
});

export const workItems: PortfolioCase[] = [
  {
    slug: "trabalho-1",
    year: "Ano — Ano",
    title: "Nome da empresa ou cliente",
    description:
      "Descreva aqui a experiência, seu papel e principais contribuições no projeto.",
    category: "Tipo de trabalho",
    detail: defaultDetail("trabalho"),
  },
  {
    slug: "trabalho-2",
    year: "Ano — Ano",
    title: "Nome da empresa ou cliente",
    description:
      "Descreva aqui a experiência, seu papel e principais contribuições no projeto.",
    category: "Tipo de trabalho",
    detail: defaultDetail("trabalho"),
  },

];

export const projectItems: PortfolioCase[] = [
  {
    slug: "projeto-1",
    year: "Ano",
    title: "Nome do projeto",
    description:
      "Descreva aqui o projeto, o problema resolvido, sua stack e o resultado.",
    category: "Categoria",
    detail: defaultDetail("projeto"),
  },
  {
    slug: "projeto-2",
    year: "Ano",
    title: "Nome do projeto",
    description:
      "Descreva aqui o projeto, o problema resolvido, sua stack e o resultado.",
    category: "Categoria",
    detail: defaultDetail("projeto"),
  },
  {
    slug: "projeto-3",
    year: "Ano",
    title: "Nome do projeto",
    description:
      "Descreva aqui o projeto, o problema resolvido, sua stack e o resultado.",
    category: "Categoria",
    detail: defaultDetail("projeto"),
  },
];

export function getWorkItem(slug: string) {
  return workItems.find((item) => item.slug === slug);
}

export function getProjectItem(slug: string) {
  return projectItems.find((item) => item.slug === slug);
}
