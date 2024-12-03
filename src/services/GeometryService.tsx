export const getAzimuthText = (degrees: number): string => {
    if ((degrees >= 0 && degrees < 45) || degrees === 360) return "sever";
    if (degrees >= 45 && degrees < 90) return "severovýchod";
    if (degrees >= 90 && degrees < 135) return "východ";
    if (degrees >= 135 && degrees < 180) return "jihovýchod";
    if (degrees >= 180 && degrees < 225) return "jih";
    if (degrees >= 225 && degrees < 270) return "jihozápad";
    if (degrees >= 270 && degrees < 315) return "západ";
    if (degrees >= 315 && degrees < 360) return "severozápad";
    return "";
};
