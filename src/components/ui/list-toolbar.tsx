import { SearchField } from "@/components/ui/search-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface ListToolbarFilter {
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  options: Array<{ value: string; label: string }>;
  className?: string;
}

export interface ListToolbarSort {
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  className?: string;
}

interface ListToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  resultCount: number;
  resultLabel?: string;
  filters?: ListToolbarFilter[];
  sort?: ListToolbarSort;
  className?: string;
}

/** 列表顶栏：搜索 + 筛选 + 排序 + 结果计数。 */
export function ListToolbar({
  search,
  onSearchChange,
  searchPlaceholder = "搜索…",
  resultCount,
  resultLabel = "条结果",
  filters = [],
  sort,
  className,
}: ListToolbarProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchField
          value={search}
          onValueChange={onSearchChange}
          placeholder={searchPlaceholder}
          className="lg:max-w-sm lg:flex-1"
        />
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((filter) => (
            <Select
              key={filter.placeholder}
              value={filter.value}
              items={filter.options.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
              onValueChange={(value) => value && filter.onValueChange(value)}
            >
              <SelectTrigger className={cn("w-[9rem]", filter.className)}>
                <SelectValue placeholder={filter.placeholder} />
              </SelectTrigger>
              <SelectContent>
                {filter.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
          {sort ? (
            <Select
              value={sort.value}
              items={sort.options.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
              onValueChange={(value) => value && sort.onValueChange(value)}
            >
              <SelectTrigger className={cn("w-[9.5rem]", sort.className)}>
                <SelectValue placeholder="排序" />
              </SelectTrigger>
              <SelectContent>
                {sort.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        共 {resultCount} {resultLabel}
      </p>
    </div>
  );
}
