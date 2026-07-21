import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Icons } from '@/components/icons';
import { commonUiCopy } from '@/lib/app-copy';
import type { ScheduleRow } from '../../api/queries';

interface CellActionProps {
  data: ScheduleRow;
  onView: () => void;
}

export function CellAction({ data, onView }: CellActionProps) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' className='h-8 w-8 p-0' onClick={(e) => e.stopPropagation()}>
          <span className='sr-only'>{commonUiCopy.openMenu}</span>
          <Icons.ellipsis className='h-4 w-4' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={onView}>
          <Icons.profile className='mr-2 h-4 w-4' /> {commonUiCopy.viewDetails}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
