import ReportDetailPage from "../../components/features/reports/reportDetailPage";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ReportDetailRoute({ params }: Props) {
  const resolvedParams = await params;
  return <ReportDetailPage reportId={resolvedParams.id} />;
}
