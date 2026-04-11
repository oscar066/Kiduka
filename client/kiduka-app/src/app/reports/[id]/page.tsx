import ReportDetailPage from "../../components/features/reports/reportDetailPage";

interface Props {
  params: { id: string };
}

export default function ReportDetailRoute({ params }: Props) {
  return <ReportDetailPage reportId={params.id} />;
}
