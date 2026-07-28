export const devAuthCookie = "orbit_dev_user_email";

export function isDevAuthEnabled() {
  return process.env.NODE_ENV !== "production";
}

export function getDevAuthUser() {
  return {
    email: process.env.ORBIT_DEV_USER_EMAIL ?? "gdc.robotic@gmail.com",
    name: process.env.ORBIT_DEV_USER_NAME ?? "Depok Racer Robotic",
  };
}
