type SectionWarningProps = {
  message: string;
  severity?: 'warning' | 'info';
};

export function SectionWarning({
  message,
  severity = 'warning'
}: SectionWarningProps) {
  return <p className={`section-warning section-warning-${severity}`}>{message}</p>;
}
