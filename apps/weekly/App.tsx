import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthPage } from './pages/AuthPage';
import { Dashboard } from './Dashboard';
import { AdminDashboard } from './AdminDashboard';
import { api } from './services/api';

const MainContent: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const [path, setPath] = useState(window.location.pathname);
    const [appConfig, setAppConfig] = useState<Record<string, string>>({});

    useEffect(() => {
        const handlePopState = () => setPath(window.location.pathname);
        window.addEventListener('popstate', handlePopState);

        // Fetch config
        api.getPublicConfig().then(setAppConfig).catch(console.error);

        return () => window.removeEventListener('popstate', handlePopState);
    }, [path]);

    // Simple routing
    if (path === '/admin') {
        return <AdminDashboard />;
    }

    if (!isAuthenticated) {
        return <AuthPage />;
    }

    return <Dashboard appConfig={appConfig} />;
};

const App: React.FC = () => {
    return (
        <AuthProvider>
            <MainContent />
        </AuthProvider>
    );
};

export default App;