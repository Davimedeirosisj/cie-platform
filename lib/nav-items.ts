export type NavItem = {
  title: string;
  href: string;
};

export const NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", href: "/dashboard" },
  { title: "Municípios", href: "/municipios" },
  { title: "Bairros", href: "/bairros" },
  { title: "Zonas", href: "/zonas" },
  { title: "Seções", href: "/secoes" },
  { title: "Rankings", href: "/rankings" },
  { title: "Pesquisa Global", href: "/busca" },
  { title: "Mapa Interativo", href: "/mapa" },
  { title: "Importação", href: "/importacao" },
  { title: "Relatórios", href: "/relatorios" },
  { title: "Configurações", href: "/configuracoes" },
];
