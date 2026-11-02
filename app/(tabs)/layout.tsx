import { TabBar } from "@/components/layout/tab-bar";

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <TabBar />
    </>
  );
}
