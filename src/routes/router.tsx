import { createBrowserRouter } from "react-router-dom";

import { AppLayout } from "@/components/layout/app-layout";
import { HomePage } from "@/pages/home";
import { LocationStylistsPage } from "@/pages/location-stylists";
import { LoginPage } from "@/pages/login";
import { NotificationsPage } from "@/pages/notifications";
import { QueueStatusPage } from "@/pages/queue-status";
import { StylistServicesPage } from "@/pages/stylist-services";

/** 应用路由表。 */
export const appRouter = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "login", element: <LoginPage /> },
      { path: "locations/:id", element: <LocationStylistsPage /> },
      { path: "locations/:id/stylists/:stylistId", element: <StylistServicesPage /> },
      { path: "queue", element: <QueueStatusPage /> },
      { path: "queue/:ticketId", element: <QueueStatusPage /> },
      { path: "notifications", element: <NotificationsPage /> },
    ],
  },
]);
