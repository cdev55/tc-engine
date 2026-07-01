interface ProgressBarProps {
  value: number;
  indeterminate?: boolean;
}

export function ProgressBar({ value, indeterminate }: ProgressBarProps) {
  return (
    <div className="progress-bar-track">
      <div
        className={`progress-bar-fill${indeterminate ? " indeterminate" : ""}`}
        style={indeterminate ? undefined : { width: `${value}%` }}
      />
    </div>
  );
}
