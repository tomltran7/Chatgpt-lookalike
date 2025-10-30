"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SelectionMenuProps = {
  visible: boolean;
  x: number;
  y: number;
  selectedText: string;
  inputValue: string;
  onChange: (value: string) => void;
  onApply: () => void;
  onCancel: () => void;
};

export function SelectionMenu({
  visible,
  x,
  y,
  selectedText,
  inputValue,
  onChange,
  onApply,
  onCancel,
}: SelectionMenuProps) {
  if (!visible) return null;

  return (
    <div
      className="selection-menu fixed z-50 bg-[#2a2b2d] border border-[#3a3a3a] rounded-lg shadow-lg p-3 min-w-[300px]"
      style={{ left: `${x - 150}px`, top: `${y}px` }}
    >
      <div className="space-y-3">
        <div className="text-xs text-[#e5e5e5] opacity-70">
          Selected: {selectedText.substring(0, 50)}...
        </div>
        <Input
          value={inputValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Add comment or edit..."
          className="bg-[#1e1e1e] border-[#3a3a3a] text-[#e5e5e5] text-sm"
          autoFocus
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            className="bg-[#10a37f] hover:bg-[#0d8a6b] text-white text-xs"
            onClick={onApply}
          >
            Apply
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-[#e5e5e5] hover:bg-[#3a3a3a] text-xs"
            onClick={onCancel}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
