import React from "react";

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className = "",
}) => {
  return (
    <div
      role="tablist"
      className={`inline-flex p-1 rounded-lg bg-parchment-950/80 border border-sandstone/20 ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            onClick={() => onChange(tab.id)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              isActive
                ? "bg-goldLeaf text-parchment-950 font-semibold shadow-sm"
                : "text-sandstone-warm hover:text-goldLeaf hover:bg-parchment-900/60"
            }`}
          >
            {tab.icon && <span>{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isActive ? "bg-parchment-950 text-goldLeaf" : "bg-black/40 text-sandstone"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
