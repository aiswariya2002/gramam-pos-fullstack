export default function SummaryCard({ title, value, color }) {
  return (
    <div className={`p-4 rounded-lg shadow-md ${color}`}>
      <h4 className="text-sm font-medium">{title}</h4>
      <p className="text-xl font-bold mt-2">{value}</p>
    </div>
  );
}
