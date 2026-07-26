import { Navigate, createBrowserRouter } from "react-router-dom";

import { TenantLayout } from "@/components/layout/tenant-layout";
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
    element: <TenantLayout />,
    children: [
      { index: true, element: <TenantHomePage /> },
      { path: "login", element: <LoginPage /> },
      { path: "book", element: <BookPage /> },
      { path: "bookings", element: <MyBookingsPage /> },
    ],
  },
]);
