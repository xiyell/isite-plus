import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

import { Variants, easeOut } from "framer-motion";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export const fadeIn = (delay = 0) => ({
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.6, ease: easeOut },
  viewport: { once: true },
});
