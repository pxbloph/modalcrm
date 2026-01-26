interface MetricCardProps {
    title: string;
    value: string | number;
    subtext?: string;
    color?: string; // 'blue', 'green', 'orange'
}

export default function MetricCard({ title, value, subtext, color = 'blue' }: MetricCardProps) {
    const colorClasses = {
        blue: 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-900/30 dark:text-blue-300',
        green: 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-900/30 dark:text-green-300',
        orange: 'bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-900/20 dark:border-orange-900/30 dark:text-orange-300',
        purple: 'bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/20 dark:border-purple-900/30 dark:text-purple-300',
    };

    return (
        <div className={`p-4 rounded-lg border ${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue}`}>
            <h4 className="text-sm font-medium opacity-80 uppercase tracking-wide">{title}</h4>
            <div className="mt-2 text-3xl font-bold">{value}</div>
            {subtext && <div className="mt-1 text-xs opacity-70">{subtext}</div>}
        </div>
    );
}
