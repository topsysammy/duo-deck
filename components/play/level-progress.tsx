/** Level progress bar (GP-4). Animates with transform (scaleX) only. */
export function LevelProgress({ index, total, levelName }: { index: number; total: number; levelName: string }) {
  const ratio = total > 0 ? index / total : 0;
  return (
    <div
      role="progressbar"
      aria-label={`${levelName} progress`}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={index}
      aria-valuetext={`Card ${index} of ${total}`}
      className="mt-[18px] h-1.5 overflow-hidden rounded-full bg-surface-2"
    >
      <div
        className="h-full origin-left rounded-full bg-pink transition-transform duration-300 ease-out"
        style={{ transform: `scaleX(${ratio})` }}
      />
    </div>
  );
}
