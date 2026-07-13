import type { ArticleMeta } from "./types";

/** Главные гайды и конверсионные статьи — в начале списка. */
const PRIORITY_HIGH = new Set([
  "gde-benzin-segodnya",
  "karta-benzina",
  "kak-polzovatsya-kartoy",
  "prilozhenie-gde-benzin",
  "net-benzina-na-zapravke",
  "defitsit-topliva",
  "marshrut-s-zapravkami",
  "kak-izbezhat-ocheredey",
  "limit-na-zapravku",
  "kogda-poyavitsya-benzin",
  "v-kakoe-vremya-privozyat-benzin",
  "kogda-privozyat-benzin-na-zapravki",
  "situatsiya-s-benzinom",
  "pochemu-net-benzina",
  "nalichie-benzina-na-zapravkah",
  "gde-zapravit-i-kupit-benzin",
  "kak-ostavit-otchet",
  "kak-schitaetsya-status",
  "protivorechivye-dannye-na-karte",
  "pyat-oshibok-pri-poiske-benzina",
  "chek-list-dalnyaya-poezdka",
  "benzin-konchilsya-na-trasse",
  "izbrannoe-zapravki",
  "nalichie-ochered-limit",
  "karta-i-zdravyy-smysl",
  "tablo-est-karta-net",
  "sluhi-v-chatah-vs-karta",
  "podtverdit-zachem-knopka",
  "odna-set-pusto-sosednyaya-ochered",
  "ai-95-v-manual",
]);

/** Практические, но второстепенные. */
const PRIORITY_MID = new Set([
  "sravnenie-setey-azs",
  "karta-azs",
  "azs-gazpromneft-na-karte-rossii",
  "set-azs-opti",
  "gde-nayti-dizel",
  "ai-92-ili-ai-95",
  "zapravki-u-dorogi",
  "zapravki-na-trasse-m4",
  "gazomotornoe-toplivo",
  "benzryadom-vs-gdebenz",
  "krowdsorsing-vs-oficial",
  "besplatnyy-servis",
  "benzin-ai-92-segodnya",
  "tseny-na-benzin-segodnya",
]);

function listTier(slug: string): number {
  if (PRIORITY_HIGH.has(slug)) return 3;
  if (PRIORITY_MID.has(slug)) return 2;
  // Городские SEO-страницы и прочие узкие запросы
  return 1;
}

/** Сортировка для /blog: сначала полезные гайды, в конце — городские заглушки. */
export function sortArticlesForBlog(articles: ArticleMeta[]): ArticleMeta[] {
  return [...articles].sort((a, b) => {
    const tierDiff = listTier(b.slug) - listTier(a.slug);
    if (tierDiff !== 0) return tierDiff;
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });
}
