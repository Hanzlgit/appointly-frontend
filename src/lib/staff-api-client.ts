import { createApiClient } from "@/lib/create-api-client";
import {
  staffAuthTokensClear,
  staffAuthTokensLoad,
  staffAuthTokensSave,
} from "@/lib/staff-auth-storage";

/** 员工/管理端 API 客户端。 */
export const staffApiClient = createApiClient({
  load: staffAuthTokensLoad,
  save: staffAuthTokensSave,
  clear: staffAuthTokensClear,
});
