import React, { useState } from 'react';
import { AppProvider, useApp } from './context';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { HomeView } from './components/dashboard/HomeView';
import { MyAssistantView } from './components/dashboard/MyAssistantView';
import { ConversationsView } from './components/dashboard/ConversationsView';
import { KnowledgeView } from './components/dashboard/KnowledgeView';
import { DeployView } from './components/dashboard/DeployView';
import { InsightsView } from './components/dashboard/InsightsView';
import { SettingsView } from './components/dashboard/SettingsView';
import { PlaygroundView } from './components/dashboard/PlaygroundView';
import { BillingView } from './components/dashboard/BillingView';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { DeveloperConsole } from './components/developer/DeveloperConsole';
import { TestAgentDrawer } from './components/common/TestAgentDrawer';
import { OnboardingModal } from './components/onboarding/OnboardingModal';
import { ToastContainer } from './components/common/ToastContainer';
import { HelpModal } from './components/common/HelpModal';
import { CommandPalette } from './components/common/CommandPalette';
import { ErrorBoundary } from './components/common/ErrorBoundary';

const DashboardContent: React.FC = () => {
  const { 
    currentExperience,
    currentTab, 
    isAdminMode, 
    setIsQuickTestOpen
  } = useApp();

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // 1. Dedicated Full-Screen Super-Admin Portal (Completely separated from customer workspace)
  if (currentExperience === 'admin' || isAdminMode) {
    return (
      <div className="flex h-screen w-screen bg-slate-100 overflow-hidden font-sans">
        <AdminDashboard />
        <ToastContainer />
      </div>
    );
  }

  // 2. Developer Console (if activated)
  if (currentExperience === 'developer') {
    return (
      <div className="flex h-screen w-screen bg-slate-900 overflow-hidden font-sans">
        <DeveloperConsole />
        <ToastContainer />
      </div>
    );
  }

  // 3. Customer Experience Workspace (Standard Sidebar + Header Layout)
  const renderCustomerView = () => {
    switch (currentTab) {
      case 'overview':
      case 'home':
        return <HomeView />;
      case 'assistant':
        return <MyAssistantView />;
      case 'knowledge':
        return <KnowledgeView />;
      case 'playground':
        return <PlaygroundView />;
      case 'conversations':
        return <ConversationsView />;
      case 'deploy':
      case 'channels':
      case 'connections':
      case 'actions':
        return <DeployView />;
      case 'analytics':
      case 'insights':
        return <InsightsView />;
      case 'billing':
        return <BillingView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <HomeView />;
    }
  };

  return (
    <div className="flex h-screen w-screen bg-slate-100 overflow-hidden font-sans">
      {/* Customer Workspace Sidebar Navigation */}
      <Sidebar 
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Workspace Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header 
          onOpenOnboarding={() => setIsOnboardingOpen(true)} 
          onOpenHelp={() => setIsHelpOpen(true)}
          onToggleMobileNav={() => setIsMobileSidebarOpen(prev => !prev)}
        />

        <main className="flex-1 overflow-y-auto p-3.5 sm:p-6 md:p-8 bg-slate-50/70">
          <div className="max-w-7xl mx-auto">
            {renderCustomerView()}
          </div>
        </main>
      </div>

      {/* Quick Test Agent Drawer */}
      <TestAgentDrawer />

      {/* Onboarding Wizard */}
      <OnboardingModal 
        isOpen={isOnboardingOpen} 
        onClose={() => setIsOnboardingOpen(false)} 
      />

      {/* Help Center */}
      <HelpModal 
        isOpen={isHelpOpen} 
        onClose={() => setIsHelpOpen(false)}
        onOpenTestAssistant={() => setIsQuickTestOpen(true)}
      />

      {/* Global Quick Command Palette (Cmd+K) */}
      <CommandPalette 
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onOpenHelp={() => setIsHelpOpen(true)}
      />

      {/* Global Interactive Toast Notification System */}
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <DashboardContent />
      </AppProvider>
    </ErrorBoundary>
  );
}
