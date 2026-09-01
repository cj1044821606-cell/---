import React from "react";
import { Globe2, Search, Send } from "lucide-react";

import { Input } from "@client/src/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@client/src/components/ui/select";
import FilterChip from "@client/src/components/FilterChip";

export interface LibraryFilterBarProps {
  keywordInput: string;
  onKeywordChange: (value: string) => void;
  materialType: string;
  onMaterialTypeChange: (value: string) => void;
  region: string;
  onRegionChange: (value: string) => void;
  productModel: string;
  onProductModelChange: (value: string) => void;
  typeOptions: string[];
  regionOptions: string[];
  modelOptions: string[];
  externalOnly: boolean;
  onExternalOnlyChange: (value: boolean) => void;
  canViewGlobal: boolean;
  viewGlobal: boolean;
  onViewGlobalChange: (value: boolean) => void;
  allValue: string;
  pt: (key: string) => string;
}

interface SelectFilterProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  allLabel: string;
  allValue: string;
  options: string[];
}

const SelectFilter: React.FC<SelectFilterProps> = ({
  value,
  onValueChange,
  placeholder,
  allLabel,
  allValue,
  options,
}: SelectFilterProps) => (
  <Select value={value} onValueChange={onValueChange}>
    <SelectTrigger className="h-10 rounded-lg w-full lg:w-[150px]">
      <SelectValue placeholder={placeholder} />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value={allValue}>{allLabel}</SelectItem>
      {options.map((option: string) => (
        <SelectItem key={option} value={option}>
          {option}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

const LibraryFilterBar: React.FC<LibraryFilterBarProps> = ({
  keywordInput,
  onKeywordChange,
  materialType,
  onMaterialTypeChange,
  region,
  onRegionChange,
  productModel,
  onProductModelChange,
  typeOptions,
  regionOptions,
  modelOptions,
  externalOnly,
  onExternalOnlyChange,
  canViewGlobal,
  viewGlobal,
  onViewGlobalChange,
  allValue,
  pt,
}: LibraryFilterBarProps) => {
  return (
    <section className="mb-5 flex flex-wrap items-center gap-2.5">
      <div className="relative min-w-[260px] max-w-[400px] flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={keywordInput}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
            onKeywordChange(event.target.value)
          }
          placeholder={pt("library.search.placeholder")}
          className="h-10 rounded-lg pl-9"
        />
      </div>
      <SelectFilter
        value={materialType}
        onValueChange={onMaterialTypeChange}
        placeholder={pt("library.filter.materialType")}
        allLabel={pt("library.filter.all")}
        allValue={allValue}
        options={typeOptions}
      />
      <SelectFilter
        value={region}
        onValueChange={onRegionChange}
        placeholder={pt("library.filter.region")}
        allLabel={pt("library.filter.all")}
        allValue={allValue}
        options={regionOptions}
      />
      <SelectFilter
        value={productModel}
        onValueChange={onProductModelChange}
        placeholder={pt("library.filter.productModel")}
        allLabel={pt("library.filter.all")}
        allValue={allValue}
        options={modelOptions}
      />
      <span className="mx-0.5 h-6 w-px bg-border" />
      <FilterChip
        active={externalOnly}
        onClick={() => onExternalOnlyChange(!externalOnly)}
        icon={Send}
      >
        {pt("library.filter.externalOnly")}
      </FilterChip>
      {canViewGlobal ? (
        <FilterChip
          active={viewGlobal}
          onClick={() => onViewGlobalChange(!viewGlobal)}
          icon={Globe2}
        >
          {pt("library.viewGlobal.label")}
        </FilterChip>
      ) : null}
    </section>
  );
};

export default LibraryFilterBar;
