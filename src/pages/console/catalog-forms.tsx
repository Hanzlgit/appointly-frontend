import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";

import {
  staffCatalogLocationCreate,
  staffCatalogLocationDelete,
  staffCatalogLocationUpdate,
  staffCatalogResourceCreate,
  staffCatalogResourceDelete,
  staffCatalogResourceUpdate,
  staffCatalogServiceCreate,
  staffCatalogServiceDelete,
  staffCatalogServiceUpdate,
} from "@/api/staff-catalog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ApiError } from "@/types/api";
import type { CatalogLocation, CatalogResource, CatalogService } from "@/types/staff-api";

const RESOURCE_TYPE_OPTIONS = [
  { value: "staff", label: "工作人员" },
  { value: "room", label: "房间" },
  { value: "venue", label: "场地" },
  { value: "equipment", label: "设备" },
] as const;

interface CatalogDeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  itemName: string;
  isPending: boolean;
  error: string | null;
  onConfirm: () => void;
}

/** 目录项删除确认 Dialog（#18/#19 复用）。 */
export function CatalogDeleteConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  itemName,
  isPending,
  error,
  onConfirm,
}: CatalogDeleteConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <p className="text-sm">
          确定删除「<span className="font-medium">{itemName}</span>」？此操作不可撤销。
        </p>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <DialogFooter>
          <Button variant="outline" disabled={isPending} onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button variant="destructive" disabled={isPending} onClick={onConfirm}>
            {isPending ? "删除中…" : "确认删除"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface CatalogLocationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantSlug: string;
  location: CatalogLocation | null;
  resources: CatalogResource[];
  onSuccess: () => void;
}

/** 地点新建/编辑 Dialog。 */
export function CatalogLocationFormDialog({
  open,
  onOpenChange,
  tenantSlug,
  location,
  resources,
  onSuccess,
}: CatalogLocationFormDialogProps) {
  const isEdit = location !== null;
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [resourceIds, setResourceIds] = useState<number[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setName(location?.name ?? "");
    setAddress(location?.address ?? "");
    setResourceIds(location?.resource_ids ?? []);
    setIsActive(location?.is_active ?? true);
    setFieldError(null);
    setApiError(null);
  }, [open, location]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const trimmedName = name.trim();
      if (!trimmedName) {
        throw new Error("VALIDATION");
      }
      const payload = {
        name: trimmedName,
        address: address.trim(),
        resource_ids: resourceIds,
      };
      if (isEdit) {
        return staffCatalogLocationUpdate(tenantSlug, location.id, {
          ...payload,
          is_active: isActive,
        });
      }
      return staffCatalogLocationCreate(tenantSlug, payload);
    },
    onSuccess: () => {
      onSuccess();
      onOpenChange(false);
    },
    onError: (err: ApiError | Error) => {
      if (err.message === "VALIDATION") {
        setFieldError("请填写地点名称");
        setApiError(null);
        return;
      }
      setFieldError(null);
      setApiError((err as ApiError).message ?? err.message);
    },
  });

  const toggleResource = (resourceId: number, checked: boolean) => {
    setResourceIds((prev) =>
      checked ? [...prev, resourceId] : prev.filter((id) => id !== resourceId),
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑地点" : "新增地点"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "修改地点信息与关联资源。" : "添加新的服务地点。"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="location-name">名称</Label>
            <Input
              id="location-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：总店"
              aria-invalid={fieldError ? true : undefined}
            />
            {fieldError ? <p className="text-sm text-destructive">{fieldError}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="location-address">地址（可选）</Label>
            <Textarea
              id="location-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="街道、楼层等"
              rows={2}
            />
          </div>

          {resources.length > 0 ? (
            <div className="space-y-2">
              <Label>关联资源</Label>
              <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border p-3">
                {resources.map((resource) => (
                  <Label key={resource.id} className="cursor-pointer font-normal">
                    <Checkbox
                      checked={resourceIds.includes(resource.id)}
                      onCheckedChange={(checked) => toggleResource(resource.id, checked === true)}
                    />
                    {resource.name}
                    <span className="text-muted-foreground">（{resource.resource_type}）</span>
                  </Label>
                ))}
              </div>
            </div>
          ) : null}

          {isEdit ? (
            <Label className="cursor-pointer font-normal">
              <Checkbox checked={isActive} onCheckedChange={(checked) => setIsActive(checked === true)} />
              启用此地点
            </Label>
          ) : null}

          {apiError ? (
            <Alert variant="destructive">
              <AlertDescription>{apiError}</AlertDescription>
            </Alert>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={saveMutation.isPending} onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
            {saveMutation.isPending ? "保存中…" : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface CatalogLocationDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantSlug: string;
  location: CatalogLocation | null;
  onSuccess: () => void;
}

/** 地点删除确认 Dialog。 */
export function CatalogLocationDeleteDialog({
  open,
  onOpenChange,
  tenantSlug,
  location,
  onSuccess,
}: CatalogLocationDeleteDialogProps) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
    }
  }, [open, location]);

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!location) {
        throw new Error("无地点数据");
      }
      return staffCatalogLocationDelete(tenantSlug, location.id);
    },
    onSuccess: () => {
      onSuccess();
      onOpenChange(false);
    },
    onError: (err: ApiError) => {
      const message = err.message;
      if (message.includes("已被业务引用")) {
        setError(`${message} 请通过「编辑」将其停用。`);
        return;
      }
      setError(message);
    },
  });

  if (!location) {
    return null;
  }

  return (
    <CatalogDeleteConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="删除地点"
      description="仅未被预约或排班引用的地点可以删除。"
      itemName={location.name}
      isPending={deleteMutation.isPending}
      error={error}
      onConfirm={() => deleteMutation.mutate()}
    />
  );
}

