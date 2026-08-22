import { AppShell } from "@/components/shell/AppShell";

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <div id="main">{children}</div>
    </AppShell>
  );
}
