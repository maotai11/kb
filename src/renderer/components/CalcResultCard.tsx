type CalcResultCardProps = {
  label: string;
  value: number | string;
  tone?: 'default' | 'accent' | 'success' | 'warning';
  hint?: string;
};

function formatValue(value: number | string): string {
  if (typeof value === 'number') {
    return `${value.toLocaleString('zh-TW')} 元`;
  }

  return value;
}

export function CalcResultCard({
  label,
  value,
  tone = 'default',
  hint
}: CalcResultCardProps) {
  return (
    <article className={`result-card result-card-${tone}`}>
      <span className="result-label">{label}</span>
      <strong className="result-value">{formatValue(value)}</strong>
      {hint ? <p className="result-hint">{hint}</p> : null}
    </article>
  );
}
