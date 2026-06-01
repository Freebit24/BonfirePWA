"use client";

import { LayoutGroup } from "framer-motion";
import React from "react";

export default function FramerProvider({ children }: { children: React.ReactNode }) {
  // Animations disabled; layout infrastructure kept for future re-enablement.
  return <>{children}</>;
}
