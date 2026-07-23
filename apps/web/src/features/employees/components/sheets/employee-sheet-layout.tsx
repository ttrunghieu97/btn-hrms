'use client';

import * as React from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

interface EmployeeSheetLayoutProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  sheetContentRef?: React.RefObject<HTMLDivElement | null>;
  onOpenAutoFocus?: (event: Event) => void;
  animationKey?: string;
}

export function EmployeeSheetLayout({
  open,
  onOpenChange,
  header,
  footer,
  children,
  sheetContentRef,
  onOpenAutoFocus,
  animationKey,
}: EmployeeSheetLayoutProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        ref={sheetContentRef}
        tabIndex={-1}
        className='w-full gap-0 p-0 sm:max-w-[94vw] xl:max-w-[1600px] data-[state=open]:duration-300 data-[state=closed]:duration-200'
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          if (onOpenAutoFocus) {
            onOpenAutoFocus(event);
          } else {
            sheetContentRef?.current?.focus({ preventScroll: true });
          }
        }}
      >
        {header}
        <div className='min-h-0 flex-1 overflow-y-auto bg-muted/10 px-6 py-6'>
          {animationKey ? (
            <AnimatePresence mode='wait'>
              <motion.div
                key={animationKey}
                initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
                animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? {} : { opacity: 0, y: -6 }}
                transition={{ duration: 0.12, ease: 'easeOut' }}
                style={{ willChange: 'transform, opacity' }}
                className='min-h-full flex flex-col'
              >
                {children}
              </motion.div>
            </AnimatePresence>
          ) : (
            children
          )}
        </div>
        {footer && (
          <div className='shrink-0 border-t border-border/60 bg-background/95 px-6 py-4 backdrop-blur'>
            {footer}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
