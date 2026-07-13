// JSON-LD для программатических SEO-страниц (поиск + ИИ-выдача).

import type { FaqItem } from "./faq";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, absoluteUrl } from "./site";
import type { StationStatus } from "./types";

export interface BreadcrumbItem {
  name: string;
  /** Путь без домена, например /goroda. Последний элемент — без ссылки. */
  path?: string;
}

export interface ProgrammaticSeoGraphInput {
  pageUrl: string;
  pageName: string;
  description: string;
  breadcrumbs: BreadcrumbItem[];
  faq: FaqItem[];
  /** Первые станции для ItemList (до 15). */
  stations?: StationStatus[];
  listHeading?: string;
}

function organizationNode() {
  return {
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
  };
}

function websiteNode() {
  return {
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    inLanguage: "ru-RU",
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
}

function webPageNode(input: ProgrammaticSeoGraphInput) {
  return {
    "@type": "WebPage",
    "@id": `${input.pageUrl}#webpage`,
    url: input.pageUrl,
    name: input.pageName,
    description: input.description,
    inLanguage: "ru-RU",
    isPartOf: { "@id": `${SITE_URL}/#website` },
    about: {
      "@type": "Thing",
      name: "Наличие топлива на автозаправочных станциях России",
    },
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: [".seo-page-h1", ".seo-page-lead"],
    },
  };
}

function breadcrumbNode(items: BreadcrumbItem[], pageUrl: string) {
  return {
    "@type": "BreadcrumbList",
    "@id": `${pageUrl}#breadcrumb`,
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      ...(item.path ? { item: absoluteUrl(item.path) } : {}),
    })),
  };
}

function faqPageNode(items: FaqItem[], pageUrl: string) {
  return {
    "@type": "FAQPage",
    "@id": `${pageUrl}#faq`,
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: it.answer,
      },
    })),
  };
}

function stationItemListNode(
  stations: StationStatus[],
  pageUrl: string,
  listName: string
) {
  const items = stations.slice(0, 15).map((s, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: s.brand ? `${s.brand}${s.address ? `, ${s.address}` : ""}` : s.name,
    description: s.status === "yes"
      ? "По отчётам есть топливо"
      : s.status === "low"
        ? "Мало топлива или лимит"
        : s.status === "no"
          ? "По отчётам нет топлива"
          : "Нет свежих отчётов",
  }));
  if (items.length === 0) return null;
  return {
    "@type": "ItemList",
    "@id": `${pageUrl}#stations`,
    name: listName,
    numberOfItems: items.length,
    itemListElement: items,
  };
}

/** Единый @graph для посадочных страниц. */
export function buildProgrammaticSeoGraph(
  input: ProgrammaticSeoGraphInput
): { "@context": string; "@graph": object[] } {
  const nodes: object[] = [
    organizationNode(),
    websiteNode(),
    webPageNode(input),
    breadcrumbNode(input.breadcrumbs, input.pageUrl),
    faqPageNode(input.faq, input.pageUrl),
  ];
  const list = stationItemListNode(
    input.stations ?? [],
    input.pageUrl,
    input.listHeading ?? input.pageName
  );
  if (list) nodes.push(list);
  return {
    "@context": "https://schema.org",
    "@graph": nodes,
  };
}
