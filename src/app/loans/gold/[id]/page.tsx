import { GoldLoanDetailsView } from '@/components/gold-loans/GoldLoanDetailsView';

export default function GoldLoanPage({ params }: { params: { id: string } }) {
  return (
    <div className="flex-1 p-4 md:p-8 pt-6">
      <GoldLoanDetailsView loanId={params.id} />
    </div>
  );
}
