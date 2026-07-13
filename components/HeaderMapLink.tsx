import Link from "next/link";
import { MapIcon } from "./Icons";

/** Кнопка «На карту» в шапке контентных страниц. */
export default function HeaderMapLink() {
  return (
    <Link href="/" className="header-map-btn">
      <MapIcon className="h-4 w-4 shrink-0" aria-hidden />
      <span>На карту</span>
    </Link>
  );
}
