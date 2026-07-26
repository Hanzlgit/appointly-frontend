import { createApiClient } from "@/lib/create-api-client";
import {
  authTokensClear,
  authTokensLoad,
  authTokensSave,
} from "@/lib/auth-storage";

/** 客户侧 API 客户端。 */
export const apiClient = createApiClient({
  load: authTokensLoad,
  save: authTokensSave,
  clear: authTokensClear,
});
