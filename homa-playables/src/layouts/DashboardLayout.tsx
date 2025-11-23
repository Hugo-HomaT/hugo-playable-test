import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { PageHeader } from '../components/PageHeader';

export const DashboardLayout: React.FC = () => {
    return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
            <Sidebar />
            <main style={{ flex: 1, overflow: 'auto', padding: '30px' }}>
                <PageHeader />
                <Outlet />
            </main>
        </div>
    );
};
