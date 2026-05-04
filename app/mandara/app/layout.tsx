import MandaraAppShell from "@/components/mandara/app-shell";

export default function MandaraAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MandaraAppShell>{children}</MandaraAppShell>;
}
