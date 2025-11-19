import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';

export const DashboardLayout: React.FC = () => {
    return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
            <Sidebar />
            <main style={{ flex: 1, overflow: 'auto', padding: '30px' }}>
                <Outlet />
            </main>
        </div>
    );
};
