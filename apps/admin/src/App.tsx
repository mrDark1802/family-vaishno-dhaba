import React from 'react';
import { NavigationProvider, usePathname } from './context/navigation-context';
import { AdminShell } from './components/layout/admin-shell';

// Pages
import DashboardPage from './app/page';
import OrdersPage from './app/orders/page';
import OrderDetailPage from './app/orders/[id]/page';
import MenuPage from './app/menu/page';
import NewDishPage from './app/menu/new/page';
import EditDishPage from './app/menu/[id]/page';
import CategoriesPage from './app/categories/page';
import UiSettingsPage from './app/ui-settings/page';
import CustomersPage from './app/customers/page';
import CouponsPage from './app/coupons/page';
import ReviewsPage from './app/reviews/page';
import ReportsPage from './app/reports/page';
import SettingsPage from './app/settings/page';
import LoginPage from './app/login/page';

function AppRouter() {
  const pathname = usePathname();

  const renderContent = () => {
    if (pathname === '/login') {
      return <LoginPage />;
    }

    if (pathname === '/') {
      return <DashboardPage />;
    }

    if (pathname === '/orders') {
      return <OrdersPage />;
    }

    if (pathname.startsWith('/orders/')) {
      return <OrderDetailPage />;
    }

    if (pathname === '/menu') {
      return <MenuPage />;
    }

    if (pathname === '/menu/new') {
      return <NewDishPage />;
    }

    if (pathname.startsWith('/menu/')) {
      return <EditDishPage />;
    }

    if (pathname === '/categories') {
      return <CategoriesPage />;
    }

    if (pathname === '/ui-settings') {
      return <UiSettingsPage />;
    }

    if (pathname === '/customers') {
      return <CustomersPage />;
    }

    if (pathname === '/coupons') {
      return <CouponsPage />;
    }

    if (pathname === '/reviews') {
      return <ReviewsPage />;
    }

    if (pathname === '/reports') {
      return <ReportsPage />;
    }

    if (pathname === '/settings') {
      return <SettingsPage />;
    }

    // Default fallback to dashboard
    return <DashboardPage />;
  };

  return (
    <AdminShell>
      {renderContent()}
    </AdminShell>
  );
}

export default function App() {
  return (
    <NavigationProvider>
      <AppRouter />
    </NavigationProvider>
  );
}