interface CatalogServiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantSlug: string;
  service: CatalogService | null;
  resources: CatalogResource[];
  onSuccess: () => void;
}

/** 服务新建/编辑 Dialog。 */
export function CatalogServiceFormDialog({
  open,
  onOpenChange,
  tenantSlug,
  service,
  resources,
  onSuccess,
}: CatalogServiceFormDialogProps) {
  const isEdit = service !== null;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [priceYuan, setPriceYuan] = useState("");
  const [resourceIds, setResourceIds] = useState<number[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setName(service?.name ?? "");
    setDescription(service?.description ?? "");
    setDurationMinutes(service ? String(service.duration_minutes) : "");
    setPriceYuan(service ? String(service.price_cents / 100) : "");
    setResourceIds(service?.resource_ids ?? []);
    setIsActive(service?.is_active ?? true);
    setFieldError(null);
    setApiError(null);
  }, [open, service]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const trimmedName = name.trim();
      if (!trimmedName) {
        throw new Error("VALIDATION_NAME");
      }
      const duration = Number.parseInt(durationMinutes, 10);
      if (!Number.isFinite(duration) || duration < 1) {
        throw new Error("VALIDATION_DURATION");
      }
      const yuan = Number.parseFloat(priceYuan);
      if (!Number.isFinite(yuan) || yuan < 0) {
        throw new Error("VALIDATION_PRICE");
      }
      const priceCents = Math.round(yuan * 100);
      const payload = {
        name: trimmedName,
        description: description.trim(),
        duration_minutes: duration,
        price_cents: priceCents,
        resource_ids: resourceIds,
      };
      if (isEdit) {
        return staffCatalogServiceUpdate(tenantSlug, service.id, {
          ...payload,
          is_active: isActive,
        });
      }
      return staffCatalogServiceCreate(tenantSlug, {
        ...payload,
        currency: "CNY",
      });
    },
    onSuccess: () => {
      onSuccess();
      onOpenChange(false);
    },
    onError: (err: ApiError | Error) => {
      if (err.message === "VALIDATION_NAME") {
        setFieldError("请填写服务名称");
        setApiError(null);
        return;
      }
      if (err.message === "VALIDATION_DURATION") {
        setFieldError("时长须为不小于 1 的整数（分钟）");
        setApiError(null);
        return;
      }
      if (err.message === "VALIDATION_PRICE") {
        setFieldError("请填写有效的价格（元）");
        setApiError(null);
        return;
      }
      setFieldError(null);
      setApiError((err as ApiError).message ?? err.message);
    },
  });

  const toggleResource = (resourceId: number, checked: boolean) => {
    setResourceIds((prev) =>
      checked ? [...prev, resourceId] : prev.filter((id) => id !== resourceId),
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑服务" : "新增服务"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "修改服务项目信息与关联资源。" : "添加新的可预约服务项目。"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="service-name">名称</Label>
            <Input
              id="service-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：基础护理"
              aria-invalid={fieldError ? true : undefined}
            />
            {fieldError ? <p className="text-sm text-destructive">{fieldError}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="service-description">说明（可选）</Label>
            <Textarea
              id="service-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="服务内容简介"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="service-duration">时长（分钟）</Label>
              <Input
                id="service-duration"
                type="number"
                min={1}
                step={1}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                placeholder="60"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="service-price">价格（元）</Label>
              <Input
                id="service-price"
                type="number"
                min={0}
                step={0.01}
                value={priceYuan}
                onChange={(e) => setPriceYuan(e.target.value)}
                placeholder="99.00"
              />
              <p className="text-xs text-muted-foreground">币种：CNY（人民币）</p>
            </div>
          </div>

          {resources.length > 0 ? (
            <div className="space-y-2">
              <Label>关联资源</Label>
              <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border p-3">
                {resources.map((resource) => (
                  <Label key={resource.id} className="cursor-pointer font-normal">
                    <Checkbox
                      checked={resourceIds.includes(resource.id)}
                      onCheckedChange={(checked) => toggleResource(resource.id, checked === true)}
                    />
                    {resource.name}
                    <span className="text-muted-foreground">（{resource.resource_type}）</span>
                  </Label>
                ))}
              </div>
            </div>
          ) : null}

          {isEdit ? (
            <Label className="cursor-pointer font-normal">
              <Checkbox checked={isActive} onCheckedChange={(checked) => setIsActive(checked === true)} />
              启用此服务
            </Label>
          ) : null}

          {apiError ? (
            <Alert variant="destructive">
              <AlertDescription>{apiError}</AlertDescription>
            </Alert>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={saveMutation.isPending} onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
            {saveMutation.isPending ? "保存中…" : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface CatalogServiceDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantSlug: string;
  service: CatalogService | null;
  onSuccess: () => void;
}

/** 服务删除确认 Dialog。 */
export function CatalogServiceDeleteDialog({
  open,
  onOpenChange,
  tenantSlug,
  service,
  onSuccess,
}: CatalogServiceDeleteDialogProps) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
    }
  }, [open, service]);

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!service) {
        throw new Error("无服务数据");
      }
      return staffCatalogServiceDelete(tenantSlug, service.id);
    },
    onSuccess: () => {
      onSuccess();
      onOpenChange(false);
    },
    onError: (err: ApiError) => {
      const message = err.message;
      if (message.includes("已被业务引用")) {
        setError(`${message} 请通过「编辑」将其停用。`);
        return;
      }
      setError(message);
    },
  });

  if (!service) {
    return null;
  }

  return (
    <CatalogDeleteConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="删除服务"
      description="仅未被预约引用的服务可以删除。"
      itemName={service.name}
      isPending={deleteMutation.isPending}
      error={error}
      onConfirm={() => deleteMutation.mutate()}
    />
  );
}

