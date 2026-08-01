import { useEffect } from "react";

import { DEFAULT_TITLE } from "@/lib/page-title";

/** 设置浏览器标签页标题，卸载时恢复默认。 */
export function useDocumentTitle(title: string | null | undefined) {
  useEffect(() => {
    if (!title) {
      return;
    }
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous || DEFAULT_TITLE;
    };
  }, [title]);
}
