"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** Hace aparecer suavemente los elementos con la clase "revelar" cuando entran en pantalla. */
export default function Revelar() {
  const pathname = usePathname();

  useEffect(() => {
    const elementos = document.querySelectorAll<HTMLElement>(".revelar:not(.visible)");
    if (!("IntersectionObserver" in window)) {
      elementos.forEach((el) => el.classList.add("visible"));
      return;
    }
    const observer = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    elementos.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