interface CatalogResourceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantSlug: string;
  resource: CatalogResource | null;
  locations: CatalogLocation[];
  onSuccess: () => void;
}

/** 资源新建/编辑 Dialog。 */
export function CatalogResourceFormDialog({
  open,
  onOpenChange,
  tenantSlug,
  resource,
  locations,
  onSuccess,
}: CatalogResourceFormDialogProps) {
  const isEdit = resource !== null;
  const [name, setName] = useState("");
  const [resourceType, setResourceType] = useState<string>("staff");
  const [locationIds, setLocationIds] = useState<number[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setName(resource?.name ?? "");
    setResourceType(resource?.resource_type ?? "staff");
    setLocationIds(resource?.location_ids ?? []);
    setIsActive(resource?.is_active ?? true);
    setFieldError(null);
    setApiError(null);
  }, [open, resource]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const trimmedName = name.trim();
      if (!trimmedName) {
        throw new Error("VALIDATION");
      }
      const payload = {
        name: trimmedName,
        resource_type: resourceType,
        location_ids: locationIds,
      };
      if (isEdit) {
        return staffCatalogResourceUpdate(tenantSlug, resource.id, {
          ...payload,
          is_active: isActive,
        });
      }
      return staffCatalogResourceCreate(tenantSlug, payload);
    },
    onSuccess: () => {
      onSuccess();
      onOpenChange(false);
    },
    onError: (err: ApiError | Error) => {
      if (err.message === "VALIDATION") {
        setFieldError("请填写资源名称");
        setApiError(null);
        return;
      }
      setFieldError(null);
      setApiError((err as ApiError).message ?? err.message);
    },
  });

  const toggleLocation = (locationId: number, checked: boolean) => {
    setLocationIds((prev) =>
      checked ? [...prev, locationId] : prev.filter((id) => id !== locationId),
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑资源" : "新增资源"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "修改资源信息与关联地点。" : "添加新的可预约资源。"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="resource-name">名称</Label>
            <Input
              id="resource-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：张医生"
              aria-invalid={fieldError ? true : undefined}
            />
            {fieldError ? <p className="text-sm text-destructive">{fieldError}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="resource-type">资源类型</Label>
            <Select value={resourceType} onValueChange={(value) => value && setResourceType(value)}>
              <SelectTrigger id="resource-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESOURCE_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {locations.length > 0 ? (
            <div className="space-y-2">
              <Label>关联地点</Label>
              <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border p-3">
                {locations.map((location) => (
                  <Label key={location.id} className="cursor-pointer font-normal">
                    <Checkbox
                      checked={locationIds.includes(location.id)}
                      onCheckedChange={(checked) => toggleLocation(location.id, checked === true)}
                    />
                    {location.name}
                  </Label>
                ))}
              </div>
            </div>
          ) : null}

          {isEdit ? (
            <Label className="cursor-pointer font-normal">
              <Checkbox checked={isActive} onCheckedChange={(checked) => setIsActive(checked === true)} />
              启用此资源
            </Label>
          ) : null}

          {apiError ? (
            <Alert variant="destructive">
              <AlertDescription>{apiError}</AlertDescription>
            </Alert>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={saveMutation.isPending} onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
            {saveMutation.isPending ? "保存中…" : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface CatalogResourceDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantSlug: string;
  resource: CatalogResource | null;
  onSuccess: () => void;
}

/** 资源删除确认 Dialog。 */
export function CatalogResourceDeleteDialog({
  open,
  onOpenChange,
  tenantSlug,
  resource,
  onSuccess,
}: CatalogResourceDeleteDialogProps) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
    }
  }, [open, resource]);

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!resource) {
        throw new Error("无资源数据");
      }
      return staffCatalogResourceDelete(tenantSlug, resource.id);
    },
    onSuccess: () => {
      onSuccess();
      onOpenChange(false);
    },
    onError: (err: ApiError) => {
      const message = err.message;
      if (message.includes("已被业务引用")) {
        setError(`${message} 请通过「编辑」将其停用。`);
        return;
      }
      setError(message);
    },
  });

  if (!resource) {
    return null;
  }

  return (
    <CatalogDeleteConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="删除资源"
      description="仅未被预约或排班引用的资源可以删除。"
      itemName={resource.name}
      isPending={deleteMutation.isPending}
      error={error}
      onConfirm={() => deleteMutation.mutate()}
    />
  );
}
