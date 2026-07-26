import { Navigate, createBrowserRouter } from "react-router-dom";

import {
  ConsoleAdminGuard,
  ConsoleAuthGuard,
} from "@/components/layout/console-layout";
import { TenantLayout } from "@/components/layout/tenant-layout";
import { ConsoleBookingsPage } from "@/pages/console/bookings";
import { ConsoleCatalogPage } from "@/pages/console/catalog";
import { ConsoleDashboardPage } from "@/pages/console/dashboard";
import { ConsoleHomePage } from "@/pages/console/home";
import { ConsoleLoginPage } from "@/pages/console/login";
import { ConsoleSettingsPage } from "@/pages/console/settings";
import { BookPage } from "@/pages/book";
import { LoginPage } from "@/pages/login";
import { MyBookingsPage } from "@/pages/my-bookings";
import { TenantHomePage } from "@/pages/tenant-home";

/** 应用路由表。 */
export const appRouter = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/t/acme" replace />,
  },
  {
    path: "/t/:tenantSlug",
    children: [
      {
        element: <TenantLayout />,
        children: [
          { index: true, element: <TenantHomePage /> },
          { path: "login", element: <LoginPage /> },
          { path: "book", element: <BookPage /> },
          { path: "bookings", element: <MyBookingsPage /> },
        ],
      },
      { path: "console/login", element: <ConsoleLoginPage /> },
      {
        path: "console",
        element: <ConsoleAuthGuard />,
        children: [
          { index: true, element: <ConsoleHomePage /> },
          { path: "bookings", element: <ConsoleBookingsPage /> },
          {
            element: <ConsoleAdminGuard />,
            children: [
              { path: "dashboard", element: <ConsoleDashboardPage /> },
              { path: "catalog", element: <ConsoleCatalogPage /> },
              { path: "settings", element: <ConsoleSettingsPage /> },
            ],
          },
        ],
      },
    ],
  },
]);
