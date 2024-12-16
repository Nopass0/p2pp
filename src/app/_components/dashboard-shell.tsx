// src/app/_components/dashboard-shell.tsx
interface DashboardShellProps {
  children: React.ReactNode;
  className?: string;
}

export function DashboardShell({
  children,
  className,
  ...props
}: DashboardShellProps) {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8" {...props}>
      {children}
    </div>
  );
}
