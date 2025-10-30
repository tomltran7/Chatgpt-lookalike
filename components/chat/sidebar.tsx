"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MenuIcon, PlusIcon } from "lucide-react";

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <div
      className={`bg-[#202123] border-r border-[#3a3a3a] transition-all duration-300 ${
        collapsed ? "w-[60px]" : "w-[250px]"
      }`}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-[#3a3a3a]">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCollapsed(!collapsed)}
              className="text-[#e5e5e5] hover:bg-[#3a3a3a]"
            >
              <MenuIcon className="h-4 w-4" />
            </Button>
            {!collapsed && (
              <Button
                variant="ghost"
                size="sm"
                className="text-[#e5e5e5] hover:bg-[#3a3a3a] flex-1 justify-start"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                New chat
              </Button>
            )}
          </div>
        </div>

        {/* Chat History */}
        <ScrollArea className="flex-1 p-2">
          {!collapsed && (
            <div className="space-y-1">
              <div className="px-3 py-2 text-sm text-[#e5e5e5] bg-[#3a3a3a] rounded-md cursor-pointer">
                Nature Poem
              </div>
              <div className="px-3 py-2 text-sm text-[#e5e5e5] hover:bg-[#3a3a3a] rounded-md cursor-pointer">
                Previous Chat
              </div>
              <div className="px-3 py-2 text-sm text-[#e5e5e5] hover:bg-[#3a3a3a] rounded-md cursor-pointer">
                Another Chat
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Settings */}
        <div className="p-4 border-t border-[#3a3a3a]">
          {!collapsed && (
            <div className="text-sm text-[#e5e5e5] hover:bg-[#3a3a3a] px-3 py-2 rounded-md cursor-pointer">
              Settings
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
