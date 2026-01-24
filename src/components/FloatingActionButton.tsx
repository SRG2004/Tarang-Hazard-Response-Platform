import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from './ui/button';

interface FloatingActionButtonProps {
  onClick: () => void;
}

export function FloatingActionButton({ onClick }: FloatingActionButtonProps) {
  return (
    <Button
      onClick={onClick}
      className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-[#0077B6] hover:bg-[#005a8c] z-40 lg:hidden"
      size="icon"
    >
      <Plus className="h-6 w-6" />
    </Button>
  );
}
