import React from 'react';
import './StatsAndButton.css';

export interface StatItem {
  id: string | number;
  title: string;
  value: string | number;
  theme: 'red' | 'amber' | 'blue' | 'emerald' | string;
  icon: React.ReactNode;
  onClick?: () => void;
}

export interface StatsAndButtonProps {
  onNewProjectClick?: () => void;
  stats?: StatItem[];
  pendingApprovals?: number | string;
  pendingMaterials?: number | string;
  pendingTodos?: number | string;
  totalProjects?: number | string;
  onApprovalClick?: () => void;
  onMaterialClick?: () => void;
  onTodoClick?: () => void;
  onProjectsClick?: () => void;
  showButton?: boolean;
  className?: string;
}

const StatsAndButton: React.FC<StatsAndButtonProps> = ({
  onNewProjectClick,
  stats,
  pendingApprovals,
  pendingMaterials,
  pendingTodos,
  totalProjects,
  onApprovalClick,
  onMaterialClick,
  onTodoClick,
  onProjectsClick,
  showButton = true,
  className = '',
}) => {
  const defaultStatsData: StatItem[] = [
    {
      id: 1,
      title: 'Approval (Pending)',
      value: pendingApprovals !== undefined ? pendingApprovals : '0',
      theme: 'red',
      onClick: onApprovalClick,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <path d="m9 15 2 2 4-4" />
        </svg>
      ),
    },
    {
      id: 2,
      title: 'Material (Pending)',
      value: pendingMaterials !== undefined ? pendingMaterials : '0',
      theme: 'amber',
      onClick: onMaterialClick,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
      ),
    },
    {
      id: 3,
      title: 'To Do (Pending)',
      value: pendingTodos !== undefined ? pendingTodos : '13',
      theme: 'blue',
      onClick: onTodoClick,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      ),
    },
    {
      id: 4,
      title: 'Total Projects',
      value: totalProjects !== undefined ? totalProjects : '1',
      theme: 'emerald',
      onClick: onProjectsClick,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
    },
  ];

  const statsData = stats || defaultStatsData;

  return (
    <div className={`ui-wrapper ${className}`.trim()}>
      {/* 1. Modern KPI Stat Cards */}
      <div className="kpi-grid">
        {statsData.map((item) => (
          <div
            key={item.id}
            className={`kpi-card kpi-${item.theme}`}
            onClick={item.onClick}
            role={item.onClick ? 'button' : undefined}
            tabIndex={item.onClick ? 0 : undefined}
          >
            <div className={`kpi-icon-box icon-${item.theme}`}>
              {item.icon}
            </div>

            <div className="kpi-content">
              <span className="kpi-label">{item.title}</span>
              <h3 className="kpi-number">{item.value}</h3>
            </div>

            {/* Mini Bar Chart Icon on Top Right */}
            <div className={`kpi-mini-bars bars-${item.theme}`}>
              <span></span>
              <span></span>
              <span></span>
            </div>

            {/* Smooth Wave Background Decoration */}
            <svg className="kpi-wave" viewBox="0 0 200 60" preserveAspectRatio="none">
              <path
                d="M0,60 C60,60 80,20 140,25 C175,28 190,10 200,5 L200,60 Z"
                fill="currentColor"
              />
            </svg>
          </div>
        ))}
      </div>

      {/* 2. Modern "+ New Project" Button */}
      {showButton && (
        <div className="button-showcase">
          <button
            className="new-project-btn"
            onClick={onNewProjectClick}
            type="button"
          >
            <span className="plus-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </span>
            <span>New Project</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default StatsAndButton;
