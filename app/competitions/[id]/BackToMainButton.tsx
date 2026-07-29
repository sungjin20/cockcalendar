"use client";

import { useRouter } from "next/navigation";
import { hasMainHistory } from "../../../lib/main-view-state";
import { appUrl } from "../../../lib/url-prefix";

export default function BackToMainButton() {
  const router = useRouter();

  const goBack = () => {
    if (hasMainHistory() && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(appUrl("/"));
  };

  return <button type="button" className="back-link detail-back-button" onClick={goBack}>← 메인 화면으로</button>;
}
