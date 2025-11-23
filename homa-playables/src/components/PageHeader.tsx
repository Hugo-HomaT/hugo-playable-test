import React from 'react';
import { useLocation, matchPath } from 'react-router-dom';

export const PageHeader: React.FC = () => {
    const location = useLocation();

    const getPageTitle = (pathname: string): string => {
        if (pathname === '/') return 'Dashboard';
        if (pathname === '/media') return 'Media Library';

        if (matchPath('/project/:id', pathname)) return 'Project Hub';
        if (matchPath('/project/:id/concept/:conceptId', pathname)) return 'Concept Editor';

        return 'Homa Playables';
    };

    const title = getPageTitle(location.pathname);

    return (
        <div style={{
            marginBottom: '30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
        }}>
            <div>
                <h1 style={{
                    fontSize: '32px',
                    fontWeight: 700,
                    color: 'var(--color-text-primary)',
                    margin: 0,
                    letterSpacing: '-0.5px',
                    background: 'linear-gradient(90deg, #fff, #e0e0e0)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    textShadow: '0 2px 10px rgba(0,0,0,0.2)'
                }}>
                    {title}
                </h1>
                <div style={{
                    height: '4px',
                    width: '40px',
                    background: 'var(--gradient-primary)',
                    borderRadius: '2px',
                    marginTop: '8px'
                }} />
            </div>

            {/* Optional: Add breadcrumbs or secondary info here later */}
        </div>
    );
};
