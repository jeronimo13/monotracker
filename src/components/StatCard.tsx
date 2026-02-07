import { formatAmount } from "../utils/formatters";

interface StatCardProps {
  color: "blue" | "green" | "red";
  header: string;
  amount: number;
}

const StatCard = ({ color, header, amount }: StatCardProps) => {
  const colorClasses = {
    blue: {
      bg: "bg-blue-50",
      header: "text-blue-600",
      amount: "text-blue-900",
    },
    green: {
      bg: "bg-green-50",
      header: "text-green-600",
      amount: "text-green-900",
    },
    red: {
      bg: "bg-red-50",
      header: "text-red-600",
      amount: "text-red-900",
    },
  };

  const classes = colorClasses[color];

  return (
    <div className={`${classes.bg} p-4 rounded-lg`}>
      <h3 className={`text-sm font-medium ${classes.header}`}>{header}</h3>
      <p className={`text-2xl font-bold ${classes.amount}`}>
        {formatAmount(amount)}
      </p>
    </div>
  );
};

export default StatCard;
