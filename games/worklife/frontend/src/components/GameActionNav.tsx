type Tab = { id: string; name: string; icon: string };

export function GameActionNav(props: {
  tabs: Tab[];
  activeTab: string;
  onSelect: (id: string) => void;
}) {
  return (
    <nav className="game-tabs">
      <div className="game-tabs-label">行动</div>
      {props.tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => props.onSelect(tab.id)}
          className={`tab-btn ${props.activeTab === tab.id ? "active" : ""}`}
        >
          <span className="tab-icon">{tab.icon}</span>
          <span className="tab-name">{tab.name}</span>
        </button>
      ))}
    </nav>
  );
}
