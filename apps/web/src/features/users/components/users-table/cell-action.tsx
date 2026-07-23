import { AlertModal } from '@/components/modal/alert-modal';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { deleteUserMutation } from '../../api/mutations';
import { userInvalidations } from '../../api/queries';
import type { User } from '../../api/types';
import { getQueryClient } from '@/lib/query-client';
import { Icons } from '@/components/icons';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { commonUiCopy } from '@/lib/app-copy';
import { getVietnameseApiErrorMessage } from '@/lib/api-error-message';
import { feedbackCopy, feedbackEntity } from '@/lib/feedback-copy';
import { UserFormSheet } from '../user-form-sheet';
import { UserRolesSheet } from '../user-roles-sheet';

interface CellActionProps {
  data: User;
}

function canMutateUser(data: User) {
  return Boolean(data.username);
}

export function CellAction({ data }: CellActionProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [rolesOpen, setRolesOpen] = useState(false);

  const deleteMutation = useMutation({
    ...deleteUserMutation,
    onSuccess: () => {
      toast.success(feedbackCopy.success.deleted(feedbackEntity.user));
      setDeleteOpen(false);
    },
    onError: (error) => {
      if (error instanceof Error && error.message === 'Forbidden') {
        toast.error(feedbackCopy.warning.accessDenied('xoa nguoi dung'));
        return;
      }

      toast.error(getVietnameseApiErrorMessage(error, feedbackCopy.failure.delete(feedbackEntity.user)));
    }
  });

  const mutationAllowed = canMutateUser(data);

  const onEdit = () => {
    if (!mutationAllowed) {
      toast.error(feedbackCopy.warning.missingUsername('chinh sua', feedbackEntity.user));
      return;
    }
    setEditOpen(true);
  };

  const onRoles = () => {
    if (!mutationAllowed) {
      toast.error(feedbackCopy.warning.missingUsername('phan quyen', feedbackEntity.user));
      return;
    }
    setRolesOpen(true);
  };

  const onDelete = () => {
    if (!mutationAllowed) {
      toast.error(feedbackCopy.warning.missingUsername('xoa', feedbackEntity.user));
      return;
    }
    setDeleteOpen(true);
  };

  return (
    <>
      <AlertModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => {
          if (!data.username) {
            toast.error(feedbackCopy.warning.missingUsername('xoa', feedbackEntity.user));
            return;
          }

          deleteMutation.mutate(data.username);
        }}
        loading={deleteMutation.isPending}
      />
      <UserFormSheet user={data} open={editOpen} onOpenChange={setEditOpen} />
      {rolesOpen && (
        <UserRolesSheet
          user={data}
          open={rolesOpen}
          onOpenChange={(open) => {
            setRolesOpen(open);
            if (!open) void userInvalidations.all(getQueryClient());
          }}
        />
      )}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' className='h-8 w-8 p-0'>
            <span className='sr-only'>{commonUiCopy.openMenu}</span>
            <Icons.ellipsis className='h-4 w-4' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuLabel>{commonUiCopy.actionsMenu}</DropdownMenuLabel>
          <DropdownMenuItem onClick={onEdit}>
            <Icons.edit className='mr-2 h-4 w-4' /> {commonUiCopy.edit}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onRoles}>
            <Icons.user className='mr-2 h-4 w-4' /> {commonUiCopy.assignRoles}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
            <Icons.trash className='mr-2 h-4 w-4' /> {commonUiCopy.delete}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
