'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Icons } from '@/components/icons';
import { commonUiCopy, roleUiCopy } from '@/lib/app-copy';
import { feedbackCopy, feedbackEntity } from '@/lib/feedback-copy';
import type { Role } from '../api/service';
import { RoleCreateDialog } from './RoleCreateDialog';
import { RoleDeleteDialog } from './role-delete-dialog';
import { useDeleteRoleMutation } from '../api/queries';
import { canEditRole } from '../role-access.utils';
import { useRouter } from 'next/navigation';

interface RoleRowActionsProps {
  role: Role;
}

export function RoleRowActions({ role }: RoleRowActionsProps) {
  const router = useRouter();
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteMutation = useDeleteRoleMutation();

  const onDelete = async () => {
    try {
      await deleteMutation.mutateAsync(role.id);
      toast.success(feedbackCopy.success.deleted(feedbackEntity.role));
      setDeleteOpen(false);
    } catch {
      // onError handles toast
    }
  };

  return (
    <>
      {/* Duplicate role using dialog */}
      <RoleCreateDialog
        open={duplicateOpen}
        onOpenChange={setDuplicateOpen}
        cloneFromRole={role}
      />
      <RoleDeleteDialog
        role={role}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        isPending={deleteMutation.isPending}
        onConfirm={() => void onDelete()}
      />
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' className='h-8 w-8 p-0'>
            <span className='sr-only'>{commonUiCopy.openMenu}</span>
            <Icons.ellipsis className='h-4 w-4' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuLabel>{commonUiCopy.actionsMenu}</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => router.push(`/administration/roles/${role.id}`)}>
            <Icons.edit className='mr-2 h-4 w-4' />
            {canEditRole(role) ? commonUiCopy.edit : commonUiCopy.viewDetails}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setDuplicateOpen(true)}>
            <Icons.restore className='mr-2 h-4 w-4 rotate-180' />
            {roleUiCopy.matrix.duplicate}
          </DropdownMenuItem>
          {!role.isSystem && (
            <DropdownMenuItem variant='destructive' onClick={() => setDeleteOpen(true)}>
              <Icons.trash className='mr-2 h-4 w-4' />
              {commonUiCopy.delete}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
