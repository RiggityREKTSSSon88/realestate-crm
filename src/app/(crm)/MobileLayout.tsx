"use client";

import { useIsMobile } from "@/hooks/useIsMobile";

type MobileLayoutProps = {
  children: React.ReactNode;
};

export default function MobileLayout({ children }: MobileLayoutProps) {
  const isMobile = useIsMobile();

  return (
    <div
      style={{
        paddingBottom: isMobile ? "60px" : undefined,
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}
