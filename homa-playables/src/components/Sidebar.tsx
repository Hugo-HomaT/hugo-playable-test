import React from 'react';
import { NavLink } from 'react-router-dom';

export const Sidebar: React.FC = () => {
  const navItems = [
    { label: 'Projects', path: '/' },
    { label: 'Media Library', path: '/media' },
  ];

  return (
    <aside style={{
      width: '250px',
      backgroundColor: 'var(--color-bg-secondary)',
      borderRight: '1px solid var(--color-border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px'
    }}>
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
          Homa <span style={{ color: 'var(--color-accent)' }}>Playables</span>
        </h1>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            style={({ isActive }) => ({
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              backgroundColor: isActive ? 'var(--color-bg-tertiary)' : 'transparent',
              transition: 'all 0.2s ease',
              fontSize: '14px',
              fontWeight: isActive ? 500 : 400
            })}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};
