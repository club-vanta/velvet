import * as auth from "./messages/auth";
import * as common from "./messages/common";
import * as dashboard from "./messages/dashboard";
import * as events from "./messages/events";
import * as guestTypes from "./messages/guestTypes";
import * as guests from "./messages/guests";
import * as mazmo from "./messages/mazmo";
import * as meetups from "./messages/meetups";
import * as navigation from "./messages/navigation";
import * as organizations from "./messages/organizations";
import * as staff from "./messages/staff";
import * as stats from "./messages/stats";

export type Lang = "en" | "es";

/**
 * One module per area of the app. Keys stay flat and global, so a key must be
 * unique across modules (i18n.test.ts checks it). Add new strings to the
 * module of the area that shows them.
 */
export const messageModules = {
  navigation,
  common,
  auth,
  dashboard,
  meetups,
  guests,
  guestTypes,
  mazmo,
  staff,
  organizations,
  stats,
  events,
};

export const translations = {
  en: {
    ...navigation.en,
    ...common.en,
    ...auth.en,
    ...dashboard.en,
    ...meetups.en,
    ...guests.en,
    ...guestTypes.en,
    ...mazmo.en,
    ...staff.en,
    ...organizations.en,
    ...stats.en,
    ...events.en,
  },
  es: {
    ...navigation.es,
    ...common.es,
    ...auth.es,
    ...dashboard.es,
    ...meetups.es,
    ...guests.es,
    ...guestTypes.es,
    ...mazmo.es,
    ...staff.es,
    ...organizations.es,
    ...stats.es,
    ...events.es,
  },
} satisfies Record<Lang, Record<string, string>>;

export type TranslationKey = keyof typeof translations.en;
