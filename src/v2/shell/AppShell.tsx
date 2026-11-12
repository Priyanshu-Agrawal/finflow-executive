import { Nav } from './Nav';
import { SyncChip } from './SyncChip';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="v2-shell">
      <Nav />
      <div className="v2-content">
        <div className="v2-top"><SyncChip /></div>
        <main className="v2-main">{children}</main>
      </div>
    </div>
  );
}
