import SiteHeader from "./SiteHeader";
import HeaderMapLink from "./HeaderMapLink";

/** Шапка контентных страниц — логотип, «На карту», меню. */
export default function PublicHeader() {
  return <SiteHeader tools={<HeaderMapLink />} />;
}
