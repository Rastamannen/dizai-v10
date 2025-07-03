export function Card({ children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-gray-300 bg-white p-4 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function CardContent({ children }) {
  return <div className="mt-2">{children}</div>;
}
