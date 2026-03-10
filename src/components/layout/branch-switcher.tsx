"use client";

import React from "react";
import { Check, ChevronsUpDown, MapPin } from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RoleBadge } from "@/components/common/permission-guard";

export function BranchSwitcher() {
  const [open, setOpen] = React.useState(false);
  const { user, activeBranch, availableBranches, switchBranch } = useAuth();

  if (!user || availableBranches.length === 0) {
    return null;
  }

  const handleSelect = (branchId: string) => {
    switchBranch(branchId);
    setOpen(false);
  };

  // Get roles for each branch
  const getBranchRoles = (branchId: string) => {
    const permission = user.permissions.find((p) => p.branchId === branchId);
    return permission?.roles || [];
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={(props) => (
          <Button
            {...props}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            <div className="flex items-center gap-2 truncate">
              <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <span className="truncate">
                {activeBranch?.name || "Pilih cabang..."}
              </span>
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        )}
      />
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Cari cabang..." />
          <CommandList>
            <CommandEmpty>Cabang tidak ditemukan.</CommandEmpty>
            <CommandGroup heading="Cabang Tersedia">
              {availableBranches.map((branch) => {
                const roles = getBranchRoles(branch.id);
                const isActive = activeBranch?.id === branch.id;

                return (
                  <CommandItem
                    key={branch.id}
                    value={branch.name}
                    onSelect={() => handleSelect(branch.id)}
                    className="flex flex-col items-start gap-1 py-3"
                  >
                    <div className="flex items-center w-full">
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 flex-shrink-0",
                          isActive ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="font-medium">{branch.name}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 ml-6">
                      {roles.map((role) => (
                        <RoleBadge key={role} role={role} size="sm" />
                      ))}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
