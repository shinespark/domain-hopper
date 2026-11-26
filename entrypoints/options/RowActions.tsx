import { DOWN, IconButton, TRASH, UP } from '@/components/Icon';
import { t } from '@/lib/i18n';

export default function RowActions({
  index,
  count,
  onMove,
  onDelete,
}: {
  index: number;
  count: number;
  onMove: (toIndex: number) => void;
  onDelete: () => void;
}) {
  return (
    <div className="actions">
      <IconButton label={t('moveUp')} path={UP} disabled={index === 0} onClick={() => onMove(index - 1)} />
      <IconButton label={t('moveDown')} path={DOWN} disabled={index === count - 1} onClick={() => onMove(index + 1)} />
      <IconButton label={t('delete')} path={TRASH} onClick={onDelete} />
    </div>
  );
}
