import { forwardRef } from "react";

export const BulletRain = forwardRef<HTMLDivElement>((_, ref) => {
  return <div ref={ref} className="bullet-rain" />;
});
