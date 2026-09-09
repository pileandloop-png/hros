import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileBottomNav } from './MobileBottomNav';
import { NavigationProvider } from '../../contexts/NavigationContext';

export const Layout: React.FC = () => {
  return (
    <NavigationProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
        {/* Responsive Desktop Sidebar + Mobile Sidelider Drawer */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-3.5 sm:p-5 lg:p-6 pb-24 md:pb-6 scrollbar-thin touch-momentum">
            <Outlet />
          </main>
        </div>

        {/* Mobile Frosted Glass Bottom Navigation Bar */}
        <MobileBottomNav />
      </div>
    </NavigationProvider>
  );
};

export default Layout;
