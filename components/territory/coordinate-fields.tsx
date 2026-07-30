import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CoordinateFields({
  latitudeDefault,
  longitudeDefault,
}: {
  latitudeDefault?: number | null;
  longitudeDefault?: number | null;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="latitude">Latitude</Label>
        <Input
          id="latitude"
          name="latitude"
          type="number"
          step="any"
          min={-90}
          max={90}
          placeholder="-12.9711"
          defaultValue={latitudeDefault ?? ""}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="longitude">Longitude</Label>
        <Input
          id="longitude"
          name="longitude"
          type="number"
          step="any"
          min={-180}
          max={180}
          placeholder="-38.5108"
          defaultValue={longitudeDefault ?? ""}
        />
      </div>
    </div>
  );
}
